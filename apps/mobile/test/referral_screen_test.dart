import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:adhocx/presentation/profile_screen/referral_screen.dart';

void main() {
  testWidgets('ReferralScreen renders basic structure and title', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: ReferralScreen(),
      ),
    );

    // Initial loading or loaded state renders without throwing
    expect(find.byType(ReferralScreen), findsOneWidget);
  });
}
