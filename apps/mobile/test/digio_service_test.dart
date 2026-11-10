import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:adhocx/presentation/12_onboarding_vehicle_screen/onboarding_vehicle_screen.dart';
import 'package:adhocx/presentation/13_onboarding_documents_screen/onboarding_documents_screen.dart';
import 'package:adhocx/services/auth_provider.dart';
import 'package:adhocx/services/auth_service.dart';
import 'package:adhocx/services/driver_service.dart';
import 'package:adhocx/services/onboarding_provider.dart';
import 'package:adhocx/theme/app_theme.dart';

Widget _wrapScreen(Widget child) {
  final onboarding = OnboardingProvider()..setRole('DRIVER');
  return MultiProvider(
    providers: [
      ChangeNotifierProvider(create: (_) => AuthProvider()),
      ChangeNotifierProvider<OnboardingProvider>.value(value: onboarding),
      Provider<AuthService>(create: (_) => AuthService.instance),
      Provider<DriverService>(create: (_) => DriverService.instance),
    ],
    child: MaterialApp(
      theme: AppTheme.lightTheme,
      home: child,
    ),
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  tearDown(() {
    DigioService.instance.latestByTypeNotifier.value = {};
    DigioService.instance.activeDigilockerRequestId.value = null;
  });

  testWidgets('OnboardingDocumentsScreen renders Digio Express KYC & DigiLocker controls',
      (WidgetTester tester) async {
    await tester.pumpWidget(_wrapScreen(const OnboardingDocumentsScreen()));
    expect(find.text('Digio Instant KYC & DigiLocker'), findsOneWidget);
    expect(find.text('Connect DigiLocker'), findsOneWidget);
    expect(find.text('Verify PAN'), findsOneWidget);
    expect(find.text('Verify DL'), findsOneWidget);

    DigioService.instance.latestByTypeNotifier.value = {
      'PAN': {'verified': true, 'verificationType': 'PAN'},
      'DRIVING_LICENSE': {'verified': true, 'verificationType': 'DRIVING_LICENSE'},
    };
    await tester.pump();
    expect(find.text('PAN Verified'), findsOneWidget);
    expect(find.text('DL Verified'), findsOneWidget);
  });

  testWidgets('OnboardingVehicleScreen renders Verify RC with Parivahan action & status',
      (WidgetTester tester) async {
    await tester.pumpWidget(_wrapScreen(const OnboardingVehicleScreen()));
    expect(find.text('Verify RC with Parivahan'), findsOneWidget);

    DigioService.instance.latestByTypeNotifier.value = {
      'VEHICLE_RC': {
        'verified': true,
        'complianceOk': true,
        'status': 'VERIFIED',
        'identifier': 'TS09AB1234',
        'verifiedName': 'RAMESH KUMAR',
        'complianceNotes': 'RC active; fitness, insurance & permit checks passed',
        'summary': {
          'makerModel': 'MARUTI SUZUKI DZIRE TOUR S',
          'rcStatus': 'ACTIVE',
          'fitUpto': '2030-12-31',
          'insuranceUpto': '2029-05-01',
        },
      },
    };
    await tester.pump();
    expect(find.text('Re-verify RC (Parivahan)'), findsOneWidget);
    expect(find.textContaining('MARUTI SUZUKI DZIRE TOUR S'), findsOneWidget);
  });
}
