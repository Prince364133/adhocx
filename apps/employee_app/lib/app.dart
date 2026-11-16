import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:sizer/sizer.dart';
import 'routes/app_routes.dart';
import 'shared/components/feedback/employee_no_page_transitions.dart';
import 'theme/app_theme.dart';
import 'theme/theme_provider.dart';

class EmployeeApp extends StatelessWidget {
  const EmployeeApp({super.key});

  static const PageTransitionsTheme _transitions = PageTransitionsTheme(
    builders: {
      TargetPlatform.android: EmployeeNoPageTransitionsBuilder(),
      TargetPlatform.iOS: EmployeeNoPageTransitionsBuilder(),
      TargetPlatform.linux: EmployeeNoPageTransitionsBuilder(),
      TargetPlatform.macOS: EmployeeNoPageTransitionsBuilder(),
      TargetPlatform.windows: EmployeeNoPageTransitionsBuilder(),
      TargetPlatform.fuchsia: EmployeeNoPageTransitionsBuilder(),
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
