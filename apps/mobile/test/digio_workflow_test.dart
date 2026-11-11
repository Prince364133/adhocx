import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:adhocx/presentation/11_onboarding_personal_screen/onboarding_personal_screen.dart';
import 'package:adhocx/presentation/12_onboarding_vehicle_screen/onboarding_vehicle_screen.dart';
import 'package:adhocx/presentation/13_onboarding_documents_screen/onboarding_documents_screen.dart';
import 'package:adhocx/presentation/14_onboarding_review_screen/onboarding_review_screen.dart';
import 'package:adhocx/services/auth_provider.dart';
import 'package:adhocx/services/auth_service.dart';
import 'package:adhocx/services/driver_service.dart';
import 'package:adhocx/services/onboarding_provider.dart';
import 'package:adhocx/theme/app_theme.dart';

Widget _wrapWithProviders(Widget child, OnboardingProvider onboarding) {
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

  test('OnboardingProvider persists & resets real DL, PAN, RC identifiers', () {
    final provider = OnboardingProvider();
    provider.setKycIdentifiers(
      dlNumber: 'dl0120200012345',
      panNumber: 'abcde1234f',
      rcNumber: 'dl01ab1234',
    );
    expect(provider.dlNumber, 'DL0120200012345');
    expect(provider.panNumber, 'ABCDE1234F');
    expect(provider.rcNumber, 'DL01AB1234');

    provider.reset();
    expect(provider.dlNumber, '');
    expect(provider.panNumber, '');
    expect(provider.rcNumber, '');
  });

  testWidgets('Vendor OnboardingPersonalScreen no longer displays Corporate GSTIN / Company PAN KYB UI',
      (WidgetTester tester) async {
    final onboarding = OnboardingProvider()..setRole('VENDOR');
    await tester.pumpWidget(_wrapWithProviders(const OnboardingPersonalScreen(), onboarding));
    expect(find.text('Tax & KYB Verification (Optional)'), findsNothing);
    expect(find.text('Verify GSTIN'), findsNothing);
  });

  testWidgets('OnboardingDocumentsScreen updates DigiLocker badges and Sync visibility dynamically',
      (WidgetTester tester) async {
    final onboarding = OnboardingProvider()..setRole('DRIVER');
    await tester.pumpWidget(_wrapWithProviders(const OnboardingDocumentsScreen(), onboarding));

    expect(find.text('Sync DigiLocker'), findsNothing);
    expect(find.text('Verify PAN'), findsNothing);
    expect(find.text('Verify DL'), findsNothing);
    DigioService.instance.activeDigilockerRequestId.value = 'KID_FLUTTER_1';
    // Non-DigiLocker PAN/DL records must NOT auto-mark documents green
    DigioService.instance.latestByTypeNotifier.value = {
      'LIVENESS': {'verified': true},
      'ID_OCR': {'verified': true},
      'PAN': {'verified': true},
      'DRIVING_LICENSE': {'verified': true},
    };
    await tester.pump();

    expect(find.text('Sync DigiLocker'), findsOneWidget);
    expect(find.text('PAN Verified'), findsNothing);
    expect(find.text('DL Verified'), findsNothing);
    expect(find.textContaining('Selfie Liveness Verified'), findsOneWidget);
  });

  testWidgets('OnboardingVehicleScreen & OnboardingReviewScreen only surface DigiLocker-verified readiness pills',
      (WidgetTester tester) async {
    final onboarding = OnboardingProvider()
      ..setRole('DRIVER')
      ..setKycIdentifiers(dlNumber: 'DL0120200012345', rcNumber: 'DL01AB1234')
      ..setVehicleDetails(
        vehicleType: 'SEDAN',
        carModel: 'Maruti Dzire',
        color: 'White',
        registrationNumber: 'DL01AB1234',
      );

    await tester.pumpWidget(_wrapWithProviders(const OnboardingVehicleScreen(), onboarding));
    expect(find.text('Verify RC with Parivahan'), findsNothing);
    expect(find.text('Verify Insurance by Policy Number'), findsNothing);

    DigioService.instance.latestByTypeNotifier.value = {
      'LIVENESS': {'verified': true},
      'AADHAAR_MASK': {'verified': true},
      'DIGILOCKER': {
        'verified': true,
        'summary': {
          'verifiedDocs': {'aadhaar': true, 'dl': true, 'rc': true},
        },
      },
    };

    await tester.pumpWidget(_wrapWithProviders(const OnboardingReviewScreen(), onboarding));
    await tester.pump();
    expect(find.text('✓ Selfie Liveness'), findsOneWidget);
    expect(find.text('✓ Aadhaar'), findsOneWidget);
    expect(find.text('✓ DL'), findsOneWidget);
    expect(find.text('✓ Vehicle RC'), findsOneWidget);
  });
}

