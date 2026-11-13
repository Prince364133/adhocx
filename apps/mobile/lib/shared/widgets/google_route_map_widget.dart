import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../services/location_service.dart';
import '../theme/app_colors.dart';
import '../theme/app_radius.dart';
import '../theme/app_typography.dart';

/// Google Maps route preview with pickup/dropoff pins, a live driver marker,
/// map expansion, and a direct link to turn-by-turn navigation.
class GoogleRouteMapWidget extends StatelessWidget {
  final double pickupLat;
  final double pickupLng;
  final double dropLat;
  final double dropLng;
  final double? driverLat;
  final double? driverLng;
  final String? pickupAddress;
  final String? dropAddress;
  final VoidCallback? onNavigate;
  final VoidCallback? onExpand;
  final bool driverLocationIsLive;
  final double height;

  const GoogleRouteMapWidget({
    super.key,
    required this.pickupLat,
    required this.pickupLng,
    required this.dropLat,
    required this.dropLng,
    this.driverLat,
    this.driverLng,
    this.pickupAddress,
    this.dropAddress,
    this.onNavigate,
    this.onExpand,
    this.driverLocationIsLive = false,
    this.height = 200,
  });

  bool get _hasPickup => pickupLat != 0.0 && pickupLng != 0.0;
  bool get _hasDrop => dropLat != 0.0 && dropLng != 0.0;

  /// Directions URL that goes through the vendor's exact pickup pin and ends at the exact drop pin.
  /// If only one pin is known, navigates straight to it. Null when neither is known.
  static Uri? directionsUri({
    required double pickupLat,
    required double pickupLng,
    required double dropLat,
    required double dropLng,
  }) {
    final hasPickup = pickupLat != 0.0 && pickupLng != 0.0;
    final hasDrop = dropLat != 0.0 && dropLng != 0.0;
    if (!hasPickup && !hasDrop) return null;
    final dest = hasDrop ? '$dropLat,$dropLng' : '$pickupLat,$pickupLng';
    final via = hasPickup && hasDrop ? '&waypoints=$pickupLat,$pickupLng' : '';
    return Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$dest$via&travelmode=driving');
  }

  Future<void> _launchGoogleMaps() async {
    if (onNavigate != null) {
      onNavigate!();
      return;
    }
    final uri = directionsUri(pickupLat: pickupLat, pickupLng: pickupLng, dropLat: dropLat, dropLng: dropLng);
    if (uri == null) return;
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final hasValidCoordinates = _hasPickup || _hasDrop;
    final hasLiveDriverLocation = driverLocationIsLive && driverLat != null && driverLng != null;
    // Never invent a point: if one pin is missing, draw only the known one.
    final pLat = _hasPickup ? pickupLat : dropLat;
    final pLng = _hasPickup ? pickupLng : dropLng;
    final dLat = _hasDrop ? dropLat : pickupLat;
    final dLng = _hasDrop ? dropLng : pickupLng;

    final mapUrl = LocationService.getStaticRouteMapUrl(
      pickupLat: pLat,
      pickupLng: pLng,
      dropLat: dLat,
      dropLng: dLng,
      driverLat: driverLat,
      driverLng: driverLng,
      width: 640,
      height: 360,
      isDark: isDark,
    );

    return Container(
      height: height,
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          // ── Google Maps Imagery ───────────────────────────────────────────
          Positioned.fill(
            child: hasValidCoordinates
                ? CachedNetworkImage(
                    imageUrl: mapUrl,
                    fit: BoxFit.cover,
                    placeholder: (context, url) => Container(
                      color: isDark ? AppColors.surfaceElevatedDark : AppColors.borderLight,
                      child: Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            SizedBox(
                              width: 28,
                              height: 28,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.5,
                                color: isDark ? AppColors.primaryLight : AppColors.primary,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Loading Google Maps...',
                              style: AppTypography.caption(
                                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    errorWidget: (context, url, error) => _buildFallbackMap(context, isDark),
                  )
                : _buildFallbackMap(context, isDark),
          ),

          // ── Interactive Tap Handler ───────────────────────────────────────
          Positioned.fill(
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: _launchGoogleMaps,
              ),
            ),
          ),

          // ── Driver location status ────────────────────────────────────────
          Positioned(
            top: 12,
            left: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: (isDark ? AppColors.surfaceDark : Colors.white).withValues(alpha: 0.92),
                borderRadius: BorderRadius.circular(AppRadius.full),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.12),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: hasLiveDriverLocation ? AppColors.accentGreenDark : AppColors.warning,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    hasLiveDriverLocation ? 'Live driver location' : 'Waiting for GPS',
                    style: AppTypography.caption(
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),

          if (onExpand != null)
            Positioned(
              top: 8,
              right: 8,
              child: Material(
                color: (isDark ? AppColors.surfaceDark : Colors.white).withValues(alpha: 0.94),
                shape: const CircleBorder(),
                child: IconButton(
                  tooltip: 'Expand map',
                  onPressed: onExpand,
                  icon: Icon(
                    Icons.fullscreen_rounded,
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  ),
                ),
              ),
            ),

          // ── Open in Google Maps Button ────────────────────────────────────
          Positioned(
            bottom: 12,
            right: 12,
            child: InkWell(
              onTap: _launchGoogleMaps,
              borderRadius: BorderRadius.circular(AppRadius.full),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      isDark ? AppColors.primaryLight : AppColors.primary,
                      AppColors.primaryDark,
                    ],
                  ),
                  borderRadius: BorderRadius.circular(AppRadius.full),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.35),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.navigation_rounded,
                      size: 14,
                      color: Colors.white,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Google Maps',
                      style: AppTypography.caption(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFallbackMap(BuildContext context, bool isDark) {
    return Container(
      color: isDark ? AppColors.surfaceElevatedDark : AppColors.borderLight,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.map_rounded,
              size: 48,
              color: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.5),
            ),
            const SizedBox(height: 8),
            Text(
              'Route Map',
              style: AppTypography.body(
                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                fontWeight: FontWeight.bold,
              ),
            ),
            Text(
              'Tap to navigate via Google Maps',
              style: AppTypography.caption(
                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
