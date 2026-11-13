import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

import 'dispatch_location.dart';
import 'driver_service.dart';
import 'permission_service.dart';

/// App-wide idle-driver location heartbeat: every 30 s, and when the driver moves 100 m, the
/// current dispatch-quality fix is sent to `POST /drivers/location`. Run it only while the driver is
/// AVAILABLE and not on a trip (trip pings cover trips).
final DriverLocationHeartbeat driverLocationHeartbeat = DriverLocationHeartbeat(
  getFix: () => PermissionService.instance.getDispatchFix(),
  send: (fix) async {
    await DriverService.instance.sendLocationHeartbeat(fix);
  },
  movementTriggerFactory: kIsWeb
      ? null
      : () => Geolocator.getPositionStream(
            locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, distanceFilter: 100),
          ).map((_) {}),
);

DriverLocationHeartbeat? _tripPinger;
String? _tripPingerTripId;
final StreamController<DispatchFix> _tripLocationFixesController = StreamController<DispatchFix>.broadcast();
DispatchFix? _latestTripLocationFix;

Stream<DispatchFix> get tripLocationFixes => _tripLocationFixesController.stream;
DispatchFix? get latestTripLocationFix => _latestTripLocationFix;

/// Builds the on-trip pinger: every 10 s (and on 50 m of movement) the dispatch-quality fix is sent
/// to `PATCH /trips/:id/location`, which feeds live tracking, the ops map and the dispatch index.
DriverLocationHeartbeat buildTripLocationPinger(
  String tripId, {
  required DispatchFixProvider getFix,
  required Future<void> Function(String tripId, DispatchFix fix) sendPing,
  Stream<void> Function()? movementTriggerFactory,
}) {
  return DriverLocationHeartbeat(
    getFix: getFix,
    send: (fix) async {
      _latestTripLocationFix = fix;
      if (!_tripLocationFixesController.isClosed) {
        _tripLocationFixesController.add(fix);
      }
      await sendPing(tripId, fix);
    },
    interval: const Duration(seconds: 10),
    movementTriggerFactory: movementTriggerFactory,
  );
}

/// Exactly one location loop runs: the trip pinger while [activeTripId] is set, otherwise the idle
/// heartbeat when [available]; nothing when offline.
void syncDriverLocationLoops({required bool available, String? activeTripId}) {
  if (activeTripId != null && activeTripId.isNotEmpty) {
    driverLocationHeartbeat.stop();
    if (_tripPinger != null && _tripPingerTripId == activeTripId) return;
    _tripPinger?.stop();
    _tripPingerTripId = activeTripId;
    _tripPinger = buildTripLocationPinger(
      activeTripId,
      getFix: () => PermissionService.instance.getDispatchFix(),
      sendPing: (tripId, fix) async {
        final p = fix.position;
        await DriverService.instance.sendLocationPing(
          tripId,
          lat: p.latitude,
          lng: p.longitude,
          speed: p.speed,
          heading: p.heading,
        );
      },
      movementTriggerFactory: kIsWeb
          ? null
          : () => Geolocator.getPositionStream(
                locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, distanceFilter: 50),
              ).map((_) {}),
    )..start();
    return;
  }
  _tripPinger?.stop();
  _tripPinger = null;
  _tripPingerTripId = null;
  if (available) {
    driverLocationHeartbeat.start();
  } else {
    driverLocationHeartbeat.stop();
  }
}

void stopDriverLocationLoops() => syncDriverLocationLoops(available: false);
