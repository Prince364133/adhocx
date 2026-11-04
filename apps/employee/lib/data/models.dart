import 'json.dart';

/// GET /corporate/me
class EmployeeProfile {
  final String employeeId;
  final String employeeCode;
  final String fullName;
  final String? email;
  final String? phoneNumber;
  final String? department;
  final String companyName;
  final String? companyCode;
  final String officeName;
  final String? officeAddress;
  final String? defaultPickupAddress;

  const EmployeeProfile({
    required this.employeeId,
    required this.employeeCode,
    required this.fullName,
    required this.companyName,
    required this.officeName,
    this.email,
    this.phoneNumber,
    this.department,
    this.companyCode,
    this.officeAddress,
    this.defaultPickupAddress,
  });

  factory EmployeeProfile.fromJson(Map<String, dynamic> j) {
    final tenant = asMap(j['tenant']);
    final office = asMap(j['office']);
    final pickup = asMap(j['defaultPickupLocation']);
    return EmployeeProfile(
      employeeId: strOr(j['employeeId'], ''),
      employeeCode: strOr(j['employeeCode'], '-'),
      fullName: strOr(j['fullName'], '-'),
      email: str(j['email']),
      phoneNumber: str(j['phoneNumber']),
      department: str(j['department']),
      companyName: strOr(tenant['name'], '-'),
      companyCode: str(tenant['code']),
      officeName: strOr(office['name'], '-'),
      officeAddress: str(office['addressText']),
      defaultPickupAddress: str(pickup['addressText']),
    );
  }
}

/// Whether a ride can still be cancelled / rescheduled, and why not.
class ModifyWindow {
  final bool allowed;
  final DateTime? cutoffAt;
  final String reason;

  const ModifyWindow({required this.allowed, required this.reason, this.cutoffAt});
}

/// One row of GET /corporate/me/schedule.
class ScheduleItem {
  final String requestId;
  final String date; // YYYY-MM-DD
  final String shiftTime; // HH:mm IST
  final String direction; // LOGIN | LOGOUT
  final String status; // request status
  final String? routeId;
  final DateTime? pickupTime;
  final DateTime? pickupAt;
  final String? pickupAddress;
  final String? officeAddress;
  final bool canModify;
  final DateTime? cancelCutoffAt;
  final int? cutoffHours;

  const ScheduleItem({
    required this.requestId,
    required this.date,
    required this.shiftTime,
    required this.direction,
    required this.status,
    required this.canModify,
    this.routeId,
    this.pickupTime,
    this.pickupAt,
    this.pickupAddress,
    this.officeAddress,
    this.cancelCutoffAt,
    this.cutoffHours,
  });

  factory ScheduleItem.fromJson(Map<String, dynamic> j) => ScheduleItem(
        requestId: strOr(j['requestId'], ''),
        date: strOr(j['date'], ''),
        shiftTime: strOr(j['shiftTime'], '--:--'),
        direction: strOr(j['direction'], 'LOGIN'),
        status: strOr(j['status'], 'APPROVED'),
        routeId: str(j['routeId']),
        pickupTime: time(j['pickupTime']),
        pickupAt: time(j['pickupAt']),
        pickupAddress: str(j['pickupAddress']),
        officeAddress: str(j['officeAddress']),
        // canModify is the cutoff contract; canCancel is the older field with the same meaning.
        canModify: j.containsKey('canModify') ? boolean(j['canModify']) : boolean(j['canCancel']),
        cancelCutoffAt: time(j['cancelCutoffAt']),
        cutoffHours: integer(j['cutoffHours']),
      );

  bool get isLogin => direction == 'LOGIN';

  /// The server decides ([canModify]); the client additionally locks the action the moment
  /// [cancelCutoffAt] passes while the screen is open, so it is never enabled after the cutoff.
  ModifyWindow modifyWindow(DateTime now) {
    const terminal = {'CANCELLED', 'COMPLETED', 'IN_PROGRESS', 'UNSERVED'};
    if (terminal.contains(status)) {
      return ModifyWindow(allowed: false, cutoffAt: cancelCutoffAt, reason: 'This ride can no longer be changed.');
    }
    final hours = cutoffHours ?? 9;
    final cutoff = cancelCutoffAt;
    if (cutoff != null && now.isAfter(cutoff)) {
      return ModifyWindow(
        allowed: false,
        cutoffAt: cutoff,
        reason: 'Changes closed $hours h before pickup. Contact your transport desk.',
      );
    }
    if (!canModify) {
      return ModifyWindow(
        allowed: false,
        cutoffAt: cutoff,
        reason: 'Changes closed $hours h before pickup. Contact your transport desk.',
      );
    }
    return ModifyWindow(
      allowed: true,
      cutoffAt: cutoff,
      reason: cutoff == null ? 'Cutoff time not provided by the server.' : 'You can cancel or reschedule until the cutoff.',
    );
  }
}

/// GET /corporate/me/trips/next (the driver phone is deliberately not read: never shown).
class NextTrip {
  final String stopId;
  final String routeId;
  final String routeNumber;
  final String direction;
  final String routeStatus;
  final String stopStatus;
  final int stopSequence;
  final DateTime? plannedEta;
  final DateTime? actualArrivalTime;
  final DateTime? actualDepartureTime;
  final String boardingOtp;
  final String pickupAddress;
  final double? pickupLat;
  final double? pickupLng;
  final String officeName;
  final String? officeAddress;
  final String? driverName;
  final String? vehiclePlate;
  final String? vehicleModel;
  final String? vehicleType;

  const NextTrip({
    required this.stopId,
    required this.routeId,
    required this.routeNumber,
    required this.direction,
    required this.routeStatus,
    required this.stopStatus,
    required this.stopSequence,
    required this.boardingOtp,
    required this.pickupAddress,
    required this.officeName,
    this.plannedEta,
    this.actualArrivalTime,
    this.actualDepartureTime,
    this.pickupLat,
    this.pickupLng,
    this.officeAddress,
    this.driverName,
    this.vehiclePlate,
    this.vehicleModel,
    this.vehicleType,
  });

  /// Null when the API says there is no active / upcoming trip.
  static NextTrip? fromJson(Map<String, dynamic> j) {
    if (!boolean(j['hasActiveTrip'])) return null;
    final pickup = asMap(j['pickupLocation']);
    final office = asMap(j['officeDestination']);
    final driver = asMap(j['driver']);
    final vehicle = asMap(j['vehicle']);
    return NextTrip(
      stopId: strOr(j['stopId'], ''),
      routeId: strOr(j['routeId'], ''),
      routeNumber: strOr(j['routeNumber'], '-'),
      direction: strOr(j['direction'], 'LOGIN'),
      routeStatus: strOr(j['routeStatus'], 'PLANNED'),
      stopStatus: strOr(j['stopStatus'], 'PENDING'),
      stopSequence: integer(j['stopSequence']) ?? 0,
      plannedEta: time(j['plannedEta']),
      actualArrivalTime: time(j['actualArrivalTime']),
      actualDepartureTime: time(j['actualDepartureTime']),
      boardingOtp: strOr(j['boardingOtp'], ''),
      pickupAddress: strOr(pickup['addressText'], 'Pickup point'),
      pickupLat: dbl(pickup['latitude']),
      pickupLng: dbl(pickup['longitude']),
      officeName: strOr(office['name'], 'Office'),
      officeAddress: str(office['addressText']),
      driverName: str(driver['name']),
      vehiclePlate: str(vehicle['registrationNumber']),
      vehicleModel: str(vehicle['model']),
      vehicleType: str(vehicle['vehicleType']),
    );
  }

  bool get isLogin => direction == 'LOGIN';
}

/// One row of GET /corporate/me/trips.
class TripSummary {
  final String stopId;
  final String routeId;
  final String? requestId;
  final String shiftDate;
  final String shiftTime;
  final String direction;
  final int stopSequence;
  final String status;
  final String routeStatus;
  final DateTime? plannedEta;
  final DateTime? actualArrivalTime;
  final DateTime? actualDepartureTime;
  final String pickupAddress;
  final String destination;
  final String? driverName;
  final double? driverRating;
  final String? vehiclePlate;
  final String? vehicleModel;
  final bool hasFeedback;
  final int? feedbackRating;
  final bool safeReachRequired;
  final bool safeReachConfirmed;
  final String? noShowReason;

  const TripSummary({
    required this.stopId,
    required this.routeId,
    required this.shiftDate,
    required this.shiftTime,
    required this.direction,
    required this.stopSequence,
    required this.status,
    required this.routeStatus,
    required this.pickupAddress,
    required this.destination,
    required this.hasFeedback,
    required this.safeReachRequired,
    required this.safeReachConfirmed,
    this.requestId,
    this.plannedEta,
    this.actualArrivalTime,
    this.actualDepartureTime,
    this.driverName,
    this.driverRating,
    this.vehiclePlate,
    this.vehicleModel,
    this.feedbackRating,
    this.noShowReason,
  });

  factory TripSummary.fromJson(Map<String, dynamic> j) {
    final driver = asMap(j['driver']);
    final vehicle = asMap(j['vehicle']);
    return TripSummary(
      stopId: strOr(j['stopId'], ''),
      routeId: strOr(j['routeId'], ''),
      requestId: str(j['requestId']),
      shiftDate: strOr(j['shiftDate'], ''),
      shiftTime: strOr(j['shiftTime'], '--:--'),
      direction: strOr(j['direction'], 'LOGIN'),
      stopSequence: integer(j['stopSequence']) ?? 0,
      status: strOr(j['status'], 'PENDING'),
      routeStatus: strOr(j['routeStatus'], 'PLANNED'),
      plannedEta: time(j['plannedEta']),
      actualArrivalTime: time(j['actualArrivalTime']),
      actualDepartureTime: time(j['actualDepartureTime']),
      pickupAddress: strOr(j['pickupAddress'], 'Pickup point'),
      destination: strOr(j['destinationAddress'], 'Office'),
      driverName: str(driver['fullName']),
      driverRating: dbl(driver['rating']),
      vehiclePlate: str(vehicle['plateNumber']),
      vehicleModel: str(vehicle['model']),
      hasFeedback: boolean(j['hasFeedback']),
      feedbackRating: integer(j['feedbackRating']),
      safeReachRequired: boolean(j['femaleSafeDropRequired']),
      safeReachConfirmed: boolean(j['femaleSafeDropConfirmed']),
      noShowReason: str(j['noShowReason']),
    );
  }
}

class GeoFix {
  final double latitude;
  final double longitude;
  final DateTime? recordedAt;
  final double? speedKph;
  final double? heading;

  const GeoFix({required this.latitude, required this.longitude, this.recordedAt, this.speedKph, this.heading});
}

class SosStatus {
  final String id;
  final String status;
  final DateTime? triggeredAt;

  const SosStatus({required this.id, required this.status, this.triggeredAt});

  static SosStatus? fromJson(Object? raw) {
    final j = asMap(raw);
    final id = str(j['id']);
    if (id == null) return null;
    return SosStatus(id: id, status: strOr(j['status'], 'NEW'), triggeredAt: time(j['triggeredAt'] ?? j['createdAt']));
  }

  bool get acknowledged => status != 'NEW' && status != 'ACTIVE';
}

/// GET /corporate/me/trips/:stopId/tracking (driver phone deliberately not read).
class RiderTracking {
  final String routeId;
  final String stopId;
  final String direction;
  final String routeStatus;
  final String stopStatus;
  final DateTime? plannedEta;
  final int? etaMinutes;
  final int? distanceMeters;
  final String boardingOtp;
  final String qrToken;
  final int? dwellRemainingSeconds;
  final bool isDriverArrived;
  final String? gpsState;
  final int? lastFixAgeSec;
  final GeoFix? driverLocation;
  final String? driverName;
  final String? driverPhotoUrl;
  final double? driverRating;
  final String? vehiclePlate;
  final String? vehicleModel;
  final String? vehicleColor;
  final String? vehicleCategory;
  final SosStatus? activeSos;
  final int coPassengersCount;

  const RiderTracking({
    required this.routeId,
    required this.stopId,
    required this.direction,
    required this.routeStatus,
    required this.stopStatus,
    required this.boardingOtp,
    required this.qrToken,
    required this.isDriverArrived,
    required this.coPassengersCount,
    this.plannedEta,
    this.etaMinutes,
    this.distanceMeters,
    this.dwellRemainingSeconds,
    this.gpsState,
    this.lastFixAgeSec,
    this.driverLocation,
    this.driverName,
    this.driverPhotoUrl,
    this.driverRating,
    this.vehiclePlate,
    this.vehicleModel,
    this.vehicleColor,
    this.vehicleCategory,
    this.activeSos,
  });

  factory RiderTracking.fromJson(Map<String, dynamic> j) {
    final loc = asMap(j['driverLocation']);
    final driver = asMap(j['driver']);
    final vehicle = asMap(j['vehicle']);
    final lat = dbl(loc['latitude']);
    final lng = dbl(loc['longitude']);
    return RiderTracking(
      routeId: strOr(j['routeId'], ''),
      stopId: strOr(j['stopId'], ''),
      direction: strOr(j['direction'], 'LOGIN'),
      routeStatus: strOr(j['routeStatus'], 'PLANNED'),
      stopStatus: strOr(j['stopStatus'], 'PENDING'),
      plannedEta: time(j['plannedEta']),
      etaMinutes: integer(j['estimatedArrivalMinutes']),
      distanceMeters: integer(j['distanceToPickupMeters']),
      boardingOtp: strOr(j['boardingOtp'], ''),
      qrToken: strOr(j['dynamicQrToken'], ''),
      dwellRemainingSeconds: integer(j['dwellRemainingSeconds']),
      isDriverArrived: boolean(j['isDriverArrived']),
      gpsState: str(j['gpsState']),
      lastFixAgeSec: integer(j['lastFixAgeSec']),
      driverLocation: (lat != null && lng != null)
          ? GeoFix(
              latitude: lat,
              longitude: lng,
              recordedAt: time(loc['updatedAt']),
              speedKph: dbl(loc['speedKmph']),
              heading: dbl(loc['heading']),
            )
          : null,
      driverName: str(driver['fullName']),
      driverPhotoUrl: str(driver['photoUrl']),
      driverRating: dbl(driver['rating']),
      vehiclePlate: str(vehicle['plateNumber']),
      vehicleModel: str(vehicle['model']),
      vehicleColor: str(vehicle['color']),
      vehicleCategory: str(vehicle['category']),
      activeSos: SosStatus.fromJson(j['activeSosAlert']),
      coPassengersCount: integer(j['coPassengersCount']) ?? 0,
    );
  }
}

/// GET /corporate/trips/routes/:routeId/tracking: authoritative GPS freshness.
class RouteGps {
  final String? gpsState;
  final int? lastFixAgeSec;
  final GeoFix? position;
  final DateTime? asOf;

  const RouteGps({this.gpsState, this.lastFixAgeSec, this.position, this.asOf});

  factory RouteGps.fromJson(Map<String, dynamic> j) {
    final p = asMap(j['position']);
    final lat = dbl(p['lat']);
    final lng = dbl(p['lng']);
    return RouteGps(
      gpsState: str(j['gpsState']),
      lastFixAgeSec: integer(j['lastFixAgeSec']),
      asOf: time(j['asOf']),
      position: (lat != null && lng != null)
          ? GeoFix(
              latitude: lat,
              longitude: lng,
              recordedAt: time(p['recordedAt']),
              speedKph: dbl(p['speedKph']),
              heading: dbl(p['heading']),
            )
          : null,
    );
  }
}

/// GET/POST /corporate/me/tickets
class SupportTicket {
  final String id;
  final String ticketNumber;
  final String category;
  final String priority;
  final String status;
  final String subject;
  final String description;
  final String? resolutionNotes;
  final int? slaMinutes;
  final DateTime? createdAt;
  final DateTime? resolvedAt;

  const SupportTicket({
    required this.id,
    required this.ticketNumber,
    required this.category,
    required this.priority,
    required this.status,
    required this.subject,
    required this.description,
    this.resolutionNotes,
    this.slaMinutes,
    this.createdAt,
    this.resolvedAt,
  });

  factory SupportTicket.fromJson(Map<String, dynamic> j) => SupportTicket(
        id: strOr(j['id'], ''),
        ticketNumber: strOr(j['ticketNumber'], '-'),
        category: strOr(j['category'], 'OTHER'),
        priority: strOr(j['priority'], 'MEDIUM'),
        status: strOr(j['status'], 'OPEN'),
        subject: strOr(j['subject'], '-'),
        description: strOr(j['description'], ''),
        resolutionNotes: str(j['resolutionNotes']),
        slaMinutes: integer(j['slaMinutes']),
        createdAt: time(j['createdAt']),
        resolvedAt: time(j['resolvedAt']),
      );
}

/// GET /corporate/me/notifications
class InboxItem {
  final String id;
  final String type;
  final String title;
  final String message;
  final DateTime? timestamp;

  const InboxItem({required this.id, required this.type, required this.title, required this.message, this.timestamp});

  factory InboxItem.fromJson(Map<String, dynamic> j) => InboxItem(
        id: strOr(j['id'], ''),
        type: strOr(j['type'], 'INFO'),
        title: strOr(j['title'], 'Notification'),
        message: strOr(j['message'], ''),
        timestamp: time(j['timestamp']),
      );
}

/// Ticket categories accepted by POST /corporate/me/tickets (@adhocx/contracts CorporateTicketCategory).
const ticketCategories = <String, String>{
  'CAB_DELAY': 'Cab delay',
  'DRIVER_BEHAVIOR': 'Driver behaviour',
  'ROUTE_ISSUE': 'Route issue',
  'LOST_ITEM': 'Lost item',
  'VEHICLE_CONDITION': 'Vehicle condition',
  'SAFETY_CONCERN': 'Safety concern',
  'BILLING': 'Billing',
  'OTHER': 'Other',
};
