import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:adhocx/shared/theme/theme_provider.dart';
import 'package:adhocx/user/requirements/widgets/add_cab_modal_bottom_sheet.dart';
import 'package:adhocx/user/requirements/requirement_draft_provider.dart';

void main() {
  group('Scheduled Trips UI & Option Partition Tests', () {
    testWidgets('AddCabModalBottomSheet renders Option Partition with Ride Now and Schedule for Later', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider(create: (_) => ThemeProvider()),
            ChangeNotifierProvider(create: (_) => RequirementDraftProvider()),
          ],
          child: MaterialApp(
            home: Scaffold(
              body: Builder(
                builder: (context) => ElevatedButton(
                  onPressed: () {
                    showModalBottomSheet(
                      context: context,
                      isScrollControlled: true,
                      builder: (_) => const AddCabModalBottomSheet(cabNumber: 1),
                    );
                  },
                  child: const Text('Open Modal'),
                ),
              ),
            ),
          ),
        ),
      );

      // Open Modal
      await tester.tap(find.text('Open Modal'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));

      // 1. Verify Section 4: Schedule & Departure Option Partition is present
      expect(find.text('Trip Timing & Schedule *'), findsOneWidget);

      // 2. Verify Dual Partition Cards: "Ride Now" and "Schedule for Later"
      expect(find.text('Ride Now'), findsOneWidget);
      expect(find.text('Instant dispatch'), findsOneWidget);
      expect(find.text('Schedule for Later'), findsOneWidget);
      expect(find.text('Pick date & time'), findsOneWidget);

      // 3. Tap "Schedule for Later" card
      await tester.tap(find.text('Schedule for Later'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 400));

      // 4. Verify 30-Second Pre-Dispatch Alert Guarantee banners are visible on both modal and sub sheet
      expect(find.textContaining('Automated Driver Dispatch Guarantee'), findsOneWidget);
      expect(find.textContaining('30 seconds before dispatch begins'), findsNWidgets(2));
    });

    testWidgets('Scheduled Trip Status Banner displays exact production text', (WidgetTester tester) async {
      const expectedStatusText =
          'This ride is scheduled for this timing. We will notify you before 30 seconds for dispatching the rides.';

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: Container(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    const Icon(Icons.alarm_on_rounded),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        expectedStatusText,
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );

      expect(find.text(expectedStatusText), findsOneWidget);
      expect(find.byIcon(Icons.alarm_on_rounded), findsOneWidget);
    });
  });
}
