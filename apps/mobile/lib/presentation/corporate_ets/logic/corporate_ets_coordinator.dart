import 'dart:async';

import 'package:flutter/widgets.dart';

import '../data/corporate_errors.dart';
import '../data/corporate_ets_api.dart';
import '../data/corporate_models.dart';
import 'corporate_device.dart';
import 'corporate_realtime_client.dart';
import 'corporate_telemetry_scheduler.dart';
import 'corporate_timers.dart';

enum OfferActionOutcome {
  /// Server confirmed the decision (2xx).
  confirmed,

  /// Offer is no longer available (expired, withdrawn or taken): close the popup.
  unavailable,

  /// Transient conflict ("assignment in progress, please retry") or offline: offer still open.
  retry,

  /// Server refused for another reason while the offer is still live.
  failed,
}

class OfferActionResult {
  const OfferActionResult(this.outcome, [this.message]);
  final OfferActionOutcome outcome;
  final String? message;
}

/// App-wide state for the corporate ETS driver flow:
/// pending 60 s offer (restored from the server on start / resume / realtime reconnect),
/// upcoming duties (drives the home entry point), realtime events and the telemetry lifecycle.
///
/// The server is the only source of truth: nothing is marked accepted, started or boarded
/// before the corresponding API call returns 2xx.
class CorporateEtsCoordinator extends ChangeNotifier with WidgetsBindingObserver {
  CorporateEtsCoordinator({
    CorporateEtsApi? api,
    CorporateTelemetryScheduler? telemetry,
    DateTime Function()? clock,
  })  : api = api ?? DriverServiceCorporateEtsApi(),
        _clock = clock ?? DateTime.now {
    this.telemetry = telemetry ??
        CorporateTelemetryScheduler(api: this.api, source: GeolocatorTelemetrySource());
  }

  static CorporateEtsCoordinator? _instance;
  static CorporateEtsCoordinator get instance => _instance ??= CorporateEtsCoordinator();

  @visibleForTesting
  static set instance(CorporateEtsCoordinator value) => _instance = value;

  final CorporateEtsApi api;
  late final CorporateTelemetryScheduler telemetry;
  final DateTime Function() _clock;

  DateTime now() => _clock();

  CorporateOffer? _pendingOffer;
  List<CorporateDuty> _duties = const [];
  bool _dutiesLoaded = false;
  String? _presentedRouteId;
  bool _started = false;
  CorporateRealtimeClient? _realtime;
  final StreamController<CorporateRealtimeEvent> _events = StreamController<CorporateRealtimeEvent>.broadcast();

  /// serverClock - deviceClock, learned per stop from the arrive response.
  final Map<String, Duration> _stopClockOffsets = {};

  /// Shows the offer popup. Installed by the presentation layer (see CorporateOfferSheet).
  void Function(CorporateOffer offer)? presenter;

  CorporateOffer? get pendingOffer {
    final o = _pendingOffer;
    if (o != null && OfferCountdown(o.deadline).isExpired(now())) return null;
    return o;
  }

  List<CorporateDuty> get duties => _duties;
  bool get dutiesLoaded => _dutiesLoaded;

  /// Entry points are only shown to drivers with corporate work.
  bool get hasCorporateWork => pendingOffer != null || _duties.isNotEmpty;

  Stream<CorporateRealtimeEvent> get events => _events.stream;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /// Idempotent. Restores the pending offer and duties, and subscribes to realtime events.
  Future<void> start({
    Future<String?> Function()? tokenProvider,
    String? baseUrl,
  }) async {
    if (!_started) {
      _started = true;
      WidgetsBinding.instance.addObserver(this);
    }
    await Future.wait([
      restorePendingOffer().then((_) {}, onError: (_) {}),
      refreshDuties().then((_) {}, onError: (_) {}),
    ]);
    if (tokenProvider != null && baseUrl != null) {
      unawaited(_connectRealtime(tokenProvider, baseUrl));
    }
  }

  Future<void> _connectRealtime(Future<String?> Function() tokenProvider, String baseUrl) async {
    try {
      final driverId = await api.getDriverId();
      final token = await tokenProvider();
      if (driverId == null || token == null) return;
      _realtime ??= CorporateRealtimeClient(
        onEvent: (e) => handleRealtimeEvent(e.event, e.payload),
        // Reconnect: the stream may have missed an offer; re-sync from the server.
        onConnected: () => unawaited(restorePendingOffer().then((_) {}, onError: (_) {})),
      );
      _realtime!.connect(baseUrl: baseUrl, token: token, channel: 'driver:$driverId');
    } catch (e) {
      debugPrint('[CorporateEts] realtime subscribe skipped: $e');
    }
  }

  void stop() {
    if (_started) WidgetsBinding.instance.removeObserver(this);
    _started = false;
    _realtime?.disconnect();
    telemetry.stop();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      unawaited(restorePendingOffer().then((_) {}, onError: (_) {}));
      unawaited(refreshDuties().then((_) {}, onError: (_) {}));
    }
  }

  // ── Offers ────────────────────────────────────────────────────────────────

  /// Re-reads the pending offer from `GET /corporate/dispatch/driver-offers`.
  /// Throws [CorporateError] on failure (the last known offer is kept while offline).
  Future<CorporateOffer?> restorePendingOffer() async {
    try {
      final res = await api.getDriverOffers();
      final offer = CorporateOffer.fromPendingResponse(res, receivedAt: now());
      _setPendingOffer(offer);
      return pendingOffer;
    } catch (e) {
      throw CorporateError.from(e);
    }
  }

  void _setPendingOffer(CorporateOffer? offer) {
    final changed = offer?.routeId != _pendingOffer?.routeId || offer?.deadline != _pendingOffer?.deadline;
    _pendingOffer = offer;
    if (offer == null) {
      _presentedRouteId = null;
    } else if (offer.routeId != _presentedRouteId &&
        !OfferCountdown(offer.deadline).isExpired(now()) &&
        presenter != null) {
      _presentedRouteId = offer.routeId;
      presenter!(offer);
    }
    if (changed) notifyListeners();
  }

  /// Called by the popup when it closes, so a later offer for the same route can show again.
  void offerSheetClosed(String routeId) {
    if (_presentedRouteId == routeId) _presentedRouteId = null;
  }

  /// Marks [routeId] as already on screen (popup opened by navigation rather than [presenter]).
  void offerSheetOpened(String routeId) => _presentedRouteId = routeId;

  Future<OfferActionResult> acceptOffer(CorporateOffer offer) async {
    try {
      await api.acceptOffer(offer.routeId);
    } catch (e) {
      return _offerFailure(offer, CorporateError.from(e));
    }
    _pendingOffer = null;
    notifyListeners();
    unawaited(refreshDuties().then((_) {}, onError: (_) {}));
    return const OfferActionResult(OfferActionOutcome.confirmed, 'Route accepted and locked to you.');
  }

  Future<OfferActionResult> rejectOffer(CorporateOffer offer, {String? reason}) async {
    try {
      await api.rejectOffer(offer.routeId, reason: reason);
    } catch (e) {
      return _offerFailure(offer, CorporateError.from(e));
    }
    _pendingOffer = null;
    notifyListeners();
    return const OfferActionResult(OfferActionOutcome.confirmed, 'Offer declined.');
  }

  Future<OfferActionResult> _offerFailure(CorporateOffer offer, CorporateError err) async {
    if (err.isOffline) return OfferActionResult(OfferActionOutcome.retry, err.message);
    if (err.kind == CorporateErrorKind.conflict && err.message.toLowerCase().contains('retry')) {
      return OfferActionResult(OfferActionOutcome.retry, err.message);
    }
    // 409 (expired / withdrawn / taken) or 400 "expired or no longer valid": confirm with the server.
    CorporateOffer? live;
    try {
      final res = await api.getDriverOffers();
      live = CorporateOffer.fromPendingResponse(res, receivedAt: now());
    } catch (_) {
      live = null;
    }
    if (live != null && live.routeId == offer.routeId) {
      _pendingOffer = live;
      notifyListeners();
      return OfferActionResult(OfferActionOutcome.failed, err.message);
    }
    _pendingOffer = live;
    notifyListeners();
    return OfferActionResult(
      OfferActionOutcome.unavailable,
      err.kind == CorporateErrorKind.conflict || err.statusCode == 400
          ? 'This offer is no longer available: ${err.message}'
          : err.message,
    );
  }

  // ── Duties ────────────────────────────────────────────────────────────────

  Future<List<CorporateDuty>> refreshDuties() async {
    try {
      final res = await api.getDuties();
      _duties = CorporateDuty.listFrom(res);
      _dutiesLoaded = true;
      notifyListeners();
      return _duties;
    } catch (e) {
      throw CorporateError.from(e);
    }
  }

  // ── Realtime ──────────────────────────────────────────────────────────────

  void handleRealtimeEvent(String event, Map<String, dynamic> payload) {
    switch (event) {
      case 'CORPORATE_ROUTE_OFFER':
        // Never trust the pushed payload for the countdown; read the live TTL from the server.
        unawaited(restorePendingOffer().then((_) {}, onError: (_) {
          final o = CorporateOffer.fromJson(payload, receivedAt: now());
          if (o != null && _pendingOffer == null) _setPendingOffer(o);
        }));
        break;
      case 'CORPORATE_ROUTE_OFFER_WITHDRAWN':
        final routeId = payload['routeId']?.toString();
        if (routeId != null && _pendingOffer?.routeId == routeId) {
          _pendingOffer = null;
          notifyListeners();
        }
        break;
      case 'CORPORATE_ROUTE_CONFIRMED':
      case 'CORPORATE_ROUTE_UNASSIGNED':
        unawaited(refreshDuties().then((_) {}, onError: (_) {}));
        break;
    }
    if (!_events.isClosed) _events.add(CorporateRealtimeEvent(event, payload));
  }

  /// Entry for FCM data messages (`data.action`).
  void handlePushData(Map<String, dynamic> data) {
    final action = data['action']?.toString() ?? data['type']?.toString();
    if (action == null || !action.startsWith('CORPORATE_')) return;
    handleRealtimeEvent(action, data);
  }

  // ── Active route / telemetry ──────────────────────────────────────────────

  /// Keeps telemetry in step with the server route status: on while IN_TRANSIT, off otherwise.
  void syncActiveRoute(CorporateActiveRoute? route) {
    if (route != null && route.isInTransit) {
      telemetry.start(route.routeId);
    } else {
      telemetry.stop();
    }
  }

  void recordArrival(String stopId, DateTime serverArrival, DateTime deviceReceipt) {
    _stopClockOffsets[stopId] = serverArrival.difference(deviceReceipt);
  }

  Duration clockOffsetFor(String stopId) => _stopClockOffsets[stopId] ?? Duration.zero;

  @override
  void dispose() {
    stop();
    _events.close();
    super.dispose();
  }
}
