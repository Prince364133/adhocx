import 'package:adhocx_employee/shared/components/inputs/employee_otp_input.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _host(Widget child, {bool reduceMotion = false}) => MaterialApp(
      home: MediaQuery(
        data: MediaQueryData(disableAnimations: reduceMotion),
        child: Scaffold(body: Center(child: child)),
      ),
    );

String _digitAt(WidgetTester tester, int index) =>
    tester.widget<Text>(find.byKey(ValueKey('otp-digit-$index'))).data ?? '';

void main() {
  testWidgets('uses ONE native number-keyboard field with OTP autofill',
      (tester) async {
    await tester.pumpWidget(_host(EmployeeOtpInput(onCompleted: (_) {})));

    expect(find.byType(TextField), findsOneWidget);
    final field = tester.widget<TextField>(find.byType(TextField));
    expect(field.keyboardType, TextInputType.number);
    expect(field.autofocus, isTrue);
    expect(field.autofillHints, contains(AutofillHints.oneTimeCode));
    // 6 display boxes.
    expect(find.byType(AnimatedScale), findsNWidgets(6));
  });

  testWidgets('typing digit by digit fills the boxes and completes once',
      (tester) async {
    final completed = <String>[];
    await tester.pumpWidget(_host(EmployeeOtpInput(onCompleted: completed.add)));

    var typed = '';
    for (var index = 0; index < 6; index++) {
      typed += '${index + 1}';
      await tester.enterText(find.byType(TextField), typed);
      await tester.pump();
    }

    expect(completed, ['123456']);
    for (var index = 0; index < 6; index++) {
      expect(_digitAt(tester, index), '${index + 1}');
    }
  });

  testWidgets('backspace on the native keyboard clears the previous box',
      (tester) async {
    final changes = <String>[];
    await tester.pumpWidget(_host(EmployeeOtpInput(
      onCompleted: (_) {},
      onChanged: changes.add,
    )));

    await tester.enterText(find.byType(TextField), '123');
    await tester.pump();
    await tester.enterText(find.byType(TextField), '12');
    await tester.pump();

    expect(changes.last, '12');
    expect(_digitAt(tester, 1), '2');
    expect(_digitAt(tester, 2), '');
  });

  testWidgets('pasting / SMS autofill fills every box and completes once',
      (tester) async {
    final completed = <String>[];
    await tester.pumpWidget(_host(EmployeeOtpInput(onCompleted: completed.add)));

    await tester.enterText(find.byType(TextField), '123456');
    await tester.pump();

    expect(completed, ['123456']);
    for (var index = 0; index < 6; index++) {
      expect(_digitAt(tester, index), '${index + 1}');
    }
  });

  testWidgets('non-digits and extra digits are ignored', (tester) async {
    final completed = <String>[];
    await tester.pumpWidget(_host(EmployeeOtpInput(onCompleted: completed.add)));

    await tester.enterText(find.byType(TextField), '12a34-5678');
    await tester.pump();

    expect(completed, ['123456']);
  });

  testWidgets('editing after completion completes again with the new code',
      (tester) async {
    final completed = <String>[];
    await tester.pumpWidget(_host(EmployeeOtpInput(onCompleted: completed.add)));

    await tester.enterText(find.byType(TextField), '123456');
    await tester.pump();
    await tester.enterText(find.byType(TextField), '12345');
    await tester.pump();
    await tester.enterText(find.byType(TextField), '123457');
    await tester.pump();

    expect(completed, ['123456', '123457']);
  });

  testWidgets('fits a narrow 320dp phone without overflowing', (tester) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(_host(
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: EmployeeOtpInput(onCompleted: (_) {}),
      ),
    ));
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
  });

  testWidgets('reduced motion disables the staggered entrance animation',
      (tester) async {
    await tester.pumpWidget(_host(
      EmployeeOtpInput(onCompleted: (_) {}),
      reduceMotion: true,
    ));

    expect(find.byType(AnimatedScale), findsNWidgets(6));
    expect(find.byType(TweenAnimationBuilder<double>), findsNothing);
  });
}
