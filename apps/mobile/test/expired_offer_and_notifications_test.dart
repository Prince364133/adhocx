import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:adhocx/presentation/dispatch_overlay/incoming_requirement_bottom_sheet.dart';
import 'package:adhocx/presentation/notifications_screen/notifications_feed_screen.dart';
import 'package:adhocx/presentation/opportunities_screen/opportunity_offer_screen.dart';
import 'package:adhocx/theme/app_colors.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() {
    final messenger = TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
    messenger.setMockMethodCallHandler(
      const MethodChannel('PonnamKarthik/fluttertoast'),
      (MethodCall call) async => true,
    );
    messenger.setMockMethodCallHandler(
      const MethodChannel('plugins.it_nomads.com/flutter_secure_storage'),
      (MethodCall call) async => null,
    );
  });

  setUp(() {
    SharedPreferences.setMockInitialValues(<String, Object>{});
  });

  group('OpportunityOfferScreen expired & active handling', () {
    testWidgets('shows Expired instead of timer and hides ACCEPT/DECLINE when expiresAt is in the past', (tester) async {
      final expiredOffer = <String, dynamic>{
        'id': 'offer-expired-1',
        'offerId': 'offer-expired-1',
        'vehicleType': 'SEDAN',
        'pickupAddress': 'Dundigal, Hyderabad, Telangana',
        'dropAddress': 'Malakpet, Hyderabad, Telangana',
        'rate': '1020.0',
        'tripDistanceKm': 30.75,
        'tripEtaMinutes': 52,
        'expiresInSeconds': '18',
        'expiresAt': DateTime.now().subtract(const Duration(hours: 15)).toIso8601String(),
      };

      await tester.pumpWidget(
        MaterialApp(
          home: OpportunityOfferScreen(offer: expiredOffer),
        ),
      );
      await tester.pump();

      expect(find.text('Expired'), findsOneWidget);
      expect(find.text('Offer status'), findsOneWidget);
      expect(find.text('MIN   SEC'), findsNothing);
      expect(find.text('Offer expires in'), findsNothing);
      expect(find.text('ACCEPT'), findsNothing);
      expect(find.text('DECLINE'), findsNothing);

      await tester.scrollUntilVisible(find.text('GO BACK'), 150, scrollable: find.byType(Scrollable).first);
      expect(find.text('GO BACK'), findsOneWidget);

      // Verifies real notification/offer details replace hardcoded 12.4 km / 28 min / ₹--
      await tester.scrollUntilVisible(find.text('30.8 km'), -150, scrollable: find.byType(Scrollable).first);
      expect(find.text('30.8 km'), findsOneWidget);
      expect(find.text('52 min'), findsOneWidget);
      expect(find.text('₹1020'), findsOneWidget);
      expect(find.text('12.4 km'), findsNothing);
      expect(find.text('28 min'), findsNothing);
    });

    testWidgets('shows Accepted badge instead of timer when offer was already accepted', (tester) async {
      final acceptedOffer = <String, dynamic>{
        'id': 'offer-accepted-1',
        'status': 'ACCEPTED',
        'vehicleType': 'SEDAN',
        'pickupAddress': 'Kokapet, Hyderabad',
        'dropAddress': 'Gachibowli, Hyderabad',
        'offeredRate': 950,
      };

      await tester.pumpWidget(
        MaterialApp(
          home: OpportunityOfferScreen(offer: acceptedOffer),
        ),
      );
      await tester.pump();

      expect(find.text('Accepted'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('GO BACK'), 150, scrollable: find.byType(Scrollable).first);
      expect(find.text('GO BACK'), findsOneWidget);
      expect(find.text('ACCEPT'), findsNothing);
      expect(find.text('DECLINE'), findsNothing);
    });

    testWidgets('transitions live countdown to Expired when timer reaches zero', (tester) async {
      final shortOffer = <String, dynamic>{
        'id': 'offer-live-expiring-1',
        'vehicleType': 'SUV',
        'pickupAddress': 'Madhapur, Hyderabad',
        'dropAddress': 'Shamshabad Airport, Hyderabad',
        'offeredRate': 1850,
        'expiresAt': DateTime.now().add(const Duration(seconds: 2)).toIso8601String(),
      };

      await tester.pumpWidget(
        MaterialApp(
          home: OpportunityOfferScreen(offer: shortOffer),
        ),
      );
      await tester.pump();

      expect(find.text('Offer expires in'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('ACCEPT'), 150, scrollable: find.byType(Scrollable).first);
      expect(find.text('ACCEPT'), findsOneWidget);

      await tester.pump(const Duration(seconds: 3));

      expect(find.text('GO BACK'), findsOneWidget);
      expect(find.text('ACCEPT'), findsNothing);
      await tester.scrollUntilVisible(find.text('Expired'), -150, scrollable: find.byType(Scrollable).first);
      expect(find.text('Expired'), findsOneWidget);
    });
  });

  group('IncomingRequirementBottomSheet expired guard', () {
    testWidgets('shows 0 remaining, OFFER EXPIRED, and disables ACCEPT TRIP when expiresAt is in the past', (tester) async {
      final pastOffer = <String, dynamic>{
        'id': 'offer-sheet-expired-1',
        'offeredRate': 1100,
        'vehicleType': 'SEDAN',
        'pickupAddress': 'Meerpet, Hyderabad',
        'dropAddress': 'Kokapet, Hyderabad',
        'tripDistanceKm': 30.6,
        'expiresInSeconds': '18',
        'expiresAt': DateTime.now().subtract(const Duration(minutes: 5)).toIso8601String(),
      };

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: IncomingRequirementBottomSheet(offerData: pastOffer),
            ),
          ),
        ),
      );
      await tester.pump();

      expect(find.text('0'), findsOneWidget);
      expect(find.text('OFFER EXPIRED'), findsOneWidget);
      expect(find.text('This offer has expired'), findsOneWidget);

      final acceptButton = tester.widget<ElevatedButton>(
        find.ancestor(
          of: find.text('ACCEPT TRIP'),
          matching: find.byType(ElevatedButton),
        ),
      );
      expect(acceptButton.onPressed, isNull);
    });

    testWidgets('overlay acceptance keeps the shared sheet available after a request failure', (tester) async {
      var attempts = 0;
      var accepted = false;
      final offer = <String, dynamic>{
        'id': 'overlay-retry-offer',
        'offeredRate': 1100,
        'vehicleType': 'SEDAN',
        'pickupAddress': 'Meerpet, Hyderabad',
        'dropAddress': 'Kokapet, Hyderabad',
        'expiresInSeconds': '20',
      };

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: IncomingRequirementBottomSheet(
              offerData: offer,
              overlayPresentation: true,
              acceptOffer: (offerId) async {
                expect(offerId, 'overlay-retry-offer');
                attempts++;
                throw Exception('network unavailable');
              },
              onOverlayAccepted: () => accepted = true,
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.tap(find.text('ACCEPT TRIP'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(attempts, 1);
      expect(accepted, isFalse);
      expect(find.text('ACCEPT TRIP'), findsOneWidget);

      final acceptButton = tester.widget<ElevatedButton>(
        find.ancestor(
          of: find.text('ACCEPT TRIP'),
          matching: find.byType(ElevatedButton),
        ),
      );
      expect(acceptButton.onPressed, isNotNull);
    });

    testWidgets('overlay acceptance invokes completion only after a successful request', (tester) async {
      var accepted = false;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: IncomingRequirementBottomSheet(
              offerData: <String, dynamic>{
                'id': 'overlay-success-offer',
                'offeredRate': 1100,
                'vehicleType': 'SEDAN',
                'pickupAddress': 'Meerpet, Hyderabad',
                'dropAddress': 'Kokapet, Hyderabad',
                'expiresInSeconds': '20',
              },
              overlayPresentation: true,
              acceptOffer: (offerId) async {},
              onOverlayAccepted: () => accepted = true,
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.tap(find.text('ACCEPT TRIP'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(accepted, isTrue);
    });
  });

  group('NotificationsFeedScreen delete & clear all', () {
    List<NotificationItem> sampleItems() => [
          const NotificationItem(
            id: 'offer_abc',
            title: 'New Trip Offer Available!',
            body: 'Pickup at Dundigal',
            timestamp: '10m ago',
            icon: Icons.local_offer_rounded,
            color: AppColors.warning,
            routeTarget: '/offers/abc',
          ),
          const NotificationItem(
            id: 'sys_notice_1',
            title: 'System Announcement',
            body: 'Platform maintenance completed.',
            timestamp: '1h ago',
            icon: Icons.campaign_rounded,
            color: AppColors.primary,
            routeTarget: '',
          ),
        ];

    testWidgets('deletes individual notification via delete icon and persists synthetic dismissal', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: NotificationsFeedScreen(initialNotifications: sampleItems()),
        ),
      );
      await tester.pump();

      expect(find.text('New Trip Offer Available!'), findsOneWidget);
      expect(find.text('System Announcement'), findsOneWidget);

      final deleteIcons = find.byTooltip('Delete notification');
      expect(deleteIcons, findsNWidgets(2));

      await tester.tap(deleteIcons.first);
      await tester.pumpAndSettle();

      expect(find.text('New Trip Offer Available!'), findsNothing);
      expect(find.text('System Announcement'), findsOneWidget);

      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getStringList('dismissed_synthetic_notifications'), contains('offer_abc'));
    });

    testWidgets('Clear All removes all notifications after confirmation', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: NotificationsFeedScreen(initialNotifications: sampleItems()),
        ),
      );
      await tester.pump();

      await tester.tap(find.text('Clear All'));
      await tester.pumpAndSettle();

      expect(find.text('Clear All Notifications?'), findsOneWidget);

      // Tap Clear All inside the confirmation dialog
      await tester.tap(find.widgetWithText(TextButton, 'Clear All').last);
      await tester.pumpAndSettle();

      expect(find.text('No notifications yet'), findsOneWidget);
      expect(find.text('New Trip Offer Available!'), findsNothing);
      expect(find.text('System Announcement'), findsNothing);

      final prefs = await SharedPreferences.getInstance();
      final dismissed = prefs.getStringList('dismissed_synthetic_notifications') ?? [];
      expect(dismissed, containsAll(['offer_abc', 'sys_notice_1', 'sys_welcome']));
    });
  });
}
