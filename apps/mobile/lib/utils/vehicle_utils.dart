class VehicleUtils {
  VehicleUtils._();

  /// Normalizes any raw vehicle string (e.g. 'Prime Sedan', 'SEDAN', 'sedan', 'Toyota Dzire', 'Compact Hatchback')
  /// into standard system categories: 'SEDAN', 'SUV', 'HATCHBACK', 'TEMPO_TRAVELLER', etc.
  static String normalizeVehicleCategory(String? raw) {
    if (raw == null) return '';
    final s = raw.trim().toUpperCase();
    if (s.isEmpty || s == 'NULL' || s == 'UNDEFINED') return '';
    if (s.contains('SEDAN') || s.contains('DZIRE') || s.contains('ETIOS') || s.contains('AURA') || s.contains('TIGOR')) {
      return 'SEDAN';
    }
    if (s.contains('SUV') || s.contains('7 SEATER') || s.contains('CRYSTA') || s.contains('INNOVA') || s.contains('ERTIGA') || s.contains('CARENS') || s.contains('XYLO') || s.contains('SCORPIO')) {
      return 'SUV';
    }
    if (s.contains('HATCHBACK') || s.contains('COMPACT') || s.contains('MINI') || s.contains('WAGONR') || s.contains('SWIFT') || s.contains('TIAGO') || s.contains('I10') || s.contains('CELERIO')) {
      return 'HATCHBACK';
    }
    if (s.contains('TEMPO') || s.contains('TRAVELLER') || s.contains('FORCE') || s.contains('WINGER') || s.contains('URBANIA')) {
      return 'TEMPO_TRAVELLER';
    }
    return s.replaceAll(RegExp(r'[^A-Z0-9]'), '_');
  }

  /// Returns user-friendly UI display label for a normalized or raw vehicle category
  static String getDisplayLabel(String? raw) {
    final norm = normalizeVehicleCategory(raw);
    switch (norm) {
      case 'SEDAN':
        return 'Prime Sedan';
      case 'SUV':
        return 'SUV 7 Seater';
      case 'HATCHBACK':
        return 'Compact Hatchback';
      case 'TEMPO_TRAVELLER':
        return 'Tempo Traveller';
      default:
        if (raw == null || raw.trim().isEmpty) return 'Prime Sedan';
        return raw.trim();
    }
  }

  /// Checks if a driver's vehicle is strictly compatible with a trip/opportunity requirement.
  /// A Sedan driver CANNOT see or accept SUV or Hatchback requirements.
  static bool isCompatible({
    required String? driverVehicle,
    required String? requiredVehicle,
  }) {
    final reqNorm = normalizeVehicleCategory(requiredVehicle);
    if (reqNorm.isEmpty) return true; // generic requirement

    final driverNorm = normalizeVehicleCategory(driverVehicle ?? 'SEDAN');
    if (driverNorm.isEmpty) return true;

    return driverNorm == reqNorm;
  }

  /// Extracts the driver's registered vehicle type from any raw profile map or object
  static String extractVehicleType(dynamic profile) {
    if (profile == null) return '';
    if (profile is Map) {
      final innerData = profile['data'];
      final p = (innerData is Map) ? innerData : profile;

      final raw = (p['vehicleType'] ??
              p['vehicle_type'] ??
              p['vehicle']?['type'] ??
              p['vehicleModel'] ??
              p['vehicle_model'])
          ?.toString()
          .trim();

      if (raw != null && raw.isNotEmpty && raw != 'null' && raw != 'NULL') {
        return normalizeVehicleCategory(raw);
      }
    }
    return '';
  }
}
