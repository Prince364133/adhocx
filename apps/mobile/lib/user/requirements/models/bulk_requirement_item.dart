class BulkRequirementItem {
  final int rowIndex;
  final String title;
  final String vehicleType;
  final int quantity;
  final String pickupAddress;
  final double pickupLat;
  final double pickupLng;
  final String dropAddress;
  final double dropLat;
  final double dropLng;
  final DateTime reportingTime;
  final double ratePerVehicle;
  final String fulfillmentMode;
  final String? notes;
  final bool isValid;
  final List<String> errors;

  const BulkRequirementItem({
    required this.rowIndex,
    required this.title,
    required this.vehicleType,
    required this.quantity,
    required this.pickupAddress,
    required this.pickupLat,
    required this.pickupLng,
    required this.dropAddress,
    required this.dropLat,
    required this.dropLng,
    required this.reportingTime,
    required this.ratePerVehicle,
    this.fulfillmentMode = 'DIRECT_DISPATCH',
    this.notes,
    this.isValid = true,
    this.errors = const [],
  });

  double get totalCost => (ratePerVehicle > 0 ? ratePerVehicle : 1500.0) * (quantity > 0 ? quantity : 1);

  String get vehicleTypeDisplay {
    switch (vehicleType.toUpperCase()) {
      case 'SEDAN':
        return 'Sedan (4 Seater)';
      case 'SUV':
        return 'SUV (6-7 Seater)';
      case 'HATCHBACK':
        return 'Hatchback (4 Seater)';
      case 'TEMPO_TRAVELLER':
        return 'Tempo Traveller';
      case 'BUS':
        return 'Commercial Bus';
      case 'TATA_ACE':
        return 'Tata Ace';
      case 'PICKUP_TRUCK':
        return 'Pickup Truck';
      default:
        return vehicleType;
    }
  }

  String get formattedDateTime {
    final y = reportingTime.year.toString().padLeft(4, '0');
    final m = reportingTime.month.toString().padLeft(2, '0');
    final d = reportingTime.day.toString().padLeft(2, '0');
    final hr = reportingTime.hour.toString().padLeft(2, '0');
    final mn = reportingTime.minute.toString().padLeft(2, '0');
    return '$d/$m/$y at $hr:$mn';
  }

  Map<String, dynamic> toCreateDto() {
    return {
      'title': title,
      'vehicleType': vehicleType,
      'quantity': quantity,
      'pickupAddress': pickupAddress,
      'pickupLat': pickupLat,
      'pickupLng': pickupLng,
      'dropAddress': dropAddress,
      'dropLat': dropLat,
      'dropLng': dropLng,
      'reportingTime': reportingTime,
      'fulfillmentMode': fulfillmentMode,
      'ratePerVehicle': ratePerVehicle > 0 ? ratePerVehicle : null,
      'notes': notes,
    };
  }

  BulkRequirementItem copyWith({
    int? rowIndex,
    String? title,
    String? vehicleType,
    int? quantity,
    String? pickupAddress,
    double? pickupLat,
    double? pickupLng,
    String? dropAddress,
    double? dropLat,
    double? dropLng,
    DateTime? reportingTime,
    double? ratePerVehicle,
    String? fulfillmentMode,
    String? notes,
    bool? isValid,
    List<String>? errors,
  }) {
    return BulkRequirementItem(
      rowIndex: rowIndex ?? this.rowIndex,
      title: title ?? this.title,
      vehicleType: vehicleType ?? this.vehicleType,
      quantity: quantity ?? this.quantity,
      pickupAddress: pickupAddress ?? this.pickupAddress,
      pickupLat: pickupLat ?? this.pickupLat,
      pickupLng: pickupLng ?? this.pickupLng,
      dropAddress: dropAddress ?? this.dropAddress,
      dropLat: dropLat ?? this.dropLat,
      dropLng: dropLng ?? this.dropLng,
      reportingTime: reportingTime ?? this.reportingTime,
      ratePerVehicle: ratePerVehicle ?? this.ratePerVehicle,
      fulfillmentMode: fulfillmentMode ?? this.fulfillmentMode,
      notes: notes ?? this.notes,
      isValid: isValid ?? this.isValid,
      errors: errors ?? this.errors,
    );
  }
}
