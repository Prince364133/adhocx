import 'package:flutter/material.dart';
import 'package:sizer/sizer.dart';
import 'routes/app_routes.dart';
import 'theme/app_theme.dart';

class EmployeeApp extends StatelessWidget {
  const EmployeeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Sizer(
      builder: (context, orientation, deviceType) {
        return MaterialApp.router(
          title: 'AdhocX Employee',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.lightTheme,
          routerConfig: AppRoutes.router,
        );
      },
    );
  }
}
