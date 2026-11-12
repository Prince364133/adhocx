import 'package:adhocx_employee/shared/components/inputs/employee_otp_input.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('typing each digit completes the OTP and animates each cell',
      (tester) async {
    String? completedOtp;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: EmployeeOtpInput(onCompleted: (value) => completedOtp = value),
        ),
      ),
    );

    final cells = find.byType(TextField);
    for (var index = 0; index < 6; index++) {
      await tester.enterText(cells.at(index), '${index + 1}');
      await tester.pump();
    }

    expect(completedOtp, '123456');
    expect(find.byType(AnimatedScale), findsNWidgets(6));
    for (var index = 0; index < 6; index++) {
      expect(tester.widget<TextField>(cells.at(index)).controller!.text,
          '${index + 1}');
    }
  });

  testWidgets('pasting an OTP fills the cells and completes once',
      (tester) async {
    final completedValues = <String>[];
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: EmployeeOtpInput(onCompleted: completedValues.add),
        ),
      ),
    );

    await tester.enterText(find.byType(TextField).first, '123456');
    await tester.pump();

    expect(completedValues, ['123456']);
    for (var index = 0; index < 6; index++) {
      expect(
        tester
            .widget<TextField>(find.byType(TextField).at(index))
            .controller!
            .text,
        '${index + 1}',
      );
    }
  });

  testWidgets('OTP cells fit within a compact mobile viewport', (tester) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: Padding(
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: EmployeeOtpInput(onCompleted: _ignoreOtp),
          ),
        ),
      ),
    );

    expect(tester.takeException(), isNull);
    final inputBounds = tester.getRect(find.byType(EmployeeOtpInput));
    expect(inputBounds.left, greaterThanOrEqualTo(0));
    expect(inputBounds.right, lessThanOrEqualTo(320));
  });

  testWidgets('reduced motion disables the staggered entrance animation',
      (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: MediaQuery(
          data: MediaQueryData(disableAnimations: true),
          child: Scaffold(
            body: EmployeeOtpInput(onCompleted: _ignoreOtp),
          ),
        ),
      ),
    );

    expect(find.byType(AnimatedScale), findsNWidgets(6));
    expect(find.byType(TweenAnimationBuilder<double>), findsNothing);
  });
}

void _ignoreOtp(String value) {}
