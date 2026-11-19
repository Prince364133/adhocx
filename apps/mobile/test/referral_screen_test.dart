import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:adhocx/presentation/profile_screen/referral_screen.dart';

void main() {
  testWidgets('ReferralScreen renders basic structure and verified elements', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: ReferralScreen(),
      ),
    );

    // Initial loading or loaded state renders without throwing
    expect(find.byType(ReferralScreen), findsOneWidget);
  });

  testWidgets('ReferralScreen verifies removal of tiers and dual-sided perks', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: ReferralScreen(),
      ),
    );

    // Verify removed concepts are NOT in the tree
    expect(find.text('Bronze Partner'), findsNothing);
    expect(find.text('Dual-Sided Win-Win Perks'), findsNothing);
    expect(find.text('Dual-Sided Perks'), findsNothing);
  });
}
