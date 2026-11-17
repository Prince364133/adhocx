import 'package:adhocx_employee/features/trips/summary/trip_details_completed_screen.dart';
import 'package:adhocx_employee/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Trip Details does not show the legacy inline rating form',
      (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.lightTheme,
        home: const TripDetailsCompletedScreen(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Rate your driver'), findsNothing);
    expect(find.text('Submit Rating'), findsNothing);
  });
}
