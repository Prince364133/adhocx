import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';

import 'package:adhocx/services/dispatch_location.dart';
import 'package:adhocx/services/driver_service.dart';
import 'package:adhocx/services/driver_location_heartbeat_service.dart';

final DateTime now = DateTime.utc(2026, 11, 10, 12, 0, 0);

Position pos({double lat = 28.6315, double lng = 77.2167, double accuracy = 8, DateTime? at}) => Position(
      latitude: lat,
      longitude: lng,
      timestamp: at ?? now,
      accuracy: accuracy,
      altitude: 0,
      altitudeAccuracy: 0,
      heading: 0,
      headingAccuracy: 0,
      speed: 0,
      speedAccuracy: 0,
    );

void main() {
  group('DispatchLocationPolicy.select (dispatch-quality fixes only)', () {
    test('a fresh GPS fix wins', () {
      final fix = DispatchLocationPolicy.select(fresh: pos(), lastKnown: pos(lat: 1, lng: 1), now: now)!;
      expect(fix.source, DispatchFixSource.gps);
      expect(fix.position.latitude, 28.6315);
    });

    test('falls back to a last-known fix only when ≤ 2 min old and ≤ 500 m accuracy', () {
      final recent = pos(at: now.subtract(const Duration(seconds: 90)));
      expect(DispatchLocationPolicy.select(lastKnown: recent, now: now)?.source, DispatchFixSource.lastKnown);

      final old = pos(at: now.subtract(const Duration(minutes: 3)));
      expect(DispatchLocationPolicy.select(lastKnown: old, now: now), isNull);

      final coarse = pos(accuracy: 1200, at: now.subtract(const Duration(seconds: 30)));
      expect(DispatchLocationPolicy.select(lastKnown: coarse, now: now), isNull);
    });

    test('rejects a coarse "fresh" fix (network/IP-level accuracy)', () {
      expect(DispatchLocationPolicy.select(fresh: pos(accuracy: 1000), now: now), isNull);
    });

    test('no fix → null, never a default city (HITEC City 17.4435, 78.3772)', () {
      expect(DispatchLocationPolicy.select(now: now), isNull);
      expect(DispatchLocationPolicy.select(fresh: pos(lat: 0, lng: 0), now: now), isNull);
    });
  });

  group('DriverLocationHeartbeat', () {
    test('sends accuracy and source with each fix', () async {
      final sent = <Map<String, dynamic>>[];
      final hb = DriverLocationHeartbeat(
        getFix: () async => DispatchFix(pos(accuracy: 12), DispatchFixSource.gps),
        send: (fix) async => sent.add(DriverService.heartbeatPayload(fix)),
      );
      expect(await hb.beat(), isTrue);
      expect(sent.single, {
        'latitude': 28.6315,
        'longitude': 77.2167,
        'accuracyM': 12.0,
        'source': 'GPS',
        'recordedAt': now.toIso8601String(),
      });
    });

    test('sends nothing when there is no fix', () async {
      var sends = 0;
      final hb = DriverLocationHeartbeat(getFix: () async => null, send: (_) async => sends++);
      expect(await hb.beat(), isFalse);
      expect(sends, 0);
    });

    test('never overlaps requests', () async {
      final gate = Completer<void>();
      var sends = 0;
      final hb = DriverLocationHeartbeat(
        getFix: () async => DispatchFix(pos(), DispatchFixSource.gps),
        send: (_) async {
          sends++;
          await gate.future;
        },
      );
      final first = hb.beat();
      expect(await hb.beat(), isFalse); // still in flight
      gate.complete();
      expect(await first, isTrue);
      expect(sends, 1);
    });

    test('network errors are swallowed (next tick retries)', () async {
      final hb = DriverLocationHeartbeat(
        getFix: () async => DispatchFix(pos(), DispatchFixSource.lastKnown),
        send: (_) async => throw Exception('offline'),
      );
      expect(await hb.beat(), isFalse);
    });

    test('start sends immediately, ticks on the interval and on movement, stop ends both', () async {
      var sends = 0;
      final movement = StreamController<void>.broadcast();
      final hb = DriverLocationHeartbeat(
        getFix: () async => DispatchFix(pos(), DispatchFixSource.gps),
        send: (_) async => sends++,
        interval: const Duration(milliseconds: 40),
        movementTriggerFactory: () => movement.stream,
      );
      hb.start();
      hb.start(); // idempotent: one timer, one immediate beat
      await Future<void>.delayed(const Duration(milliseconds: 5));
      expect(sends, 1);
      await Future<void>.delayed(const Duration(milliseconds: 60));
      expect(sends, greaterThanOrEqualTo(2));
      final beforeMove = sends;
      movement.add(null);
      await Future<void>.delayed(const Duration(milliseconds: 5));
      expect(sends, greaterThan(beforeMove));
      hb.stop();
      expect(hb.isRunning, isFalse);
      final afterStop = sends;
      movement.add(null);
      await Future<void>.delayed(const Duration(milliseconds: 120));
      expect(sends, afterStop);
      await movement.close();
    });
  });

  group('availability payload', () {
    test('going online without a fix sends no coordinates', () {
      expect(DriverService.availabilityPayload('available'), {'status': 'AVAILABLE'});
    });

    test('a real fix is sent as currentLocation', () {
      expect(DriverService.availabilityPayload('AVAILABLE', lat: 28.6, lng: 77.2), {
        'status': 'AVAILABLE',
        'currentLocation': {'latitude': 28.6, 'longitude': 77.2},
      });
    });
  });
  group('on-trip location pings (docs/23 RC8)', () {
    test('trip ping body matches TripLocationUpdateDto: nested location, no top-level lat/lng', () {
      final body = tripLocationPingBody(lat: 28.61, lng: 77.2, speed: 8.5, heading: 90);
      expect(body, {
        'location': {'latitude': 28.61, 'longitude': 77.2},
        'speed': 8.5,
        'heading': 90.0,
      });
      expect(body.containsKey('latitude'), isFalse);
      expect(tripLocationPingBody(lat: 1, lng: 2, speed: -1, heading: -1), {
        'location': {'latitude': 1.0, 'longitude': 2.0},
      });
    });

    test('trip pinger sends every fix to its trip id and nothing without a fix', () async {
      final sent = <String>[];
      final fixes = <DispatchFix>[];
      final subscription = tripLocationFixes.listen(fixes.add);
      DispatchFix? next = DispatchFix(pos(lat: 28.61, lng: 77.2), DispatchFixSource.gps);
      final pinger = buildTripLocationPinger(
        'trip-42',
        getFix: () async => next,
        sendPing: (tripId, fix) async => sent.add('$tripId@${fix.position.latitude}'),
      );
      expect(pinger.interval, const Duration(seconds: 10));
      expect(await pinger.beat(), isTrue);
      await Future<void>.delayed(Duration.zero);
      next = null;
      expect(await pinger.beat(), isFalse);
      expect(sent, ['trip-42@28.61']);
      expect(fixes.single.position.latitude, 28.61);
      await subscription.cancel();
    });
  });
}
