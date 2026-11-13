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

  @override
  Future<void> sendOtp(String mobileNumber) async => sentTo.add(mobileNumber);

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

    Future<void> pumpScreen(WidgetTester tester) async {
      repo = _FakeAuthRepository();
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

    testWidgets('has no in-app dialer pad', (tester) async {
      await pumpScreen(tester);

      expect(find.byIcon(Icons.backspace_outlined), findsNothing);
      for (final key in ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']) {
        expect(find.widgetWithText(TextButton, key), findsNothing);
      }
    });

    testWidgets('opens the native phone keyboard with phone autofill',
        (tester) async {
      await pumpScreen(tester);

      final field = tester.widget<TextField>(find.byType(TextField));
      expect(field.autofocus, isTrue);
      expect(field.keyboardType, TextInputType.phone);
      expect(field.textInputAction, TextInputAction.done);
      expect(field.autofillHints,
          contains(AutofillHints.telephoneNumberNational));
      expect(tester.testTextInput.isVisible, isTrue);
    });

    testWidgets('keyboard "Done" sends the OTP for a valid number',
        (tester) async {
      await pumpScreen(tester);

      await tester.enterText(find.byType(TextField), '+91 98765 43210');
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pumpAndSettle();

      expect(repo.sentTo, ['+91 9876543210']);
      expect(find.text('OTP SCREEN'), findsOneWidget);
    });

    testWidgets('Send button stays disabled until 10 digits are entered',
        (tester) async {
      await pumpScreen(tester);

      ElevatedButton button() =>
          tester.widget<ElevatedButton>(find.byType(ElevatedButton));

      await tester.enterText(find.byType(TextField), '98765');
      await tester.pump();
      expect(button().onPressed, isNull);

      await tester.enterText(find.byType(TextField), '9876543210');
      await tester.pump();
      expect(button().onPressed, isNotNull);
    });

    testWidgets('invalid Indian number is rejected without calling the API',
        (tester) async {
      await pumpScreen(tester);

      await tester.enterText(find.byType(TextField), '1234567890');
      await tester.pump();
      await tester.tap(find.byType(ElevatedButton));
      await tester.pump();

      expect(repo.sentTo, isEmpty);
      expect(find.textContaining('valid 10-digit Indian mobile'),
          findsOneWidget);
    });

    testWidgets('Send button remains visible when the keyboard is open',
        (tester) async {
      tester.view.physicalSize = const Size(360, 640);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);
      await pumpScreen(tester);

      // Simulate a ~300dp native keyboard.
      tester.view.viewInsets = const FakeViewPadding(bottom: 300);
      addTearDown(tester.view.resetViewInsets);
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
      final buttonBottom =
          tester.getBottomLeft(find.byType(ElevatedButton)).dy;
      expect(buttonBottom, lessThanOrEqualTo(640 - 300));
    });
  });
}
