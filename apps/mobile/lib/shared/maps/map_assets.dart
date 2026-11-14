import 'dart:async';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter_android/google_maps_flutter_android.dart';
import 'package:google_maps_flutter_platform_interface/google_maps_flutter_platform_interface.dart';

import '../../core/platform/test_env.dart';
import '../theme/app_colors.dart';

/// Shared, cached resources for every native map in the driver app.
class MapAssets {
  MapAssets._();

  /// False under `flutter test` (no platform view host). Screens render a light placeholder instead.
  static bool get nativeMapsAvailable => !isFlutterTest;

  /// Pre-initialises the Android Maps SDK so the first map opens without a grey cold-start frame.
  static Future<void> warmup() async {
    if (kIsWeb || isFlutterTest || defaultTargetPlatform != TargetPlatform.android) return;
    try {
      final impl = GoogleMapsFlutterPlatform.instance;
      if (impl is GoogleMapsFlutterAndroid) await impl.warmup();
    } catch (e) {
      debugPrint('🗺️ [MapAssets] warmup skipped: $e');
    }
  }

  static const CameraPosition indiaFallback = CameraPosition(target: LatLng(17.4435, 78.3772), zoom: 15);

  /// Applied at map creation through `GoogleMap.style` (no light flash before the dark style lands).
  static String? styleFor(Brightness b) => b == Brightness.dark ? _darkStyle : _lightStyle;

  // Light: hide business POI clutter, keep transit + landmarks readable.
  static const String _lightStyle = '''
[
  {"featureType":"poi.business","stylers":[{"visibility":"off"}]},
  {"featureType":"poi.park","elementType":"labels.text","stylers":[{"visibility":"off"}]}
]''';

  static const String _darkStyle = '''
[
  {"elementType":"geometry","stylers":[{"color":"#1d2330"}]},
  {"elementType":"labels.text.fill","stylers":[{"color":"#9aa4b5"}]},
  {"elementType":"labels.text.stroke","stylers":[{"color":"#1d2330"}]},
  {"featureType":"administrative","elementType":"geometry","stylers":[{"color":"#3a4354"}]},
  {"featureType":"poi","elementType":"geometry","stylers":[{"color":"#232a38"}]},
  {"featureType":"poi.business","stylers":[{"visibility":"off"}]},
  {"featureType":"poi.park","elementType":"geometry","stylers":[{"color":"#1f3330"}]},
  {"featureType":"road","elementType":"geometry","stylers":[{"color":"#2e3646"}]},
  {"featureType":"road","elementType":"geometry.stroke","stylers":[{"color":"#1a1f2b"}]},
  {"featureType":"road.highway","elementType":"geometry","stylers":[{"color":"#46506a"}]},
  {"featureType":"road.highway","elementType":"labels.text.fill","stylers":[{"color":"#d3d9e3"}]},
  {"featureType":"transit","elementType":"geometry","stylers":[{"color":"#2a3142"}]},
  {"featureType":"water","elementType":"geometry","stylers":[{"color":"#0f1a2b"}]},
  {"featureType":"water","elementType":"labels.text.fill","stylers":[{"color":"#4e6179"}]}
]''';

  static Future<MapMarkerIcons>? _icons;

  /// Driver arrow + pickup/drop pins, drawn once per process and reused by every map.
  static Future<MapMarkerIcons> icons() => _icons ??= MapMarkerIcons._build().catchError((Object e) {
        _icons = null;
        debugPrint('🗺️ [MapAssets] marker icons fell back to defaults: $e');
        return MapMarkerIcons.fallback();
      });
}

class MapMarkerIcons {
  const MapMarkerIcons({required this.driver, required this.pickup, required this.drop});

  /// Navigation arrow pointing north at rotation 0 (rotate with Marker.rotation, flat, centre anchor).
  final BitmapDescriptor driver;

  /// Pin icons with the tip at the bottom centre (anchor (0.5, 1)).
  final BitmapDescriptor pickup;
  final BitmapDescriptor drop;

  static MapMarkerIcons fallback() => MapMarkerIcons(
        driver: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueViolet),
        pickup: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
        drop: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
      );

  static Future<MapMarkerIcons> _build() async {
    final dpr = ui.PlatformDispatcher.instance.views.isNotEmpty
        ? ui.PlatformDispatcher.instance.views.first.devicePixelRatio
        : 2.0;
    return MapMarkerIcons(
      driver: await _draw(const Size(46, 46), dpr, _paintDriverArrow),
      pickup: await _draw(const Size(34, 44), dpr, (c, s) => _paintPin(c, s, AppColors.success, 'P')),
      drop: await _draw(const Size(34, 44), dpr, (c, s) => _paintPin(c, s, const Color(0xFFEA4335), 'D')),
    );
  }

  static Future<BitmapDescriptor> _draw(Size logical, double dpr, void Function(Canvas, Size) paint) async {
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    canvas.scale(dpr);
    paint(canvas, logical);
    final image = await recorder.endRecording().toImage((logical.width * dpr).ceil(), (logical.height * dpr).ceil());
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    image.dispose();
    return BytesMapBitmap(bytes!.buffer.asUint8List(), width: logical.width, height: logical.height);
  }

  static void _paintDriverArrow(Canvas c, Size s) {
    final center = Offset(s.width / 2, s.height / 2);
    final r = s.width / 2 - 3;
    c.drawCircle(
        center,
        r + 1.5,
        Paint()
          ..color = Colors.black.withValues(alpha: 0.22)
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3));
    c.drawCircle(center, r, Paint()..color = Colors.white);
    c.drawCircle(center, r - 3, Paint()..color = AppColors.primary);
    final a = r * 0.62;
    final path = Path()
      ..moveTo(center.dx, center.dy - a) // nose points north
      ..lineTo(center.dx + a * 0.72, center.dy + a * 0.78)
      ..lineTo(center.dx, center.dy + a * 0.38)
      ..lineTo(center.dx - a * 0.72, center.dy + a * 0.78)
      ..close();
    c.drawPath(path, Paint()..color = Colors.white);
  }

  static void _paintPin(Canvas c, Size s, Color color, String letter) {
    final w = s.width;
    final head = Offset(w / 2, w / 2);
    final r = w / 2 - 2;
    final body = Path()
      ..addOval(Rect.fromCircle(center: head, radius: r))
      ..moveTo(head.dx - r * 0.62, head.dy + r * 0.72)
      ..lineTo(w / 2, s.height - 1)
      ..lineTo(head.dx + r * 0.62, head.dy + r * 0.72)
      ..close();
    c.drawPath(
        body.shift(const Offset(0, 1.5)),
        Paint()
          ..color = Colors.black.withValues(alpha: 0.25)
          ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2));
    c.drawPath(body, Paint()..color = color);
    c.drawCircle(
        head,
        r,
        Paint()
          ..color = Colors.white
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2);
    final tp = TextPainter(
      text: TextSpan(
          text: letter, style: TextStyle(color: Colors.white, fontSize: r * 1.05, fontWeight: FontWeight.w800)),
      textDirection: TextDirection.ltr,
    )..layout();
    tp.paint(c, head - Offset(tp.width / 2, tp.height / 2));
  }
}
