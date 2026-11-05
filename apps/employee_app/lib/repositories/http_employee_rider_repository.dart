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

  /// Fetches upcoming 7-day shift rides schedule
  Future<Map<String, dynamic>> getSchedule({
    String? startDate,
    String? endDate,
  }) async {
    final params = <String, String>{};
    if (startDate != null) params['startDate'] = startDate;
    if (endDate != null) params['endDate'] = endDate;

    final res = await _client.get('/corporate/me/schedule', queryParams: params);
    return (res['data'] ?? res) as Map<String, dynamic>;
  }

  /// Fetches the next active or upcoming trip with driver, vehicle, and boarding OTP
  Future<Map<String, dynamic>> getNextTrip() async {
    final res = await _client.get('/corporate/me/trips/next');
    return (res['data'] ?? res) as Map<String, dynamic>;
  }

  /// Fetches past commute trip history
  Future<List<dynamic>> getTripsHistory({int limit = 20, int offset = 0}) async {
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
        'confirmed': confirmed,
        if (notes != null) 'notes': notes,
      },
    );
    return (res['data'] ?? res) as Map<String, dynamic>;
  }

  /// Submits 1-5 star rating and feedback for completed ride
  Future<Map<String, dynamic>> submitFeedback(
    String stopId, {
    required int rating,
    String? comment,
    List<String>? tags,
  }) async {
    final res = await _client.post(
      '/corporate/me/trips/$stopId/feedback',
      body: {
        'rating': rating,
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
}
