import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:adhocx/user/requirements/user_create_requirement_screen.dart';
import 'package:adhocx/user/requirements/requirement_draft_provider.dart';
import 'package:adhocx/theme/theme_provider.dart';
import 'package:adhocx/services/auth_provider.dart';
import 'package:adhocx/user/requirements/widgets/add_cab_modal_bottom_sheet.dart';
import 'package:adhocx/user/requirements/models/cab_cart_item.dart';

void main() {
  testWidgets('Test AddCabModalBottomSheet build directly on narrow screen (320px)', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
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
              child: const Text('Open Sheet'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open Sheet'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
    expect(find.byType(AddCabModalBottomSheet), findsOneWidget);
  });

  testWidgets('Test UserCreateRequirementScreen with cabs in manifest on narrow screen (320px)', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final draftProvider = RequirementDraftProvider();
    
    // Add a cab directly to draft
    draftProvider.addCab(
      CabCartItem(
        id: 'test_cab_1',
        vehicleType: 'SEDAN',
        vehicleLabel: 'Prime Sedan',
        passengers: 4,
        direction: 'OUTBOUND_FROM_OFFICE',
        officeHubId: 'HITEC_NANAKRAMGUDA',
        officeAddress: 'HITEC City, Hyderabad',
        officeLat: 17.4435,
        officeLng: 78.3772,
        locality: {'name': 'Malakpet', 'lat': 17.3753, 'lng': 78.4983},
        localityName: 'Malakpet',
        pickupAddress: 'HITEC City, Hyderabad, Telangana',
        pickupLat: 17.4435,
        pickupLng: 78.3772,
        dropAddress: 'Malakpet, Hyderabad, Telangana',
        dropLat: 17.3753,
        dropLng: 78.4983,
        pickupDate: '2026-10-10',
        pickupTime: '09:00 AM',
        reportingDateTime: DateTime(2026, 10, 10, 9, 0),
        estimatedFare: 800.0,
      ),
    );

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => ThemeProvider()),
          ChangeNotifierProvider<RequirementDraftProvider>.value(value: draftProvider),
          ChangeNotifierProvider(create: (_) => AuthProvider()),
        ],
        child: const MaterialApp(
          home: UserCreateRequirementScreen(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Verify cab card rendered
    expect(find.text('Cabs in Manifest (1)'), findsOneWidget);
    expect(find.textContaining('Cab #1 • Prime Sedan'), findsOneWidget);

    // Toggle expand
    await tester.tap(find.textContaining('Cab #1 • Prime Sedan'));
    await tester.pumpAndSettle();

    // Verify expanded details
    expect(find.textContaining('Direction:'), findsOneWidget);
    expect(find.textContaining('Pickup: HITEC City'), findsOneWidget);

    // Duplicate/clone cab
    expect(find.text('Clone'), findsOneWidget);
    await tester.ensureVisible(find.text('Clone'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Clone'));
    await tester.pumpAndSettle();
    expect(draftProvider.cabs.length, 2);
  });

  testWidgets('Test AddCabModalBottomSheet on standard mobile screen (390x844)', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
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
              child: const Text('Open Sheet'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open Sheet'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
    expect(find.byType(AddCabModalBottomSheet), findsOneWidget);
  });
}

