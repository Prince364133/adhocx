import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:adhocx/presentation/15_onboarding_face_verification_screen/onboarding_face_verification_screen.dart';
import 'package:adhocx/services/onboarding_provider.dart';
import 'package:adhocx/theme/app_theme.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('evaluateFaceAlignment', () {
    const frameSize = Size(480, 640);

    test('rejects when no face is present', () {
      final res = evaluateFaceAlignment(faces: const [], imageSize: frameSize);
      expect(res.hasFace, isFalse);
      expect(res.isAligned, isFalse);
      expect(res.guidance, contains('No face detected'));
    });

    test('rejects when multiple faces are present', () {
      final res = evaluateFaceAlignment(
        faces: const [
          FacePoseObservation(boundingBox: Rect.fromLTWH(80, 120, 200, 260)),
          FacePoseObservation(boundingBox: Rect.fromLTWH(200, 120, 200, 260)),
        ],
        imageSize: frameSize,
      );
      expect(res.hasFace, isTrue);
      expect(res.isAligned, isFalse);
      expect(res.guidance, contains('Multiple faces'));
    });

    test('asks user to move closer when face bounding box is too small', () {
      final res = evaluateFaceAlignment(
        faces: const [
          FacePoseObservation(
            boundingBox: Rect.fromLTWH(200, 250, 80, 100),
            headEulerAngleX: 0,
            headEulerAngleY: 0,
            headEulerAngleZ: 0,
          ),
        ],
        imageSize: frameSize,
      );
      expect(res.isAligned, isFalse);
      expect(res.guidance, contains('closer'));
    });

    test('asks user to center face when off-center', () {
      final res = evaluateFaceAlignment(
        faces: const [
          FacePoseObservation(
            boundingBox: Rect.fromLTWH(10, 150, 200, 260),
            headEulerAngleX: 0,
            headEulerAngleY: 0,
            headEulerAngleZ: 0,
          ),
        ],
        imageSize: frameSize,
      );
      expect(res.isAligned, isFalse);
      expect(res.guidance, contains('Center your face'));
    });

    test('asks user to look straight when head is turned', () {
      final res = evaluateFaceAlignment(
        faces: const [
          FacePoseObservation(
            boundingBox: Rect.fromLTWH(130, 160, 220, 280),
            headEulerAngleX: 0,
            headEulerAngleY: 28,
            headEulerAngleZ: 0,
          ),
        ],
        imageSize: frameSize,
      );
      expect(res.isAligned, isFalse);
      expect(res.guidance, contains('Look straight'));
    });

    test('asks user to keep eyes open when blinking or closed', () {
      final res = evaluateFaceAlignment(
        faces: const [
          FacePoseObservation(
            boundingBox: Rect.fromLTWH(130, 160, 220, 280),
            headEulerAngleX: 2,
            headEulerAngleY: -3,
            headEulerAngleZ: 1,
            leftEyeOpenProbability: 0.1,
            rightEyeOpenProbability: 0.9,
          ),
        ],
        imageSize: frameSize,
      );
      expect(res.isAligned, isFalse);
      expect(res.guidance, contains('eyes clearly open'));
    });

    test('marks aligned when single centered straight face has open eyes', () {
      final res = evaluateFaceAlignment(
        faces: const [
          FacePoseObservation(
            boundingBox: Rect.fromLTWH(130, 160, 220, 280),
            headEulerAngleX: 3,
            headEulerAngleY: -4,
            headEulerAngleZ: 2,
            leftEyeOpenProbability: 0.95,
            rightEyeOpenProbability: 0.92,
          ),
        ],
        imageSize: frameSize,
      );
      expect(res.hasFace, isTrue);
      expect(res.isAligned, isTrue);
      expect(res.guidance, contains('Hold steady'));
    });
  });

  testWidgets('OnboardingFaceVerificationScreen renders permission denied and camera unavailable states cleanly',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      ChangeNotifierProvider(
        create: (_) => OnboardingProvider()..setRole('DRIVER'),
        child: MaterialApp(
          theme: AppTheme.lightTheme,
          home: OnboardingFaceVerificationScreen(
            cameraPermissionRequester: () async => false,
            availableCamerasLoader: () async => const [],
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Face Verification'), findsOneWidget);
    expect(find.text('Camera permission is required for live face verification.'), findsOneWidget);
    expect(find.text('Enable Camera & Retry'), findsOneWidget);

    await tester.pumpWidget(
      ChangeNotifierProvider(
        create: (_) => OnboardingProvider()..setRole('DRIVER'),
        child: MaterialApp(
          theme: AppTheme.lightTheme,
          home: OnboardingFaceVerificationScreen(
            key: const ValueKey('no-camera-state'),
            cameraPermissionRequester: () async => true,
            availableCamerasLoader: () async => const [],
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('No camera detected on this device.'), findsOneWidget);
    expect(find.text('Enable Camera & Retry'), findsOneWidget);
  });
}
