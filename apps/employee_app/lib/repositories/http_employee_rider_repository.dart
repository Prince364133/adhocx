import 'dart:async';
import '../services/employee_api_client.dart';

class HttpEmployeeRiderRepository {
  final EmployeeApiClient _client;

  HttpEmployeeRiderRepository({EmployeeApiClient? client})
      : _client = client ?? EmployeeApiClient();

  /// Fetches commuter profile and organization details
  Future<Map<String, dynamic>> getProfile() async {
    final res = await _client.get('/corporate/me');
    return (res['data'] ?? res) as Map<String, dynamic>;
  }

  /// Updates commuter profile details and default pickup address
  Future<Map<String, dynamic>> updateProfile({
    String? fullName,
    String? email,
    String? homeAddress,
  }) async {
    final body = <String, dynamic>{};
    if (fullName != null) body['fullName'] = fullName;
    if (email != null) body['email'] = email;
    if (homeAddress != null) body['homeAddress'] = homeAddress;
    final res = await _client.patch('/corporate/me', body: body);
    return (res['data'] ?? res) as Map<String, dynamic>;
  }

  /// Fetches upcoming 7-day shift rides schedule
  Future<Map<String, dynamic>> getSchedule({
    String? startDate,
    String? endDate,
  }) async {
    final params = <String, String>{};
    if (startDate != null) params['startDate'] = startDate;
    if (endDate != null) params['endDate'] = endDate;

    final res =
        await _client.get('/corporate/me/schedule', queryParams: params);
    return (res['data'] ?? res) as Map<String, dynamic>;
  }

  /// Fetches the next active or upcoming trip with driver, vehicle, and boarding OTP
  Future<Map<String, dynamic>> getNextTrip() async {
    final res = await _client.get('/corporate/me/trips/next');
    return (res['data'] ?? res) as Map<String, dynamic>;
  }

  /// Fetches past commute trip history
  Future<List<dynamic>> getTripsHistory(
      {int limit = 20, int offset = 0}) async {
    final res = await _client.get(
      '/corporate/me/trips',
      queryParams: {'limit': limit.toString(), 'offset': offset.toString()},
    );
    final data = res['data'] ?? res;
    return data is List ? data : [];
  }

  /// Real-time live trip tracking with GPS, ETA, and dynamic QR token
  Future<Map<String, dynamic>> getTripTracking(String tripId) async {
    final res = await _client.get('/corporate/me/trips/$tripId/tracking');
    return (res['data'] ?? res) as Map<String, dynamic>;
  }

  /// Confirms safe residence entry for late-night commuters
  Future<Map<String, dynamic>> submitSafeReach(
    String stopId, {
    required bool confirmed,
    String? notes,
  }) async {
    final res = await _client.post(
      '/corporate/me/trips/$stopId/safe-reach',
      body: {
        'confirmedResidenceEntry': confirmed,
        if (notes != null) 'notes': notes,
      },
    );
    return (res['data'] ?? res) as Map<String, dynamic>;
  }

  /// Submits 1-5 star rating and feedback for completed ride
  Future<Map<String, dynamic>> submitFeedback(
    String stopId, {
    required int rating,
    bool? feltSafe,
    String? comment,
    List<String>? tags,
  }) async {
    final res = await _client.post(
      '/corporate/me/trips/$stopId/feedback',
      body: {
        'rating': rating,
        if (feltSafe != null) 'feltSafe': feltSafe,
        if (comment != null) 'comment': comment,
        if (tags != null) 'tags': tags,
      },
    );
    return (res['data'] ?? res) as Map<String, dynamic>;
  }

  /// Submits commuter support ticket
  Future<Map<String, dynamic>> createTicket({
    required String category,
    required String subject,
    required String description,
    String priority = 'MEDIUM',
  }) async {
    final res = await _client.post(
      '/corporate/me/tickets',
      body: {
        'category': category,
        'subject': subject,
        'description': description,
        'priority': priority,
      },
    );
    return (res['data'] ?? res) as Map<String, dynamic>;
  }

  /// Lists commuter support tickets
  Future<List<dynamic>> getTickets() async {
    final res = await _client.get('/corporate/me/tickets');
    final data = res['data'] ?? res;
    return data is List ? data : [];
  }

  /// Lists commuter notification events
  Future<List<dynamic>> getNotifications() async {
    final res = await _client.get('/corporate/me/notifications');
    final data = res['data'] ?? res;
    return data is List ? data : [];
  }

  /// Marks an in-app notification as read on the backend
  Future<void> markNotificationRead(String notificationId) async {
    await _client.patch('/notifications/in-app/$notificationId/read');
  }

  /// Marks all in-app notifications as read on the backend in a single request
  Future<void> markAllNotificationsRead() async {
    await _client.markAllNotificationsRead();
  }

  /// Persists notification channel preferences on the backend
  Future<Map<String, dynamic>> updateNotificationPreferences(
    Map<String, dynamic> preferences,
  ) async {
    final res = await _client.patch(
      '/notifications/preferences',
      body: preferences,
    );
    return (res['data'] ?? res) as Map<String, dynamic>;
  }

  /// Fetches rider-safe route details and ordered stops
  Future<Map<String, dynamic>> getRouteDetails(String routeId) async {
    final res = await _client.get('/corporate/routes/$routeId');
    return (res['data'] ?? res) as Map<String, dynamic>;
  }

  /// Cancels an upcoming commuter route stop
  Future<Map<String, dynamic>> cancelStop(
    String stopId, {
    String? reason,
  }) async {
    final res = await _client.post(
      '/corporate/me/trips/$stopId/cancel',
      body: {
        if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim(),
      },
    );
    return (res['data'] ?? res) as Map<String, dynamic>;
  }

  /// Reschedules a scheduled transport request
  Future<Map<String, dynamic>> rescheduleRequest(
    String requestId,
    Map<String, dynamic> body,
  ) async {
    final res = await _client.post(
      '/corporate/trips/requests/$requestId/reschedule',
      body: body,
    );
    return (res['data'] ?? res) as Map<String, dynamic>;
  }

  /// Triggers an emergency SOS alert for an active route
  Future<Map<String, dynamic>> triggerSos({
    required String routeId,
    required double latitude,
    required double longitude,
    String? reason,
  }) async {
    final res = await _client.post(
      '/corporate/safety/sos',
      body: {
        'routeId': routeId,
        'latitude': latitude,
        'longitude': longitude,
        if (reason != null && reason.trim().isNotEmpty)
          'triggerReason': reason.trim(),
      },
    );
    return (res['data'] ?? res) as Map<String, dynamic>;
  }

  /// Fetches details of a specific support ticket
  Future<Map<String, dynamic>> getTicketDetails(String ticketId) async {
    final res = await _client.get('/corporate/support/tickets/$ticketId');
    return (res['data'] ?? res) as Map<String, dynamic>;
  }

  /// Lists conversation messages for a support ticket
  Future<List<dynamic>> getTicketMessages(String ticketId) async {
    final res =
        await _client.get('/corporate/support/tickets/$ticketId/messages');
    final data = res['data'] ?? res;
    if (data is List) return data;
    if (data is Map && data['messages'] is List) {
      return data['messages'] as List<dynamic>;
    }
    return [];
  }

  /// Posts a message on a support ticket conversation
  Future<Map<String, dynamic>> sendTicketMessage(
    String ticketId,
    String message,
  ) async {
    final res = await _client.post(
      '/corporate/support/tickets/$ticketId/messages',
      body: {'message': message},
    );
    return (res['data'] ?? res) as Map<String, dynamic>;
  }
}
