import 'package:flutter_test/flutter_test.dart';
import 'package:adhocx/user/requirements/utils/office_hub_detector.dart';

void main() {
  group('OfficeHubDetector Tests', () {
    test('Detects HITEC / Nanakramguda by coordinates', () {
      // Near Cyber Towers / HITEC City
      final hub = OfficeHubDetector.detectHub(
        lat: 17.4435,
        lng: 78.3772,
        addressText: 'Madhapur, Hyderabad',
      );
      expect(hub, equals(OfficeHubDetector.hitecId));
    });

    test('Detects HITEC / Nanakramguda by Financial District coordinates', () {
      // Near Nanakramguda Financial District
      final hub = OfficeHubDetector.detectHub(
        lat: 17.4155,
        lng: 78.3416,
        addressText: 'Financial District, Hyderabad',
      );
      expect(hub, equals(OfficeHubDetector.hitecId));
    });

    test('Detects Kokapet by coordinates', () {
      // Near Kokapet SEZ / Neopolis
      final hub = OfficeHubDetector.detectHub(
        lat: 17.3850,
        lng: 78.3245,
        addressText: 'Kokapet, Hyderabad',
      );
      expect(hub, equals(OfficeHubDetector.kokapetId));
    });

    test('Detects HITEC / Nanakramguda by keywords', () {
      final hub = OfficeHubDetector.detectHub(
        lat: 0.0,
        lng: 0.0,
        addressText: 'Mindspace HITEC City, Hyderabad, Telangana',
      );
      expect(hub, equals(OfficeHubDetector.hitecId));
    });

    test('Detects Kokapet by keywords', () {
      final hub = OfficeHubDetector.detectHub(
        lat: 0.0,
        lng: 0.0,
        addressText: 'GAR Infobahn Tower 1, Kokapet, Telangana',
      );
      expect(hub, equals(OfficeHubDetector.kokapetId));
    });

    test('Returns null for locations outside Hyderabad (e.g. Gurgaon DLF Cyber Hub)', () {
      // From user screenshot: DLF Cyber Hub Sector 25A Gurgaon Haryana
      final hub = OfficeHubDetector.detectHub(
        lat: 28.4950,
        lng: 77.0895,
        addressText: 'DLF Tower 10th Road, DLF Cyber Hub, Sector 25A, Gurgaon, Haryana, 122010',
      );
      expect(hub, isNull);
    });

    test('Returns null for other cities (Bengaluru, Delhi, Mumbai)', () {
      final hub = OfficeHubDetector.detectHub(
        lat: 12.9716,
        lng: 77.5946,
        addressText: 'MG Road, Bengaluru, Karnataka',
      );
      expect(hub, isNull);
    });

    test('Returns null for locations inside Hyderabad but outside approved hubs (e.g. Charminar, Malakpet)', () {
      // Malakpet (lat: 17.3753, lng: 78.4983) is an employee locality, not an office hub
      final hub = OfficeHubDetector.detectHub(
        lat: 17.3753,
        lng: 78.4983,
        addressText: 'Malakpet, Hyderabad, Telangana',
      );
      expect(hub, isNull);
    });

    test('Default locations return valid presets', () {
      final hitecLoc = OfficeHubDetector.defaultLocationForHub(OfficeHubDetector.hitecId);
      expect(hitecLoc['address'], contains('HITEC City'));
      expect(hitecLoc['lat'], equals(17.4435));
      expect(hitecLoc['lng'], equals(78.3772));

      final kokapetLoc = OfficeHubDetector.defaultLocationForHub(OfficeHubDetector.kokapetId);
      expect(kokapetLoc['address'], contains('Kokapet'));
      expect(kokapetLoc['lat'], equals(17.3850));
      expect(kokapetLoc['lng'], equals(78.3245));
    });
  });
}
