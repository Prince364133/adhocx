import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:sizer/sizer.dart';
import 'routes/app_routes.dart';
import 'shared/components/feedback/employee_page_transition.dart';
import 'theme/app_theme.dart';
import 'theme/theme_provider.dart';

class EmployeeApp extends StatelessWidget {
  const EmployeeApp({super.key});

  /// The employee app keeps its own page-transition motion on top of the
  /// Driver app theme (the theme files themselves are exact driver copies).
  static const PageTransitionsTheme _transitions = PageTransitionsTheme(
    builders: {
      TargetPlatform.android: EmployeePageTransition(),
      TargetPlatform.iOS: EmployeePageTransition(),
      TargetPlatform.linux: EmployeePageTransition(),
      TargetPlatform.macOS: EmployeePageTransition(),
      TargetPlatform.windows: EmployeePageTransition(),
      TargetPlatform.fuchsia: EmployeePageTransition(),
    },
  );

  @override
  Widget build(BuildContext context) {
    final themeProvider = context.watch<ThemeProvider>();

    return Sizer(
      builder: (context, orientation, deviceType) {
        return MaterialApp.router(
          title: 'AdhocX Employee',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.lightTheme.copyWith(
            pageTransitionsTheme: _transitions,
          ),
          darkTheme: AppTheme.darkTheme.copyWith(
            pageTransitionsTheme: _transitions,
          ),
          themeMode: ThemeProvider.darkModeReady
              ? themeProvider.themeMode
              : ThemeMode.light,
          routerConfig: AppRoutes.router,
        );
      },
    );
  }
}
