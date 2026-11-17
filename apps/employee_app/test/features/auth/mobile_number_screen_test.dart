import 'package:adhocx_employee/features/auth/login/mobile_number_screen.dart';
import 'package:adhocx_employee/models/employee_user.dart';
import 'package:adhocx_employee/repositories/employee_auth_repository.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/state/employee_auth_provider.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

class _FakeAuthRepository implements EmployeeAuthRepository {
  final sentTo = <String>[];
  final Object? sendOtpError;

  _FakeAuthRepository({this.sendOtpError});

  @override
  Future<void> sendOtp(String mobileNumber) async {
    if (sendOtpError != null) throw sendOtpError!;
    sentTo.add(mobileNumber);
  }

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

TextEditingValue _apply(String oldText, String newText) =>
    IndianMobileNumberFormatter().formatEditUpdate(
      TextEditingValue(
        text: oldText,
        selection: TextSelection.collapsed(offset: oldText.length),
      ),
      TextEditingValue(
        text: newText,
        selection: TextSelection.collapsed(offset: newText.length),
      ),
    );

void main() {
  group('IndianMobileNumberFormatter', () {
    test('keeps plain typed digits', () {
      expect(_apply('98765', '987654').text, '987654');
    });

    test('normalises pasted / autofilled international formats', () {
      expect(_apply('', '+91 98765 43210').text, '9876543210');
      expect(_apply('', '+919876543210').text, '9876543210');
      expect(_apply('', '0091 98765 43210').text, '9876543210');
      expect(_apply('', '098765-43210').text, '9876543210');
      expect(_apply('', '(987) 654-3210').text, '9876543210');
    });

    test('rejects an 11th digit instead of mangling the number', () {
      expect(_apply('9198765432', '91987654321').text, '9198765432');
    });

    test('a number that itself starts with 91 is not stripped', () {
      expect(_apply('', '9198765432').text, '9198765432');
    });

    test('drops a leading trunk zero', () {
      expect(_apply('', '0').text, '');
    });
  });

  group('MobileNumberScreen', () {
    late _FakeAuthRepository repo;

    Future<void> enterDigits(WidgetTester tester, String digits) async {
      final controller =
          tester.widget<TextField>(find.byType(TextField)).controller!;
      await tester.enterText(
          find.byType(TextField), '${controller.text}$digits');
      await tester.pump();
    }

    Future<void> pumpScreen(
      WidgetTester tester, {
      Object? sendOtpError,
    }) async {
      repo = _FakeAuthRepository(sendOtpError: sendOtpError);
      final router = GoRouter(
        initialLocation: '/',
        routes: [
          GoRoute(path: '/', builder: (_, __) => const MobileNumberScreen()),
          GoRoute(
            path: AppRoutes.otpVerify,
            builder: (_, __) => const Scaffold(body: Text('OTP SCREEN')),
          ),
          GoRoute(
            path: AppRoutes.welcome,
            builder: (_, __) => const Scaffold(body: Text('WELCOME')),
          ),
        ],
      );
      await tester.pumpWidget(
        ChangeNotifierProvider(
          create: (_) => EmployeeAuthProvider(repository: repo),
          child: MaterialApp.router(routerConfig: router),
        ),
      );
      await tester.pumpAndSettle();
    }

    testWidgets('uses the native phone keyboard without an in-app keypad',
        (tester) async {
      await pumpScreen(tester);

      final field = tester.widget<TextField>(find.byType(TextField));
      expect(field.autofocus, isTrue);
      expect(field.readOnly, isFalse);
      expect(field.enableInteractiveSelection, isTrue);
      expect(field.keyboardType, TextInputType.phone);
      expect(find.text('Mobile Number (India) *'), findsOneWidget);
      expect(find.text('🇮🇳'), findsOneWidget);
      expect(
        find.byKey(const ValueKey('employee-keypad-backspace')),
        findsNothing,
      );
    });

    testWidgets('shows an inset prefix divider inside the outlined phone field',
        (tester) async {
      await pumpScreen(tester);

      final field = tester.widget<TextField>(find.byType(TextField));
      expect(field.decoration!.enabledBorder, isA<OutlineInputBorder>());
      expect(
        find.byKey(const ValueKey('employee-phone-prefix-divider')),
        findsOneWidget,
      );
      expect(
        tester.getSize(
          find.byKey(const ValueKey('employee-phone-prefix-divider')),
        ).height,
        18,
      );
      expect(
        tester.getSize(
          find.byKey(const ValueKey('employee-phone-prefix-divider')),
        ).width,
        2,
      );
    });

    testWidgets('native phone keyboard sends OTP for a valid number',
        (tester) async {
      await pumpScreen(tester);

      await enterDigits(tester, '9876543210');
      await tester.tap(find.byType(ElevatedButton));
      await tester.pumpAndSettle();

      expect(repo.sentTo, ['+91 9876543210']);
      expect(find.text('OTP SCREEN'), findsOneWidget);
    });

    testWidgets('native keyboard entry preserves the typed phone number',
        (tester) async {
      await pumpScreen(tester);
      await enterDigits(tester, '73868');

      final controller =
          tester.widget<TextField>(find.byType(TextField)).controller!;
      expect(controller.text, '73868');
    });

    testWidgets('keeps native keyboard input available after a request fails',
        (tester) async {
      await pumpScreen(
        tester,
        sendOtpError: Exception('Authentication service unavailable'),
      );

      await enterDigits(tester, '9876543210');
      await tester.tap(find.byType(ElevatedButton));
      await tester.pumpAndSettle();

      final field = tester.widget<TextField>(find.byType(TextField));
      expect(field.focusNode?.hasFocus, isTrue);
      expect(field.keyboardType, TextInputType.phone);
      expect(
        find.text('Authentication service unavailable'),
        findsOneWidget,
      );
    });

    testWidgets('Send button stays disabled until 10 digits are entered',
        (tester) async {
      await pumpScreen(tester);

      ElevatedButton button() =>
          tester.widget<ElevatedButton>(find.byType(ElevatedButton));

      await enterDigits(tester, '98765');
      expect(button().onPressed, isNull);

      await enterDigits(tester, '43210');
      expect(button().onPressed, isNotNull);
    });

    testWidgets('invalid Indian number is rejected without calling the API',
        (tester) async {
      await pumpScreen(tester);

      await enterDigits(tester, '1234567890');
      await tester.tap(find.byType(ElevatedButton));
      await tester.pump();

      expect(repo.sentTo, isEmpty);
      expect(
          find.textContaining('valid 10-digit Indian mobile'), findsOneWidget);
    });

    testWidgets('phone field and Send button fit a narrow Android viewport',
        (tester) async {
      tester.view.physicalSize = const Size(360, 640);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      await pumpScreen(tester);
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
      expect(
        tester.getBottomLeft(find.byType(ElevatedButton)).dy,
        lessThanOrEqualTo(640),
      );
      expect(find.byType(TextField), findsOneWidget);
      expect(
        find.byKey(const ValueKey('employee-keypad-digit-1')),
        findsNothing,
      );
    });
  });
}
