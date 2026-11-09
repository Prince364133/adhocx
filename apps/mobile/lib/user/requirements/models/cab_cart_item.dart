class CabCartItem {
  final String id;
  String vehicleType; // 'SEDAN', 'SUV', 'HATCHBACK', 'BUS'
  String vehicleLabel; // 'Prime Sedan', 'SUV 7 Seater', etc.
  int passengers;
  String pickupAddress;
  double pickupLat;
  double pickupLng;
  bool pickupIsOffice; // optional display label
  String pickupInstructions;
  String dropAddress;
  double dropLat;
  double dropLng;
  bool dropIsOffice; // optional display label
  String dropInstructions;
  String tripType; // 'One Way'
  bool isScheduled;
  String pickupDate; // YYYY-MM-DD
  String pickupTime; // e.g. 07:14 PM
  DateTime reportingDateTime;
  List<String> additionalStops;
  String additionalInfo;
  double distanceKm;
  int durationMinutes;
  String formattedDistance;
  String formattedEta;

  /// Price per vehicle from the server quote (0 until quoted).
  double estimatedFare;
  String? quoteId;
  DateTime? quoteExpiresAt;
  bool isExpanded;

  CabCartItem({
    required this.id,
    required this.vehicleType,
    required this.vehicleLabel,
    required this.passengers,
    required this.pickupAddress,
    required this.pickupLat,
    required this.pickupLng,
    this.pickupIsOffice = false,
    this.pickupInstructions = '',
    required this.dropAddress,
    required this.dropLat,
    required this.dropLng,
    this.dropIsOffice = false,
    this.dropInstructions = '',
    this.tripType = 'One Way',
    this.isScheduled = false,
    required this.pickupDate,
    required this.pickupTime,
    required this.reportingDateTime,
    this.additionalStops = const [],
    this.additionalInfo = '',
    this.distanceKm = 0.0,
    this.durationMinutes = 0,
    this.formattedDistance = '',
    this.formattedEta = '',
    required this.estimatedFare,
    this.quoteId,
    this.quoteExpiresAt,
    this.isExpanded = false,
  });

  bool get hasLocations => pickupLat != 0.0 && pickupLng != 0.0 && dropLat != 0.0 && dropLng != 0.0;

  /// True when the stored quote can still be booked as-is.
  bool get hasValidQuote =>
      quoteId != null && (quoteExpiresAt == null || quoteExpiresAt!.isAfter(DateTime.now().add(const Duration(seconds: 30))));

  String get pickupShort {
    final s = pickupAddress.split(',').first.trim();
    return pickupIsOffice ? '$s (Office)' : s;
  }

  String get dropShort {
    final s = dropAddress.split(',').first.trim();
    return dropIsOffice ? '$s (Office)' : s;
  }

  String get routeSummary => '$pickupShort → $dropShort';

  String get scheduleSummary => '$pickupDate • $pickupTime';

  String buildFormattedNotes({
    String? batchId,
    String? groupName,
    int? cabIndex,
    int? totalCabs,
  }) {
    final List<String> notes = [];
    if (batchId != null && batchId.isNotEmpty) {
      final bName = (groupName != null && groupName.isNotEmpty) ? groupName : 'Corporate Fleet';
      final cIdx = cabIndex ?? 1;
      final tCabs = totalCabs ?? 1;
      notes.add('[Batch: $batchId | Group: $bName | Cab: $cIdx/$tCabs]');
    }
    if (pickupIsOffice) notes.add('Pickup: Office');
    if (dropIsOffice) notes.add('Drop: Office');
    if (passengers > 0) {
      notes.add('Passengers: $passengers');
    }
    if (pickupInstructions.trim().isNotEmpty) {
      notes.add('Pickup Guide: ${pickupInstructions.trim()}');
    }
    if (dropInstructions.trim().isNotEmpty) {
      notes.add('Drop Guide: ${dropInstructions.trim()}');
    }
    if (additionalStops.isNotEmpty) {
      notes.add('Intermediate Stops: ${additionalStops.join(', ')}');
    }
    if (additionalInfo.trim().isNotEmpty) {
      notes.add('Notes: ${additionalInfo.trim()}');
    }
    return notes.join(' | ');
  }

  static Map<String, String> parseBatchMetadata(String? notes) {
    if (notes == null || notes.isEmpty) return {};
    final match = RegExp(r'\[Batch:\s*([^\|]+)\s*\|\s*Group:\s*([^\|]+)\s*\|\s*Cab:\s*(\d+)/(\d+)\]').firstMatch(notes);
    if (match != null) {
      return {
        'batchId': match.group(1)?.trim() ?? '',
        'groupName': match.group(2)?.trim() ?? '',
        'cabIndex': match.group(3)?.trim() ?? '1',
        'totalCabs': match.group(4)?.trim() ?? '1',
      };
    }
    return {};
  }

  static String parsePickupGuide(String? notes) {
    if (notes == null || notes.isEmpty) return '';
    final match = RegExp(r'(?:Pickup Guide|Pickup Instructions):\s*([^|]+)').firstMatch(notes);
    return match?.group(1)?.trim() ?? '';
  }

  static String parseDropGuide(String? notes) {
    if (notes == null || notes.isEmpty) return '';
    final match = RegExp(r'(?:Drop Guide|Drop Instructions):\s*([^|]+)').firstMatch(notes);
    return match?.group(1)?.trim() ?? '';
  }

  /// Office labels written by [buildFormattedNotes] (and by older app builds' route notes).
  static bool parsePickupIsOffice(String? notes) =>
      notes != null && (notes.contains('Pickup: Office') || notes.contains('Route: Office → Home'));

  static bool parseDropIsOffice(String? notes) =>
      notes != null && (notes.contains('Drop: Office') || notes.contains('Route: Home → Office'));

  Map<String, dynamic> toJson() => {
    'id': id,
    'vehicleType': vehicleType,
    'vehicleLabel': vehicleLabel,
    'passengers': passengers,
    'pickupAddress': pickupAddress,
    'pickupLat': pickupLat,
    'pickupLng': pickupLng,
    'pickupIsOffice': pickupIsOffice,
    'pickupInstructions': pickupInstructions,
    'dropAddress': dropAddress,
    'dropLat': dropLat,
    'dropLng': dropLng,
    'dropIsOffice': dropIsOffice,
    'dropInstructions': dropInstructions,
    'tripType': tripType,
    'isScheduled': isScheduled,
    'pickupDate': pickupDate,
    'pickupTime': pickupTime,
    'reportingDateTime': reportingDateTime.toUtc().toIso8601String(),
    'additionalStops': additionalStops,
    'additionalInfo': additionalInfo,
    'distanceKm': distanceKm,
    'durationMinutes': durationMinutes,
    'formattedDistance': formattedDistance,
    'formattedEta': formattedEta,
    'estimatedFare': estimatedFare,
    // Quotes are short-lived and are not stored in templates.
  };

  factory CabCartItem.fromJson(Map<String, dynamic> json) {
    DateTime parsedReporting;
    try {
      parsedReporting = DateTime.parse(json['reportingDateTime']?.toString() ?? '').toLocal();
    } catch (_) {
      parsedReporting = DateTime.now();
    }

    // Templates saved by older builds stored a direction instead of office labels.
    final legacyDirection = json['direction']?.toString();
    final pickupIsOffice = json['pickupIsOffice'] == true || legacyDirection == 'OUTBOUND_FROM_OFFICE';
    final dropIsOffice = json['dropIsOffice'] == true || legacyDirection == 'INBOUND_TO_OFFICE';

    return CabCartItem(
      id: json['id']?.toString() ?? 'cab_${DateTime.now().millisecondsSinceEpoch}',
      vehicleType: json['vehicleType']?.toString() ?? 'SEDAN',
      vehicleLabel: json['vehicleLabel']?.toString() ?? 'Prime Sedan',
      passengers: (json['passengers'] as num?)?.toInt() ?? 4,
      pickupAddress: json['pickupAddress']?.toString() ?? '',
      pickupLat: (json['pickupLat'] as num?)?.toDouble() ?? 0.0,
      pickupLng: (json['pickupLng'] as num?)?.toDouble() ?? 0.0,
      pickupIsOffice: pickupIsOffice,
      pickupInstructions: json['pickupInstructions']?.toString() ?? '',
      dropAddress: json['dropAddress']?.toString() ?? '',
      dropLat: (json['dropLat'] as num?)?.toDouble() ?? 0.0,
      dropLng: (json['dropLng'] as num?)?.toDouble() ?? 0.0,
      dropIsOffice: dropIsOffice,
      dropInstructions: json['dropInstructions']?.toString() ?? '',
      tripType: json['tripType']?.toString() ?? 'One Way',
      isScheduled: json['isScheduled'] == true,
      pickupDate: json['pickupDate']?.toString() ?? '',
      pickupTime: json['pickupTime']?.toString() ?? '',
      reportingDateTime: parsedReporting,
      additionalStops: (json['additionalStops'] as List?)?.map((e) => e.toString()).toList() ?? [],
      additionalInfo: json['additionalInfo']?.toString() ?? '',
      distanceKm: (json['distanceKm'] as num?)?.toDouble() ?? 0.0,
      durationMinutes: (json['durationMinutes'] as num?)?.toInt() ?? 0,
      formattedDistance: json['formattedDistance']?.toString() ?? '',
      formattedEta: json['formattedEta']?.toString() ?? '',
      estimatedFare: (json['estimatedFare'] as num?)?.toDouble() ?? 0.0,
    );
  }

  /// Clones the cab item and updates its date to today (or given target date),
  /// preserving its scheduled time-of-day. The copy has no quote: it is re-priced before booking.
  CabCartItem copyForDate(DateTime targetDate, {int? index}) {
    final newId = 'cab_${DateTime.now().millisecondsSinceEpoch}_${index ?? 0}';
    final dateStr = '${targetDate.year}-${targetDate.month.toString().padLeft(2, '0')}-${targetDate.day.toString().padLeft(2, '0')}';

    int hour = reportingDateTime.hour;
    int minute = reportingDateTime.minute;

    if (pickupTime.isNotEmpty && pickupTime.contains(':')) {
      try {
        final timeClean = pickupTime.replaceAll(RegExp(r'[APMapm\s]'), '');
        final parts = timeClean.split(':');
        int h = int.parse(parts[0]);
        final m = int.parse(parts[1]);
        if (pickupTime.toUpperCase().contains('PM') && h < 12) h += 12;
        if (pickupTime.toUpperCase().contains('AM') && h == 12) h = 0;
        hour = h;
        minute = m;
      } catch (_) {}
    }

    final newReporting = DateTime(targetDate.year, targetDate.month, targetDate.day, hour, minute);

    return copyWith(
      id: newId,
      pickupDate: dateStr,
      reportingDateTime: newReporting,
      clearQuote: true,
      isExpanded: false,
    );
  }

  CabCartItem copyWith({
    String? id,
    String? vehicleType,
    String? vehicleLabel,
    int? passengers,
    String? pickupAddress,
    double? pickupLat,
    double? pickupLng,
    bool? pickupIsOffice,
    String? pickupInstructions,
    String? dropAddress,
    double? dropLat,
    double? dropLng,
    bool? dropIsOffice,
    String? dropInstructions,
    String? tripType,
    bool? isScheduled,
    String? pickupDate,
    String? pickupTime,
    DateTime? reportingDateTime,
    List<String>? additionalStops,
    String? additionalInfo,
    double? distanceKm,
    int? durationMinutes,
    String? formattedDistance,
    String? formattedEta,
    double? estimatedFare,
    String? quoteId,
    DateTime? quoteExpiresAt,
    bool clearQuote = false,
    bool? isExpanded,
  }) {
    return CabCartItem(
      id: id ?? this.id,
      vehicleType: vehicleType ?? this.vehicleType,
      vehicleLabel: vehicleLabel ?? this.vehicleLabel,
      passengers: passengers ?? this.passengers,
      pickupAddress: pickupAddress ?? this.pickupAddress,
      pickupLat: pickupLat ?? this.pickupLat,
      pickupLng: pickupLng ?? this.pickupLng,
      pickupIsOffice: pickupIsOffice ?? this.pickupIsOffice,
      pickupInstructions: pickupInstructions ?? this.pickupInstructions,
      dropAddress: dropAddress ?? this.dropAddress,
      dropLat: dropLat ?? this.dropLat,
      dropLng: dropLng ?? this.dropLng,
      dropIsOffice: dropIsOffice ?? this.dropIsOffice,
      dropInstructions: dropInstructions ?? this.dropInstructions,
      tripType: tripType ?? this.tripType,
      isScheduled: isScheduled ?? this.isScheduled,
      pickupDate: pickupDate ?? this.pickupDate,
      pickupTime: pickupTime ?? this.pickupTime,
      reportingDateTime: reportingDateTime ?? this.reportingDateTime,
      additionalStops: additionalStops ?? List.from(this.additionalStops),
      additionalInfo: additionalInfo ?? this.additionalInfo,
      distanceKm: distanceKm ?? this.distanceKm,
      durationMinutes: durationMinutes ?? this.durationMinutes,
      formattedDistance: formattedDistance ?? this.formattedDistance,
      formattedEta: formattedEta ?? this.formattedEta,
      estimatedFare: estimatedFare ?? this.estimatedFare,
      quoteId: clearQuote ? null : (quoteId ?? this.quoteId),
      quoteExpiresAt: clearQuote ? null : (quoteExpiresAt ?? this.quoteExpiresAt),
      isExpanded: isExpanded ?? this.isExpanded,
    );
  }
}
