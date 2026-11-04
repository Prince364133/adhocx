import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';

import '../data/corporate_errors.dart';
import '../data/corporate_ets_api.dart';
import 'corporate_device.dart';

/// Posts live GPS telemetry for the active corporate route (DRV-11).
///
/// * one POST every [baseInterval] (20 s, inside the 15–30 s contract window);
/// * exponential back-off up to [maxInterval] while the network is poor or the server errors,
///   reset after the next success;
/// * stops by itself when the server says the route is gone or the session is no longer allowed
///   (401 / 403 / 404), and whenever [stop] is called (route completed, driver left the route).
///
/// Uses one-shot [Timer]s, so tests drive it with fake time.
class CorporateTelemetryScheduler {
  CorporateTelemetryScheduler({
    required CorporateEtsApi api,
    required CorporateTelemetrySource source,
    this.baseInterval = const Duration(seconds: 20),
    this.maxInterval = const Duration(seconds: 120),
  })  : _api = api,
        _source = source;

  final CorporateEtsApi _api;
  final CorporateTelemetrySource _source;
  final Duration baseInterval;
  final Duration maxInterval;

  String? _routeId;
  Timer? _timer;
  bool _inFlight = false;
  int _consecutiveFailures = 0;
  DateTime? _lastSentFixAt;
  int _generation = 0;

  String? get activeRouteId => _routeId;
  bool get isRunning => _routeId != null;
  int get consecutiveFailures => _consecutiveFailures;
  DateTime? get lastSentFixAt => _lastSentFixAt;

  /// Interval before the next attempt given the current failure streak.
  Duration get currentInterval {
    if (_consecutiveFailures == 0) return baseInterval;
    final factor = math.pow(2, _consecutiveFailures).toInt();
    final ms = baseInterval.inMilliseconds * factor;
    return Duration(milliseconds: math.min(ms, maxInterval.inMilliseconds));
  }

  /// Starts (or keeps) telemetry for [routeId]. Switching routes restarts cleanly.
  void start(String routeId) {
    if (_routeId == routeId) return;
    if (_routeId != null) stop();
    _routeId = routeId;
    _consecutiveFailures = 0;
    _lastSentFixAt = null;
    _generation++;
    unawaited(_source.start());
    _schedule(Duration.zero);
  }

  void stop() {
    if (_routeId == null && _timer == null) return;
    _timer?.cancel();
    _timer = null;
    _routeId = null;
    _generation++;
    unawaited(_source.stop());
  }

  void _schedule(Duration delay) {
    _timer?.cancel();
    final gen = _generation;
    _timer = Timer(delay, () {
      if (gen != _generation) return;
      unawaited(_tick(gen));
    });
  }

  Future<void> _tick(int gen) async {
    final routeId = _routeId;
    if (routeId == null || _inFlight) return;
    _inFlight = true;
    try {
      final fix = await _source.latestFix(maxAge: baseInterval + const Duration(seconds: 5));
      if (gen != _generation) return;
      if (fix == null) {
        // No GPS fix yet (permission pending / cold start): try again at the normal cadence.
        _schedule(baseInterval);
        return;
      }
      final battery = await _source.batteryPct();
      await _api.postTelemetry(routeId, fix.toTelemetryJson(batteryPct: battery));
      if (gen != _generation) return;
      _consecutiveFailures = 0;
      _lastSentFixAt = fix.recordedAt;
      _schedule(baseInterval);
    } catch (e) {
      if (gen != _generation) return;
      final err = CorporateError.from(e);
      final code = err.statusCode;
      if (code == 401 || code == 403 || code == 404) {
        debugPrint('[CorporateTelemetry] stopping for route $routeId: ${err.message}');
        stop();
        return;
      }
      _consecutiveFailures++;
      _schedule(currentInterval);
    } finally {
      _inFlight = false;
    }
  }
}
