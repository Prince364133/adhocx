import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:adhocx/core/networking/api_client.dart';
import 'package:adhocx/core/utils/app_toast.dart';
import 'package:adhocx/services/driver_service.dart';
import 'package:adhocx/widgets/aadhaar_consent_sheet.dart';

ApiException _apiError(int status, String code, {Map<String, dynamic>? details}) => ApiException(
      statusCode: status,
      message: 'server message',
      data: {
        'success': false,
        'error': {'code': code, 'message': 'server message', if (details != null) 'details': details},
      },
    );

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('KYC licence fields (no fabricated DL number)', () {
    test('sends nothing when the DL number is unknown', () {
      expect(DriverService.licenseFieldsFor(), isEmpty);
      expect(DriverService.licenseFieldsFor(licenseNumber: '', dlNumber: ''), isEmpty);
      expect(DriverService.licenseFieldsFor(licenseNumber: 'DL-PENDING'), isEmpty);
    });

    test('sends the real DL number (normalised) and expiry only when known', () {
      final f = DriverService.licenseFieldsFor(dlNumber: ' dl0120200012345 ');
      expect(f, {'licenseNumber': 'DL0120200012345', 'dlNumber': 'DL0120200012345'});
      expect(f.containsKey('licenseExpiry'), isFalse);
      final withExpiry = DriverService.licenseFieldsFor(dlNumber: 'DL01', licenseExpiry: DateTime.utc(2030, 1, 2));
      expect(withExpiry['licenseExpiry'], '2030-01-02T00:00:00.000Z');
    });
  });

  group('Aadhaar consent gate', () {
    late int prompts;
    late int grants;
    late int actions;

    setUp(() {
      prompts = 0;
      grants = 0;
      actions = 0;
      DigioService.instance.debugResetConsent();
      DigioService.instance.debugConsentGranter = () async => grants++;
    });
    tearDown(() => DigioService.instance.debugResetConsent());

    test('declining consent never calls the Aadhaar endpoint', () async {
      DigioService.instance.debugConsentStatusLoader = () async => false;
      final out = await DigioService.instance.runWithAadhaarConsent<String>(
        askUser: () async {
          prompts++;
          return false;
        },
        action: () async {
          actions++;
          return 'called';
        },
      );
      expect(out, isNull);
      expect(prompts, 1);
      expect(grants, 0);
      expect(actions, 0);
    });

    test('accepting records consent once, then runs the action', () async {
      DigioService.instance.debugConsentStatusLoader = () async => false;
      final out = await DigioService.instance.runWithAadhaarConsent<String>(
        askUser: () async {
          prompts++;
          return true;
        },
        action: () async {
          actions++;
          return 'ok';
        },
      );
      expect(out, 'ok');
      expect([prompts, grants, actions], [1, 1, 1]);

      // Second Aadhaar action in the same session: no second prompt.
      await DigioService.instance.runWithAadhaarConsent<String>(
        askUser: () async {
          prompts++;
          return true;
        },
        action: () async {
          actions++;
          return 'ok';
        },
      );
      expect([prompts, grants, actions], [1, 1, 2]);
    });

    test('already granted on the server: no prompt', () async {
      DigioService.instance.debugConsentStatusLoader = () async => true;
      await DigioService.instance.runWithAadhaarConsent<void>(
        askUser: () async {
          prompts++;
          return true;
        },
        action: () async => actions++,
      );
      expect([prompts, grants, actions], [0, 0, 1]);
    });

    test('AADHAAR_CONSENT_REQUIRED from the server asks again and retries exactly once', () async {
      var serverHasConsent = true; // client thinks consent exists, server disagrees once
      DigioService.instance.debugConsentStatusLoader = () async => serverHasConsent;
      DigioService.instance.debugConsentGranter = () async {
        grants++;
        serverHasConsent = true;
      };
      final out = await DigioService.instance.runWithAadhaarConsent<String>(
        askUser: () async {
          prompts++;
          return true;
        },
        action: () async {
          actions++;
          if (actions == 1) {
            serverHasConsent = false;
            throw _apiError(400, 'AADHAAR_CONSENT_REQUIRED');
          }
          return 'retried';
        },
      );
      expect(out, 'retried');
      expect([prompts, grants, actions], [1, 1, 2]);
    });

    test('other errors propagate untouched', () async {
      DigioService.instance.debugConsentStatusLoader = () async => true;
      expect(
        DigioService.instance.runWithAadhaarConsent<void>(
          askUser: () async => true,
          action: () async => throw _apiError(502, 'BAD_GATEWAY'),
        ),
        throwsA(isA<ApiException>()),
      );
    });
  });

  group('Digio error messages', () {
    test('429 DIGIO_RATE_LIMITED says when to retry', () {
      final e = _apiError(429, 'DIGIO_RATE_LIMITED', details: {'retryAfterSec': 120});
      expect(DigioService.friendlyErrorMessage(e), 'Too many verification attempts. Please try again in 2 minutes.');
      expect(AppToast.cleanErrorMessage(e), 'Too many verification attempts. Please try again in 2 minutes.');
      expect(
        DigioService.friendlyErrorMessage(_apiError(429, 'DIGIO_RATE_LIMITED', details: {'retryAfterSec': 30})),
        'Too many verification attempts. Please try again in 1 minute.',
      );
      expect(
        DigioService.friendlyErrorMessage(_apiError(429, 'DIGIO_RATE_LIMITED')),
        'Too many verification attempts. Please try again later.',
      );
    });

    test('consent-required and unrelated errors', () {
      expect(DigioService.friendlyErrorMessage(_apiError(400, 'AADHAAR_CONSENT_REQUIRED')), contains('Aadhaar consent'));
      expect(DigioService.friendlyErrorMessage(_apiError(400, 'VALIDATION_ERROR')), isNull);
      expect(DigioService.friendlyErrorMessage(Exception('x')), isNull);
    });
  });

  group('AadhaarConsentSheet', () {
    Future<bool?> openSheet(WidgetTester tester) async {
      bool? result;
      await tester.pumpWidget(MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: Center(
              child: ElevatedButton(
                onPressed: () async => result = await showAadhaarConsentSheet(context),
                child: const Text('open'),
              ),
            ),
          ),
        ),
      ));
      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();
      return result;
    }

    testWidgets('"I agree" stays disabled until the checkbox is ticked', (tester) async {
      await openSheet(tester);
      expect(find.text(AadhaarConsentSheet.title), findsOneWidget);
      final accept = find.byKey(const Key('aadhaar_consent_accept'));
      expect(tester.widget<FilledButton>(accept).onPressed, isNull);
      await tester.tap(find.byKey(const Key('aadhaar_consent_checkbox')));
      await tester.pump();
      expect(tester.widget<FilledButton>(accept).onPressed, isNotNull);
    });

    testWidgets('accept resolves true; decline resolves false', (tester) async {
      bool? result;
      await tester.pumpWidget(MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: Column(children: [
              ElevatedButton(
                onPressed: () async => result = await showAadhaarConsentSheet(context),
                child: const Text('open'),
              ),
            ]),
          ),
        ),
      ));
      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('aadhaar_consent_checkbox')));
      await tester.pump();
      await tester.tap(find.byKey(const Key('aadhaar_consent_accept')));
      await tester.pumpAndSettle();
      expect(result, isTrue);

      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('aadhaar_consent_decline')));
      await tester.pumpAndSettle();
      expect(result, isFalse);
    });
  });
}
