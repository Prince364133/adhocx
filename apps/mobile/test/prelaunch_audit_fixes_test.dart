import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:adhocx/shared/widgets/google_route_map_widget.dart';
import 'package:adhocx/presentation/profile_screen/modals/about_modal.dart';
import 'package:adhocx/presentation/profile_screen/modals/privacy_modal.dart';
import 'package:adhocx/presentation/profile_screen/modals/terms_modal.dart';
import 'package:adhocx/presentation/profile_screen/modals/rate_card_modal.dart';

void main() {
  group('Driver rate card shows admin peak windows', () {
    test('formats peak windows in IST', () {
      expect(
        RateCardModal.peakWindowsLabel([
          {'start': '08:00', 'end': '11:00'},
          {'start': '17:00', 'end': '21:00'},
        ]),
        '08:00–11:00, 17:00–21:00 IST',
      );
      expect(RateCardModal.peakWindowsLabel(null), isNull);
      expect(RateCardModal.peakWindowsLabel(<dynamic>[]), isNull);
    });
  });

  group('Driver navigation to vendor pins', () {
    test('routes through the pickup pin to the drop pin', () {
      final uri = GoogleRouteMapWidget.directionsUri(pickupLat: 17.1, pickupLng: 78.1, dropLat: 17.2, dropLng: 78.2)!;
      expect(uri.queryParameters['destination'], '17.2,78.2');
      expect(uri.queryParameters['waypoints'], '17.1,78.1');
    });

    test('never invents a point when a pin is missing', () {
      final onlyPickup = GoogleRouteMapWidget.directionsUri(pickupLat: 17.1, pickupLng: 78.1, dropLat: 0, dropLng: 0)!;
      expect(onlyPickup.queryParameters['destination'], '17.1,78.1');
      expect(onlyPickup.queryParameters.containsKey('waypoints'), isFalse);
      expect(GoogleRouteMapWidget.directionsUri(pickupLat: 0, pickupLng: 0, dropLat: 0, dropLng: 0), isNull);
    });
  });

  group('Legal content per audience', () {
    Future<void> pump(WidgetTester tester, Widget child) => tester.pumpWidget(
          MaterialApp(home: Scaffold(body: SingleChildScrollView(child: child))),
        );

    testWidgets('vendor terms are booking terms, not driver terms', (tester) async {
      await pump(tester, const TermsModal(forVendor: true));
      expect(find.text('Bookings & Fares'), findsOneWidget);
      expect(find.text('Exact Pickup & Drop Points'), findsOneWidget);
      expect(find.text('Vehicle Compliance'), findsNothing);
      expect(find.text('Driver Conduct'), findsNothing);
      expect(find.text(kAdhocxOperatorStatement), findsOneWidget);
    });

    testWidgets('driver terms keep driver sections and no hard-coded withdrawal minimum', (tester) async {
      await pump(tester, const TermsModal());
      expect(find.text('Vehicle Compliance'), findsOneWidget);
      expect(find.textContaining('₹100'), findsNothing);
    });

    testWidgets('vendor privacy does not describe driver GPS tracking', (tester) async {
      await pump(tester, const PrivacyModal(forVendor: true));
      expect(find.text('What We Collect'), findsOneWidget);
      expect(find.textContaining('While you are online'), findsNothing);
    });

    testWidgets('about modal carries the exact operator statement', (tester) async {
      await pump(tester, const AboutModal());
      expect(kAdhocxOperatorStatement, 'AdhocX is operated by Estemporaneo Technologies Private Limited.');
      expect(find.text(kAdhocxOperatorStatement), findsWidgets);
    });
  });
}
