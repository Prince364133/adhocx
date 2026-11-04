import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';

import '../../../services/permission_service.dart';

/// A device GPS fix in the shape the corporate telemetry DTO expects.
class CorporateFix {
  const CorporateFix({
    required this.latitude,
    required this.longitude,
    required this.recordedAt,
    this.accuracyM,
    this.speedMps,
    this.headingDeg,
  });

  final double latitude;
  final double longitude;
  final DateTime recordedAt;
  final double? accuracyM;
  final double? speedMps;
  final double? headingDeg;

  factory CorporateFix.fromPosition(Position p) => CorporateFix(
        latitude: p.latitude,
        longitude: p.longitude,
        recordedAt: p.timestamp,
        accuracyM: p.accuracy >= 0 ? p.accuracy : null,
        speedMps: p.speed >= 0 ? p.speed : null,
        headingDeg: p.heading >= 0 ? p.heading : null,
      );

  /// RouteTelemetryDto body.
  Map<String, dynamic> toTelemetryJson({int? batteryPct}) => {
        'latitude': latitude,
        'longitude': longitude,
        'recordedAt': recordedAt.toUtc().toIso8601String(),
        if (speedMps != null) 'speedMps': speedMps,
        if (headingDeg != null) 'headingDeg': headingDeg,
        if (accuracyM != null) 'accuracyM': accuracyM,
        if (batteryPct != null) 'batteryPct': batteryPct,
      };
}

/// Device capabilities the corporate flow needs: a fresh GPS fix and the battery level.
abstract class CorporateDevice {
  Future<CorporateFix?> currentFix();
  Future<int?> batteryPct();
}

class DefaultCorporateDevice implements CorporateDevice {
  const DefaultCorporateDevice();

  static const MethodChannel _channel = MethodChannel('com.adhocx.app/foreground');

  @override
  Future<CorporateFix?> currentFix() async {
    final pos = await PermissionService.instance.getCurrentPosition(requestIfDenied: true);
    return pos == null ? null : CorporateFix.fromPosition(pos);
  }

  @override
  Future<int?> batteryPct() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return null;
    try {
      final v = await _channel.invokeMethod<int>('batteryLevel');
      return (v != null && v >= 0 && v <= 100) ? v : null;
    } catch (_) {
      return null;
    }
  }
}

/// Supplies fixes to the telemetry scheduler while a route is active.
abstract class CorporateTelemetrySource {
  /// Begin tracking (e.g. open a position stream / foreground service).
  Future<void> start();

  /// Latest fix no older than [maxAge], requesting a new one when the cached fix is stale.
  Future<CorporateFix?> latestFix({required Duration maxAge});

  Future<int?> batteryPct();

  Future<void> stop();
}

/// Geolocator-backed source. On Android the position stream runs with geolocator's foreground
/// service notification so fixes keep flowing while the driver is in Google Maps or the screen
/// is off. No extra dependency is involved.
class GeolocatorTelemetrySource implements CorporateTelemetrySource {
  GeolocatorTelemetrySource({CorporateDevice device = const DefaultCorporateDevice()}) : _device = device;

  final CorporateDevice _device;
  StreamSubscription<Position>? _sub;
  CorporateFix? _latest;

  @override
  Future<void> start() async {
    if (_sub != null) return;
    try {
      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) return;
      final LocationSettings settings;
      if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
        settings = AndroidSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 10,
          intervalDuration: const Duration(seconds: 10),
          foregroundNotificationConfig: const ForegroundNotificationConfig(
            notificationTitle: 'AdhocX corporate route in progress',
            notificationText: 'Sharing live location with the AdhocX command centre until the route ends.',
            enableWakeLock: true,
            setOngoing: true,
          ),
        );
      } else {
        settings = const LocationSettings(accuracy: LocationAccuracy.high, distanceFilter: 10);
      }
      _sub = Geolocator.getPositionStream(locationSettings: settings).listen(
        (p) => _latest = CorporateFix.fromPosition(p),
        onError: (Object e) => debugPrint('[CorporateTelemetry] position stream error: $e'),
      );
    } catch (e) {
      debugPrint('[CorporateTelemetry] could not start position stream: $e');
    }
  }

  @override
  Future<CorporateFix?> latestFix({required Duration maxAge}) async {
    final cached = _latest;
    if (cached != null && DateTime.now().difference(cached.recordedAt) <= maxAge) return cached;
    try {
      final pos = await PermissionService.instance.getCurrentPosition(requestIfDenied: false);
      if (pos != null) _latest = CorporateFix.fromPosition(pos);
    } catch (_) {}
    return _latest;
  }

  @override
  Future<int?> batteryPct() => _device.batteryPct();

  @override
  Future<void> stop() async {
    await _sub?.cancel();
    _sub = null;
    _latest = null;
  }
}
