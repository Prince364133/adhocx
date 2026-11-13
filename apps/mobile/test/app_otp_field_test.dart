import 'package:adhocx/widgets/common/app_otp_field.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _host(Widget child) =>
    MaterialApp(home: Scaffold(body: Padding(padding: const EdgeInsets.all(24), child: child)));

String _digit(WidgetTester tester, int i) =>
    tester.widget<Text>(find.byKey(ValueKey('app-otp-digit-$i'))).data ?? '';

void main() {
  testWidgets('uses one native number field with OTP autofill', (tester) async {
    await tester.pumpWidget(_host(AppOtpField(onCompleted: (_) {})));

    expect(find.byType(TextField), findsOneWidget);
    final field = tester.widget<TextField>(find.byType(TextField));
    expect(field.keyboardType, TextInputType.number);
    expect(field.autofillHints, contains(AutofillHints.oneTimeCode));
  });

  testWidgets('typing digit by digit completes exactly once', (tester) async {
    final completed = <String>[];
    await tester.pumpWidget(_host(AppOtpField(onCompleted: completed.add)));

    var typed = '';
    for (var i = 1; i <= 6; i++) {
      typed += '$i';
      await tester.enterText(find.byType(TextField), typed);
      await tester.pump();
    }
    expect(completed, ['123456']);
    expect(_digit(tester, 5), '6');
  });

  testWidgets('backspace clears the last box (works on soft keyboards)',
      (tester) async {
    final changes = <String>[];
    await tester.pumpWidget(
        _host(AppOtpField(onCompleted: (_) {}, onChanged: changes.add)));

    await tester.enterText(find.byType(TextField), '123');
    await tester.pump();
    await tester.enterText(find.byType(TextField), '12');
    await tester.pump();

    expect(changes.last, '12');
    expect(_digit(tester, 2), '');
  });

  testWidgets('paste / SMS autofill fills all boxes; extra digits ignored',
      (tester) async {
    final completed = <String>[];
    await tester.pumpWidget(
        _host(AppOtpField(length: 4, onCompleted: completed.add)));

    await tester.enterText(find.byType(TextField), '98a76-54');
    await tester.pump();

    expect(completed, ['9876']);
    expect(_digit(tester, 3), '6');
  });
}
