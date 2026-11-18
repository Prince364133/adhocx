import 'dart:async';
import 'dart:collection';
import 'package:flutter/foundation.dart';
import '../repositories/http_employee_rider_repository.dart';

/// Shared live data store backed by [HttpEmployeeRiderRepository].
///
/// Caches the authenticated commuter's profile, next trip, live tracking,
/// schedule, trip history, support tickets, notifications, and route details
/// with in-flight request deduplication, short per-resource TTL caching,
/// LRU-capped route detail cache, and batched notifications for multi-fetch
/// refreshes.
class EmployeeDataProvider extends ChangeNotifier {
  static const Duration _profileTtl = Duration(minutes: 5);
  static const Duration _nextTripTtl = Duration(seconds: 30);
  static const Duration _trackingTtl = Duration(seconds: 10);
  static const Duration _scheduleTtl = Duration(seconds: 60);
  static const Duration _tripsHistoryTtl = Duration(minutes: 2);
  static const Duration _ticketsTtl = Duration(seconds: 30);
  static const Duration _notificationsTtl = Duration(seconds: 30);
  static const Duration _routeDetailsTtl = Duration(minutes: 5);
  static const int maxRouteDetailsCacheEntries = 20;

  final HttpEmployeeRiderRepository _repository;
  final DateTime Function() _now;

  EmployeeDataProvider({
    required HttpEmployeeRiderRepository repository,
    DateTime Function()? clock,
  })  : _repository = repository,
        _now = clock ?? DateTime.now;

  HttpEmployeeRiderRepository get repository => _repository;

  Map<String, dynamic>? _profile;
  Map<String, dynamic>? _nextTrip;
  Map<String, dynamic>? _activeTracking;
  Map<String, dynamic>? _scheduleResponse;
  List<Map<String, dynamic>> _scheduleItems = const [];
  List<Map<String, dynamic>> _tripsHistory = const [];
  List<Map<String, dynamic>> _tickets = const [];
  List<Map<String, dynamic>> _notifications = const [];
  int _unreadCount = 0;
  final LinkedHashMap<String, Map<String, dynamic>> _routeDetailsCache =
      LinkedHashMap();
  final Set<String> _readNotificationIds = {};

  final Map<String, Future<dynamic>> _inFlight = {};
  final Map<String, DateTime> _fetchedAt = {};
  int _generation = 0;
  int _notifyBatchDepth = 0;
  bool _pendingNotify = false;
  bool _disposed = false;

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

  List<Map<String, dynamic>> get scheduleItems => _scheduleItems;

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

  int get unreadNotificationsCount => _unreadCount;

  @visibleForTesting
  int get routeDetailsCacheLength => _routeDetailsCache.length;

  bool isNotificationUnread(Map<String, dynamic> n) {
    final id = n['id']?.toString() ?? '';
    if (_readNotificationIds.contains(id)) return false;
    return n['read'] != true && n['isRead'] != true;
  }

  void _recomputeUnreadCount() {
    var count = 0;
    for (final n in _notifications) {
      if (isNotificationUnread(n)) count++;
    }
    _unreadCount = count;
  }

  void _rebuildScheduleItems() {
    final raw = _scheduleResponse?['schedule'];
    if (raw is List) {
      _scheduleItems = List<Map<String, dynamic>>.unmodifiable(
        raw.whereType<Map>().map((e) => Map<String, dynamic>.from(e)),
      );
    } else {
      _scheduleItems = const [];
    }
  }

  bool _isFresh(String key, Duration ttl) {
    final fetched = _fetchedAt[key];
    if (fetched == null) return false;
    return _now().difference(fetched) < ttl;
  }

  void _notify() {
    if (_disposed) return;
    if (_notifyBatchDepth > 0) {
      _pendingNotify = true;
      return;
    }
    notifyListeners();
  }

  Future<T> _batchNotifications<T>(Future<T> Function() action) async {
    _notifyBatchDepth++;
    try {
      return await action();
    } finally {
      _notifyBatchDepth--;
      if (_notifyBatchDepth == 0 && _pendingNotify && !_disposed) {
        _pendingNotify = false;
        notifyListeners();
      }
    }
  }

  Future<T> _dedupe<T>(String key, Future<T> Function() run) {
    final existing = _inFlight[key];
    if (existing != null) {
      return existing as Future<T>;
    }
    final completer = Completer<T>();
    final future = completer.future;
    _inFlight[key] = future;
    Future<T>.sync(run).then(
      (value) {
        if (identical(_inFlight[key], future)) {
          _inFlight.remove(key);
        }
        if (!completer.isCompleted) completer.complete(value);
      },
      onError: (Object error, StackTrace stackTrace) {
        if (identical(_inFlight[key], future)) {
          _inFlight.remove(key);
        }
        if (!completer.isCompleted) {
          completer.completeError(error, stackTrace);
        }
      },
    );
    return future;
  }

  Map<String, dynamic>? _touchRouteCache(String routeId) {
    final value = _routeDetailsCache.remove(routeId);
    if (value != null) {
      _routeDetailsCache[routeId] = value;
    }
    return value;
  }

  void _putRouteCache(String routeId, Map<String, dynamic> data) {
    _routeDetailsCache.remove(routeId);
    _routeDetailsCache[routeId] = data;
    while (_routeDetailsCache.length > maxRouteDetailsCacheEntries) {
      final oldestKey = _routeDetailsCache.keys.first;
      _routeDetailsCache.remove(oldestKey);
      _fetchedAt.remove('routeDetails:$oldestKey');
    }
  }

  Future<void> markAllNotificationsRead() async {
    var hasUnread = false;
    for (final n in _notifications) {
      final id = n['id']?.toString();
      if (isNotificationUnread(n)) {
        if (id != null && id.isNotEmpty) {
          _readNotificationIds.add(id);
        }
        n['isRead'] = true;
        n['read'] = true;
        hasUnread = true;
      }
    }
    if (!hasUnread) return;
    _unreadCount = 0;
    _notify();
    try {
      await _repository.markAllNotificationsRead();
    } catch (e) {
      debugPrint(
          '[EmployeeDataProvider] markAllNotificationsRead() failed: $e');
    }
  }

  Future<void> markNotificationRead(String id) async {
    if (id.isEmpty) return;
    final changed = _readNotificationIds.add(id);
    for (final n in _notifications) {
      if (n['id']?.toString() == id) {
        n['isRead'] = true;
        n['read'] = true;
      }
    }
    if (changed) {
      _recomputeUnreadCount();
      _notify();
    }
    try {
      await _repository.markNotificationRead(id);
    } catch (e) {
      debugPrint('[EmployeeDataProvider] markNotificationRead($id) failed: $e');
    }
  }

  Map<String, dynamic>? cachedRouteDetails(String routeId) =>
      _touchRouteCache(routeId);

  // ─── Loaders ──────────────────────────────────────────────────────────

  Future<Map<String, dynamic>?> loadProfile({bool force = false}) {
    const key = 'profile';
    if (_inFlight.containsKey(key)) {
      return _inFlight[key]! as Future<Map<String, dynamic>?>;
    }
    if (!force && _profile != null && _isFresh(key, _profileTtl)) {
      return Future.value(_profile);
    }
    return _dedupe<Map<String, dynamic>?>(key, () async {
      final gen = _generation;
      _loadingProfile = true;
      _profileError = null;
      _notify();
      try {
        final result = await _repository.getProfile();
        if (gen != _generation) return _profile;
        _profile = result;
        _fetchedAt[key] = _now();
        return _profile;
      } catch (e) {
        if (gen == _generation) {
          _profileError = _cleanError(e);
          debugPrint('[EmployeeDataProvider] loadProfile failed: $e');
        }
        return _profile;
      } finally {
        if (gen == _generation) {
          _loadingProfile = false;
          _notify();
        }
      }
    });
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
    _fetchedAt['profile'] = _now();
    _notify();
    return updated;
  }

  Future<Map<String, dynamic>?> loadNextTrip({bool force = false}) {
    const key = 'nextTrip';
    if (_inFlight.containsKey(key)) {
      return _inFlight[key]! as Future<Map<String, dynamic>?>;
    }
    if (!force && _nextTrip != null && _isFresh(key, _nextTripTtl)) {
      return Future.value(_nextTrip);
    }
    return _dedupe<Map<String, dynamic>?>(key, () async {
      final gen = _generation;
      _loadingNextTrip = true;
      _nextTripError = null;
      _notify();
      try {
        final result = await _repository.getNextTrip();
        if (gen != _generation) return _nextTrip;
        _nextTrip = result;
        _fetchedAt[key] = _now();
        return _nextTrip;
      } catch (e) {
        if (gen == _generation) {
          _nextTripError = _cleanError(e);
          debugPrint('[EmployeeDataProvider] loadNextTrip failed: $e');
        }
        return _nextTrip;
      } finally {
        if (gen == _generation) {
          _loadingNextTrip = false;
          _notify();
        }
      }
    });
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
      _notify();
      return null;
    }
    final key = 'tracking:$targetId';
    if (_inFlight.containsKey(key)) {
      return _inFlight[key]! as Future<Map<String, dynamic>?>;
    }
    if (!force &&
        _activeTracking != null &&
        (_activeTracking!['stopId'] == targetId ||
            _activeTracking!['routeId'] == targetId) &&
        _isFresh(key, _trackingTtl)) {
      return _activeTracking;
    }

    final resolvedTargetId = targetId;
    return _dedupe<Map<String, dynamic>?>(key, () async {
      final gen = _generation;
      _loadingTracking = true;
      _trackingError = null;
      _notify();
      try {
        final result = await _repository.getTripTracking(resolvedTargetId);
        if (gen != _generation) return _activeTracking;
        _activeTracking = result;
        _fetchedAt[key] = _now();
        return _activeTracking;
      } catch (e) {
        if (gen == _generation) {
          _trackingError = _cleanError(e);
          debugPrint('[EmployeeDataProvider] loadTracking failed: $e');
        }
        return _activeTracking;
      } finally {
        if (gen == _generation) {
          _loadingTracking = false;
          _notify();
        }
      }
    });
  }

  Future<Map<String, dynamic>?> loadSchedule({
    DateTime? startDate,
    DateTime? endDate,
    bool force = false,
  }) {
    final startStr = startDate != null ? formatIsoDate(startDate) : null;
    final endStr = endDate != null ? formatIsoDate(endDate) : null;
    final key = 'schedule:${startStr ?? ''}:${endStr ?? ''}';
    if (_inFlight.containsKey(key)) {
      return _inFlight[key]! as Future<Map<String, dynamic>?>;
    }
    if (!force &&
        _scheduleResponse != null &&
        startStr == null &&
        endStr == null &&
        _isFresh(key, _scheduleTtl)) {
      return Future.value(_scheduleResponse);
    }
    return _dedupe<Map<String, dynamic>?>(key, () async {
      final gen = _generation;
      _loadingSchedule = true;
      _scheduleError = null;
      _notify();
      try {
        final result = await _repository.getSchedule(
          startDate: startStr,
          endDate: endStr,
        );
        if (gen != _generation) return _scheduleResponse;
        _scheduleResponse = result;
        _rebuildScheduleItems();
        _fetchedAt[key] = _now();
        return _scheduleResponse;
      } catch (e) {
        if (gen == _generation) {
          _scheduleError = _cleanError(e);
          debugPrint('[EmployeeDataProvider] loadSchedule failed: $e');
        }
        return _scheduleResponse;
      } finally {
        if (gen == _generation) {
          _loadingSchedule = false;
          _notify();
        }
      }
    });
  }

  Future<List<Map<String, dynamic>>> loadTripsHistory({
    int limit = 50,
    int offset = 0,
    bool force = false,
  }) {
    final key = 'tripsHistory:$limit:$offset';
    if (_inFlight.containsKey(key)) {
      return _inFlight[key]! as Future<List<Map<String, dynamic>>>;
    }
    if (!force && offset == 0 && _isFresh(key, _tripsHistoryTtl)) {
      return Future.value(_tripsHistory);
    }
    return _dedupe<List<Map<String, dynamic>>>(key, () async {
      final gen = _generation;
      _loadingTripsHistory = true;
      _tripsHistoryError = null;
      _notify();
      try {
        final raw = await _repository.getTripsHistory(
          limit: limit,
          offset: offset,
        );
        if (gen != _generation) return _tripsHistory;
        _tripsHistory = raw
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
        _fetchedAt[key] = _now();
        return _tripsHistory;
      } catch (e) {
        if (gen == _generation) {
          _tripsHistoryError = _cleanError(e);
          debugPrint('[EmployeeDataProvider] loadTripsHistory failed: $e');
        }
        return _tripsHistory;
      } finally {
        if (gen == _generation) {
          _loadingTripsHistory = false;
          _notify();
        }
      }
    });
  }

  Future<List<Map<String, dynamic>>> loadTickets({bool force = false}) {
    const key = 'tickets';
    if (_inFlight.containsKey(key)) {
      return _inFlight[key]! as Future<List<Map<String, dynamic>>>;
    }
    if (!force && _isFresh(key, _ticketsTtl)) {
      return Future.value(_tickets);
    }
    return _dedupe<List<Map<String, dynamic>>>(key, () async {
      final gen = _generation;
      _loadingTickets = true;
      _ticketsError = null;
      _notify();
      try {
        final raw = await _repository.getTickets();
        if (gen != _generation) return _tickets;
        _tickets = raw
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
        _fetchedAt[key] = _now();
        return _tickets;
      } catch (e) {
        if (gen == _generation) {
          _ticketsError = _cleanError(e);
          debugPrint('[EmployeeDataProvider] loadTickets failed: $e');
        }
        return _tickets;
      } finally {
        if (gen == _generation) {
          _loadingTickets = false;
          _notify();
        }
      }
    });
  }

  Future<List<Map<String, dynamic>>> loadNotifications({
    bool force = false,
  }) {
    const key = 'notifications';
    if (_inFlight.containsKey(key)) {
      return _inFlight[key]! as Future<List<Map<String, dynamic>>>;
    }
    if (!force && _isFresh(key, _notificationsTtl)) {
      return Future.value(_notifications);
    }
    return _dedupe<List<Map<String, dynamic>>>(key, () async {
      final gen = _generation;
      _loadingNotifications = true;
      _notificationsError = null;
      _notify();
      try {
        final raw = await _repository.getNotifications();
        if (gen != _generation) return _notifications;
        _notifications = raw
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList();
        _recomputeUnreadCount();
        _fetchedAt[key] = _now();
        return _notifications;
      } catch (e) {
        if (gen == _generation) {
          _notificationsError = _cleanError(e);
          debugPrint('[EmployeeDataProvider] loadNotifications failed: $e');
        }
        return _notifications;
      } finally {
        if (gen == _generation) {
          _loadingNotifications = false;
          _notify();
        }
      }
    });
  }

  Future<Map<String, dynamic>?> loadRouteDetails(
    String routeId, {
    bool force = false,
  }) {
    final key = 'routeDetails:$routeId';
    if (_inFlight.containsKey(key)) {
      return _inFlight[key]! as Future<Map<String, dynamic>?>;
    }
    if (!force &&
        _routeDetailsCache.containsKey(routeId) &&
        _isFresh(key, _routeDetailsTtl)) {
      return Future.value(_touchRouteCache(routeId));
    }
    return _dedupe<Map<String, dynamic>?>(key, () async {
      final gen = _generation;
      try {
        final data = await _repository.getRouteDetails(routeId);
        if (gen != _generation) return _routeDetailsCache[routeId];
        _putRouteCache(routeId, data);
        _fetchedAt[key] = _now();
        _notify();
        return data;
      } catch (e) {
        debugPrint(
            '[EmployeeDataProvider] loadRouteDetails($routeId) failed: $e');
        return _routeDetailsCache[routeId];
      }
    });
  }

  /// Refreshes primary home dashboard data in parallel with batched
  /// listener notifications to avoid redundant widget rebuild storms.
  Future<void> refreshHome({bool force = true}) async {
    await _batchNotifications(() async {
      await Future.wait([
        loadProfile(force: force),
        loadNextTrip(force: force),
        loadNotifications(force: force),
      ]);
    });
  }

  /// Cancels an upcoming stop and refreshes schedule + next trip caches.
  Future<Map<String, dynamic>> cancelStop(
    String stopId, {
    String? reason,
  }) async {
    final res = await _repository.cancelStop(stopId, reason: reason);
    await _batchNotifications(() async {
      await Future.wait([
        loadNextTrip(force: true),
        loadSchedule(force: true),
      ]);
    });
    return res;
  }

  /// Reschedules a scheduled transport request and refreshes schedule.
  Future<Map<String, dynamic>> rescheduleRequest(
    String requestId,
    Map<String, dynamic> body,
  ) async {
    final res = await _repository.rescheduleRequest(requestId, body);
    await _batchNotifications(() async {
      await Future.wait([
        loadNextTrip(force: true),
        loadSchedule(force: true),
      ]);
    });
    return res;
  }

  /// Clears all cached rider state on logout / account deletion.
  void clear() {
    _generation++;
    _inFlight.clear();
    _fetchedAt.clear();
    _profile = null;
    _nextTrip = null;
    _activeTracking = null;
    _scheduleResponse = null;
    _scheduleItems = const [];
    _tripsHistory = const [];
    _tickets = const [];
    _notifications = const [];
    _unreadCount = 0;
    _routeDetailsCache.clear();
    _readNotificationIds.clear();
    _loadingProfile = false;
    _loadingNextTrip = false;
    _loadingTracking = false;
    _loadingSchedule = false;
    _loadingTripsHistory = false;
    _loadingTickets = false;
    _loadingNotifications = false;
    _profileError = null;
    _nextTripError = null;
    _trackingError = null;
    _scheduleError = null;
    _tripsHistoryError = null;
    _ticketsError = null;
    _notificationsError = null;
    _notify();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
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
