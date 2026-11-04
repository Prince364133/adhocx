/// Pure countdown logic for the corporate ETS driver flow. All instants are compared on the
/// device clock; server instants are mapped onto it by the caller (see [StopWaitClock]).
library;

/// 60-second offer acceptance countdown driven by the server expiry.
class OfferCountdown {
  const OfferCountdown(this.deadline);

  final DateTime deadline;

  /// Whole seconds left, rounded up so the UI never shows 0 while the offer is still valid.
  int remainingSeconds(DateTime now) {
    final ms = deadline.difference(now).inMilliseconds;
    if (ms <= 0) return 0;
    return (ms + 999) ~/ 1000;
  }

  bool isExpired(DateTime now) => !now.isBefore(deadline);

  /// Fraction of a 60 s window left (for the progress ring), clamped to 0..1.
  double fractionLeft(DateTime now, {int windowSeconds = 60}) {
    final ms = deadline.difference(now).inMilliseconds;
    return (ms / (windowSeconds * 1000)).clamp(0.0, 1.0);
  }
}

/// 5-minute stop wait window that starts at the server-recorded arrival time.
///
/// [serverOffset] is `serverClock - deviceClock`. It defaults to zero and is refined from the
/// arrive response (server arrival time vs device receipt time) or from the server's own
/// "N seconds remaining" refusal, so the no-show button never unlocks before the server would
/// accept it by more than network latency.
class StopWaitClock {
  const StopWaitClock({
    required this.arrivalTime,
    this.dwell = const Duration(seconds: 300),
    this.serverOffset = Duration.zero,
  });

  final DateTime arrivalTime;
  final Duration dwell;
  final Duration serverOffset;

  Duration elapsed(DateTime deviceNow) {
    final d = deviceNow.add(serverOffset).difference(arrivalTime);
    return d.isNegative ? Duration.zero : d;
  }

  Duration remaining(DateTime deviceNow) {
    final r = dwell - elapsed(deviceNow);
    return r.isNegative ? Duration.zero : r;
  }

  /// No-show is only allowed once the full wait window has elapsed.
  bool noShowUnlocked(DateTime deviceNow) => elapsed(deviceNow) >= dwell;

  /// Re-anchors the clock so that [secondsRemaining] are left at [deviceNow] (server truth).
  StopWaitClock reanchored(DateTime deviceNow, int secondsRemaining) {
    final targetElapsed = dwell - Duration(seconds: secondsRemaining);
    final offset = arrivalTime.add(targetElapsed).difference(deviceNow);
    return StopWaitClock(arrivalTime: arrivalTime, dwell: dwell, serverOffset: offset);
  }

  static String format(Duration d) {
    final total = d.inSeconds < 0 ? 0 : (d.inMilliseconds + 999) ~/ 1000;
    final m = (total ~/ 60).toString().padLeft(2, '0');
    final s = (total % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }
}
