import 'dart:async';

import 'package:adhocx/services/live_location_hub.dart';
import 'package:adhocx/shared/maps/map_geo.dart';
import 'package:adhocx/shared/widgets/google_route_map_widget.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

Position _pos(double lat, double lng, {double speed = 0, double heading = 0}) => Position(
      latitude: lat,
      longitude: lng,
      timestamp: DateTime.now(),
      accuracy: 5,
      altitude: 0,
      altitudeAccuracy: 0,
      heading: heading,
      headingAccuracy: 0,
      speed: speed,
      speedAccuracy: 0,
    );

void main() {
  group('MapGeo', () {
    test('bearing: north, east, south, west', () {
      const o = LatLng(17.0, 78.0);
      expect(MapGeo.bearingDeg(o, const LatLng(17.01, 78.0)), closeTo(0, 0.5));
      expect(MapGeo.bearingDeg(o, const LatLng(17.0, 78.01)), closeTo(90, 0.5));
      expect(MapGeo.bearingDeg(o, const LatLng(16.99, 78.0)), closeTo(180, 0.5));
      expect(MapGeo.bearingDeg(o, const LatLng(17.0, 77.99)), closeTo(270, 0.5));
    });

    test('angle interpolation turns the short way through north', () {
      expect(MapGeo.lerpAngleDeg(350, 10, 0.5), closeTo(0, 1e-9));
      expect(MapGeo.lerpAngleDeg(10, 350, 0.5), closeTo(0, 1e-9));
      expect(MapGeo.shortestDeltaDeg(270, 90), closeTo(180, 1e-9));
    });

    test('decodes the reference Google polyline', () {
      final pts = MapGeo.decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
      expect(pts, hasLength(3));
      expect(pts[0].latitude, closeTo(38.5, 1e-6));
      expect(pts[0].longitude, closeTo(-120.2, 1e-6));
      expect(pts[2].latitude, closeTo(43.252, 1e-6));
      expect(pts[2].longitude, closeTo(-126.453, 1e-6));
    });

    test('off-route distance and remaining route', () {
      const line = [LatLng(17.0, 78.0), LatLng(17.0, 78.01), LatLng(17.0, 78.02)];
      final on = MapGeo.nearestOnPolyline(const LatLng(17.0, 78.015), line);
      expect(on.meters, lessThan(1));
      expect(on.segment, 1);
      final off = MapGeo.nearestOnPolyline(const LatLng(17.001, 78.005), line);
      expect(off.meters, closeTo(111, 2)); // 0.001° lat ≈ 111 m
      final rest = MapGeo.remainingRoute(const LatLng(17.0, 78.015), line);
      expect(rest.first, const LatLng(17.0, 78.015));
      expect(rest.last, line.last);
      expect(rest, hasLength(2));
    });

    test('bounds of a single point still have an area', () {
      final b = MapGeo.boundsOf(const [LatLng(17.0, 78.0)])!;
      expect(b.northeast.latitude, greaterThan(b.southwest.latitude));
      expect(MapGeo.boundsOf(const []), isNull);
    });

    test('0,0 and missing coordinates are unknown', () {
      expect(MapGeo.isKnown(0, 0), isFalse);
      expect(MapGeo.isKnown(null, 78), isFalse);
      expect(MapGeo.isKnown(17.4, 78.3), isTrue);
    });
  });

  group('HeadingFilter (driver arrow)', () {
    test('stationary jitter does not spin the arrow', () {
      final f = HeadingFilter();
      f.update(const LatLng(17.0, 78.0));
      expect(f.update(const LatLng(17.0001, 78.0), speedMps: 3), closeTo(0, 1)); // ~11 m north
      // 1 m wobble east while stopped, with a garbage device heading: heading must hold.
      expect(f.update(const LatLng(17.0001, 78.00001), speedMps: 0.2, deviceHeading: 200), closeTo(0, 1));
    });

    test('follows the direction of travel, smoothed across north', () {
      final f = HeadingFilter(smoothing: 1);
      f.update(const LatLng(17.0, 78.0));
      expect(f.update(const LatLng(17.0, 78.0002), speedMps: 5), closeTo(90, 1)); // east
      expect(f.update(const LatLng(17.0002, 78.0002), speedMps: 5), closeTo(0, 1)); // north
    });
  });

  group('FixGate', () {
    test('rejects poor accuracy and teleport jumps', () {
      final g = FixGate();
      final t0 = DateTime(2026, 11, 14, 10);
      expect(g.accept(const LatLng(17.0, 78.0), accuracyM: 10, at: t0), isTrue);
      expect(g.accept(const LatLng(17.0, 78.0001), accuracyM: 200, at: t0.add(const Duration(seconds: 1))), isFalse);
      // 5 km in 2 s
      expect(g.accept(const LatLng(17.045, 78.0), accuracyM: 10, at: t0.add(const Duration(seconds: 2))), isFalse);
      expect(g.accept(const LatLng(17.0002, 78.0), accuracyM: 10, at: t0.add(const Duration(seconds: 3))), isTrue);
    });
  });

  test('trip status maps to the right map leg', () {
    expect(tripMapPhaseForStatus('ASSIGNED'), TripMapPhase.toPickup);
    expect(tripMapPhaseForStatus('driver_assigned'), TripMapPhase.toPickup);
    expect(tripMapPhaseForStatus('ARRIVED'), TripMapPhase.atPickup);
    expect(tripMapPhaseForStatus('IN_PROGRESS'), TripMapPhase.toDrop);
    expect(tripMapPhaseForStatus('COMPLETED'), TripMapPhase.preview);
    expect(tripMapPhaseForStatus(null), TripMapPhase.preview);
  });

  group('LiveLocationHub (one platform stream, strictest settings win)', () {
    late List<LocationSettings> opened;
    late List<StreamController<Position>> sources;
    late LiveLocationHub hub;

    setUp(() {
      opened = [];
      sources = [];
      hub = LiveLocationHub(streamFactory: (s) {
        opened.add(s);
        final c = StreamController<Position>();
        sources.add(c);
        return c.stream;
      });
    });

    test('a precise watcher upgrades the idle stream, and it downgrades when it leaves', () async {
      final idle = hub.watch(precise: false).listen((_) {});
      expect(hub.runningPrecise, isFalse);
      expect(opened.last.distanceFilter, 100);

      final map = hub.watch(precise: true).listen((_) {});
      expect(hub.runningPrecise, isTrue);
      expect(opened.last.distanceFilter, 2);

      await map.cancel();
      expect(hub.runningPrecise, isFalse);
      await idle.cancel();
      expect(hub.runningPrecise, isNull);
      expect(opened, hasLength(3));
    });

    test('positions fan out to every watcher; movement trigger fires per N metres', () async {
      final seen = <Position>[];
      var triggers = 0;
      final a = hub.watch().listen(seen.add);
      final b = hub.movementTrigger(50).listen((_) => triggers++);
      final src = sources.last;
      src.add(_pos(17.0, 78.0)); // first fix always triggers
      src.add(_pos(17.0001, 78.0)); // 11 m
      src.add(_pos(17.0003, 78.0)); // 33 m from anchor
      src.add(_pos(17.0005, 78.0)); // 55 m from anchor -> trigger
      await Future<void>.delayed(Duration.zero);
      expect(seen, hasLength(4));
      expect(triggers, 2);
      expect(hub.latest!.latitude, 17.0005);
      await a.cancel();
      await b.cancel();
    });
  });
}
