class VehicleUtils {
  VehicleUtils._();

  /// Normalizes a database category code without mapping it to a built-in vehicle list.
  static String normalizeVehicleCategory(String? raw) {
    if (raw == null) return '';
    final s = raw.trim().toUpperCase();
    if (s.isEmpty || s == 'NULL' || s == 'UNDEFINED') return '';
    return s.replaceAll(RegExp(r'[^A-Z0-9]'), '_');
  }

  /// Returns the supplied database label or code.
  static String getDisplayLabel(String? raw) {
    if (raw == null || raw.trim().isEmpty) return 'Vehicle';
    return raw.trim();
  }

  /// Uses the supplied capacity when available; category codes do not imply seating.
  static int getMaxSeats(String? vehicleType, [int? fallbackSeats]) {
    return fallbackSeats ?? 0;
  }

  /// Checks if a driver's vehicle is strictly compatible with a trip/opportunity requirement.
  /// A driver can only serve a requirement with the same registered category.
  static bool isCompatible({
    required String? driverVehicle,
    required String? requiredVehicle,
  }) {
    final reqNorm = normalizeVehicleCategory(requiredVehicle);
    if (reqNorm.isEmpty) return true; // generic requirement

    final driverNorm = normalizeVehicleCategory(driverVehicle);
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
