import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:adhocx/presentation/location_picker/universal_location_picker_screen.dart';
import 'package:adhocx/user/requirements/utils/office_hub_detector.dart';
import 'package:adhocx/user/requirements/widgets/select_route_sub_bottom_sheet.dart';

void main() {
  group('Office Hub Validation & Driver Guidance Widget Tests', () {
    testWidgets('SelectRouteSubBottomSheet renders direction-aware guidance fields (Outbound)', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      Map<String, dynamic>? returnedResult;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () async {
                  final res = await showModalBottomSheet<Map<String, dynamic>>(
                    context: context,
                    isScrollControlled: true,
                    builder: (_) => const SelectRouteSubBottomSheet(
                      initialDirection: 'OUTBOUND_FROM_OFFICE',
                      initialOfficeHubId: OfficeHubDetector.hitecId,
                      initialOfficeAddress: 'Cyber Towers, HITEC City, Hyderabad',
                      initialOfficeLat: 17.4504,
                      initialOfficeLng: 78.3808,
                      initialLocality: {
                        'id': 'LOC_MALAKPET',
                        'name': 'Malakpet',
                        'lat': 17.3753,
                        'lng': 78.4983,
                      },
                      initialPickupInstructions: 'Gate 2 Main Lobby',
                      initialDropInstructions: 'Flat 402, beside SBI ATM',
                    ),
                  );
                  returnedResult = res;
                },
                child: const Text('Open Route Sheet'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open Route Sheet'));
      await tester.pumpAndSettle();

      // Check that bottom sheet is visible
      expect(find.byType(SelectRouteSubBottomSheet), findsOneWidget);

      // Verify that guidance/landmark fields are removed from SelectRouteSubBottomSheet:
      expect(find.text('Office Gate / Tower / Lobby Guidance'), findsNothing);
      expect(find.text('Home Flat / Colony Landmark Guidance'), findsNothing);

      // Tap confirm button
      await tester.tap(find.text('Confirm Route Locations'));
      await tester.pumpAndSettle();

      // Verify returned payload
      expect(returnedResult, isNotNull);
      expect(returnedResult!['direction'], equals('OUTBOUND_FROM_OFFICE'));
      expect(returnedResult!['officeHubId'], equals(OfficeHubDetector.hitecId));
      expect(returnedResult!['pickupInstructions'], equals('Gate 2 Main Lobby'));
      expect(returnedResult!['dropInstructions'], equals('Flat 402, beside SBI ATM'));
      expect(returnedResult!['officeGuidance'], equals('Gate 2 Main Lobby'));
      expect(returnedResult!['homeGuidance'], equals('Flat 402, beside SBI ATM'));
    });

    testWidgets('SelectRouteSubBottomSheet renders direction-aware guidance fields (Inbound)', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      Map<String, dynamic>? returnedResult;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () async {
                  final res = await showModalBottomSheet<Map<String, dynamic>>(
                    context: context,
                    isScrollControlled: true,
                    builder: (_) => const SelectRouteSubBottomSheet(
                      initialDirection: 'INBOUND_TO_OFFICE',
                      initialOfficeHubId: OfficeHubDetector.kokapetId,
                      initialOfficeAddress: 'GAR Infobahn Tower 1, Kokapet',
                      initialOfficeLat: 17.3850,
                      initialOfficeLng: 78.3245,
                      initialLocality: {
                        'id': 'LOC_DILSUKHNAGAR',
                        'name': 'Dilsukhnagar',
                        'lat': 17.3688,
                        'lng': 78.5247,
                      },
                      initialPickupInstructions: 'Near Metro Pillar 1400',
                      initialDropInstructions: 'Building 12, Basement B1',
                    ),
                  );
                  returnedResult = res;
                },
                child: const Text('Open Inbound Route Sheet'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open Inbound Route Sheet'));
      await tester.pumpAndSettle();

      expect(find.byType(SelectRouteSubBottomSheet), findsOneWidget);

      // Verify that guidance/landmark fields are removed from SelectRouteSubBottomSheet:
      expect(find.text('Home Flat / Colony Landmark Guidance'), findsNothing);
      expect(find.text('Office Gate / Tower / Lobby Guidance'), findsNothing);

      // Tap confirm button
      await tester.tap(find.text('Confirm Route Locations'));
      await tester.pumpAndSettle();

      expect(returnedResult, isNotNull);
      expect(returnedResult!['direction'], equals('INBOUND_TO_OFFICE'));
      expect(returnedResult!['officeHubId'], equals(OfficeHubDetector.kokapetId));
      expect(returnedResult!['pickupInstructions'], equals('Near Metro Pillar 1400'));
      expect(returnedResult!['dropInstructions'], equals('Building 12, Basement B1'));
      expect(returnedResult!['officeGuidance'], equals('Building 12, Basement B1'));
      expect(returnedResult!['homeGuidance'], equals('Near Metro Pillar 1400'));
    });

    testWidgets('UniversalLocationPickerScreen displays corporate banner when officeHubOnly is true', (WidgetTester tester) async {
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        const MaterialApp(
          home: UniversalLocationPickerScreen(
            title: 'Search Corporate Office Building',
            officeHubOnly: true,
            initialAddress: 'Cyber Towers, HITEC City',
            initialLat: 17.4504,
            initialLng: 78.3808,
          ),
        ),
      );

      await tester.pump();

      // Check header title
      expect(find.text('Search Corporate Office Building'), findsOneWidget);

      // Check the corporate office hub warning banner
      expect(
        find.text('Corporate Office Search: Pickups & drops for office hubs are restricted to HITEC City / Nanakramguda and Kokapet.'),
        findsOneWidget,
      );
    });
  });
}
