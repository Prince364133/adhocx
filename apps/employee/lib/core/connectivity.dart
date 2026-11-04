import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';

/// Device network reachability (connectivity_plus, same package as apps/mobile).
/// A request can still fail while "online"; screens treat [ApiErrorKind.offline] the same way.
class ConnectivityService extends ChangeNotifier {
  bool _online;
  StreamSubscription<List<ConnectivityResult>>? _sub;

  ConnectivityService._(this._online);

  /// Fixed state, no platform channel (tests).
  factory ConnectivityService.fixed({bool online = true}) => ConnectivityService._(online);

  static Future<ConnectivityService> create() async {
    final svc = ConnectivityService._(true);
    final c = Connectivity();
    try {
      svc._apply(await c.checkConnectivity());
    } catch (_) {}
    svc._sub = c.onConnectivityChanged.listen(svc._apply);
    return svc;
  }

  bool get isOnline => _online;

  void setOnline(bool value) {
    if (value == _online) return;
    _online = value;
    notifyListeners();
  }

  void _apply(List<ConnectivityResult> results) =>
      setOnline(results.any((r) => r != ConnectivityResult.none));

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }
}
