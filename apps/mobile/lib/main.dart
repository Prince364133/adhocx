import 'dart:ui';
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
import './services/supabase_service.dart';
import './services/user_service.dart';
import './theme/app_theme.dart';
import './theme/theme_provider.dart';
import './user/requirements/requirement_draft_provider.dart';
import './widgets/custom_error_widget.dart';
import './presentation/language_selection_widget.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

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

  // Initialize Supabase if credentials are provided (graceful fallback)
  bool supabaseReady = true;
  Object? initError;

  try {
    await SupabaseService.initialize().timeout(const Duration(seconds: 3));
  } catch (e) {
    AppLogger.debug('Supabase optional init skipped: $e', tag: 'MAIN');
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
      child: MyApp(supabaseReady: supabaseReady, initError: initError),
    ),
  );
}

class MyApp extends StatelessWidget {
  final bool supabaseReady;
  final Object? initError;

  const MyApp({super.key, required this.supabaseReady, this.initError});

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