import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:adhocx/services/driver_service.dart';
import 'package:adhocx/user/requirements/models/cab_cart_item.dart';
import 'package:adhocx/user/requirements/requirement_draft_provider.dart';
import 'package:adhocx/user/requirements/user_create_requirement_step2_screen.dart';
import 'package:adhocx/user/requirements/widgets/select_route_sub_bottom_sheet.dart';

CabCartItem _cab({String? quoteId, DateTime? expires, bool pickupOffice = false, bool dropOffice = false}) => CabCartItem(
      id: 'c1',
      vehicleType: 'SEDAN',
      vehicleLabel: 'Prime Sedan',
      passengers: 4,
      pickupAddress: 'Mindspace IT Park, Madhapur, Hyderabad',
      pickupLat: 17.4411,
      pickupLng: 78.3789,
      pickupIsOffice: pickupOffice,
      pickupInstructions: 'Gate 2',
      dropAddress: 'Kukatpally, Hyderabad',
      dropLat: 17.4948,
      dropLng: 78.3996,
      dropIsOffice: dropOffice,
      dropInstructions: 'Near metro',
      pickupDate: '2026-11-10',
      pickupTime: '09:00 AM',
      reportingDateTime: DateTime(2026, 11, 10, 9),
      estimatedFare: 650,
      quoteId: quoteId,
      quoteExpiresAt: expires,
    );

void main() {
  group('CabCartItem (no office hubs, server quotes)', () {
    test('notes carry instructions and the optional office labels', () {
      final notes = _cab(pickupOffice: true).buildFormattedNotes(batchId: 'B1', groupName: 'Shift', cabIndex: 1, totalCabs: 2);
      expect(notes, contains('[Batch: B1 | Group: Shift | Cab: 1/2]'));
      expect(notes, contains('Pickup: Office'));
      expect(notes, isNot(contains('Drop: Office')));
      expect(CabCartItem.parsePickupGuide(notes), 'Gate 2');
      expect(CabCartItem.parseDropGuide(notes), 'Near metro');
      expect(CabCartItem.parsePickupIsOffice(notes), isTrue);
      expect(CabCartItem.parseDropIsOffice(notes), isFalse);
    });

    test('notes written by older builds still map to office labels', () {
      expect(CabCartItem.parseDropIsOffice('Route: Home → Office | Passengers: 4'), isTrue);
      expect(CabCartItem.parsePickupIsOffice('Route: Office → Home'), isTrue);
    });

    test('templates saved with a direction load as office labels, without a quote', () {
      final json = _cab(quoteId: 'q1').toJson()
        ..remove('pickupIsOffice')
        ..['direction'] = 'INBOUND_TO_OFFICE';
      expect(json.containsKey('quoteId'), isFalse);
      final item = CabCartItem.fromJson(json);
      expect(item.dropIsOffice, isTrue);
      expect(item.pickupIsOffice, isFalse);
      expect(item.quoteId, isNull);
      expect(item.hasValidQuote, isFalse);
    });

    test('a quote is usable only until it expires; copies for another date are re-priced', () {
      expect(_cab(quoteId: 'q1', expires: DateTime.now().add(const Duration(minutes: 10))).hasValidQuote, isTrue);
      expect(_cab(quoteId: 'q1', expires: DateTime.now().subtract(const Duration(minutes: 1))).hasValidQuote, isFalse);
      final copy = _cab(quoteId: 'q1', expires: DateTime.now().add(const Duration(minutes: 10))).copyForDate(DateTime(2026, 11, 12));
      expect(copy.quoteId, isNull);
      expect(copy.hasValidQuote, isFalse);
    });

    test('route summary shows the office label', () {
      expect(_cab(dropOffice: true).routeSummary, 'Mindspace IT Park → Kukatpally (Office)');
    });

    test('pickup and drop cannot both be marked as office', () {
      final constructed = _cab(pickupOffice: true, dropOffice: true);
      expect(constructed.pickupIsOffice, isTrue);
      expect(constructed.dropIsOffice, isFalse);

      final switchedToDrop = constructed.copyWith(dropIsOffice: true);
      expect(switchedToDrop.pickupIsOffice, isFalse);
      expect(switchedToDrop.dropIsOffice, isTrue);

      final switchedToPickup = switchedToDrop.copyWith(pickupIsOffice: true);
      expect(switchedToPickup.pickupIsOffice, isTrue);
      expect(switchedToPickup.dropIsOffice, isFalse);

      final fromJson = CabCartItem.fromJson({
        ..._cab().toJson(),
        'pickupIsOffice': true,
        'dropIsOffice': true,
      });
      expect(fromJson.pickupIsOffice && fromJson.dropIsOffice, isFalse);

      expect(CabCartItem.parsePickupIsOffice('Pickup: Office | Drop: Office'), isTrue);
      expect(CabCartItem.parseDropIsOffice('Pickup: Office | Drop: Office'), isFalse);

      final draft = RequirementDraftProvider();
      draft.setOfficeLabels(pickupIsOffice: true);
      expect(draft.pickupIsOffice, isTrue);
      expect(draft.dropIsOffice, isFalse);
      draft.setOfficeLabels(dropIsOffice: true);
      expect(draft.pickupIsOffice, isFalse);
      expect(draft.dropIsOffice, isTrue);
      draft.setOfficeLabels(pickupIsOffice: true, dropIsOffice: true);
      expect(draft.pickupIsOffice && draft.dropIsOffice, isFalse);
    });
  });

  group('Driver payout display', () {
    test('uses the driver amount from the pricing snapshot', () {
      expect(DriverService.resolveDriverPayout({'pricingSnapshot': {'driverPayoutPaise': 78000}, 'ratePerVehicle': 950}), 780);
    });

    test('never derives a payout from the vendor rate', () {
      expect(DriverService.resolveDriverPayout({'ratePerVehicle': 1000, 'totalAmount': 1000}), 0);
      expect(DriverService.resolveDriverPayout({'requirement': {'ratePerVehicle': 900}}), 0);
    });
  });

  group('SelectRouteSubBottomSheet', () {
    Future<void> pump(WidgetTester tester, Widget sheet) async {
      tester.view.physicalSize = const Size(390 * 3.0, 844 * 3.0);
      tester.view.devicePixelRatio = 3.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(MaterialApp(home: Scaffold(body: sheet)));
      await tester.pump();
    }

    testWidgets('any pickup and drop; no hub list; confirm needs both points', (tester) async {
      await pump(tester, const SelectRouteSubBottomSheet());
      expect(find.text('Choose pickup location'), findsOneWidget);
      expect(find.text('Choose drop location'), findsOneWidget);
      expect(find.textContaining('HITEC'), findsNothing);
      expect(find.textContaining('Kokapet'), findsNothing);
      final button = tester.widget<ElevatedButton>(find.widgetWithText(ElevatedButton, 'Use this route'));
      expect(button.onPressed, isNull);
    });

    testWidgets('at most one point can be marked as office', (tester) async {
      Map<String, dynamic>? confirmed;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => TextButton(
                onPressed: () async {
                  confirmed = await showModalBottomSheet<Map<String, dynamic>>(
                    context: context,
                    isScrollControlled: true,
                    builder: (_) => const SelectRouteSubBottomSheet(
                      initialPickupAddress: 'Home, Kukatpally',
                      initialPickupLat: 17.49,
                      initialPickupLng: 78.39,
                      initialDropAddress: 'Mindspace, Madhapur',
                      initialDropLat: 17.44,
                      initialDropLng: 78.37,
                    ),
                  );
                },
                child: const Text('Open'),
              ),
            ),
          ),
        ),
      );
      tester.view.physicalSize = const Size(390 * 3.0, 844 * 3.0);
      tester.view.devicePixelRatio = 3.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();

      expect(find.text('Mark as office'), findsNWidgets(2));

      // Mark pickup as office
      await tester.tap(find.text('Mark as office').first);
      await tester.pump();
      expect(find.text('Office'), findsOneWidget);
      expect(find.text('Mark as office'), findsOneWidget);

      // Marking drop as office clears pickup's office mark
      await tester.tap(find.text('Mark as office').first);
      await tester.pump();
      expect(find.text('Office'), findsOneWidget);
      expect(find.text('Mark as office'), findsOneWidget);

      await tester.tap(find.text('Use this route'));
      await tester.pumpAndSettle();
      expect(confirmed, isNotNull);
      expect(confirmed!['pickupIsOffice'], isFalse);
      expect(confirmed!['dropIsOffice'], isTrue);
    });

    testWidgets('initializes with at most one office even if both flags passed', (tester) async {
      await pump(
        tester,
        const SelectRouteSubBottomSheet(
          initialPickupAddress: 'Home, Kukatpally',
          initialPickupLat: 17.49,
          initialPickupLng: 78.39,
          initialPickupIsOffice: true,
          initialDropAddress: 'Mindspace, Madhapur',
          initialDropLat: 17.44,
          initialDropLng: 78.37,
          initialDropIsOffice: true,
        ),
      );
      expect(find.text('Office'), findsOneWidget);
      expect(find.text('Mark as office'), findsOneWidget);

      // Tapping the active Office chip unmarks it so neither is office
      await tester.tap(find.text('Office'));
      await tester.pump();
      expect(find.text('Office'), findsNothing);
      expect(find.text('Mark as office'), findsNWidgets(2));
    });
  });

  group('UserCreateRequirementStep2Screen office toggle', () {
    testWidgets('marking both pickup and drop as office is prevented', (tester) async {
      tester.view.physicalSize = const Size(600 * 3.0, 844 * 3.0);
      tester.view.devicePixelRatio = 3.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final draft = RequirementDraftProvider();
      await tester.pumpWidget(
        ChangeNotifierProvider<RequirementDraftProvider>.value(
          value: draft,
          child: const MaterialApp(home: UserCreateRequirementStep2Screen()),
        ),
      );
      await tester.pump();

      expect(find.text('Mention as Office'), findsNWidgets(2));
      await tester.tap(find.text('Mention as Office').first);
      await tester.pump();
      expect(draft.pickupIsOffice, isTrue);
      expect(draft.dropIsOffice, isFalse);
      expect(find.text('Office'), findsOneWidget);

      await tester.tap(find.text('Mention as Office').first);
      await tester.pump();
      expect(draft.pickupIsOffice, isFalse);
      expect(draft.dropIsOffice, isTrue);
      expect(find.text('Office'), findsOneWidget);
    });
  });
}
