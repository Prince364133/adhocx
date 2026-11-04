import 'dart:async';

import 'backoff.dart';

/// Runs [task] now and then again after [Backoff.current]: every 15 s while requests succeed,
/// 30 s / 60 s / 120 s after consecutive failures. Never overlaps runs. Paused while the app is
/// in the background (see [pause] / [resume]) so a closed app does not keep polling.
class Poller {
  /// Returns true when the poll succeeded.
  final Future<bool> Function() task;
  final Backoff backoff;

  Timer? _timer;
  bool _running = false;
  bool _inFlight = false;
  bool _paused = false;

  /// Delay chosen after the last run (exposed for tests and the "next refresh" hint).
  Duration? nextDelay;

  Poller({required this.task, Backoff? backoff}) : backoff = backoff ?? Backoff();

  bool get isRunning => _running;

  void start() {
    if (_running) return;
    _running = true;
    _paused = false;
    backoff.reset();
    _run();
  }

  void stop() {
    _running = false;
    _timer?.cancel();
    _timer = null;
  }

  void pause() {
    _paused = true;
    _timer?.cancel();
  }

  void resume() {
    if (!_running || !_paused) return;
    _paused = false;
    _run();
  }

  /// Immediate refresh (pull-to-refresh, realtime event). Reschedules the next run.
  Future<void> pollNow() => _run();

  Future<void> _run() async {
    if (!_running || _paused || _inFlight) return;
    _timer?.cancel();
    _inFlight = true;
    bool ok;
    try {
      ok = await task();
    } catch (_) {
      ok = false;
    } finally {
      _inFlight = false;
    }
    if (!_running || _paused) return;
    nextDelay = ok ? backoff.success() : backoff.failure();
    _timer = Timer(nextDelay!, _run);
  }
}
