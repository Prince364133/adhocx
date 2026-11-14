import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:adhocx/presentation/location_picker/universal_location_picker_screen.dart';
import 'package:adhocx/presentation/profile_screen/modals/about_modal.dart';
import 'package:adhocx/presentation/profile_screen/modals/privacy_modal.dart';
import 'package:adhocx/presentation/profile_screen/modals/terms_modal.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Universal Location Picker Screen - search + pinpoint on one screen', () {
    Widget host({required bool startOnMap}) => MaterialApp(
          home: UniversalLocationPickerScreen(
            title: 'Pickup Location',
            initialAddress: 'Hitec City, Hyderabad',
            initialLat: 17.4435,
            initialLng: 78.3772,
            startOnMap: startOnMap,
          ),
        );

    testWidgets('opens on the map with the pin, the address and Confirm', (tester) async {
      await tester.pumpWidget(host(startOnMap: true));
      await tester.pump();

      expect(find.text('SELECTED LOCATION'), findsOneWidget);
      expect(find.text('Confirm Location'), findsOneWidget);
      expect(find.text('Hitec City, Hyderabad'), findsWidgets); // initial address shown, no lookup needed
      expect(find.byTooltip('Use my current location'), findsOneWidget);
      expect(find.byTooltip('Zoom in'), findsOneWidget);
      // No separate "modes" any more.
      expect(find.text('Search Address'), findsNothing);
      expect(find.text('Pinpoint on Map'), findsNothing);
    });

    testWidgets('search panel opens over the map and "Set location on map" returns to the pin', (tester) async {
      await tester.pumpWidget(host(startOnMap: false));
      await tester.pump();

      expect(find.text('Use current location'), findsOneWidget);
      expect(find.text('Set location on map'), findsOneWidget);
      expect(find.byType(TextField), findsOneWidget);

      await tester.tap(find.text('Set location on map'));
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
      // Panel hidden (ignored + transparent); the map sheet is what the user interacts with.
      final ignore = tester.widget<IgnorePointer>(
        find.ancestor(of: find.text('Set location on map'), matching: find.byType(IgnorePointer)).first,
      );
      expect(ignore.ignoring, isTrue);
      expect(find.text('Confirm Location'), findsOneWidget);

      // "Change" in the confirm sheet (or the top search bar) brings the panel back on the same screen.
      await tester.tap(find.text('Change'));
      await tester.pumpAndSettle(const Duration(milliseconds: 100));
      final ignore2 = tester.widget<IgnorePointer>(
        find.ancestor(of: find.text('Set location on map'), matching: find.byType(IgnorePointer)).first,
      );
      expect(ignore2.ignoring, isFalse);
    });
  });

  group('Profile Legal Modals & Company Footer Tests', () {
    testWidgets('AboutModal displays operating company declaration', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(child: AboutModal()),
          ),
        ),
      );
      await tester.pump();

      expect(find.text('About AdhocX'), findsOneWidget);
      expect(
        find.text('AdhocX is operated by Estemporaneo Technologies Private Limited.'),
        findsOneWidget,
      );
    });

    testWidgets('TermsModal and PrivacyModal render correctly', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: Column(
                children: [
                  TermsModal(),
                  PrivacyModal(),
                ],
              ),
            ),
          ),
        ),
      );
      await tester.pump();

      expect(find.text('Terms & Conditions'), findsOneWidget);
      expect(find.text('Privacy Policy'), findsOneWidget);
    });
  });
}

