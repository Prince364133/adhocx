import 'package:flutter_test/flutter_test.dart';
import 'package:adhocx/user/requirements/utils/office_hub_detector.dart';
import 'package:adhocx/user/requirements/models/cab_cart_item.dart';

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

    test('Returns null for locations inside Hyderabad but outside approved hubs (e.g. Charminar, Malakpet, Secunderabad, Ameerpet)', () {
      // Malakpet (lat: 17.3753, lng: 78.4983) is an employee locality, not an office hub
      final hub1 = OfficeHubDetector.detectHub(
        lat: 17.3753,
        lng: 78.4983,
        addressText: 'Malakpet, Hyderabad, Telangana',
      );
      expect(hub1, isNull);

      final hub2 = OfficeHubDetector.detectHub(
        lat: 17.4399,
        lng: 78.4983,
        addressText: 'Secunderabad Railway Station, Hyderabad',
      );
      expect(hub2, isNull);

      final hub3 = OfficeHubDetector.detectHub(
        lat: 17.4375,
        lng: 78.4483,
        addressText: 'Ameerpet Metro Station, Hyderabad',
      );
      expect(hub3, isNull);

      final hub4 = OfficeHubDetector.detectHub(
        lat: 17.3688,
        lng: 78.5247,
        addressText: 'Dilsukhnagar Metro, Hyderabad',
      );
      expect(hub4, isNull);

      final hub5 = OfficeHubDetector.detectHub(
        lat: 17.4947,
        lng: 78.3996,
        addressText: 'Kukatpally Housing Board Colony, Hyderabad',
      );
      expect(hub5, isNull);
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

  group('CabCartItem Guidance & Driver Notes Formatting Tests', () {
    test('Formats Pickup Guide and Drop Guide into dispatch notes', () {
      final now = DateTime.now();
      final item = CabCartItem(
        id: 'test_item_1',
        vehicleType: 'SEDAN',
        vehicleLabel: 'Prime Sedan',
        passengers: 3,
        direction: 'OUTBOUND_FROM_OFFICE',
        officeHubId: OfficeHubDetector.hitecId,
        officeAddress: 'Cyber Towers, HITEC City',
        officeLat: 17.4504,
        officeLng: 78.3808,
        localityName: 'Malakpet',
        pickupAddress: 'Cyber Towers, HITEC City',
        pickupLat: 17.4504,
        pickupLng: 78.3808,
        pickupInstructions: 'Gate 2, Tower West Lobby',
        dropAddress: 'Flat 302, Sai Balaji Residency, Malakpet',
        dropLat: 17.3753,
        dropLng: 78.4983,
        dropInstructions: 'Beside SBI ATM, call on arrival',
        tripType: 'One Way',
        hasEscort: true,
        pickupDate: '2026-10-09',
        pickupTime: '06:30 PM',
        reportingDateTime: now,
        estimatedFare: 850.0,
      );

      final notes = item.buildFormattedNotes(
        batchId: 'BATCH_101',
        groupName: 'Evening Shift',
        cabIndex: 1,
        totalCabs: 5,
      );

      expect(notes, contains('[Batch: BATCH_101 | Group: Evening Shift | Cab: 1/5]'));
      expect(notes, contains('Route: Office → Home'));
      expect(notes, contains('Security Escort: Required'));
      expect(notes, contains('Passengers: 3'));
      expect(notes, contains('Pickup Guide: Gate 2, Tower West Lobby'));
      expect(notes, contains('Drop Guide: Beside SBI ATM, call on arrival'));
    });

    test('Parses instructions and direction from note strings', () {
      const sampleNotes = '[Batch: B_12 | Group: IT Staff | Cab: 2/4] | Route: Home → Office | Passengers: 4 | Pickup Guide: Gate 1, Pillar 45 | Drop Guide: GAR Infobahn Tower 2 Basement | Notes: VIP Client';

      expect(CabCartItem.parseDirection(sampleNotes), equals('INBOUND_TO_OFFICE'));
      expect(CabCartItem.parsePickupGuide(sampleNotes), equals('Gate 1, Pillar 45'));
      expect(CabCartItem.parseDropGuide(sampleNotes), equals('GAR Infobahn Tower 2 Basement'));

      const legacyNotes = 'Route: Office → Home | Pickup Instructions: Gate 3 Lobby | Drop Instructions: Flat 101 Near Temple';
      expect(CabCartItem.parseDirection(legacyNotes), equals('OUTBOUND_FROM_OFFICE'));
      expect(CabCartItem.parsePickupGuide(legacyNotes), equals('Gate 3 Lobby'));
      expect(CabCartItem.parseDropGuide(legacyNotes), equals('Flat 101 Near Temple'));
    });
  });
}
