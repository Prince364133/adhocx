import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'app.dart';
import 'repositories/mock_employee_auth_repository.dart';
import 'state/employee_auth_provider.dart';
import 'state/employee_permission_provider.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  final authRepository = MockEmployeeAuthRepository();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (_) => EmployeeAuthProvider(repository: authRepository),
        ),
        ChangeNotifierProvider(
          create: (_) => EmployeePermissionProvider(),
        ),
      ],
      child: const EmployeeApp(),
    ),
  );
}

