import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'app.dart';
import 'repositories/http_employee_auth_repository.dart';
import 'repositories/http_employee_rider_repository.dart';
import 'services/employee_api_client.dart';
import 'services/mock_data_service.dart';
import 'state/employee_auth_provider.dart';
import 'state/employee_permission_provider.dart';
import 'theme/theme_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Eagerly mount asset bundle for UI illustrations / offline mockups
  try {
    await MockDataService.loadData();
  } catch (_) {}

  final apiClient = EmployeeApiClient();
  final authRepository = HttpEmployeeAuthRepository(client: apiClient);
  final riderRepository = HttpEmployeeRiderRepository(client: apiClient);

  runApp(
    MultiProvider(
      providers: [
        Provider<EmployeeApiClient>.value(value: apiClient),
        Provider<HttpEmployeeRiderRepository>.value(value: riderRepository),
        ChangeNotifierProvider(
          create: (_) => EmployeeAuthProvider(repository: authRepository),
        ),
        ChangeNotifierProvider(
          create: (_) => EmployeePermissionProvider(),
        ),
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
      ],
      child: const EmployeeApp(),
    ),
  );
}
