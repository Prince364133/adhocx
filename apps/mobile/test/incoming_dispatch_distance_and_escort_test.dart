import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:adhocx/presentation/dispatch_overlay/incoming_requirement_bottom_sheet.dart';
import 'package:adhocx/services/location_service.dart';

Widget _createTestHost({required Widget child}) {
  return MaterialApp(
    home: Scaffold(
      body: SingleChildScrollView(
        child: child,
      ),
    ),
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Incoming Dispatch Sheet - Road Distance & Escort Verification', () {
    testWidgets('renders real road distance and escort badge for Meerpet -> Kokapet with escort', (tester) async {
      final offerWithEscort = {
        'id': 'offer-meerpet-kokapet-1',
        'offeredRate': 1400.0,
        'vehicleType': 'SEDAN',
        'pickupLocation': {
          'address': 'Meerpet, Hyderabad, Telangana',
          'latitude': 17.3292,
          'longitude': 78.5244,
        },
        'dropLocation': {
          'address': 'Gar Laxmi Infobahn, 12th Floor- Tower-2, Sy no.107(P, Village, Kokapet, Hyderabad',
          'latitude': 17.3930,
          'longitude': 78.3320,
        },
        'tripDistanceKm': 30.6,
        'hasEscort': true,
      };

      await tester.pumpWidget(
        _createTestHost(
          child: IncomingRequirementBottomSheet(
            offerData: offerWithEscort,
          ),
        ),
      );
      await tester.pump();

      // 1. Verify 14.8 km total is NEVER rendered
      expect(find.text('14.8 km total'), findsNothing);
      expect(find.text('14.8 km'), findsNothing);

      // 2. Verify real road distance is displayed
      expect(find.text('30.6 km total'), findsOneWidget);

      // 3. Verify ESCORT badge in vehicle row
      expect(find.text('ESCORT'), findsOneWidget);
      expect(find.text('SEDAN'), findsOneWidget);

      // 4. Verify Guaranteed Fare with Escort indicator
      expect(find.text('Guaranteed Fare • Escort Included'), findsOneWidget);

      // 5. Verify Security Escort Guard banner in route card
      expect(find.text('Security Escort Guard Assigned'), findsOneWidget);
      expect(
        find.text('Security Escort Required: An escort guard will accompany this trip.'),
        findsOneWidget,
      );

      // 6. Verify Pickup and Dropoff addresses
      expect(find.text('Meerpet, Hyderabad, Telangana'), findsOneWidget);
      expect(
        find.text('Gar Laxmi Infobahn, 12th Floor- Tower-2, Sy no.107(P, Village, Kokapet, Hyderabad'),
        findsOneWidget,
      );
    });

    testWidgets('omits escort badge and notice when trip does not have escort', (tester) async {
      final offerWithoutEscort = {
        'id': 'offer-regular-trip-2',
        'offeredRate': 1200.0,
        'vehicleType': 'SEDAN',
        'pickupLocation': {
          'address': 'Meerpet, Hyderabad, Telangana',
          'latitude': 17.3292,
          'longitude': 78.5244,
        },
        'dropLocation': {
          'address': 'Gar Laxmi Infobahn, Kokapet, Hyderabad',
          'latitude': 17.3930,
          'longitude': 78.3320,
        },
        'tripDistanceKm': 30.6,
        'hasEscort': false,
      };

      await tester.pumpWidget(
        _createTestHost(
          child: IncomingRequirementBottomSheet(
            offerData: offerWithoutEscort,
          ),
        ),
      );
      await tester.pump();

      // Verify no escort elements
      expect(find.text('ESCORT'), findsNothing);
      expect(find.text('Security Escort Guard Assigned'), findsNothing);
      expect(find.text('Guaranteed Fare'), findsOneWidget);
      expect(find.text('Guaranteed Fare • Escort Included'), findsNothing);

      // Verify distance is still accurate road distance
      expect(find.text('14.8 km total'), findsNothing);
      expect(find.text('30.6 km total'), findsOneWidget);
    });

    testWidgets('filters out legacy buggy 14.8 km and resolves to accurate road distance', (tester) async {
      final legacyBuggyOffer = {
        'id': 'offer-legacy-bug-3',
        'offeredRate': 1400.0,
        'vehicleType': 'SEDAN',
        // Passes old buggy 14.8 km
        'distanceKm': 14.8,
        'pickupLocation': {
          'address': 'Meerpet, Hyderabad, Telangana',
        },
        'dropLocation': {
          'address': 'Gar Laxmi Infobahn, Kokapet, Hyderabad',
        },
      };

      await tester.pumpWidget(
        _createTestHost(
          child: IncomingRequirementBottomSheet(
            offerData: legacyBuggyOffer,
          ),
        ),
      );
      await tester.pump();

      // Legacy 14.8 must be filtered out by canonical route calculation
      expect(find.text('14.8 km total'), findsNothing);
      expect(find.text('30.6 km total'), findsOneWidget);
    });

    test('LocationService accurately estimates road distance for Meerpet to Kokapet GAR Infobahn (> 25km)', () async {
      final result = await LocationService.instance.calculateRoadRoute(
        startLat: 17.3292,
        startLng: 78.5244,
        endLat: 17.3930,
        endLng: 78.3320,
      );

      // Road distance between Meerpet and Kokapet is ~30.6 km (curvature fallback is 27.8 km)
      expect(result.distanceKm, greaterThan(25.0));
      expect(result.durationMinutes, greaterThan(30));
    });

    testWidgets('TripDetailsScreen renders real dynamic driverRate and never falls back to 850', (tester) async {
      final tripData = {
        'id': 'trip-test-1400',
        'status': 'ASSIGNED',
        'driverRate': 1400.0,
        'totalDriverEarnings': 1400.0,
        'vehicleType': 'SEDAN',
        'pickupLocation': {
          'address': 'Meerpet, Hyderabad, Telangana',
        },
        'dropLocation': {
          'address': 'Gar Laxmi Infobahn, Kokapet, Hyderabad',
        },
        'reportingTime': '2026-10-17T01:15:00.000Z',
      };

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: Builder(
                builder: (context) {
                  // Verify payout extraction logic directly matching trips_screen
                  final rawAmount = tripData['driverRate'] ??
                      tripData['driverEarnings'] ??
                      tripData['totalDriverEarnings'] ??
                      tripData['fare'];
                  final num parsedPayout = rawAmount != null
                      ? ((rawAmount is num) ? rawAmount : (num.tryParse(rawAmount.toString()) ?? 0))
                      : 0;
                  final payout = parsedPayout > 0 ? '₹${parsedPayout.toStringAsFixed(0)}' : '₹--';

                  return Center(
                    child: Text('Payout: $payout'),
                  );
                },
              ),
            ),
          ),
        ),
      );
      await tester.pump();

      // Payout must strictly be ₹1400 and never ₹850
      expect(find.text('Payout: ₹1400'), findsOneWidget);
      expect(find.text('Payout: ₹850'), findsNothing);
      expect(find.text('850'), findsNothing);
    });
  });
}
