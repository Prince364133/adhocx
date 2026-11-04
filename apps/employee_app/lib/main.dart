import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'app.dart';
import 'repositories/mock_employee_auth_repository.dart';
import 'services/mock_data_service.dart';
import 'state/employee_auth_provider.dart';
import 'state/employee_permission_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Eagerly mount and cache JSON data bundle for all 107 screens
  await MockDataService.loadData();

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
