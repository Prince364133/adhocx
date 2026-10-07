import 'dart:math' as math;
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import '../../services/location_service.dart';
import '../theme/app_colors.dart';
import '../theme/app_radius.dart';

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
  void didUpdateWidget(covariant GoogleMapPickerWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialLat != widget.initialLat || oldWidget.initialLng != widget.initialLng) {
      setState(() {
        _currentLat = widget.initialLat;
        _currentLng = widget.initialLng;
      });
    }
  }

  void _zoomIn() {
    if (_zoom < 20) {
      setState(() => _zoom++);
    }
  }

  void _zoomOut() {
    if (_zoom > 3) {
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

    final staticMapUrl = LocationService.getStaticMapUrl(
      lat: _currentLat,
      lng: _currentLng,
      zoom: _zoom,
      width: 600,
      height: 380,
      isDark: isDark,
    );

    return ClipRRect(
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: Stack(
        children: [
          // Interactive Gesture Area with Google Maps Static API Imagery
          GestureDetector(
            onPanUpdate: _handlePanUpdate,
            onPanEnd: _handlePanEnd,
            child: Container(
              color: isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0),
              width: double.infinity,
              height: double.infinity,
              child: CachedNetworkImage(
                imageUrl: staticMapUrl,
                fit: BoxFit.cover,
                placeholder: (context, url) => Container(
                  color: isDark ? AppColors.surfaceDark : AppColors.slate200,
                  child: const Center(
                    child: SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
                ),
                errorWidget: (context, url, error) => Container(
                  color: isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0),
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.map_outlined,
                          size: 32,
                          color: isDark ? AppColors.slate700 : AppColors.slate400,
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Google Maps',
                          style: TextStyle(
                            fontSize: 11,
                            color: isDark ? AppColors.slate600 : AppColors.slate500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),

          // Center Pin Marker with Label
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(AppRadius.full),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.35),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Text(
                    widget.label,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(height: 2),
                Icon(
                  Icons.location_pin,
                  size: 44,
                  color: const Color(0xFFEA4335), // Google Maps Pin Red
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
                    color: Colors.black.withValues(alpha: 0.35),
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ],
            ),
          ),

          // Google Maps Attribution Badge (Top Left)
          Positioned(
            top: 10,
            left: 10,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: (isDark ? AppColors.bgDark : Colors.white).withValues(alpha: 0.92),
                borderRadius: BorderRadius.circular(AppRadius.sm),
                border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.08),
                    blurRadius: 4,
                    offset: const Offset(0, 1),
                  ),
                ],
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
                color: (isDark ? AppColors.bgDark : Colors.white).withValues(alpha: 0.92),
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
          color: (isDark ? AppColors.surfaceDark : Colors.white).withValues(alpha: 0.94),
          borderRadius: BorderRadius.circular(AppRadius.sm),
          border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.12),
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
