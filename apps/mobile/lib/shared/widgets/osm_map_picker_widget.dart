import 'dart:math' as math;
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import '../../services/location_service.dart';
import '../theme/app_colors.dart';
import '../theme/app_radius.dart';

/// Pure Web-Mercator helpers for the static-image map picker (kept separate so they are unit-testable).
class MapPickerMath {
  MapPickerMath._();

  /// Google Static Maps free-tier ceiling for each side of `size=` (before `scale=2`).
  static const int maxStaticSide = 640;

  /// Static-map request size with the same aspect ratio as the on-screen box, capped at [maxStaticSide].
  static ({int width, int height}) requestSize(double boxWidth, double boxHeight) {
    final w = boxWidth <= 0 ? 600.0 : boxWidth;
    final h = boxHeight <= 0 ? 380.0 : boxHeight;
    final shrink = math.min(1.0, maxStaticSide / math.max(w, h));
    return (
      width: math.max(1, (w * shrink).round()),
      height: math.max(1, (h * shrink).round()),
    );
  }

  /// New map centre after the user drags the map by ([dx], [dy]) on-screen logical pixels.
  ///
  /// [mapPxPerScreenPx] is how many static-map pixels one on-screen pixel covers
  /// (requestWidth / boxWidth). Dragging right moves the centre west; dragging down moves it north.
  static ({double lat, double lng}) shiftCenter({
    required double lat,
    required double lng,
    required int zoom,
    required double dx,
    required double dy,
    double mapPxPerScreenPx = 1.0,
  }) {
    final worldPx = 256.0 * math.pow(2, zoom);
    // Longitude is linear in Mercator x.
    var newLng = lng - (dx * mapPxPerScreenPx) * 360.0 / worldPx;
    // Latitude is not: move in Mercator y, then convert back.
    final sinLat = math.sin(lat * math.pi / 180.0).clamp(-0.9999, 0.9999);
    final mercY = 0.5 - math.log((1 + sinLat) / (1 - sinLat)) / (4 * math.pi);
    final newMercY = mercY - (dy * mapPxPerScreenPx) / worldPx;
    final n = math.pi - 2 * math.pi * newMercY;
    var newLat = 180.0 / math.pi * math.atan(0.5 * (math.exp(n) - math.exp(-n)));
    newLat = newLat.clamp(-85.0, 85.0);
    // Wrap longitude into [-180, 180).
    newLng = ((newLng + 180.0) % 360.0 + 360.0) % 360.0 - 180.0;
    return (lat: newLat, lng: newLng);
  }
}

/// Drag-to-pinpoint map built on Google Static Maps imagery.
///
/// The pin's tip is always the exact map centre, and the reported coordinate is that centre.
/// While dragging, the already-loaded image is moved under the pin (no network calls per frame);
/// a fresh image is fetched once the finger lifts.
class GoogleMapPickerWidget extends StatefulWidget {
  final double initialLat;
  final double initialLng;
  final Function(double lat, double lng)? onPositionChanged;
  final bool isInteractive;
  final String label;

  const GoogleMapPickerWidget({
    super.key,
    required this.initialLat,
    required this.initialLng,
    this.onPositionChanged,
    this.isInteractive = true,
    this.label = 'Point of Interest',
  });

  @override
  State<GoogleMapPickerWidget> createState() => _GoogleMapPickerWidgetState();
}

/// Backwards compatibility alias for existing callers
typedef OsmMapPickerWidget = GoogleMapPickerWidget;

class _GoogleMapPickerWidgetState extends State<GoogleMapPickerWidget> {
  static const double _pinSize = 44;
  // The Material `location_pin` glyph's tip sits ~22/24 of the way down its box.
  static const double _pinTipFromTop = _pinSize * 22 / 24;

  late double _centerLat;
  late double _centerLng;
  int _zoom = 17;
  Offset _drag = Offset.zero;
  String? _previousUrl;
  // Where the previous tile must sit relative to the new centre while the new tile loads.
  Offset _fallbackOffset = Offset.zero;

  @override
  void initState() {
    super.initState();
    _centerLat = widget.initialLat;
    _centerLng = widget.initialLng;
  }

  @override
  void didUpdateWidget(covariant GoogleMapPickerWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Parent re-centred the map (e.g. "use my GPS location"): follow it unless it is just echoing our own value.
    if ((oldWidget.initialLat != widget.initialLat || oldWidget.initialLng != widget.initialLng) &&
        (widget.initialLat != _centerLat || widget.initialLng != _centerLng)) {
      setState(() {
        _centerLat = widget.initialLat;
        _centerLng = widget.initialLng;
        _drag = Offset.zero;
        _fallbackOffset = Offset.zero;
        _previousUrl = null;
      });
    }
  }

  void _setZoom(int zoom) {
    if (zoom < 3 || zoom > 20 || zoom == _zoom) return;
    setState(() {
      _zoom = zoom;
      _fallbackOffset = Offset.zero;
      _previousUrl = null;
    });
  }

  ({double lat, double lng}) _liveCenter(Size box) {
    if (_drag == Offset.zero) return (lat: _centerLat, lng: _centerLng);
    final req = MapPickerMath.requestSize(box.width, box.height);
    return MapPickerMath.shiftCenter(
      lat: _centerLat,
      lng: _centerLng,
      zoom: _zoom,
      dx: _drag.dx,
      dy: _drag.dy,
      mapPxPerScreenPx: req.width / box.width,
    );
  }

  void _endDrag(Size box) {
    if (_drag == Offset.zero) return;
    final c = _liveCenter(box);
    setState(() {
      _centerLat = c.lat;
      _centerLng = c.lng;
      _fallbackOffset = _drag;
      _drag = Offset.zero;
    });
    widget.onPositionChanged?.call(c.lat, c.lng);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return ClipRRect(
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final box = Size(
            constraints.maxWidth.isFinite ? constraints.maxWidth : 400,
            constraints.maxHeight.isFinite ? constraints.maxHeight : 300,
          );
          final req = MapPickerMath.requestSize(box.width, box.height);
          final url = LocationService.getStaticMapUrl(
            lat: _centerLat,
            lng: _centerLng,
            zoom: _zoom,
            width: req.width,
            height: req.height,
            isDark: isDark,
            showMarker: false,
          );
          final fallbackUrl = _previousUrl;
          if (_previousUrl != url) {
            WidgetsBinding.instance.addPostFrameCallback((_) => _previousUrl = url);
          }
          final live = _liveCenter(box);
          final bg = isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0);

          return Stack(
            children: [
              // Map imagery, shifted under the fixed pin while dragging.
              Positioned.fill(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onPanUpdate: widget.isInteractive ? (d) => setState(() => _drag += d.delta) : null,
                  onPanEnd: widget.isInteractive ? (_) => _endDrag(box) : null,
                  onPanCancel: widget.isInteractive ? () => _endDrag(box) : null,
                  onDoubleTap: widget.isInteractive ? () => _setZoom(_zoom + 1) : null,
                  child: Container(
                    color: bg,
                    child: Transform.translate(
                      offset: _drag,
                      child: CachedNetworkImage(
                        imageUrl: url,
                        width: box.width,
                        height: box.height,
                        fit: BoxFit.fill,
                        fadeInDuration: Duration.zero,
                        fadeOutDuration: Duration.zero,
                        // Keep showing the previous tile until the new one arrives (no blank flash).
                        placeholder: (context, _) => fallbackUrl != null && fallbackUrl != url
                            ? Transform.translate(
                                offset: _fallbackOffset,
                                child: CachedNetworkImage(
                                imageUrl: fallbackUrl,
                                width: box.width,
                                height: box.height,
                                fit: BoxFit.fill,
                                fadeInDuration: Duration.zero,
                                errorWidget: (_, __, ___) => Container(color: bg),
                              ),
                              )
                            : Container(
                                color: bg,
                                child: const Center(
                                  child: SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2)),
                                ),
                              ),
                        errorWidget: (context, url, error) => Container(
                          color: bg,
                          child: Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.map_outlined, size: 32, color: isDark ? AppColors.slate700 : AppColors.slate400),
                                const SizedBox(height: 6),
                                Text(
                                  'Map could not load — drag still moves the pin',
                                  style: TextStyle(fontSize: 11, color: isDark ? AppColors.slate600 : AppColors.slate500),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),

              // Pin: its tip is pinned to the exact centre of the box.
              Positioned(
                left: box.width / 2 - _pinSize / 2,
                top: box.height / 2 - _pinTipFromTop,
                child: IgnorePointer(
                  child: Icon(
                    Icons.location_pin,
                    size: _pinSize,
                    color: const Color(0xFFEA4335),
                    shadows: [Shadow(color: Colors.black.withValues(alpha: 0.4), blurRadius: 8, offset: const Offset(0, 4))],
                  ),
                ),
              ),
              // Exact-point dot under the tip.
              Positioned(
                left: box.width / 2 - 3,
                top: box.height / 2 - 3,
                child: IgnorePointer(
                  child: Container(
                    width: 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.55),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 1),
                    ),
                  ),
                ),
              ),
              // Label above the pin.
              Positioned(
                left: 0,
                right: 0,
                top: math.max(0, box.height / 2 - _pinTipFromTop - 28),
                child: IgnorePointer(
                  child: Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        borderRadius: BorderRadius.circular(AppRadius.full),
                        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.35), blurRadius: 6, offset: const Offset(0, 2))],
                      ),
                      child: Text(
                        widget.label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ),
              ),

              // Google Maps attribution badge (top left)
              Positioned(
                top: 10,
                left: 10,
                child: IgnorePointer(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: (isDark ? AppColors.bgDark : Colors.white).withValues(alpha: 0.92),
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                      border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.place, size: 13, color: Color(0xFFEA4335)),
                        const SizedBox(width: 4),
                        Text(
                          'Google Maps',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.2,
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              // Zoom controls (top right)
              if (widget.isInteractive)
                Positioned(
                  top: 10,
                  right: 10,
                  child: Column(
                    children: [
                      _buildMapButton(icon: Icons.add, tooltip: 'Zoom in', onTap: () => _setZoom(_zoom + 1), isDark: isDark),
                      const SizedBox(height: 4),
                      _buildMapButton(icon: Icons.remove, tooltip: 'Zoom out', onTap: () => _setZoom(_zoom - 1), isDark: isDark),
                    ],
                  ),
                ),

              // Live coordinates of the pin tip (bottom left, clear of the parent's GPS button)
              Positioned(
                bottom: 10,
                left: 10,
                child: IgnorePointer(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: (isDark ? AppColors.bgDark : Colors.white).withValues(alpha: 0.92),
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                      border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                    ),
                    child: Text(
                      '${live.lat.toStringAsFixed(5)}, ${live.lng.toStringAsFixed(5)}',
                      style: TextStyle(
                        fontSize: 10,
                        fontFamily: 'monospace',
                        fontWeight: FontWeight.w600,
                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildMapButton({
    required IconData icon,
    required String tooltip,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.sm),
        child: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: (isDark ? AppColors.surfaceDark : Colors.white).withValues(alpha: 0.94),
            borderRadius: BorderRadius.circular(AppRadius.sm),
            border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.12), blurRadius: 4, offset: const Offset(0, 2))],
          ),
          child: Icon(icon, size: 18, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
        ),
      ),
    );
  }
}
