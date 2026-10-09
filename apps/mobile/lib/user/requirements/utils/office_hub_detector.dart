import 'dart:math' as math;

/// Utility for detecting Hyderabad office hubs (HITEC / Nanakramguda and Kokapet)
/// based on coordinates and address keywords.
class OfficeHubDetector {
  static const String hitecId = 'HITEC_NANAKRAMGUDA';
  static const String kokapetId = 'KOKAPET';

  static const List<Map<String, String>> hubs = [
    {'id': hitecId, 'label': 'HITEC / Nanakramguda'},
    {'id': kokapetId, 'label': 'Kokapet'},
  ];

  /// Calculate distance between two coordinates in kilometers using Haversine formula.
  static double haversineDistanceKm(double lat1, double lon1, double lat2, double lon2) {
    const p = 0.017453292519943295; // Math.PI / 180
    final a = 0.5 -
        math.cos((lat2 - lat1) * p) / 2 +
        math.cos(lat1 * p) * math.cos(lat2 * p) * (1 - math.cos((lon2 - lon1) * p)) / 2;
    return 12742 * math.asin(math.sqrt(a));
  }

  /// Detects whether the given coordinates and/or address belong to an approved office hub.
  /// Returns 'HITEC_NANAKRAMGUDA', 'KOKAPET', or null if outside approved hubs.
  static String? detectHub({
    required double lat,
    required double lng,
    required String addressText,
  }) {
    final lower = addressText.toLowerCase();

    // 1. Explicit Kokapet keywords:
    if (lower.contains('kokapet') ||
        lower.contains('gar infobahn') ||
        lower.contains('neopolis') ||
        lower.contains('golden mile')) {
      return kokapetId;
    }

    // Exclude if it mentions other non-Hyderabad cities (e.g. Gurgaon DLF Cyber Hub)
    final isOutsideCity = lower.contains('gurgaon') ||
        lower.contains('haryana') ||
        lower.contains('delhi') ||
        lower.contains('noida') ||
        lower.contains('bengaluru') ||
        lower.contains('bangalore') ||
        lower.contains('mumbai') ||
        lower.contains('pune');

    if (isOutsideCity) return null;

    // Exclude explicit residential / non-hub localities of Hyderabad
    final isExplicitNonHubLocality = lower.contains('malakpet') ||
        lower.contains('secunderabad') ||
        lower.contains('ameerpet') ||
        lower.contains('dilsukhnagar') ||
        lower.contains('lb nagar') ||
        lower.contains('l.b. nagar') ||
        lower.contains('charminar') ||
        lower.contains('uppal') ||
        lower.contains('kukatpally') ||
        lower.contains('kphb') ||
        lower.contains('miyapur') ||
        lower.contains('mehdipatnam') ||
        lower.contains('toli chowki') ||
        lower.contains('tolichowki') ||
        lower.contains('begumpet') ||
        lower.contains('somajiguda') ||
        lower.contains('panjagutta') ||
        lower.contains('koti') ||
        lower.contains('ecil') ||
        lower.contains('alwal') ||
        lower.contains('malkajgiri') ||
        lower.contains('shamshabad') ||
        lower.contains('rajendranagar') ||
        lower.contains('attapur') ||
        lower.contains('falaknuma') ||
        lower.contains('santhosh nagar') ||
        lower.contains('chandanagar');

    if (isExplicitNonHubLocality &&
        !lower.contains('hitec') &&
        !lower.contains('kokapet') &&
        !lower.contains('nanakramguda') &&
        !lower.contains('cyber towers') &&
        !lower.contains('mindspace')) {
      return null;
    }
      // 2. HITEC / Nanakramguda keywords:
      if (lower.contains('hitec') ||
          lower.contains('cyber towers') ||
          lower.contains('cyber gateway') ||
          lower.contains('raidurg') ||
          lower.contains('rayadurg') ||
          lower.contains('nanakramguda') ||
          lower.contains('financial district') ||
          lower.contains('knowledge city') ||
          lower.contains('mindspace') ||
          lower.contains('waverock') ||
          lower.contains('madhapur') ||
          lower.contains('gachibowli')) {
        return hitecId;
      }

      if (lower.contains('dlf cyber') &&
          (lower.contains('hyderabad') || lower.contains('telangana') || (lat > 17.0 && lat < 18.0))) {
        return hitecId;
      }

    // 3. Geocoordinate check:
    // Hyderabad bounding region: 17.0 - 18.0 N, 78.0 - 79.0 E
    if (lat >= 17.0 && lat <= 18.0 && lng >= 78.0 && lng <= 79.0) {
      // Check distance to HITEC anchor (17.4435, 78.3772) and Nanakramguda anchor (17.4155, 78.3416)
      final distHitec = haversineDistanceKm(lat, lng, 17.4435, 78.3772);
      final distNanakramguda = haversineDistanceKm(lat, lng, 17.4155, 78.3416);
      if (distHitec <= 5.5 || distNanakramguda <= 5.5) {
        return hitecId;
      }

      // Check distance to Kokapet anchor (17.3850, 78.3245)
      final distKokapet = haversineDistanceKm(lat, lng, 17.3850, 78.3245);
      if (distKokapet <= 4.5) {
        return kokapetId;
      }
    }

    return null;
  }

  /// Official preset location for an office hub
  static Map<String, dynamic> defaultLocationForHub(String hubId) {
    if (hubId == kokapetId) {
      return {
        'address': 'Kokapet SEZ / Neopolis, Hyderabad, Telangana 500075',
        'lat': 17.3850,
        'lng': 78.3245,
      };
    }
    return {
      'address': 'HITEC City / Financial District, Hyderabad, Telangana 500081',
      'lat': 17.4435,
      'lng': 78.3772,
    };
  }

  static String hubDisplayName(String? hubId) {
    if (hubId == kokapetId) return 'Kokapet';
    return 'HITEC / Nanakramguda';
  }
}
