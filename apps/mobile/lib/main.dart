import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:sizer/sizer.dart';

import './core/utils/app_logger.dart';
import './routes/app_routes.dart';
import './services/auth_provider.dart';
import './services/auth_service.dart';
import './services/driver_service.dart';
import './services/onboarding_provider.dart';
import './services/user_service.dart';
import './theme/app_theme.dart';
import './theme/theme_provider.dart';
import './user/requirements/requirement_draft_provider.dart';
import './widgets/custom_error_widget.dart';
import './presentation/language_selection_widget.dart';
import 'package:flutter/foundation.dart';
import 'package:firebase_core/firebase_core.dart';
import './services/edge_case_manager.dart';
import './services/local_notification_service.dart';
import './services/fcm_service.dart';
import './core/networking/api_client.dart';
import './core/security/security_service.dart';
import './services/app_update_service.dart';

import './presentation/overlay/driver_bubble_overlay.dart';

// Overlay entry-point for flutter_overlay_window (runs in dedicated background isolate)
@pragma("vm:entry-point")
void overlayMain() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    const MaterialApp(
      debugShowCheckedModeBanner: false,
      home: DriverAssistiveBubbleOverlay(),
    ),
  );
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Run device integrity and root/jailbreak detection check
  try {
    await SecurityService.instance.checkDeviceIntegrity();
  } catch (e) {
    AppLogger.warn('Security check initialization notice: $e', tag: 'SECURITY');
  }

  // Initialize Firebase for Push Notifications
  try {
    if (!kIsWeb) {
      await Firebase.initializeApp();
    }
  } catch (e) {
    AppLogger.debug('Firebase initialization notice: $e', tag: 'MAIN');
  }

  // Initialize Local Notifications for urgent dispatch alerts and app update notifications
  try {
    await LocalNotificationService.instance.initialize();
  } catch (e) {
    AppLogger.debug('Local notification init skipped: $e', tag: 'MAIN');
  }

  // Asynchronously query authoritative backend for app updates
  AppUpdateService.instance.checkForUpdate().catchError((e) {
    AppLogger.debug('Initial app update check notice: $e', tag: 'MAIN');
    return null;
  });

  // Route uncaught framework errors to structured logger
  FlutterError.onError = (FlutterErrorDetails details) {
    AppLogger.error(
      'Flutter Framework Exception: ${details.exceptionAsString()}',
      tag: 'FLUTTER',
      error: details.exception,
      stackTrace: details.stack,
    );
  };

  // Route uncaught async/platform errors to structured logger
  PlatformDispatcher.instance.onError = (error, stack) {
    AppLogger.error(
      'Uncaught Asynchronous Exception: $error',
      tag: 'ASYNC',
      error: error,
      stackTrace: stack,
    );
    return true;
  };

  AppLogger.info('AdhocX application starting bootstrap sequence...', tag: 'MAIN');

  // Lock orientation before anything renders (graceful on Web)
  try {
    await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  } catch (e) {
    AppLogger.debug('Orientation lock skipped on platform: $e', tag: 'MAIN');
  }

  // Initialize Language Provider and load saved language
  final languageProvider = LanguageProvider();
  try {
    await languageProvider.loadSavedLanguage();
  } catch (e) {
    AppLogger.debug('Language init skipped: $e', tag: 'MAIN');
  }

  // Initialize Auth Provider and restore session
  final authProvider = AuthProvider();
  try {
    // Fast local hydration first (< 5ms from disk)
    await AuthService.instance.loadCachedUser();
    // Network session verification and proactive refresh
    await authProvider.checkSession().timeout(const Duration(seconds: 4));
  } catch (e) {
    AppLogger.debug('Auth session network sync deferred to background: $e', tag: 'MAIN');
  }

  // Initialize Onboarding Provider
  final onboardingProvider = OnboardingProvider();

  // Initialize real device permissions (location, notifications, camera)
  try {
    await EdgeCaseManager.instance.initializeRealPermissions();
  } catch (e) {
    AppLogger.debug('Permission initialization skipped: $e', tag: 'MAIN');
  }

  // Initialize FCM Push Notifications and sync device token with backend
  try {
    final token = await ApiClient.instance.getToken();
    await FcmService.instance.initialize(
      apiBaseUrl: ApiClient.instance.baseUrl,
      userToken: token,
    );
    AppLogger.info('FCM Push notification service initialized', tag: 'MAIN');
  } catch (e) {
    AppLogger.debug('FCM Push notification initialization skipped: $e', tag: 'MAIN');
  }

  bool hasShownError = false;

  // 🚨 CRITICAL: Custom error handling - DO NOT REMOVE
  ErrorWidget.builder = (FlutterErrorDetails details) {
    if (!hasShownError) {
      hasShownError = true;
      Future.delayed(const Duration(seconds: 5), () {
        hasShownError = false;
      });
      return CustomErrorWidget(errorDetails: details);
    }
    return const SizedBox.shrink();
  };

  GoRouter.optionURLReflectsImperativeAPIs = true;

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider.value(value: languageProvider),
        ChangeNotifierProvider.value(value: authProvider),
        ChangeNotifierProvider.value(value: onboardingProvider),
        ChangeNotifierProvider(create: (_) => RequirementDraftProvider()),
        Provider<AuthService>(create: (_) => AuthService.instance),
        Provider<DriverService>(create: (_) => DriverService.instance),
        Provider<UserService>(create: (_) => UserService.instance),
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    final themeProvider = context.watch<ThemeProvider>();
    final languageProvider = context.watch<LanguageProvider>();

    return Sizer(
      builder: (context, orientation, screenType) {
        return MaterialApp.router(
          title: 'AdhocX',
          locale: languageProvider.currentLocale,
          supportedLocales: const [
            Locale('en', ''),
            Locale('hi', ''),
            Locale('te', ''),
          ],
          localizationsDelegates: const [
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          theme: AppTheme.lightTheme,
          darkTheme: AppTheme.darkTheme,
          themeMode: themeProvider.themeMode,
          builder: (context, child) {
            final mediaQuery = MediaQuery.of(context);
            final safeScaler = mediaQuery.textScaler.clamp(
              minScaleFactor: 0.85,
              maxScaleFactor: 1.0,
            );
            return MediaQuery(
              data: mediaQuery.copyWith(textScaler: safeScaler),
              child: DefaultTextStyle.merge(
                overflow: TextOverflow.ellipsis,
                child: child ?? const SizedBox.shrink(),
              ),
            );
          },
          debugShowCheckedModeBanner: false,
          routerConfig: appRouter,
        );
      },
    );
  }
}