import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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

  // Initialize Local Notifications for urgent dispatch alerts
  try {
    await LocalNotificationService.instance.initialize();
  } catch (e) {
    AppLogger.debug('Local notification init skipped: $e', tag: 'MAIN');
  }

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
    await authProvider.checkSession().timeout(const Duration(milliseconds: 1500));
  } catch (e) {
    AppLogger.debug('Auth session check skipped: $e', tag: 'MAIN');
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
          theme: AppTheme.lightTheme,
          darkTheme: AppTheme.darkTheme,
          themeMode: themeProvider.themeMode,
          builder: (context, child) {
            return MediaQuery(
              data: MediaQuery.of(
                context,
              ).copyWith(textScaler: const TextScaler.linear(1.0)),
              child: child ?? const SizedBox.shrink(),
            );
          },
          debugShowCheckedModeBanner: false,
          routerConfig: appRouter,
        );
      },
    );
  }
}