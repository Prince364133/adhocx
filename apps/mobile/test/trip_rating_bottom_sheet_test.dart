import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:adhocx/shared/widgets/trip_rating_bottom_sheet.dart';

Widget _host({required bool mandatory}) {
  return MaterialApp(
    home: Builder(
      builder: (context) => Scaffold(
        body: Center(
          child: ElevatedButton(
            onPressed: () => TripRatingBottomSheet.show(
              context: context,
              tripId: 'trip-1',
              targetName: 'Aarav Sharma',
              isMandatory: mandatory,
            ),
            child: const Text('open'),
          ),
        ),
      ),
    ),
  );
}

void main() {
  testWidgets('mandatory sheet cannot be dismissed by tapping outside or system back', (tester) async {
    await tester.pumpWidget(_host(mandatory: true));
    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();
    expect(find.byType(TripRatingBottomSheet), findsOneWidget);
    expect(find.text('Skip for now'), findsNothing);

    // Tap the modal barrier (top of screen, outside the sheet)
    await tester.tapAt(const Offset(10, 10));
    await tester.pumpAndSettle();
    expect(find.byType(TripRatingBottomSheet), findsOneWidget);

    // System back
    final popped = await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(popped, isTrue); // handled (blocked) by PopScope
    expect(find.byType(TripRatingBottomSheet), findsOneWidget);
  });

  testWidgets('optional sheet (default, e.g. driver rating passenger) can be skipped', (tester) async {
    await tester.pumpWidget(_host(mandatory: false));
    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();
    expect(find.text('Skip for now'), findsOneWidget);

    await tester.tapAt(const Offset(10, 10));
    await tester.pumpAndSettle();
    expect(find.byType(TripRatingBottomSheet), findsNothing);
  });

  test('show() defaults to optional so only the review gate locks the sheet', () {
    const sheet = TripRatingBottomSheet(tripId: 't', targetName: 'x');
    expect(sheet.isMandatory, isFalse);
  });
}
