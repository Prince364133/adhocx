import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:adhocx/presentation/location_picker/universal_location_picker_screen.dart';
import 'package:adhocx/presentation/profile_screen/modals/about_modal.dart';
import 'package:adhocx/presentation/profile_screen/modals/privacy_modal.dart';
import 'package:adhocx/presentation/profile_screen/modals/terms_modal.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Universal Location Picker Screen - Map Pinpoint Tests', () {
    testWidgets('Renders Search Address and Pinpoint on Map mode tabs', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: UniversalLocationPickerScreen(
              title: 'Pickup Location',
              initialAddress: 'Hitec City, Hyderabad',
              initialLat: 17.4435,
              initialLng: 78.3772,
              startOnMap: false,
            ),
          ),
        ),
      );
      await tester.pump();

      expect(find.text('Search Address'), findsOneWidget);
      expect(find.text('Pinpoint on Map'), findsOneWidget);
      expect(find.text('Choose / Pinpoint on Map'), findsOneWidget);
    });

    testWidgets('Switching to Pinpoint on Map shows map guidance and confirmation button', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: UniversalLocationPickerScreen(
              title: 'Pickup Location',
              initialAddress: 'Hitec City, Hyderabad',
              initialLat: 17.4435,
              initialLng: 78.3772,
              startOnMap: true,
            ),
          ),
        ),
      );
      await tester.pump();

      expect(find.text('Confirm Pinpoint Location'), findsOneWidget);
      expect(find.text('SELECTED PINPOINT LOCATION'), findsOneWidget);
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
