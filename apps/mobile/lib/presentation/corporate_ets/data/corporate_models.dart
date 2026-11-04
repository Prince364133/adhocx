/// Typed views over the corporate ETS driver API responses.
///
/// Parsing is defensive (the API returns plain JSON maps) and deliberately drops fields the
/// driver must not see: the active-route payload carries the employee's phone and gender, but
/// only the employee name and pickup point are kept here.
library;

Map<String, dynamic> asJsonMap(dynamic v) {
  if (v is Map<String, dynamic>) return v;
  if (v is Map) return v.map((k, val) => MapEntry(k.toString(), val));
  return <String, dynamic>{};
}

/// Unwraps `{success, data}` envelopes that some endpoints still return.
dynamic unwrapData(dynamic v) {
  if (v is Map && v['success'] == true && v.containsKey('data')) return v['data'];
  return v;
}

String? _str(dynamic v) {
  if (v == null) return null;
  final s = v.toString().trim();
  return s.isEmpty || s == 'null' ? null : s;
}

int? _int(dynamic v) {
  if (v is int) return v;
  if (v is num) return v.round();
  if (v is String) return int.tryParse(v) ?? double.tryParse(v)?.round();
  return null;
}

double? _double(dynamic v) {
  if (v is num) return v.toDouble();
  if (v is String) return double.tryParse(v);
  return null;
}

DateTime? parseServerTime(dynamic v) {
  if (v == null) return null;
  if (v is DateTime) return v;
  if (v is int) return DateTime.fromMillisecondsSinceEpoch(v, isUtc: true);
  return DateTime.tryParse(v.toString());
}

/// Live 60-second corporate route offer (UI-04-01).
class CorporateOffer {
  CorporateOffer({
    required this.routeId,
    required this.deadline,
    this.offerId,
    this.tenantName,
    this.shiftDate,
    this.shiftTime,
    this.direction,
    this.passengerCount,
    this.stopsCount,
    this.totalDistanceMeters,
    this.targetPickup1Time,
    this.farePaise,
    this.originAddress,
    this.destinationAddress,
  });

  final String routeId;
  final String? offerId;
  final String? tenantName;
  final String? shiftDate;
  final String? shiftTime;
  final String? direction;
  final int? passengerCount;
  final int? stopsCount;
  final int? totalDistanceMeters;
  final DateTime? targetPickup1Time;
  final int? farePaise;
  final String? originAddress;
  final String? destinationAddress;

  /// Device-clock instant at which the server's offer expires.
  ///
  /// Derived from the server TTL (`remainingSeconds`) relative to the moment the response was
  /// received, so device clock skew does not shorten or extend the window. Falls back to the
  /// absolute `offerExpiresAt` when no TTL is supplied (realtime payloads).
  final DateTime deadline;

  bool get isLogout => (direction ?? '').toUpperCase() == 'LOGOUT';

  static CorporateOffer? fromJson(dynamic raw, {required DateTime receivedAt}) {
    final j = asJsonMap(raw);
    final routeId = _str(j['routeId']);
    if (routeId == null) return null;
    final remaining = _int(j['remainingSeconds'] ?? j['remainingTtlSeconds']);
    final expiresAt = parseServerTime(j['offerExpiresAt'] ?? j['expiresAt']);
    DateTime? deadline;
    if (remaining != null) {
      deadline = receivedAt.add(Duration(seconds: remaining < 0 ? 0 : remaining));
    } else if (expiresAt != null) {
      deadline = expiresAt.toLocal();
    }
    if (deadline == null) return null;
    return CorporateOffer(
      routeId: routeId,
      offerId: _str(j['id']),
      deadline: deadline,
      tenantName: _str(j['tenantName']),
      shiftDate: _str(j['shiftDate']),
      shiftTime: _str(j['shiftTime']),
      direction: _str(j['direction']),
      passengerCount: _int(j['passengerCount']),
      stopsCount: _int(j['stopsCount']),
      totalDistanceMeters: _int(j['totalDistanceMeters']),
      targetPickup1Time: parseServerTime(j['targetPickup1Time'])?.toLocal(),
      farePaise: _int(j['farePaise']),
      originAddress: _str(j['originAddress']),
      destinationAddress: _str(j['destinationAddress']),
    );
  }

  /// Parses either `GET driver-offers` (`{hasActiveOffer, offer}`) or `GET my-offer`
  /// (`{hasOffer, offer}`). Returns null when the server reports no live offer.
  static CorporateOffer? fromPendingResponse(dynamic raw, {required DateTime receivedAt}) {
    final j = asJsonMap(unwrapData(raw));
    final has = j['hasActiveOffer'] == true || j['hasOffer'] == true;
    if (!has || j['offer'] == null) return null;
    final offer = asJsonMap(j['offer']);
    if (_str(offer['routeId']) == null && _str(j['routeId']) != null) {
      offer['routeId'] = j['routeId'];
    }
    return fromJson(offer, receivedAt: receivedAt);
  }
}

/// Upcoming committed duty (GET /corporate/dispatch/driver-duties).
class CorporateDuty {
  CorporateDuty({
    required this.routeId,
    required this.status,
    this.tenantName,
    this.shiftDate,
    this.shiftTime,
    this.direction,
    this.vehicleCategory,
    this.targetPickup1Time,
    this.targetOfficeArrivalTime,
    this.estDistanceMeters,
    this.estDurationSeconds,
    this.passengerCount,
    this.stopsCount,
  });

  final String routeId;
  final String status;
  final String? tenantName;
  final String? shiftDate;
  final String? shiftTime;
  final String? direction;
  final String? vehicleCategory;
  final DateTime? targetPickup1Time;
  final DateTime? targetOfficeArrivalTime;
  final int? estDistanceMeters;
  final int? estDurationSeconds;
  final int? passengerCount;
  final int? stopsCount;

  bool get isInTransit => status.toUpperCase() == 'IN_TRANSIT';
  bool get isLogout => (direction ?? '').toUpperCase() == 'LOGOUT';

  static List<CorporateDuty> listFrom(dynamic raw) {
    final data = unwrapData(raw);
    if (data is! List) return const [];
    return data
        .map((e) {
          final j = asJsonMap(e);
          final id = _str(j['routeId'] ?? j['id']);
          if (id == null) return null;
          return CorporateDuty(
            routeId: id,
            status: _str(j['status']) ?? 'ASSIGNED',
            tenantName: _str(j['tenantName']),
            shiftDate: _str(j['shiftDate']),
            shiftTime: _str(j['shiftTime']),
            direction: _str(j['direction']),
            vehicleCategory: _str(j['vehicleCategory']),
            targetPickup1Time: parseServerTime(j['targetPickup1Time'])?.toLocal(),
            targetOfficeArrivalTime: parseServerTime(j['targetOfficeArrivalTime'])?.toLocal(),
            estDistanceMeters: _int(j['estDistanceMeters']),
            estDurationSeconds: _int(j['estDurationSeconds']),
            passengerCount: _int(j['passengerCount']),
            stopsCount: _int(j['stopsCount']),
          );
        })
        .whereType<CorporateDuty>()
        .toList();
  }
}

/// Route history row (GET /corporate/trips/driver/routes). Employee phone numbers in that
/// payload are intentionally not parsed.
class CorporateRouteSummary {
  CorporateRouteSummary({
    required this.routeId,
    required this.status,
    this.routeNumber,
    this.direction,
    this.shiftDate,
    this.shiftTime,
    this.passengerCount,
    this.stopsCount,
    this.officeName,
  });

  final String routeId;
  final String status;
  final String? routeNumber;
  final String? direction;
  final DateTime? shiftDate;
  final String? shiftTime;
  final int? passengerCount;
  final int? stopsCount;
  final String? officeName;

  static List<CorporateRouteSummary> listFrom(dynamic raw) {
    final data = unwrapData(raw);
    if (data is! List) return const [];
    return data
        .map((e) {
          final j = asJsonMap(e);
          final id = _str(j['routeId'] ?? j['id']);
          if (id == null) return null;
          return CorporateRouteSummary(
            routeId: id,
            status: _str(j['status']) ?? 'UNKNOWN',
            routeNumber: _str(j['routeNumber']),
            direction: _str(j['direction']),
            shiftDate: parseServerTime(j['shiftDate']),
            shiftTime: _str(j['shiftTime']),
            passengerCount: _int(j['passengerCount']),
            stopsCount: _int(j['stopsCount']),
            officeName: _str(j['office']),
          );
        })
        .whereType<CorporateRouteSummary>()
        .toList();
  }
}

enum CorporateStopStatus { pending, arrived, boarded, noShow, completed, cancelled, unknown }

CorporateStopStatus parseStopStatus(String? s) {
  switch ((s ?? '').toUpperCase()) {
    case 'PENDING':
      return CorporateStopStatus.pending;
    case 'ARRIVED':
      return CorporateStopStatus.arrived;
    case 'BOARDED':
      return CorporateStopStatus.boarded;
    case 'NO_SHOW':
      return CorporateStopStatus.noShow;
    case 'COMPLETED':
    case 'DROPPED':
      return CorporateStopStatus.completed;
    case 'CANCELLED':
      return CorporateStopStatus.cancelled;
    default:
      return CorporateStopStatus.unknown;
  }
}

class CorporateStop {
  CorporateStop({
    required this.stopId,
    required this.sequence,
    required this.status,
    required this.rawStatus,
    this.stopType,
    this.plannedEta,
    this.actualArrivalTime,
    this.actualDepartureTime,
    this.dwellBufferSeconds = 300,
    this.latitude,
    this.longitude,
    this.employeeName,
    this.pickupPoint,
  });

  final String stopId;
  final int sequence;
  final CorporateStopStatus status;
  final String rawStatus;
  final String? stopType;
  final DateTime? plannedEta;
  final DateTime? actualArrivalTime;
  final DateTime? actualDepartureTime;
  final int dwellBufferSeconds;
  final double? latitude;
  final double? longitude;

  /// Authorized employee info only: display name and pickup point.
  final String? employeeName;
  final String? pickupPoint;

  bool get isDropoff => (stopType ?? '').toUpperCase() == 'DROPOFF';
  bool get hasEmployee => employeeName != null;

  /// Boarding (OTP / no-show) applies to employee pickups the cab has arrived at.
  bool get awaitsBoarding => status == CorporateStopStatus.arrived && !isDropoff;

  bool get hasCoordinates => latitude != null && longitude != null;

  CorporateStop copyWith({String? stopType, String? employeeName, String? pickupPoint}) => CorporateStop(
        stopId: stopId,
        sequence: sequence,
        status: status,
        rawStatus: rawStatus,
        stopType: stopType ?? this.stopType,
        plannedEta: plannedEta,
        actualArrivalTime: actualArrivalTime,
        actualDepartureTime: actualDepartureTime,
        dwellBufferSeconds: dwellBufferSeconds,
        latitude: latitude,
        longitude: longitude,
        employeeName: employeeName ?? this.employeeName,
        pickupPoint: pickupPoint ?? this.pickupPoint,
      );
}

class CorporateOffice {
  CorporateOffice({this.name, this.addressText, this.latitude, this.longitude});
  final String? name;
  final String? addressText;
  final double? latitude;
  final double? longitude;
}

/// Active corporate route (GET /corporate/trips/driver/active-route), optionally enriched with
/// stop types and pickup addresses from GET routes/:id/waypoints.
class CorporateActiveRoute {
  CorporateActiveRoute({
    required this.routeId,
    required this.status,
    required this.stops,
    this.routeNumber,
    this.direction,
    this.shiftDate,
    this.shiftTime,
    this.vehicleCategory,
    this.assignedPassengerCount,
    this.targetPickup1Time,
    this.targetOfficeArrivalTime,
    this.office,
  });

  final String routeId;
  final String status;
  final List<CorporateStop> stops;
  final String? routeNumber;
  final String? direction;
  final DateTime? shiftDate;
  final String? shiftTime;
  final String? vehicleCategory;
  final int? assignedPassengerCount;
  final DateTime? targetPickup1Time;
  final DateTime? targetOfficeArrivalTime;
  final CorporateOffice? office;

  bool get isAssigned => status.toUpperCase() == 'ASSIGNED';
  bool get isInTransit => status.toUpperCase() == 'IN_TRANSIT';
  bool get isLogout => (direction ?? '').toUpperCase() == 'LOGOUT';

  /// The stop the driver is working on: an arrived stop awaiting boarding, else the next pending.
  CorporateStop? get currentStop {
    for (final s in stops) {
      if (s.awaitsBoarding) return s;
    }
    for (final s in stops) {
      if (s.status == CorporateStopStatus.pending) return s;
    }
    return null;
  }

  int get pendingStopsCount => stops.where((s) => s.status == CorporateStopStatus.pending).length;

  /// Server rule (completeRoute): no stop may remain PENDING.
  bool get canComplete => isInTransit && pendingStopsCount == 0;

  /// Returns null when the server reports `hasActiveRoute: false`.
  static CorporateActiveRoute? fromJson(dynamic raw) {
    final j = asJsonMap(unwrapData(raw));
    if (j['hasActiveRoute'] == false) return null;
    final routeId = _str(j['routeId'] ?? j['id']);
    if (routeId == null) return null;
    final stopsRaw = j['stops'] is List ? j['stops'] as List : const [];
    final stops = stopsRaw
        .map((e) {
          final s = asJsonMap(e);
          final id = _str(s['stopId'] ?? s['id']);
          if (id == null) return null;
          final passenger = asJsonMap(s['passenger']);
          return CorporateStop(
            stopId: id,
            sequence: _int(s['stopSequence'] ?? s['sequence']) ?? 0,
            rawStatus: _str(s['status']) ?? 'PENDING',
            status: parseStopStatus(_str(s['status'])),
            stopType: _str(s['stopType']),
            plannedEta: parseServerTime(s['plannedEta'])?.toLocal(),
            actualArrivalTime: parseServerTime(s['actualArrivalTime']),
            actualDepartureTime: parseServerTime(s['actualDepartureTime']),
            dwellBufferSeconds: (_int(s['dwellBufferSeconds']) ?? 0) > 0 ? _int(s['dwellBufferSeconds'])! : 300,
            latitude: _double(s['latitude']),
            longitude: _double(s['longitude']),
            employeeName: _str(passenger['name']),
          );
        })
        .whereType<CorporateStop>()
        .toList()
      ..sort((a, b) => a.sequence.compareTo(b.sequence));
    final office = asJsonMap(j['office']);
    return CorporateActiveRoute(
      routeId: routeId,
      status: _str(j['status']) ?? 'ASSIGNED',
      stops: stops,
      routeNumber: _str(j['routeNumber']),
      direction: _str(j['direction']),
      shiftDate: parseServerTime(j['shiftDate']),
      shiftTime: _str(j['shiftTime']),
      vehicleCategory: _str(j['vehicleCategory']),
      assignedPassengerCount: _int(j['assignedPassengerCount']),
      targetPickup1Time: parseServerTime(j['targetPickup1Time'])?.toLocal(),
      targetOfficeArrivalTime: parseServerTime(j['targetOfficeArrivalTime'])?.toLocal(),
      office: office.isEmpty
          ? null
          : CorporateOffice(
              name: _str(office['name']),
              addressText: _str(office['addressText']),
              latitude: _double(office['latitude']),
              longitude: _double(office['longitude']),
            ),
    );
  }

  /// Merges stop type, pickup address and employee name from the waypoints payload.
  CorporateActiveRoute withWaypoints(dynamic raw) {
    final j = asJsonMap(unwrapData(raw));
    final list = j['stops'] is List ? j['stops'] as List : const [];
    final byId = <String, Map<String, dynamic>>{};
    for (final e in list) {
      final m = asJsonMap(e);
      final id = _str(m['stopId']);
      if (id != null) byId[id] = m;
    }
    if (byId.isEmpty) return this;
    return CorporateActiveRoute(
      routeId: routeId,
      status: status,
      routeNumber: routeNumber,
      direction: direction,
      shiftDate: shiftDate,
      shiftTime: shiftTime,
      vehicleCategory: vehicleCategory,
      assignedPassengerCount: assignedPassengerCount,
      targetPickup1Time: targetPickup1Time,
      targetOfficeArrivalTime: targetOfficeArrivalTime,
      office: office,
      stops: stops.map((s) {
        final w = byId[s.stopId];
        if (w == null) return s;
        return s.copyWith(
          stopType: _str(w['stopType']),
          employeeName: s.employeeName ?? _str(w['employeeName']),
          pickupPoint: _str(w['addressText']),
        );
      }).toList(),
    );
  }
}

/// Corporate commute earnings summary (GET /corporate/billing/drivers/:driverId/earnings).
/// Amounts are integer paise serialized as strings.
class CorporateEarningsSummary {
  CorporateEarningsSummary({
    required this.totalRoutesCount,
    required this.totalEarnedPaise,
    required this.paidPaise,
    required this.unpaidPaise,
    required this.estimatedTdsPaise,
    required this.netPaidPaise,
    required this.netUnpaidPaise,
  });

  final int totalRoutesCount;
  final int totalEarnedPaise;
  final int paidPaise;
  final int unpaidPaise;
  final int estimatedTdsPaise;
  final int netPaidPaise;
  final int netUnpaidPaise;

  static CorporateEarningsSummary fromJson(dynamic raw) {
    final j = asJsonMap(unwrapData(raw));
    int p(String k) => _int(j[k]) ?? 0;
    return CorporateEarningsSummary(
      totalRoutesCount: p('totalRoutesCount'),
      totalEarnedPaise: p('totalEarnedPaise'),
      paidPaise: p('paidPaise'),
      unpaidPaise: p('unpaidPaise'),
      estimatedTdsPaise: p('estimatedTdsPaise'),
      netPaidPaise: p('netPaidPaise'),
      netUnpaidPaise: p('netUnpaidPaise'),
    );
  }
}

/// Formats integer paise as rupees without float rounding drift, e.g. 85000 -> "₹850.00".
String formatPaise(int paise) {
  final negative = paise < 0;
  final abs = paise.abs();
  final rupees = abs ~/ 100;
  final rem = (abs % 100).toString().padLeft(2, '0');
  final digits = rupees.toString();
  // Indian digit grouping: last 3, then groups of 2.
  String grouped;
  if (digits.length <= 3) {
    grouped = digits;
  } else {
    final last3 = digits.substring(digits.length - 3);
    var rest = digits.substring(0, digits.length - 3);
    final parts = <String>[];
    while (rest.length > 2) {
      parts.insert(0, rest.substring(rest.length - 2));
      rest = rest.substring(0, rest.length - 2);
    }
    if (rest.isNotEmpty) parts.insert(0, rest);
    grouped = '${parts.join(',')},$last3';
  }
  return '${negative ? '-' : ''}₹$grouped.$rem';
}

String formatDistanceMeters(int? meters) {
  if (meters == null) return '--';
  if (meters < 1000) return '$meters m';
  return '${(meters / 1000).toStringAsFixed(1)} km';
}

String formatClock(DateTime? t) {
  if (t == null) return '--:--';
  final l = t.toLocal();
  final h = l.hour % 12 == 0 ? 12 : l.hour % 12;
  final m = l.minute.toString().padLeft(2, '0');
  return '$h:$m ${l.hour < 12 ? 'AM' : 'PM'}';
}
