import 'package:adhocx_employee/features/profile_settings/profile_settings.dart';
import 'package:adhocx_employee/models/employee_user.dart';
import 'package:adhocx_employee/repositories/employee_auth_repository.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/state/employee_auth_provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_theme.dart';
import 'package:adhocx_employee/theme/theme_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

class _FakeAuthRepository implements EmployeeAuthRepository {
  @override
  Future<void> sendOtp(String mobileNumber) async {}
  @override
  Future<EmployeeUser?> getCurrentUser() async => null;
  @override
  Future<void> signOut() async {}
  @override
  Future<EmployeeUser> verifyOtp({
    required String mobileNumber,
    required String otp,
  }) =>
      throw UnimplementedError();
  @override
  Future<EmployeeUser> authenticateWithSso(String companyEmail) =>
      throw UnimplementedError();
}

final _screens = <String, Widget Function()>{
  'Profile': () => const ProfileMyDetailsScreen(),
  'Edit profile': () => const EditProfileScreen(),
  'Settings': () => const SettingsOverviewScreen(),
  'Language': () => const SelectLanguageScreen(),
  'Privacy': () => const PrivacyDataScreen(),
  'About': () => const AboutAdhocxScreen(),
  'Notifications': () => const NotificationsCenterScreen(),
  'Notification prefs': () => const NotificationPreferencesScreen(),
  'Trip history': () => const TripHistoryOverviewScreen(),
  'Trip history details': () => const TripHistoryDetailsScreen(),
  'Trip analytics': () => const TripSummaryAnalyticsScreen(),
  'Trip feedback': () => const TripFeedbackFormScreen(),
  'Logout': () => const LogoutConfirmScreen(),
  'Delete account': () => const DeleteAccountScreen(),
};

late ThemeProvider _theme;

Future<void> _pump(WidgetTester tester, Widget screen, {bool dark = false}) async {
  tester.view.physicalSize = const Size(360, 640);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  SharedPreferences.setMockInitialValues({});
  await tester.runAsync(MockDataService.loadData);
  _theme = ThemeProvider();
  Widget landed(String r) => Scaffold(body: Text('LANDED $r'));
  final router = GoRouter(
    initialLocation: '/screen',
    routes: [
      GoRoute(path: '/screen', builder: (_, __) => screen),
      for (final r in [AppRoutes.welcome, AppRoutes.settingsOverview])
        GoRoute(path: r, builder: (_, __) => landed(r)),
    ],
  );
  await tester.pumpWidget(MultiProvider(
    providers: [
      ChangeNotifierProvider(
        create: (_) => EmployeeAuthProvider(repository: _FakeAuthRepository()),
      ),
      ChangeNotifierProvider.value(value: _theme),
    ],
    child: MaterialApp.router(
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: dark ? ThemeMode.dark : ThemeMode.light,
      routerConfig: router,
    ),
  ));
  await tester.pumpAndSettle();
}

void main() {
  for (final dark in [false, true]) {
    final mode = dark ? 'dark' : 'light';
    _screens.forEach((name, build) {
      testWidgets('$name renders on a 360x640 phone in $mode mode',
          (tester) async {
        await _pump(tester, build(), dark: dark);
        expect(tester.takeException(), isNull);
        final scaffold = tester.widget<Scaffold>(find.byType(Scaffold).first);
        expect(scaffold.backgroundColor,
            dark ? AppColors.bgDark : AppColors.bgLight);
      });
    });
  }

  testWidgets('Delete Account signs out and goes to Welcome (no crash)',
      (tester) async {
    await _pump(tester, const DeleteAccountScreen());
    await tester.ensureVisible(find.byType(CheckboxListTile));
    await tester.tap(find.byType(CheckboxListTile));
    await tester.pump();
    await tester.tap(find.widgetWithText(ElevatedButton, 'Delete Account'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(find.text('LANDED ${AppRoutes.welcome}'), findsOneWidget);
  });

  testWidgets('Appearance control updates the theme preference',
      (tester) async {
    await _pump(tester, const SettingsOverviewScreen());
    await tester.tap(find.text('Dark'));
    await tester.pumpAndSettle();
    expect(_theme.themeMode, ThemeMode.dark);
  });

  testWidgets('Profile links to Settings', (tester) async {
    await _pump(tester, const ProfileMyDetailsScreen());
    await tester.ensureVisible(find.text('Settings'));
    await tester.tap(find.text('Settings'));
    await tester.pumpAndSettle();
    expect(find.text('LANDED ${AppRoutes.settingsOverview}'), findsOneWidget);
  });
}
