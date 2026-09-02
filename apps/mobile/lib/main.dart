import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:sizer/sizer.dart';

import './services/supabase_service.dart';
import './services/auth_provider.dart';
import './theme/theme_provider.dart';

import './widgets/custom_error_widget.dart';
import 'core/app_export.dart';

// Make sure to import your new LanguageProvider!
// Adjust this path if you placed it in a different folder.
import './presentation/language_selection_widget.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Lock orientation before anything renders
  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);

  // Initialize Language Provider and load saved language
  final languageProvider = LanguageProvider();
  await languageProvider.loadSavedLanguage();

  // Initialize Auth Provider and restore session
  final authProvider = AuthProvider();
  await authProvider.checkSession();

  // Initialize Supabase if credentials are provided (graceful fallback)
  bool supabaseReady = true;
  Object? initError;

  try {
    await SupabaseService.initialize().timeout(const Duration(seconds: 5));
  } catch (e) {
    debugPrint('Supabase optional init skipped: $e');
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
  
  // Wrapped in MultiProvider to handle Theme, Language, and Auth
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider.value(value: languageProvider),
        ChangeNotifierProvider.value(value: authProvider),
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


    // Watch both providers for changes
    final themeProvider = context.watch<ThemeProvider>();
    final languageProvider = context.watch<LanguageProvider>();

    return Sizer(
      builder: (context, orientation, screenType) {
        return MaterialApp.router(
          title: 'AdhocX',
          
          // Inject the current active language here!
          locale: languageProvider.currentLocale, 
          
          theme: AppTheme.lightTheme,
          darkTheme: AppTheme.darkTheme,
          themeMode: themeProvider.themeMode,
          // 🚨 CRITICAL: NEVER REMOVE OR MODIFY
          builder: (context, child) {
            return MediaQuery(
              data: MediaQuery.of(
                context,
              ).copyWith(textScaler: const TextScaler.linear(1.0)),
              child: child ?? const SizedBox.shrink(),
            );
          },
          // 🚨 END CRITICAL SECTION
          debugShowCheckedModeBanner: false,
          routerConfig: appRouter,
        );
      },
    );
  }
}

class StartupErrorScreen extends StatelessWidget {
  final Object? error;

  const StartupErrorScreen({super.key, this.error});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF020617),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.cloud_off_rounded,
                color: Color(0xFFef4444),
                size: 56,
              ),
              const SizedBox(height: 16),
              const Text(
                'Unable to start AdhocX',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 10),
              Text(
                error?.toString() ?? 'Supabase configuration is unavailable.',
                style: const TextStyle(color: Color(0xFF94a3b8)),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 18),
              const Text(
                'Run with: flutter run -d chrome --dart-define-from-file=env.json',
                style: TextStyle(color: Color(0xFF22c55e), fontSize: 12),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}