import 'dart:math' as math;
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_radius.dart';

class OsmMapPickerWidget extends StatefulWidget {
  final double initialLat;
  final double initialLng;
  final Function(double lat, double lng)? onPositionChanged;
  final bool isInteractive;

  const OsmMapPickerWidget({
    super.key,
    required this.initialLat,
    required this.initialLng,
    this.onPositionChanged,
    this.isInteractive = true,
  });

  @override
  State<OsmMapPickerWidget> createState() => _OsmMapPickerWidgetState();
}

class _OsmMapPickerWidgetState extends State<OsmMapPickerWidget> {
  late double _currentLat;
  late double _currentLng;
  int _zoom = 15;

  @override
  void initState() {
    super.initState();
    _currentLat = widget.initialLat;
    _currentLng = widget.initialLng;
  }

  @override
  void didUpdateWidget(covariant OsmMapPickerWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialLat != widget.initialLat || oldWidget.initialLng != widget.initialLng) {
      setState(() {
        _currentLat = widget.initialLat;
        _currentLng = widget.initialLng;
      });
    }
  }

  // Convert lat/lng to OpenStreetMap tile coordinate
  int _lonToTileX(double lon, int z) {
    return ((lon + 180.0) / 360.0 * (1 << z)).floor();
  }

  int _latToTileY(double lat, int z) {
    final latRad = lat * math.pi / 180.0;
    return ((1.0 - math.log(math.tan(latRad) + 1.0 / math.cos(latRad)) / math.pi) / 2.0 * (1 << z)).floor();
  }

  void _zoomIn() {
    if (_zoom < 18) {
      setState(() => _zoom++);
    }
  }

  void _zoomOut() {
    if (_zoom > 5) {
      setState(() => _zoom--);
    }
  }

  void _handlePanUpdate(DragUpdateDetails details) {
    if (!widget.isInteractive) return;

    // Estimate degree shift per pixel based on zoom
    final scale = 360.0 / (256.0 * math.pow(2, _zoom));
    final deltaLat = details.delta.dy * scale;
    final deltaLng = -details.delta.dx * scale;

    setState(() {
      _currentLat = (_currentLat + deltaLat).clamp(-85.0, 85.0);
      _currentLng = (_currentLng + deltaLng).clamp(-180.0, 180.0);
    });
  }

  void _handlePanEnd(DragEndDetails details) {
    if (widget.onPositionChanged != null) {
      widget.onPositionChanged!(_currentLat, _currentLng);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final tileX = _lonToTileX(_currentLng, _zoom);
    final tileY = _latToTileY(_currentLat, _zoom);

    return ClipRRect(
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: Stack(
        children: [
          // Interactive Gesture Area with OpenStreetMap 3x3 Tile Grid
          GestureDetector(
            onPanUpdate: _handlePanUpdate,
            onPanEnd: _handlePanEnd,
            child: Container(
              color: isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0),
              child: GridView.builder(
                physics: const NeverScrollableScrollPhysics(),
                padding: EdgeInsets.zero,
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 3,
                  childAspectRatio: 1.0,
                ),
                itemCount: 9,
                itemBuilder: (context, index) {
                  final dx = (index % 3) - 1;
                  final dy = (index ~/ 3) - 1;
                  final x = tileX + dx;
                  final y = tileY + dy;
                  final tileUrl = 'https://tile.openstreetmap.org/$_zoom/$x/$y.png';

                  return CachedNetworkImage(
                    imageUrl: tileUrl,
                    fit: BoxFit.cover,
                    httpHeaders: const {
                      'User-Agent': 'AdhocX-Flutter-App/1.0',
                    },
                    placeholder: (context, url) => Container(
                      color: isDark ? AppColors.surfaceDark : AppColors.slate200,
                      child: const Center(
                        child: SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      ),
                    ),
                    errorWidget: (context, url, error) => Container(
                      color: isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0),
                      child: Center(
                        child: Icon(
                          Icons.map_outlined,
                          size: 24,
                          color: isDark ? AppColors.slate700 : AppColors.slate400,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),

          // Center Pin Marker with Ripple Effect
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(AppRadius.full),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.3),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: const Text(
                    'Point of Interest',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(height: 2),
                Icon(
                  Icons.location_pin,
                  size: 42,
                  color: AppColors.primary,
                  shadows: [
                    Shadow(
                      color: Colors.black.withValues(alpha: 0.4),
                      blurRadius: 8,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                Container(
                  width: 8,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ],
            ),
          ),

          // OSM Attribution & Zoom Level Badge (Top Left)
          Positioned(
            top: 10,
            left: 10,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: (isDark ? AppColors.bgDark : Colors.white).withValues(alpha: 0.88),
                borderRadius: BorderRadius.circular(AppRadius.sm),
                border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.public, size: 12, color: AppColors.primary),
                  const SizedBox(width: 4),
                  Text(
                    'OpenStreetMap',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Zoom Controls (Top Right)
          if (widget.isInteractive)
            Positioned(
              top: 10,
              right: 10,
              child: Column(
                children: [
                  _buildMapButton(
                    icon: Icons.add,
                    onTap: _zoomIn,
                    isDark: isDark,
                  ),
                  const SizedBox(height: 4),
                  _buildMapButton(
                    icon: Icons.remove,
                    onTap: _zoomOut,
                    isDark: isDark,
                  ),
                ],
              ),
            ),

          // Coordinates Badge (Bottom Right)
          Positioned(
            bottom: 10,
            right: 10,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: (isDark ? AppColors.bgDark : Colors.white).withValues(alpha: 0.88),
                borderRadius: BorderRadius.circular(AppRadius.sm),
                border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
              ),
              child: Text(
                '${_currentLat.toStringAsFixed(4)}, ${_currentLng.toStringAsFixed(4)}',
                style: TextStyle(
                  fontSize: 10,
                  fontFamily: 'monospace',
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMapButton({
    required IconData icon,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadius.sm),
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: (isDark ? AppColors.surfaceDark : Colors.white).withValues(alpha: 0.92),
          borderRadius: BorderRadius.circular(AppRadius.sm),
          border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.1),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Icon(
          icon,
          size: 18,
          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
        ),
      ),
    );
  }
}
