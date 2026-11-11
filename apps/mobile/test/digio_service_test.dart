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

  testWidgets('OnboardingDocumentsScreen shows prominent Verify with DigiLocker CTA, routes to Face Verification, and separates Pending Review vs Verified',
      (WidgetTester tester) async {
    final onboarding = OnboardingProvider()..setRole('DRIVER');
    await tester.pumpWidget(_wrapScreen(const OnboardingDocumentsScreen(), provider: onboarding));
    expect(find.text('DigiLocker & Instant KYC'), findsOneWidget);
    expect(find.textContaining('Digio'), findsNothing);
    expect(find.textContaining('Connect DigiLocker or verify Govt IDs'), findsNothing);
    expect(find.text('Verify with DigiLocker'), findsOneWidget);
    expect(find.text('Verify PAN'), findsOneWidget);
    expect(find.text('Verify DL'), findsOneWidget);
    expect(find.text('Driver Profile Photo *'), findsNothing);
    expect(find.text('CONTINUE TO FACE VERIFICATION'), findsOneWidget);

    // Manual document upload displays Pending Review instead of Verified
    onboarding.setDocumentUrl('DRIVING_LICENSE', 'https://cdn.example.com/dl.jpg');
    await tester.pump();
    expect(find.text('Pending Review'), findsOneWidget);

    DigioService.instance.latestByTypeNotifier.value = {
      'PAN': {'verified': true, 'verificationType': 'PAN'},
      'DRIVING_LICENSE': {'verified': true, 'verificationType': 'DRIVING_LICENSE'},
    };
    await tester.pump();
    expect(find.text('PAN Verified'), findsAtLeastNWidgets(2));
    expect(find.text('DL Verified'), findsAtLeastNWidgets(2));
    expect(find.text('Verified via Govt DL check — no upload needed'), findsOneWidget);
    expect(find.text('Verified via PAN check — no upload needed'), findsOneWidget);

    final panBtn = tester.widget<ButtonStyleButton>(
      find.ancestor(
        of: find.text('PAN Verified').first,
        matching: find.bySubtype<ButtonStyleButton>(),
      ).first,
    );
    expect(panBtn.onPressed, isNull);
    final dlBtn = tester.widget<ButtonStyleButton>(
      find.ancestor(
        of: find.text('DL Verified').first,
        matching: find.bySubtype<ButtonStyleButton>(),
      ).first,
    );
    expect(dlBtn.onPressed, isNull);

    // DigiLocker verification auto-marks Aadhaar Front & Back green without manual upload
    DigioService.instance.latestByTypeNotifier.value = {
      'DIGILOCKER': {
        'verified': true,
        'summary': {
          'verifiedDocs': {'aadhaar': true, 'pan': true, 'dl': true},
        },
      },
    };
    await tester.pump();
    expect(find.text('DigiLocker Verified'), findsOneWidget);
    expect(find.text('Verified via DigiLocker — already uploaded'), findsNWidgets(4));
  });

  testWidgets('OnboardingVehicleScreen renders full-width Verify RC with Parivahan CTA, auto-filled vehicle fields, Pending Review, and Policy verification option',
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
    expect(find.text('Verify RC with Parivahan'), findsOneWidget);
    expect(find.text('Vehicle Model Name *'), findsOneWidget);
    expect(find.text('MARUTI SUZUKI DZIRE TOUR S'), findsOneWidget);
    expect(find.text('2023'), findsOneWidget);
    expect(find.text('WHITE'), findsOneWidget);
    expect(find.text('Verify Insurance by Policy Number'), findsOneWidget);
    expect(find.text('Pending Review'), findsOneWidget);
    expect(find.textContaining('Digio'), findsNothing);

    // Open Verify Insurance by Policy Number bottom sheet
    await tester.ensureVisible(find.text('Verify Insurance by Policy Number'));
    await tester.tap(find.text('Verify Insurance by Policy Number'));
    await tester.pumpAndSettle();
    expect(find.byType(BottomSheet), findsOneWidget);
    expect(find.text('Verify Commercial Insurance'), findsOneWidget);
    await tester.tap(find.text('Upload Insurance PDF / Photo Instead'));
    await tester.pumpAndSettle();
    // Document source sheet offers Camera, Gallery, and PDF/File
    expect(find.text('Choose PDF / Document File'), findsOneWidget);
    Navigator.of(tester.element(find.text('Choose PDF / Document File'))).pop();
    await tester.pumpAndSettle();

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
      'VEHICLE_INSURANCE': {
        'verified': true,
        'complianceOk': true,
        'status': 'VERIFIED',
      },
    };
    await tester.pump();
    expect(find.text('RC Verified (Parivahan)'), findsOneWidget);
    expect(find.text('Verified via Govt RC check — no upload needed'), findsNWidgets(2));
    expect(find.text('Insured'), findsOneWidget);
    expect(find.text('Verify Insurance by Policy Number'), findsNothing);
    // Parivahan button is locked once RC is verified & compliant
    final parivahanBtn = tester.widget<ButtonStyleButton>(
      find.ancestor(
        of: find.text('RC Verified (Parivahan)'),
        matching: find.bySubtype<ButtonStyleButton>(),
      ).first,
    );
    expect(parivahanBtn.onPressed, isNull);
  });

  testWidgets('Verify PAN and Verify DL open as modal bottom sheets instead of AlertDialog popups',
      (WidgetTester tester) async {
    await tester.pumpWidget(_wrapScreen(const OnboardingDocumentsScreen()));

    // Open Verify PAN bottom sheet
    await tester.ensureVisible(find.text('Verify PAN'));
    await tester.tap(find.text('Verify PAN'));
    await tester.pumpAndSettle();

    expect(find.byType(BottomSheet), findsOneWidget);
    expect(find.byType(AlertDialog), findsNothing);
    expect(find.text('Verify PAN Instantly'), findsOneWidget);
    expect(find.textContaining('Digio'), findsNothing);
    expect(find.byKey(const Key('pan_verify_input')), findsOneWidget);

    // Invalid PAN shows inline validation error inside sheet
    await tester.enterText(find.byKey(const Key('pan_verify_input')), 'BADPAN');
    await tester.tap(find.byKey(const Key('pan_verify_submit_btn')));
    await tester.pump();
    expect(find.textContaining('valid 10-character PAN'), findsOneWidget);

    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(find.byType(BottomSheet), findsNothing);

    // Open Verify DL bottom sheet
    await tester.ensureVisible(find.text('Verify DL'));
    await tester.tap(find.text('Verify DL'));
    await tester.pumpAndSettle();

    expect(find.byType(BottomSheet), findsOneWidget);
    expect(find.byType(AlertDialog), findsNothing);
    expect(find.text('Verify Driving License'), findsOneWidget);
    expect(find.textContaining('Digio'), findsNothing);
    expect(find.byKey(const Key('dl_verify_input')), findsOneWidget);
    expect(find.byKey(const Key('dl_dob_input')), findsOneWidget);
  });
}
