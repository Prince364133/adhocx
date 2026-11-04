/// Poll / reconnect delay: [base] while healthy, doubled after each consecutive failure up to
/// [max], back to [base] after a success. Deterministic (no jitter) so it is testable.
class Backoff {
  final Duration base;
  final Duration max;
  final double factor;
  int _failures = 0;

  Backoff({
    this.base = const Duration(seconds: 15),
    this.max = const Duration(minutes: 2),
    this.factor = 2,
  }) : assert(factor >= 1);

  int get failures => _failures;

  Duration get current {
    var ms = base.inMilliseconds.toDouble();
    for (var i = 0; i < _failures; i++) {
      ms *= factor;
      if (ms >= max.inMilliseconds) return max;
    }
    return Duration(milliseconds: ms.round());
  }

  /// Records a success and returns the next delay (= [base]).
  Duration success() {
    _failures = 0;
    return current;
  }

  /// Records a failure and returns the next delay.
  Duration failure() {
    _failures++;
    return current;
  }

  void reset() => _failures = 0;
}
