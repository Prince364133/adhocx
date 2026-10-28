class CabCartItem {
  final String id;
  String vehicleType; // 'SEDAN', 'SUV', 'HATCHBACK', 'BUS'
  String vehicleLabel; // 'Prime Sedan', 'SUV 7 Seater', etc.
  int passengers;
  String direction; // 'OUTBOUND_FROM_OFFICE' or 'INBOUND_TO_OFFICE'
  String officeHubId;
  String officeAddress;
  double officeLat;
  double officeLng;
  Map<String, dynamic>? locality;
  String localityName;
  String pickupAddress;
  double pickupLat;
  double pickupLng;
  String pickupInstructions;
  String dropAddress;
  double dropLat;
  double dropLng;
  String dropInstructions;
  String tripType; // 'One Way'
  bool hasEscort;
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
  double estimatedFare;
  String? zonalQuoteId;
  bool isExpanded;

  CabCartItem({
    required this.id,
    required this.vehicleType,
    required this.vehicleLabel,
    required this.passengers,
    required this.direction,
    required this.officeHubId,
    required this.officeAddress,
    required this.officeLat,
    required this.officeLng,
    this.locality,
    required this.localityName,
    required this.pickupAddress,
    required this.pickupLat,
    required this.pickupLng,
    this.pickupInstructions = '',
    required this.dropAddress,
    required this.dropLat,
    required this.dropLng,
    this.dropInstructions = '',
    this.tripType = 'One Way',
    this.hasEscort = false,
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
    this.zonalQuoteId,
    this.isExpanded = false,
  });

  bool get isOutbound => direction == 'OUTBOUND_FROM_OFFICE';

  String get pickupShort => pickupAddress.isNotEmpty
      ? pickupAddress.split(',').first.trim()
      : (isOutbound ? 'Office Hub' : localityName);

  String get dropShort => dropAddress.isNotEmpty
      ? dropAddress.split(',').first.trim()
      : (!isOutbound ? 'Office Hub' : localityName);

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
    if (direction.isNotEmpty) {
      notes.add(isOutbound ? 'Route: Office → Home' : 'Route: Home → Office');
    }
    if (hasEscort) {
      notes.add('Security Escort: Required');
    }
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

  static String parseDirection(String? notes) {
    if (notes == null || notes.isEmpty) return 'OUTBOUND_FROM_OFFICE';
    if (notes.contains('Route: Home → Office') || notes.contains('INBOUND_TO_OFFICE')) {
      return 'INBOUND_TO_OFFICE';
    }
    return 'OUTBOUND_FROM_OFFICE';
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'vehicleType': vehicleType,
    'vehicleLabel': vehicleLabel,
    'passengers': passengers,
    'direction': direction,
    'officeHubId': officeHubId,
    'officeAddress': officeAddress,
    'officeLat': officeLat,
    'officeLng': officeLng,
    'locality': locality,
    'localityName': localityName,
    'pickupAddress': pickupAddress,
    'pickupLat': pickupLat,
    'pickupLng': pickupLng,
    'pickupInstructions': pickupInstructions,
    'dropAddress': dropAddress,
    'dropLat': dropLat,
    'dropLng': dropLng,
    'dropInstructions': dropInstructions,
    'tripType': tripType,
    'hasEscort': hasEscort,
    'isScheduled': isScheduled,
    'pickupDate': pickupDate,
    'pickupTime': pickupTime,
    'reportingDateTime': reportingDateTime.toIso8601String(),
    'additionalStops': additionalStops,
    'additionalInfo': additionalInfo,
    'distanceKm': distanceKm,
    'durationMinutes': durationMinutes,
    'formattedDistance': formattedDistance,
    'formattedEta': formattedEta,
    'estimatedFare': estimatedFare,
    'zonalQuoteId': zonalQuoteId,
  };

  factory CabCartItem.fromJson(Map<String, dynamic> json) {
    DateTime parsedReporting;
    try {
      parsedReporting = DateTime.parse(json['reportingDateTime']?.toString() ?? '');
    } catch (_) {
      parsedReporting = DateTime.now().add(const Duration(hours: 4));
    }

    final bool isSched = json['isScheduled'] == true ||
        parsedReporting.isAfter(DateTime.now().add(const Duration(minutes: 5)));

    return CabCartItem(
      id: json['id']?.toString() ?? 'cab_${DateTime.now().millisecondsSinceEpoch}',
      vehicleType: json['vehicleType']?.toString() ?? 'SEDAN',
      vehicleLabel: json['vehicleLabel']?.toString() ?? 'Prime Sedan',
      passengers: (json['passengers'] as num?)?.toInt() ?? 4,
      direction: json['direction']?.toString() ?? 'OUTBOUND_FROM_OFFICE',
      officeHubId: json['officeHubId']?.toString() ?? '',
      officeAddress: json['officeAddress']?.toString() ?? '',
      officeLat: (json['officeLat'] as num?)?.toDouble() ?? 0.0,
      officeLng: (json['officeLng'] as num?)?.toDouble() ?? 0.0,
      locality: json['locality'] is Map ? Map<String, dynamic>.from(json['locality']) : null,
      localityName: json['localityName']?.toString() ?? '',
      pickupAddress: json['pickupAddress']?.toString() ?? '',
      pickupLat: (json['pickupLat'] as num?)?.toDouble() ?? 0.0,
      pickupLng: (json['pickupLng'] as num?)?.toDouble() ?? 0.0,
      pickupInstructions: json['pickupInstructions']?.toString() ?? '',
      dropAddress: json['dropAddress']?.toString() ?? '',
      dropLat: (json['dropLat'] as num?)?.toDouble() ?? 0.0,
      dropLng: (json['dropLng'] as num?)?.toDouble() ?? 0.0,
      dropInstructions: json['dropInstructions']?.toString() ?? '',
      tripType: json['tripType']?.toString() ?? 'One Way',
      hasEscort: json['hasEscort'] == true,
      isScheduled: isSched,
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
      zonalQuoteId: json['zonalQuoteId']?.toString(),
    );
  }

  /// Clones the cab item and updates its date to today (or given target date),
  /// preserving its scheduled time-of-day.
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
      zonalQuoteId: null,
      isExpanded: false,
    );
  }

  CabCartItem copyWith({
    String? id,
    String? vehicleType,
    String? vehicleLabel,
    int? passengers,
    String? direction,
    String? officeHubId,
    String? officeAddress,
    double? officeLat,
    double? officeLng,
    Map<String, dynamic>? locality,
    String? localityName,
    String? pickupAddress,
    double? pickupLat,
    double? pickupLng,
    String? pickupInstructions,
    String? dropAddress,
    double? dropLat,
    double? dropLng,
    String? dropInstructions,
    String? tripType,
    bool? hasEscort,
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
    String? zonalQuoteId,
    bool? isExpanded,
  }) {
    return CabCartItem(
      id: id ?? this.id,
      vehicleType: vehicleType ?? this.vehicleType,
      vehicleLabel: vehicleLabel ?? this.vehicleLabel,
      passengers: passengers ?? this.passengers,
      direction: direction ?? this.direction,
      officeHubId: officeHubId ?? this.officeHubId,
      officeAddress: officeAddress ?? this.officeAddress,
      officeLat: officeLat ?? this.officeLat,
      officeLng: officeLng ?? this.officeLng,
      locality: locality ?? this.locality,
      localityName: localityName ?? this.localityName,
      pickupAddress: pickupAddress ?? this.pickupAddress,
      pickupLat: pickupLat ?? this.pickupLat,
      pickupLng: pickupLng ?? this.pickupLng,
      pickupInstructions: pickupInstructions ?? this.pickupInstructions,
      dropAddress: dropAddress ?? this.dropAddress,
      dropLat: dropLat ?? this.dropLat,
      dropLng: dropLng ?? this.dropLng,
      dropInstructions: dropInstructions ?? this.dropInstructions,
      tripType: tripType ?? this.tripType,
      hasEscort: hasEscort ?? this.hasEscort,
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
      zonalQuoteId: zonalQuoteId ?? this.zonalQuoteId,
      isExpanded: isExpanded ?? this.isExpanded,
    );
  }
}
