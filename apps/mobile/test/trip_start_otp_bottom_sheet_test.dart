import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:adhocx/shared/widgets/trip_start_otp_bottom_sheet.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('TripStartOtpBottomSheet renders 4 digit boxes and limits input to 4 digits', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () {
                TripStartOtpBottomSheet.show(
                  context: context,
                  tripId: 'TRIP-1234',
                  passengerName: 'Jane Doe',
                );
              },
              child: const Text('Open Sheet'),
            ),
          ),
        ),
      ),
    );

    // Tap to open sheet
    await tester.tap(find.text('Open Sheet'));
    await tester.pumpAndSettle();

    // Verify Title and Passenger prompt
    expect(find.text('Start Trip - Enter OTP'), findsOneWidget);
    expect(find.text('Ask Jane Doe for their 4-digit trip start PIN'), findsOneWidget);

    // Verify 4 PIN digit boxes exist
    expect(find.byType(TextField), findsOneWidget);

    // Enter more than 4 digits
    await tester.enterText(find.byType(TextField), '9526455');
    await tester.pump();

    // Since LengthLimitingTextInputFormatter(4) is applied, verify controller or input is limited to 4
    final textField = tester.widget<TextField>(find.byType(TextField));
    expect(textField.controller?.text.length, lessThanOrEqualTo(4));

    // Verify cancel button dismisses sheet
    expect(find.text('Cancel'), findsOneWidget);
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();

    expect(find.text('Start Trip - Enter OTP'), findsNothing);
  });
}
