import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:adhocx/presentation/profile_screen/modals/rate_card_modal.dart';

void main() {
  group('RateCardModal vehicle resolution', () {
    test('resolves vehicle type from profile, nested vehicle, auth, or onboarding', () {
      expect(
        RateCardModal.resolveDriverVehicleType(
          profile: {'vehicleType': 'suv'},
          onboardingVehicleType: 'SEDAN',
        ),
        'SUV',
      );
      expect(
        RateCardModal.resolveDriverVehicleType(
          profile: {
            'vehicle': {'vehicleType': 'sedan'},
          },
        ),
        'SEDAN',
      );
      expect(
        RateCardModal.resolveDriverVehicleType(
          profile: {},
          authDriverProfile: {'vehicleType': 'hatchback'},
        ),
        'HATCHBACK',
      );
      expect(
        RateCardModal.resolveDriverVehicleType(
          profile: {},
          onboardingVehicleType: 'muv',
        ),
        'MUV',
      );
      expect(
        RateCardModal.resolveDriverVehicleType(profile: {}),
        isNull,
      );
    });

    test('resolves vehicle display label from categories with clean fallback', () {
      final categories = [
        {'vehicleType': 'SEDAN', 'categoryLabel': 'Sedan'},
        {'vehicleType': 'SUV', 'categoryLabel': 'SUV'},
      ];
      expect(RateCardModal.resolveVehicleLabel('SEDAN', categories), 'Sedan');
      expect(RateCardModal.resolveVehicleLabel('SUV', categories), 'SUV');
      expect(RateCardModal.resolveVehicleLabel('MINI_TRUCK', const []), 'Mini Truck');
    });
  });

  group('RateCardModal UI & scrolling', () {
    testWidgets('shows only the driver vehicle rate card without category switcher chips', (tester) async {
      final requestedCategories = <String>[];

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: RateCardModal(
              loadDriverProfile: () async => {'vehicleType': 'SUV'},
              loadVehicleCategories: () async => [
                {'vehicleType': 'SEDAN', 'categoryLabel': 'Sedan', 'isActive': true},
                {'vehicleType': 'SUV', 'categoryLabel': 'SUV', 'isActive': true},
              ],
              loadRateCard: (category) async {
                requestedCategories.add(category);
                return {
                  'version': '2',
                  'peakWindows': [
                    {'start': '20:00', 'end': '23:00'},
                  ],
                  'slabs': [
                    {
                      'range': '0–10 km',
                      'minKm': 0,
                      'maxKm': 10,
                      'desc': 'Base guaranteed payout',
                      'driverPayoutRupees': 750,
                      'driverPeakPayoutRupees': 850,
                    },
                  ],
                };
              },
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(requestedCategories, ['SUV']);
      expect(find.text('Your Vehicle: SUV'), findsOneWidget);
      expect(find.text('Sedan'), findsNothing);
      expect(find.byType(ChoiceChip), findsNothing);
      expect(find.text('₹750 Net'), findsOneWidget);
      expect(find.text('Peak ₹850'), findsOneWidget);
    });

    testWidgets('scrolls all the way to the last slab and guarantee callout inside a bottom sheet', (tester) async {
      tester.view.physicalSize = const Size(390, 780);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final manySlabs = List.generate(18, (index) {
        final start = index == 0 ? 0 : 10 + (index - 1) * 5;
        final end = index == 0 ? 10 : start + 5;
        return {
          'range': index == 0 ? '0–10 km' : '>$start–$end km',
          'minKm': start,
          'maxKm': end,
          'desc': index == 0 ? 'Base guaranteed payout' : 'Step increment (+5 km)',
          'driverPayoutRupees': 550 + index * 50,
          'driverPeakPayoutRupees': 600 + index * 50,
        };
      });

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () {
                  showModalBottomSheet(
                    context: context,
                    isScrollControlled: true,
                    useSafeArea: true,
                    backgroundColor: Colors.transparent,
                    builder: (_) => RateCardModal(
                      loadDriverProfile: () async => {'vehicleType': 'SEDAN'},
                      loadVehicleCategories: () async => [
                        {'vehicleType': 'SEDAN', 'categoryLabel': 'Sedan', 'isActive': true},
                        {'vehicleType': 'SUV', 'categoryLabel': 'SUV', 'isActive': true},
                      ],
                      loadRateCard: (_) async => {
                        'version': '1',
                        'peakWindows': [
                          {'start': '20:00', 'end': '23:00'},
                        ],
                        'slabs': manySlabs,
                      },
                    ),
                  );
                },
                child: const Text('Open'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();

      // Sheet respects bounded height and renders top content without overflow
      expect(tester.takeException(), isNull);
      expect(find.text('Driver Distance Rate Card'), findsOneWidget);
      expect(find.text('Your Vehicle: Sedan'), findsOneWidget);
      expect(find.text('0–10 km'), findsOneWidget);

      // Scroll down to reach the final slab and bottom guarantee banner
      final scrollable = find.byType(Scrollable).first;
      await tester.scrollUntilVisible(
        find.text('>90–95 km'),
        200,
        scrollable: scrollable,
      );
      expect(find.text('>90–95 km'), findsOneWidget);

      await tester.scrollUntilVisible(
        find.textContaining('credited to your wallet after verified OTP completion'),
        200,
        scrollable: scrollable,
      );
      expect(
        find.textContaining('credited to your wallet after verified OTP completion'),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    });

    testWidgets('shows helpful message and does not fetch rate card when driver has no vehicle', (tester) async {
      var rateCardCalled = false;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: RateCardModal(
              loadDriverProfile: () async => <String, dynamic>{},
              loadVehicleCategories: () async => [
                {'vehicleType': 'SEDAN', 'categoryLabel': 'Sedan', 'isActive': true},
              ],
              loadRateCard: (_) async {
                rateCardCalled = true;
                return null;
              },
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(rateCardCalled, isFalse);
      expect(find.byType(ChoiceChip), findsNothing);
      expect(find.textContaining('No vehicle category is registered'), findsOneWidget);
    });
  });
}
