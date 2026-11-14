import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

/// The app's single device-location stream for the driver (idle heartbeat, trip pinger, trip map).
///
/// Why this exists: geolocator on Android keeps ONE platform position stream and hands it to every
/// caller, whatever settings they ask for; the first subscriber's settings win. Before this hub the
/// trip pinger opened it with a 50 m filter, so the trip map got at most one fix per 50 m and the
/// driver arrow jumped. The hub owns that stream, picks settings from the strictest live demand, and
/// fans positions out in Dart.
///
/// - `precise` demand (on-trip pinger, any visible trip map): ~1 s / 2 m, navigation-grade.
/// - coarse demand only (idle heartbeat): 100 m filter, same battery cost as before.
/// - no demand: the platform stream is closed.
class LiveLocationHub {
  LiveLocationHub({Stream<Position> Function(LocationSettings settings)? streamFactory})
      : _streamFactory = streamFactory ?? ((s) => Geolocator.getPositionStream(locationSettings: s));

  static final LiveLocationHub instance = LiveLocationHub();

  final Stream<Position> Function(LocationSettings settings) _streamFactory;
  final Set<_Watcher> _watchers = {};
  StreamSubscription<Position>? _platformSub;
  bool? _runningPrecise;
  Position? _latest;

  /// Most recent position seen by any watcher (null until the first fix).
  Position? get latest => _latest;

  /// True while the platform stream is open with navigation-grade settings (for tests/diagnostics).
  bool? get runningPrecise => _runningPrecise;

  /// A broadcast-style stream of device positions. Listening registers demand; cancelling removes it.
  Stream<Position> watch({bool precise = true}) {
    late final _Watcher watcher;
    final controller = StreamController<Position>(
      onListen: () {
        _watchers.add(watcher);
        _reconfigure();
      },
      onCancel: () {
        _watchers.remove(watcher);
        _reconfigure();
      },
    );
    watcher = _Watcher(controller, precise);
    return controller.stream;
  }

  /// Emits once each time the device has moved at least [meters] since the previous emit
  /// (the first fix always emits). Used as the heartbeat/pinger movement trigger.
  Stream<void> movementTrigger(double meters, {bool precise = true}) {
    Position? anchor;
    return watch(precise: precise).where((p) {
      final a = anchor;
      if (a == null || Geolocator.distanceBetween(a.latitude, a.longitude, p.latitude, p.longitude) >= meters) {
        anchor = p;
        return true;
      }
      return false;
    }).map((_) {});
  }

  void _reconfigure() {
    if (_watchers.isEmpty) {
      _platformSub?.cancel();
      _platformSub = null;
      _runningPrecise = null;
      return;
    }
    final wantPrecise = _watchers.any((w) => w.precise);
    if (_platformSub != null && _runningPrecise == wantPrecise) return;
    // Settings changed: close first so geolocator drops its cached stream, then reopen.
    _platformSub?.cancel();
    _runningPrecise = wantPrecise;
    try {
      late final StreamSubscription<Position> sub;
      sub = _streamFactory(settingsFor(precise: wantPrecise)).listen(
        _dispatch,
        onError: (Object e) => debugPrint('📍 [LiveLocationHub] position stream error: $e'),
        onDone: () {
          // Platform closed the stream (e.g. permission revoked): forget it so the next demand reopens it.
          if (identical(_platformSub, sub)) {
            _platformSub = null;
            _runningPrecise = null;
          }
        },
      );
      _platformSub = sub;
    } catch (e) {
      debugPrint('📍 [LiveLocationHub] position stream unavailable: $e');
      _platformSub = null;
    }
  }

  void _dispatch(Position p) {
    _latest = p;
    for (final w in _watchers.toList()) {
      if (!w.controller.isClosed) w.controller.add(p);
    }
  }

  @visibleForTesting
  static LocationSettings settingsFor({required bool precise}) {
    if (!precise) {
      return const LocationSettings(accuracy: LocationAccuracy.high, distanceFilter: 100);
    }
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return AndroidSettings(
        accuracy: LocationAccuracy.bestForNavigation,
        distanceFilter: 2,
        intervalDuration: const Duration(seconds: 1),
      );
    }
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.iOS) {
      return AppleSettings(
        accuracy: LocationAccuracy.bestForNavigation,
        distanceFilter: 2,
        activityType: ActivityType.automotiveNavigation,
        pauseLocationUpdatesAutomatically: false,
      );
    }
    return const LocationSettings(accuracy: LocationAccuracy.high, distanceFilter: 2);
  }
}

class _Watcher {
  _Watcher(this.controller, this.precise);
  final StreamController<Position> controller;
  final bool precise;
}
