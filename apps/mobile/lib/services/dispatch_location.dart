import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

/// Where a dispatch-quality fix came from (matches the API's `source` field).
enum DispatchFixSource { gps, lastKnown }

extension DispatchFixSourceWire on DispatchFixSource {
  String get wire => this == DispatchFixSource.gps ? 'GPS' : 'LAST_KNOWN';
}

/// A position good enough to match the driver with nearby pickups.
class DispatchFix {
  const DispatchFix(this.position, this.source);
  final Position position;
  final DispatchFixSource source;
}

/// Rules for a location the dispatch engine may trust (docs/23_DISPATCH_PICKUP_RADIUS_RCA_AND_PLAN.md).
class DispatchLocationPolicy {
  /// A last-known fix older than this is not the driver's current position.
  static const Duration maxLastKnownAge = Duration(minutes: 2);

  /// Worse than this (metres) is a network/cell guess, not a GPS fix.
  static const double maxAccuracyM = 500;

  /// Picks the fix to report, or null when there is none worth reporting.
  ///
  /// Never invents a position: no IP geolocation, no default city. A null result means
  /// "don't send a location" so the server keeps the driver out of dispatch until a real fix arrives.
  static DispatchFix? select({Position? fresh, Position? lastKnown, DateTime? now}) {
    if (fresh != null && _plausible(fresh) && fresh.accuracy <= maxAccuracyM) {
      return DispatchFix(fresh, DispatchFixSource.gps);
    }
    if (lastKnown != null && _plausible(lastKnown) && lastKnown.accuracy <= maxAccuracyM) {
      final age = (now ?? DateTime.now()).difference(lastKnown.timestamp);
      if (!age.isNegative && age <= maxLastKnownAge) {
        return DispatchFix(lastKnown, DispatchFixSource.lastKnown);
      }
    }
    return null;
  }

  static bool _plausible(Position p) =>
      p.latitude.isFinite &&
      p.longitude.isFinite &&
      p.latitude.abs() <= 90 &&
      p.longitude.abs() <= 180 &&
      !(p.latitude == 0 && p.longitude == 0) &&
      p.accuracy.isFinite &&
      p.accuracy > 0;
}

typedef DispatchFixProvider = Future<DispatchFix?> Function();
typedef HeartbeatSender = Future<void> Function(DispatchFix fix);

/// Sends the driver's location while they are AVAILABLE and not on a trip, so the dispatch engine
/// matches them against where they actually are (not where they went online).
///
/// Every [interval] (and on each [movementTrigger] event, e.g. a position stream with a 100 m
/// distance filter) it reads a dispatch-quality fix and sends it. No fix → nothing is sent.
/// Sends never overlap; failures are logged and dropped (the next tick retries).
class DriverLocationHeartbeat {
  DriverLocationHeartbeat({
    required this.getFix,
    required this.send,
    this.interval = const Duration(seconds: 30),
    this.movementTriggerFactory,
  });

  final DispatchFixProvider getFix;
  final HeartbeatSender send;
  final Duration interval;

  /// Creates the movement stream on start (null in tests/web).
  final Stream<void> Function()? movementTriggerFactory;

  Timer? _timer;
  StreamSubscription<void>? _movementSub;
  bool _inFlight = false;

  bool get isRunning => _timer != null;

  /// Starts (idempotent) and sends one beat immediately.
  void start() {
    if (_timer != null) return;
    _timer = Timer.periodic(interval, (_) => beat());
    final factory = movementTriggerFactory;
    if (factory != null) {
      try {
        _movementSub = factory().listen((_) => beat(), onError: (Object e) {
          debugPrint('📍 [Heartbeat] movement stream error: $e');
        });
      } catch (e) {
        debugPrint('📍 [Heartbeat] movement stream unavailable: $e');
      }
    }
    beat();
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
    _movementSub?.cancel();
    _movementSub = null;
  }

  /// One heartbeat. Returns true when a location was sent.
  Future<bool> beat() async {
    if (_inFlight) return false;
    _inFlight = true;
    try {
      final fix = await getFix();
      if (fix == null) return false;
      await send(fix);
      return true;
    } catch (e) {
      debugPrint('📍 [Heartbeat] location heartbeat failed: $e');
      return false;
    } finally {
      _inFlight = false;
    }
  }
}
