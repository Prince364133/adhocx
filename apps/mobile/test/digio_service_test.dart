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

Widget _wrapScreen(Widget child, {OnboardingProvider? provider}) {
  final onboarding = provider ?? (OnboardingProvider()..setRole('DRIVER'));
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

  test('DigioService.verifiedDocsFromMap and extractedIdentifiersFromMap only trust DigiLocker', () {
    final spoofedLatest = <String, dynamic>{
      'PAN': {'verified': true, 'identifier': 'ABCDE1234F'},
      'DRIVING_LICENSE': {'verified': true, 'identifier': 'TS0920200012345'},
      'VEHICLE_RC': {
        'verified': true,
        'identifier': 'TS07KA2864',
        'summary': {'makerModel': 'TVS RAIDER', 'color': 'RED', 'modelYear': '2023'},
      },
      'VEHICLE_INSURANCE': {'verified': true, 'identifier': 'POL12345'},
    };

    expect(
      DigioService.verifiedDocsFromMap(spoofedLatest),
      {
        'digilocker': false,
        'aadhaar': false,
        'pan': false,
        'dl': false,
        'rc': false,
        'insurance': false,
      },
    );
    expect(DigioService.extractedIdentifiersFromMap(spoofedLatest), isEmpty);

    final digilockerLatest = <String, dynamic>{
      ...spoofedLatest,
      'DIGILOCKER': {
        'verified': true,
        'summary': {
          'verifiedDocs': {'aadhaar': true, 'pan': true, 'dl': false, 'rc': false},
          'maskedAadhaar': 'XXXX-XXXX-1234',
          'extractedPan': 'REALP1234K',
        },
      },
    };

    expect(
      DigioService.verifiedDocsFromMap(digilockerLatest),
      {
        'digilocker': true,
        'aadhaar': true,
        'pan': true,
        'dl': false,
        'rc': false,
        'insurance': false,
      },
    );
    expect(
      DigioService.extractedIdentifiersFromMap(digilockerLatest),
      {'panNumber': 'REALP1234K'},
    );
  });

  testWidgets('OnboardingDocumentsScreen shows only Verify with DigiLocker, ignores manual ID records, and separates Pending Review vs DigiLocker',
      (WidgetTester tester) async {
    final onboarding = OnboardingProvider()..setRole('DRIVER');
    await tester.pumpWidget(_wrapScreen(const OnboardingDocumentsScreen(), provider: onboarding));
    expect(find.text('DigiLocker Verification'), findsOneWidget);
    expect(find.textContaining('Digio'), findsNothing);
    expect(find.textContaining('Connect DigiLocker or verify Govt IDs'), findsNothing);
    expect(find.text('Verify with DigiLocker'), findsOneWidget);
    expect(find.text('Verify PAN'), findsNothing);
    expect(find.text('Verify DL'), findsNothing);
    expect(find.text('Driver Profile Photo *'), findsNothing);
    expect(find.text('CONTINUE TO FACE VERIFICATION'), findsOneWidget);

    // Manual document upload displays Pending Review instead of Verified
    onboarding.setDocumentUrl('DRIVING_LICENSE', 'https://cdn.example.com/dl.jpg');
    await tester.pump();
    expect(find.text('Pending Review'), findsOneWidget);

    // Typed-number PAN/DL records must NOT satisfy or green-mark onboarding uploads
    DigioService.instance.latestByTypeNotifier.value = {
      'PAN': {'verified': true, 'verificationType': 'PAN'},
      'DRIVING_LICENSE': {'verified': true, 'verificationType': 'DRIVING_LICENSE'},
    };
    await tester.pump();
    expect(find.text('PAN Verified'), findsNothing);
    expect(find.text('DL Verified'), findsNothing);
    expect(find.text('Verified via Govt DL check — no upload needed'), findsNothing);
    expect(find.text('Verified via PAN check — no upload needed'), findsNothing);

    // DigiLocker verification auto-marks ONLY documents shared via DigiLocker;
    // unshared docs (e.g. DL not in DigiLocker) remain Pending Review / Upload
    DigioService.instance.latestByTypeNotifier.value = {
      'DIGILOCKER': {
        'verified': true,
        'summary': {
          'verifiedDocs': {'aadhaar': true, 'pan': true, 'dl': false},
        },
      },
    };
    await tester.pump();
    expect(find.text('DigiLocker Verified'), findsOneWidget);
    expect(find.text('Verified via DigiLocker — already uploaded'), findsNWidgets(3));
    expect(find.text('Pending Review'), findsOneWidget);
  });

  testWidgets('OnboardingVehicleScreen removes Parivahan RC/Policy verification and requires RC photos + Insurance upload unless RC came from DigiLocker',
      (WidgetTester tester) async {
    final onboarding = OnboardingProvider()..setRole('DRIVER');
    onboarding.setVehicleDetails(
      vehicleType: 'SEDAN',
      carModel: 'MARUTI SUZUKI DZIRE TOUR S',
      color: 'WHITE',
      registrationNumber: 'TS09AB1234',
      modelYear: '2023',
    );
    onboarding.setDocumentUrl('INSURANCE', 'https://cdn.example.com/insurance.pdf');

    await tester.pumpWidget(_wrapScreen(const OnboardingVehicleScreen(), provider: onboarding));
    expect(find.text('Verify RC with Parivahan'), findsNothing);
    expect(find.text('Verify Insurance by Policy Number'), findsNothing);
    expect(find.text('Vehicle Model Name *'), findsOneWidget);
    expect(find.text('MARUTI SUZUKI DZIRE TOUR S'), findsOneWidget);
    expect(find.text('2023'), findsOneWidget);
    expect(find.text('WHITE'), findsOneWidget);
    expect(find.text('Pending Review'), findsOneWidget);
    expect(find.textContaining('Digio'), findsNothing);

    // Standalone Parivahan VEHICLE_RC / VEHICLE_INSURANCE must NOT bypass photo uploads
    DigioService.instance.latestByTypeNotifier.value = {
      'VEHICLE_RC': {'verified': true, 'complianceOk': true, 'status': 'VERIFIED'},
      'VEHICLE_INSURANCE': {'verified': true, 'complianceOk': true, 'status': 'VERIFIED'},
    };
    await tester.pump();
    expect(find.text('Verified via Govt RC check — no upload needed'), findsNothing);
    expect(find.text('Insured'), findsNothing);

    // RC directly returned by DigiLocker auto-marks RC Front & Back green
    DigioService.instance.latestByTypeNotifier.value = {
      'DIGILOCKER': {
        'verified': true,
        'summary': {
          'verifiedDocs': {'rc': true},
          'extractedRc': 'TS09AB1234',
        },
      },
    };
    await tester.pump();
    expect(find.text('Verified via DigiLocker — already uploaded'), findsNWidgets(2));
    // Insurance still shows Pending Review (never auto-satisfied)
    expect(find.text('Pending Review'), findsOneWidget);
  });
}
