import 'dart:math' as math;

import 'package:google_maps_flutter/google_maps_flutter.dart';

/// Pure geometry used by the live maps (no Flutter/platform calls, unit-tested).
class MapGeo {
  MapGeo._();

  static const double _earthR = 6371000.0;
  static double _rad(double d) => d * math.pi / 180.0;
  static double _deg(double r) => r * 180.0 / math.pi;

  /// True for a coordinate the backend actually set (0,0 / NaN mean "unknown").
  static bool isKnown(double? lat, double? lng) =>
      lat != null &&
      lng != null &&
      lat.isFinite &&
      lng.isFinite &&
      lat.abs() <= 90 &&
      lng.abs() <= 180 &&
      lat != 0 &&
      lng != 0;

  static double distanceM(LatLng a, LatLng b) {
    final dLat = _rad(b.latitude - a.latitude);
    final dLng = _rad(b.longitude - a.longitude);
    final h = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(_rad(a.latitude)) * math.cos(_rad(b.latitude)) * math.sin(dLng / 2) * math.sin(dLng / 2);
    return 2 * _earthR * math.asin(math.min(1.0, math.sqrt(h)));
  }

  /// Initial compass bearing from [a] to [b], 0..360 (0 = north, clockwise).
  static double bearingDeg(LatLng a, LatLng b) {
    final la1 = _rad(a.latitude), la2 = _rad(b.latitude);
    final dLng = _rad(b.longitude - a.longitude);
    final y = math.sin(dLng) * math.cos(la2);
    final x = math.cos(la1) * math.sin(la2) - math.sin(la1) * math.cos(la2) * math.cos(dLng);
    return normalizeDeg(_deg(math.atan2(y, x)));
  }

  static double normalizeDeg(double d) => ((d % 360) + 360) % 360;

  /// Signed shortest rotation from [from] to [to], in (-180, 180].
  static double shortestDeltaDeg(double from, double to) {
    var d = normalizeDeg(to) - normalizeDeg(from);
    if (d > 180) d -= 360;
    if (d <= -180) d += 360;
    return d;
  }

  /// Angle interpolation that turns the short way round (359° → 1° passes through 0°, not 180°).
  static double lerpAngleDeg(double from, double to, double t) => normalizeDeg(from + shortestDeltaDeg(from, to) * t);

  static LatLng lerpLatLng(LatLng a, LatLng b, double t) =>
      LatLng(a.latitude + (b.latitude - a.latitude) * t, a.longitude + (b.longitude - a.longitude) * t);

  /// Decodes a Google encoded polyline (Routes API `encodedPolyline`, precision 5).
  static List<LatLng> decodePolyline(String encoded) {
    final points = <LatLng>[];
    var index = 0, lat = 0, lng = 0;
    while (index < encoded.length) {
      for (var coord = 0; coord < 2; coord++) {
        var shift = 0, result = 0, b = 0;
        do {
          if (index >= encoded.length) return points;
          b = encoded.codeUnitAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (b >= 0x20);
        final delta = (result & 1) != 0 ? ~(result >> 1) : (result >> 1);
        if (coord == 0) {
          lat += delta;
        } else {
          lng += delta;
        }
      }
      points.add(LatLng(lat / 1e5, lng / 1e5));
    }
    return points;
  }

  /// Local flat projection (metres) around [origin]; accurate to <0.5% over a few km.
  static (double x, double y) _project(LatLng p, LatLng origin) {
    final x = _rad(p.longitude - origin.longitude) * math.cos(_rad(origin.latitude)) * _earthR;
    final y = _rad(p.latitude - origin.latitude) * _earthR;
    return (x, y);
  }

  /// Distance from [p] to the polyline and the index of the closest segment's start point.
  static ({double meters, int segment}) nearestOnPolyline(LatLng p, List<LatLng> line) {
    if (line.isEmpty) return (meters: double.infinity, segment: 0);
    if (line.length == 1) return (meters: distanceM(p, line.first), segment: 0);
    var best = double.infinity;
    var bestSeg = 0;
    for (var i = 0; i < line.length - 1; i++) {
      final (ax, ay) = _project(line[i], p);
      final (bx, by) = _project(line[i + 1], p);
      final dx = bx - ax, dy = by - ay;
      final len2 = dx * dx + dy * dy;
      var t = len2 == 0 ? 0.0 : -(ax * dx + ay * dy) / len2;
      t = t.clamp(0.0, 1.0);
      final cx = ax + t * dx, cy = ay + t * dy;
      final d = math.sqrt(cx * cx + cy * cy);
      if (d < best) {
        best = d;
        bestSeg = i;
      }
    }
    return (meters: best, segment: bestSeg);
  }

  /// The part of [line] still ahead of the driver at [p] (starts at [p], drops the travelled part).
  static List<LatLng> remainingRoute(LatLng p, List<LatLng> line) {
    if (line.length < 2) return line;
    final near = nearestOnPolyline(p, line);
    return [p, ...line.sublist(near.segment + 1)];
  }

  /// Smallest bounds containing every point (null when empty). A single point gets a tiny box.
  static LatLngBounds? boundsOf(Iterable<LatLng> points) {
    double? minLat, maxLat, minLng, maxLng;
    for (final p in points) {
      minLat = minLat == null ? p.latitude : math.min(minLat, p.latitude);
      maxLat = maxLat == null ? p.latitude : math.max(maxLat, p.latitude);
      minLng = minLng == null ? p.longitude : math.min(minLng, p.longitude);
      maxLng = maxLng == null ? p.longitude : math.max(maxLng, p.longitude);
    }
    if (minLat == null) return null;
    const pad = 0.0005; // ~50 m so a lone point still has an area to fit
    if (maxLat! - minLat < pad) {
      minLat -= pad;
      maxLat += pad;
    }
    if (maxLng! - minLng! < pad) {
      minLng -= pad;
      maxLng += pad;
    }
    return LatLngBounds(southwest: LatLng(minLat, minLng), northeast: LatLng(maxLat, maxLng));
  }
}

/// Turns raw GPS fixes into a stable heading for the driver arrow.
///
/// GPS heading is noise when slow/stationary, so: when moving (≥ [minSpeedMps]) use the bearing of
/// actual travel between fixes (falls back to the device-reported course); when stopped, keep the
/// last heading instead of spinning. Changes are low-pass filtered the short way round.
class HeadingFilter {
  HeadingFilter({this.minSpeedMps = 1.5, this.minMoveM = 4, this.smoothing = 0.45});

  final double minSpeedMps;
  final double minMoveM;
  final double smoothing;

  double? _heading;
  LatLng? _anchor;

  double? get heading => _heading;

  /// Feeds a fix; returns the heading to draw (null until the driver has actually moved).
  double? update(LatLng p, {double speedMps = 0, double? deviceHeading}) {
    final anchor = _anchor;
    if (anchor == null) {
      _anchor = p;
      if (speedMps >= minSpeedMps && _validHeading(deviceHeading)) _heading = MapGeo.normalizeDeg(deviceHeading!);
      return _heading;
    }
    final moved = MapGeo.distanceM(anchor, p);
    double? raw;
    if (moved >= minMoveM) {
      raw = MapGeo.bearingDeg(anchor, p);
      _anchor = p;
    } else if (speedMps >= minSpeedMps && _validHeading(deviceHeading)) {
      raw = deviceHeading;
    }
    if (raw == null) return _heading; // stationary / jitter: hold the last heading
    final current = _heading;
    _heading = current == null ? MapGeo.normalizeDeg(raw) : MapGeo.lerpAngleDeg(current, raw, smoothing);
    return _heading;
  }

  static bool _validHeading(double? h) => h != null && h.isFinite && h >= 0;
}

/// Drops fixes that would make the marker teleport (bad accuracy or physically impossible jumps).
class FixGate {
  FixGate({this.maxAccuracyM = 60, this.maxSpeedMps = 55});

  final double maxAccuracyM;
  final double maxSpeedMps;
  LatLng? _last;
  DateTime? _lastAt;

  bool accept(LatLng p, {required double accuracyM, required DateTime at}) {
    if (!accuracyM.isFinite || accuracyM > maxAccuracyM) return false;
    final last = _last, lastAt = _lastAt;
    if (last != null && lastAt != null) {
      final dt = at.difference(lastAt).inMilliseconds / 1000.0;
      if (dt <= 0) return false; // stale or duplicate fix
      final d = MapGeo.distanceM(last, p);
      if (d / dt > maxSpeedMps && d > 100) return false;
    }
    _last = p;
    _lastAt = at;
    return true;
  }
}
