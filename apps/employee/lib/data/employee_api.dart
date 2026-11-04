import '../core/api_client.dart';
import 'json.dart';
import 'models.dart';

/// Every employee endpoint used by the app. Real API calls only: no mock or demo data.
///
/// Canonical employee API: `/corporate/me/*` (apps/api corporate-rider.controller.ts).
/// Plus: reschedule / cancel and boarding QR (corporate-trip-execution.controller.ts),
/// route GPS freshness (corporate-tracking.controller.ts), SOS (corporate-safety.controller.ts)
/// and ticket detail (corporate-support-ticket.controller.ts).
class EmployeeApi {
  final ApiClient client;

  EmployeeApi(this.client);

  Future<ApiResponse<EmployeeProfile>> profile() async {
    final r = await client.get('/corporate/me');
    return ApiResponse(EmployeeProfile.fromJson(asMap(r.data)), r.serverTime);
  }

  /// [start] / [end] are IST calendar dates (YYYY-MM-DD).
  Future<ApiResponse<List<ScheduleItem>>> schedule({String? start, String? end}) async {
    final r = await client.get('/corporate/me/schedule', query: {
      if (start != null) 'startDate': start,
      if (end != null) 'endDate': end,
    });
    final items = asMapList(asMap(r.data)['schedule']).map(ScheduleItem.fromJson).toList();
    return ApiResponse(items, r.serverTime);
  }

  /// Null data = no active or upcoming trip.
  Future<ApiResponse<NextTrip?>> nextTrip() async {
    final r = await client.get('/corporate/me/trips/next');
    return ApiResponse(NextTrip.fromJson(asMap(r.data)), r.serverTime);
  }

  Future<ApiResponse<List<TripSummary>>> trips({int limit = 20, int offset = 0}) async {
    final r = await client.get('/corporate/me/trips', query: {'limit': '$limit', 'offset': '$offset'});
    return ApiResponse(asMapList(r.data).map(TripSummary.fromJson).toList(), r.serverTime);
  }

  Future<ApiResponse<RiderTracking>> tracking(String stopId) async {
    final r = await client.get('/corporate/me/trips/${Uri.encodeComponent(stopId)}/tracking');
    return ApiResponse(RiderTracking.fromJson(asMap(r.data)), r.serverTime);
  }

  Future<ApiResponse<RouteGps>> routeGps(String routeId) async {
    final r = await client.get('/corporate/trips/routes/${Uri.encodeComponent(routeId)}/tracking');
    return ApiResponse(RouteGps.fromJson(asMap(r.data)), r.serverTime);
  }

  /// Signed, time-limited boarding QR payload (5-minute TTL).
  Future<ApiResponse<({String payload, DateTime? expiresAt})>> boardingQr(String routeId, String stopId) async {
    final r = await client.get(
      '/corporate/trips/routes/${Uri.encodeComponent(routeId)}/stops/${Uri.encodeComponent(stopId)}/boarding-qr',
    );
    final j = asMap(r.data);
    return ApiResponse((payload: strOr(j['qrPayload'], ''), expiresAt: time(j['expiresAt'])), r.serverTime);
  }

  /// The API enforces the cutoff again and answers 400 "Modification locked" after it.
  Future<ApiResponse<dynamic>> cancelRequest({required String requestId, required String employeeId}) =>
      client.post('/corporate/trips/requests/${Uri.encodeComponent(requestId)}/reschedule', body: {
        'employeeId': employeeId,
        'action': 'CANCEL',
      });

  Future<ApiResponse<dynamic>> rescheduleRequest({
    required String requestId,
    required String employeeId,
    required String newShiftTime,
    String? newShiftDate,
  }) =>
      client.post('/corporate/trips/requests/${Uri.encodeComponent(requestId)}/reschedule', body: {
        'employeeId': employeeId,
        'action': 'RESCHEDULE',
        'newShiftTime': newShiftTime,
        if (newShiftDate != null) 'newShiftDate': newShiftDate,
      });

  Future<ApiResponse<dynamic>> confirmSafeReach(String stopId) =>
      client.post('/corporate/me/trips/${Uri.encodeComponent(stopId)}/safe-reach', body: {
        'confirmedResidenceEntry': true,
        'notes': 'Confirmed from the AdhocX Employee app',
      });

  Future<ApiResponse<dynamic>> submitFeedback(String stopId, {required int rating, List<String>? tags, String? comment}) =>
      client.post('/corporate/me/trips/${Uri.encodeComponent(stopId)}/feedback', body: {
        'rating': rating,
        if (tags != null && tags.isNotEmpty) 'tags': tags,
        if (comment != null && comment.trim().isNotEmpty) 'comment': comment.trim(),
      });

  /// POST /corporate/safety/sos. The DTO has no device-time field, so the device time is carried
  /// in `triggerReason` (broadcast to the command centre, not persisted on the alert).
  Future<ApiResponse<SosStatus?>> triggerSos({
    required String routeId,
    String? stopId,
    required double latitude,
    required double longitude,
    required String triggerReason,
  }) async {
    final r = await client.post('/corporate/safety/sos', body: {
      'routeId': routeId,
      if (stopId != null) 'stopId': stopId,
      'latitude': latitude,
      'longitude': longitude,
      'triggerReason': triggerReason,
    });
    return ApiResponse(SosStatus.fromJson(r.data), r.serverTime);
  }

  Future<ApiResponse<List<SupportTicket>>> tickets() async {
    final r = await client.get('/corporate/me/tickets');
    return ApiResponse(asMapList(r.data).map(SupportTicket.fromJson).toList(), r.serverTime);
  }

  Future<ApiResponse<SupportTicket>> ticket(String id) async {
    final r = await client.get('/corporate/support/tickets/${Uri.encodeComponent(id)}');
    return ApiResponse(SupportTicket.fromJson(asMap(r.data)), r.serverTime);
  }

  Future<ApiResponse<SupportTicket>> createTicket({
    required String category,
    required String subject,
    required String description,
    String? routeId,
    String? stopId,
  }) async {
    final r = await client.post('/corporate/me/tickets', body: {
      'category': category,
      'subject': subject,
      'description': description,
      if (routeId != null) 'routeId': routeId,
      if (stopId != null) 'stopId': stopId,
    });
    return ApiResponse(SupportTicket.fromJson(asMap(r.data)), r.serverTime);
  }

  Future<ApiResponse<List<InboxItem>>> notifications() async {
    final r = await client.get('/corporate/me/notifications');
    final items = asMapList(r.data).map(InboxItem.fromJson).toList()
      ..sort((a, b) => (b.timestamp ?? DateTime(0)).compareTo(a.timestamp ?? DateTime(0)));
    return ApiResponse(items, r.serverTime);
  }
}
