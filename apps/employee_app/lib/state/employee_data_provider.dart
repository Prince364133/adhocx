import 'package:flutter/foundation.dart';
import '../repositories/http_employee_rider_repository.dart';

/// Shared live data store backed by [HttpEmployeeRiderRepository].
///
/// Caches the authenticated commuter's profile, next trip, live tracking,
/// schedule, trip history, support tickets, notifications, and route details
/// so all screens render real backend data with consistent loading/error states.
class EmployeeDataProvider extends ChangeNotifier {
  final HttpEmployeeRiderRepository _repository;

  EmployeeDataProvider({required HttpEmployeeRiderRepository repository})
      : _repository = repository;

  HttpEmployeeRiderRepository get repository => _repository;

  Map<String, dynamic>? _profile;
  Map<String, dynamic>? _nextTrip;
  Map<String, dynamic>? _activeTracking;
  Map<String, dynamic>? _scheduleResponse;
  List<Map<String, dynamic>> _tripsHistory = const [];
  List<Map<String, dynamic>> _tickets = const [];
  List<Map<String, dynamic>> _notifications = const [];
  final Map<String, Map<String, dynamic>> _routeDetailsCache = {};
  final Set<String> _readNotificationIds = {};

  bool _loadingProfile = false;
  bool _loadingNextTrip = false;
  bool _loadingTracking = false;
  bool _loadingSchedule = false;
  bool _loadingTripsHistory = false;
  bool _loadingTickets = false;
  bool _loadingNotifications = false;

  String? _profileError;
  String? _nextTripError;
  String? _trackingError;
  String? _scheduleError;
  String? _tripsHistoryError;
  String? _ticketsError;
  String? _notificationsError;

  // ─── Getters ──────────────────────────────────────────────────────────

  Map<String, dynamic>? get profile => _profile;
  Map<String, dynamic>? get nextTrip => _nextTrip;
  Map<String, dynamic>? get activeTracking => _activeTracking;
  Map<String, dynamic>? get scheduleResponse => _scheduleResponse;

  List<Map<String, dynamic>> get scheduleItems {
    final raw = _scheduleResponse?['schedule'];
    if (raw is List) {
      return raw
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    }
    return const [];
  }

  List<Map<String, dynamic>> get tripsHistory => _tripsHistory;
  List<Map<String, dynamic>> get tickets => _tickets;
  List<Map<String, dynamic>> get notifications => _notifications;

  bool get loadingProfile => _loadingProfile;
  bool get loadingNextTrip => _loadingNextTrip;
  bool get loadingTracking => _loadingTracking;
  bool get loadingSchedule => _loadingSchedule;
  bool get loadingTripsHistory => _loadingTripsHistory;
  bool get loadingTickets => _loadingTickets;
  bool get loadingNotifications => _loadingNotifications;

  String? get profileError => _profileError;
  String? get nextTripError => _nextTripError;
  String? get trackingError => _trackingError;
  String? get scheduleError => _scheduleError;
  String? get tripsHistoryError => _tripsHistoryError;
  String? get ticketsError => _ticketsError;
  String? get notificationsError => _notificationsError;

  bool get hasActiveTrip => _nextTrip?['hasActiveTrip'] == true;

  String? get activeStopId =>
      _nextTrip?['stopId']?.toString() ??
      _activeTracking?['stopId']?.toString();

  String? get activeRouteId =>
      _nextTrip?['routeId']?.toString() ??
      _activeTracking?['routeId']?.toString();

  int get unreadNotificationsCount {
    return _notifications.where((n) {
      final id = n['id']?.toString() ?? '';
      if (_readNotificationIds.contains(id)) return false;
      final isRead = n['read'] == true || n['isRead'] == true;
      return !isRead;
    }).length;
  }

  bool isNotificationUnread(Map<String, dynamic> n) {
    final id = n['id']?.toString() ?? '';
    if (_readNotificationIds.contains(id)) return false;
    return n['read'] != true && n['isRead'] != true;
  }

  void markAllNotificationsRead() {
    for (final n in _notifications) {
      final id = n['id']?.toString();
      if (id != null && id.isNotEmpty) {
        _readNotificationIds.add(id);
      }
    }
    notifyListeners();
  }

  void markNotificationRead(String id) {
    if (id.isNotEmpty && _readNotificationIds.add(id)) {
      notifyListeners();
    }
  }

  Map<String, dynamic>? cachedRouteDetails(String routeId) =>
      _routeDetailsCache[routeId];

  // ─── Loaders ──────────────────────────────────────────────────────────

  Future<Map<String, dynamic>?> loadProfile({bool force = false}) async {
    if (!force && _profile != null) return _profile;
    _loadingProfile = true;
    _profileError = null;
    notifyListeners();
    try {
      _profile = await _repository.getProfile();
      return _profile;
    } catch (e) {
      _profileError = _cleanError(e);
      debugPrint('[EmployeeDataProvider] loadProfile failed: $e');
      return _profile;
    } finally {
      _loadingProfile = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>> updateProfile({
    String? fullName,
    String? email,
    String? homeAddress,
  }) async {
    final updated = await _repository.updateProfile(
      fullName: fullName,
      email: email,
      homeAddress: homeAddress,
    );
    _profile = updated;
    notifyListeners();
    return updated;
  }

  Future<Map<String, dynamic>?> loadNextTrip({bool force = false}) async {
    if (!force && _nextTrip != null) return _nextTrip;
    _loadingNextTrip = true;
    _nextTripError = null;
    notifyListeners();
    try {
      _nextTrip = await _repository.getNextTrip();
      return _nextTrip;
    } catch (e) {
      _nextTripError = _cleanError(e);
      debugPrint('[EmployeeDataProvider] loadNextTrip failed: $e');
      return _nextTrip;
    } finally {
      _loadingNextTrip = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>?> loadTracking({
    String? tripOrStopId,
    bool force = false,
  }) async {
    String? targetId = tripOrStopId ?? activeStopId ?? activeRouteId;
    if (targetId == null || targetId.isEmpty) {
      await loadNextTrip(force: force);
      targetId = activeStopId ?? activeRouteId;
    }
    if (targetId == null || targetId.isEmpty) {
      _activeTracking = null;
      _trackingError = null;
      notifyListeners();
      return null;
    }
    if (!force &&
        _activeTracking != null &&
        (_activeTracking!['stopId'] == targetId ||
            _activeTracking!['routeId'] == targetId)) {
      return _activeTracking;
    }

    _loadingTracking = true;
    _trackingError = null;
    notifyListeners();
    try {
      _activeTracking = await _repository.getTripTracking(targetId);
      return _activeTracking;
    } catch (e) {
      _trackingError = _cleanError(e);
      debugPrint('[EmployeeDataProvider] loadTracking failed: $e');
      return _activeTracking;
    } finally {
      _loadingTracking = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>?> loadSchedule({
    DateTime? startDate,
    DateTime? endDate,
    bool force = false,
  }) async {
    if (!force &&
        _scheduleResponse != null &&
        startDate == null &&
        endDate == null) {
      return _scheduleResponse;
    }
    _loadingSchedule = true;
    _scheduleError = null;
    notifyListeners();
    try {
      _scheduleResponse = await _repository.getSchedule(
        startDate: startDate != null ? formatIsoDate(startDate) : null,
        endDate: endDate != null ? formatIsoDate(endDate) : null,
      );
      return _scheduleResponse;
    } catch (e) {
      _scheduleError = _cleanError(e);
      debugPrint('[EmployeeDataProvider] loadSchedule failed: $e');
      return _scheduleResponse;
    } finally {
      _loadingSchedule = false;
      notifyListeners();
    }
  }

  Future<List<Map<String, dynamic>>> loadTripsHistory({
    int limit = 50,
    int offset = 0,
    bool force = false,
  }) async {
    if (!force && _tripsHistory.isNotEmpty && offset == 0) {
      return _tripsHistory;
    }
    _loadingTripsHistory = true;
    _tripsHistoryError = null;
    notifyListeners();
    try {
      final raw = await _repository.getTripsHistory(
        limit: limit,
        offset: offset,
      );
      _tripsHistory = raw
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
      return _tripsHistory;
    } catch (e) {
      _tripsHistoryError = _cleanError(e);
      debugPrint('[EmployeeDataProvider] loadTripsHistory failed: $e');
      return _tripsHistory;
    } finally {
      _loadingTripsHistory = false;
      notifyListeners();
    }
  }

  Future<List<Map<String, dynamic>>> loadTickets({bool force = false}) async {
    if (!force && _tickets.isNotEmpty) return _tickets;
    _loadingTickets = true;
    _ticketsError = null;
    notifyListeners();
    try {
      final raw = await _repository.getTickets();
      _tickets = raw
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
      return _tickets;
    } catch (e) {
      _ticketsError = _cleanError(e);
      debugPrint('[EmployeeDataProvider] loadTickets failed: $e');
      return _tickets;
    } finally {
      _loadingTickets = false;
      notifyListeners();
    }
  }

  Future<List<Map<String, dynamic>>> loadNotifications({
    bool force = false,
  }) async {
    if (!force && _notifications.isNotEmpty) return _notifications;
    _loadingNotifications = true;
    _notificationsError = null;
    notifyListeners();
    try {
      final raw = await _repository.getNotifications();
      _notifications = raw
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
      return _notifications;
    } catch (e) {
      _notificationsError = _cleanError(e);
      debugPrint('[EmployeeDataProvider] loadNotifications failed: $e');
      return _notifications;
    } finally {
      _loadingNotifications = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>?> loadRouteDetails(
    String routeId, {
    bool force = false,
  }) async {
    if (!force && _routeDetailsCache.containsKey(routeId)) {
      return _routeDetailsCache[routeId];
    }
    try {
      final data = await _repository.getRouteDetails(routeId);
      _routeDetailsCache[routeId] = data;
      notifyListeners();
      return data;
    } catch (e) {
      debugPrint('[EmployeeDataProvider] loadRouteDetails($routeId) failed: $e');
      return _routeDetailsCache[routeId];
    }
  }

  /// Refreshes primary home dashboard data in parallel.
  Future<void> refreshHome() async {
    await Future.wait([
      loadProfile(force: true),
      loadNextTrip(force: true),
      loadNotifications(force: true),
    ]);
  }

  /// Cancels an upcoming stop and refreshes schedule + next trip caches.
  Future<Map<String, dynamic>> cancelStop(
    String stopId, {
    String? reason,
  }) async {
    final res = await _repository.cancelStop(stopId, reason: reason);
    await Future.wait([
      loadNextTrip(force: true),
      loadSchedule(force: true),
    ]);
    return res;
  }

  /// Reschedules a scheduled transport request and refreshes schedule.
  Future<Map<String, dynamic>> rescheduleRequest(
    String requestId,
    Map<String, dynamic> body,
  ) async {
    final res = await _repository.rescheduleRequest(requestId, body);
    await Future.wait([
      loadNextTrip(force: true),
      loadSchedule(force: true),
    ]);
    return res;
  }

  /// Clears all cached rider state on logout / account deletion.
  void clear() {
    _profile = null;
    _nextTrip = null;
    _activeTracking = null;
    _scheduleResponse = null;
    _tripsHistory = const [];
    _tickets = const [];
    _notifications = const [];
    _routeDetailsCache.clear();
    _readNotificationIds.clear();
    _profileError = null;
    _nextTripError = null;
    _trackingError = null;
    _scheduleError = null;
    _tripsHistoryError = null;
    _ticketsError = null;
    _notificationsError = null;
    notifyListeners();
  }

  // ─── Formatting Helpers ───────────────────────────────────────────────

  static String formatIsoDate(DateTime date) {
    final y = date.year.toString().padLeft(4, '0');
    final m = date.month.toString().padLeft(2, '0');
    final d = date.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }

  static String formatDisplayDate(String? isoDateOrTimestamp) {
    if (isoDateOrTimestamp == null || isoDateOrTimestamp.trim().isEmpty) {
      return '';
    }
    final dt = DateTime.tryParse(isoDateOrTimestamp.trim());
    if (dt == null) return isoDateOrTimestamp;
    final local = dt.isUtc ? dt.toLocal() : dt;
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return '${local.day} ${months[local.month - 1]} ${local.year}';
  }

  static String formatDisplayTime(String? raw) {
    if (raw == null || raw.trim().isEmpty) return '';
    final value = raw.trim();
    // Handle ISO timestamps
    final dt = DateTime.tryParse(value);
    if (dt != null) {
      final local = dt.isUtc ? dt.toLocal() : dt;
      return _formatHourMinute(local.hour, local.minute);
    }
    // Handle HH:mm or HH:mm:ss
    final hhmm = RegExp(r'^(\d{1,2}):(\d{2})').firstMatch(value);
    if (hhmm != null) {
      final hour = int.tryParse(hhmm.group(1)!) ?? 0;
      final minute = int.tryParse(hhmm.group(2)!) ?? 0;
      return _formatHourMinute(hour, minute);
    }
    return value;
  }

  static String _formatHourMinute(int hour, int minute) {
    final period = hour >= 12 ? 'PM' : 'AM';
    final h12 = hour % 12 == 0 ? 12 : hour % 12;
    final mStr = minute.toString().padLeft(2, '0');
    return '$h12:$mStr $period';
  }

  static String formatDirectionLabel(String? direction) {
    final upper = (direction ?? '').toUpperCase();
    if (upper == 'LOGIN' || upper == 'PICKUP') return 'Login (Pickup)';
    if (upper == 'LOGOUT' || upper == 'DROP') return 'Logout (Drop)';
    return direction?.isNotEmpty == true ? direction! : 'Commute Trip';
  }

  static String _cleanError(Object error) {
    return error.toString().replaceFirst('Exception: ', '');
  }
}
