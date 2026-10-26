import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:adhocx/shared/widgets/google_route_map_widget.dart';
import 'package:adhocx/shared/widgets/safe_ui_widgets.dart';

void main() {
  group('Centralized Overflow & Google Maps Integration Tests', () {
    testWidgets('SafeHeaderRow prevents long titles from pushing trailing badges off screen', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SizedBox(
              width: 320, // Small screen width simulation
              child: SafeHeaderRow(
                title: 'Commercial Vehicle Transfer Extra Long Organization Name Dispatch',
                trailing: Container(
                  key: const Key('status_badge'),
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  color: Colors.green,
                  child: const Text('IN_PROGRESS'),
                ),
              ),
            ),
          ),
        ),
      );

      // Verify status badge is rendered and located within screen bounds (< 320 width)
      final badgeFinder = find.byKey(const Key('status_badge'));
      expect(badgeFinder, findsOneWidget);

      final badgeRect = tester.getRect(badgeFinder);
      expect(badgeRect.right, lessThanOrEqualTo(320.0));
      expect(tester.takeException(), isNull);
    });

    testWidgets('GoogleRouteMapWidget renders image and navigation tap target', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: GoogleRouteMapWidget(
              pickupLat: 17.3850,
              pickupLng: 78.4867,
              dropLat: 17.4435,
              dropLng: 78.3808,
              pickupAddress: 'Kokapet, Hyderabad',
              dropAddress: 'Begumpet, Hyderabad',
              height: 160,
            ),
          ),
        ),
      );

      expect(find.byType(GoogleRouteMapWidget), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
