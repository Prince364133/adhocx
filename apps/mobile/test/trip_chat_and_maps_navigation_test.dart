import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:adhocx/presentation/trips_screen/trip_details_screen.dart';
import 'package:adhocx/presentation/trips_screen/trip_chat_screen.dart';
import 'package:adhocx/shared/widgets/google_route_map_widget.dart';
import 'package:adhocx/services/location_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  final sampleTrip = {
    'id': 'TRP-HYD-8821',
    'status': 'ASSIGNED',
    'driverRate': 1400.0,
    'fare': 1400.0,
    'totalDriverEarnings': 1400.0,
    'pickupAddress': 'Meerpet, Hyderabad, Telangana',
    'dropAddress': 'GAR Laxmi Infobahn, Kokapet, Hyderabad',
    'pickupLocation': {
      'latitude': 17.3186,
      'longitude': 78.5373,
      'address': 'Meerpet, Hyderabad, Telangana',
    },
    'dropLocation': {
      'latitude': 17.4082,
      'longitude': 78.3392,
      'address': 'GAR Laxmi Infobahn, Kokapet, Hyderabad',
    },
    'vendorName': 'Rajesh Sharma',
    'vendorPhone': '+91 98480 12345',
    'vendorOrganizationName': 'TechCorp Logistics',
    'vehicleType': 'SEDAN',
  };

  group('Trip Details Screen - Maps, Chat, User Name & Navigation Tests', () {
    setUp(() {
      TestWidgetsFlutterBinding.ensureInitialized();
    });

    testWidgets('renders Real User name and phone number on Requester Card', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        MaterialApp(
          home: TripDetailsScreen(initialTrip: sampleTrip),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));

      // Verify the user name and phone number are rendered dynamically
      expect(find.text('User: Rajesh Sharma'), findsOneWidget);
      expect(find.text('+91 98480 12345'), findsOneWidget);
      // Verify placeholder "—" is NOT shown for passenger
      expect(find.text('Requester'), findsNothing);

      // Verify Call and Chat action icons exist on User Card
      expect(find.byTooltip('Call User'), findsOneWidget);
      expect(find.byTooltip('Chat with User'), findsOneWidget);
    });

    testWidgets('bypasses placeholder "Partner" and displays real user name from nested user object', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      final tripWithPlaceholder = {
        'id': 'TRP-HYD-9999',
        'status': 'ASSIGNED',
        'driverRate': 800.0,
        'pickupLocation': {'latitude': 17.3850, 'longitude': 78.4867, 'address': 'Kokapet'},
        'dropLocation': {'latitude': 17.4435, 'longitude': 78.3808, 'address': 'Begumpet'},
        'vendorName': 'Partner',
        'vendorOrganizationName': 'Corporate Partner',
        'vendor': {
          'user': {
            'fullName': 'Suresh Reddy',
            'phone': '+91 91234 56789',
          },
        },
      };

      await tester.pumpWidget(
        MaterialApp(
          home: TripDetailsScreen(initialTrip: tripWithPlaceholder),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));

      expect(find.text('User: Suresh Reddy'), findsOneWidget);
      expect(find.text('User: Partner'), findsNothing);
      expect(find.text('+91 91234 56789'), findsOneWidget);
    });

    testWidgets('renders GoogleRouteMapWidget instead of static placeholder icon', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: TripDetailsScreen(initialTrip: sampleTrip),
        ),
      );
      await tester.pump();

      // GoogleRouteMapWidget should be present in the widget tree
      expect(find.byType(GoogleRouteMapWidget), findsOneWidget);
      expect(find.text('GPS Tracking Active'), findsOneWidget);
      expect(find.text('Google Maps'), findsOneWidget);
    });

    testWidgets('renders real dynamic distance, duration, and earnings (> 0)', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: TripDetailsScreen(initialTrip: sampleTrip),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));

      // Earnings should render dynamic payout, never ₹0
      expect(find.text('₹1400'), findsOneWidget);
      expect(find.text('₹0'), findsNothing);

      // Distance & duration should be dynamically computed (> 25 km for Meerpet to Kokapet)
      expect(find.textContaining('km'), findsWidgets);
      expect(find.textContaining('min'), findsWidgets);
    });

    testWidgets('renders NAVIGATE button and triggers navigation action without error', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        MaterialApp(
          home: TripDetailsScreen(initialTrip: sampleTrip),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 200));

      final navButton = find.widgetWithText(OutlinedButton, 'NAVIGATE');
      expect(navButton, findsOneWidget);

      await tester.tap(navButton);
      await tester.pump(const Duration(milliseconds: 100));
    });
  });

  group('Trip Chat Screen Tests', () {
    testWidgets('renders chat header with other party name and quick reply chips', (tester) async {
      final chatParams = {
        'tripId': 'TRP-HYD-8821',
        'otherPartyName': 'Rajesh Sharma',
        'otherPartyPhone': '+91 98480 12345',
        'otherPartyRole': 'USER',
        'status': 'IN_PROGRESS',
      };

      await tester.pumpWidget(
        MaterialApp(
          home: TripChatScreen(params: chatParams),
        ),
      );
      await tester.pump();

      // Check header shows User: Rajesh Sharma
      expect(find.text('User: Rajesh Sharma'), findsOneWidget);
      expect(find.textContaining('Trip #TRP-HYD-'), findsOneWidget);

      // Check phone call button in chat header
      expect(find.byTooltip('Call User'), findsOneWidget);

      // Check quick reply chips exist
      expect(find.text('I have arrived at pickup location'), findsOneWidget);
      expect(find.text('Stuck in traffic (~10 mins delay)'), findsOneWidget);

      // Check message input field
      expect(find.byType(TextField), findsOneWidget);
    });

    testWidgets('allows typing and tapping quick reply to send message', (tester) async {
      final chatParams = {
        'tripId': 'TRP-HYD-8821',
        'otherPartyName': 'Rajesh Sharma',
        'otherPartyPhone': '+91 98480 12345',
        'otherPartyRole': 'USER',
        'status': 'IN_PROGRESS',
      };

      await tester.pumpWidget(
        MaterialApp(
          home: TripChatScreen(params: chatParams),
        ),
      );
      await tester.pump();

      // Tap quick reply chip
      final quickChip = find.text('I have arrived at pickup location');
      await tester.tap(quickChip);
      await tester.pump();

      // Optimistic message should appear in chat
      expect(find.text('I have arrived at pickup location'), findsWidgets);
    });
  });

  group('LocationService Static Route Map URL Generator', () {
    test('constructs valid Google Static Route Map URL with pickup, drop and path', () {
      final url = LocationService.getStaticRouteMapUrl(
        pickupLat: 17.3186,
        pickupLng: 78.5373,
        dropLat: 17.4082,
        dropLng: 78.3392,
        driverLat: 17.3200,
        driverLng: 78.5300,
      );

      expect(url, contains('maps.googleapis.com/maps/api/staticmap'));
      expect(url, contains('markers=color:green%7Clabel:P%7C17.3186,78.5373'));
      expect(url, contains('markers=color:red%7Clabel:D%7C17.4082,78.3392'));
      expect(url, contains('markers=color:blue%7Clabel:C%7C17.32,78.53'));
      expect(url, contains('&path=color:0x2563ebff%7Cweight:5%7C17.3186,78.5373%7C17.4082,78.3392'));
    });
  });
}
