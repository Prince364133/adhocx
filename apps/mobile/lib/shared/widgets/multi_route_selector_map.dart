import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../services/location_service.dart';
import '../maps/map_geo.dart';
import '../theme/app_colors.dart';
import '../theme/app_radius.dart';

/// Interactive Google Maps route preview showing 2–3 alternative toll-free driving routes
/// with the shortest route automatically highlighted and selectable directly on the map
/// or via the route option cards underneath.
class MultiRouteSelectorMap extends StatefulWidget {
  final double pickupLat;
  final double pickupLng;
  final double dropLat;
  final double dropLng;
  final String pickupAddress;
  final String dropAddress;
  final List<RouteOption> routes;
  final int selectedIndex;
  final ValueChanged<int> onSelectRoute;
  final double mapHeight;

  const MultiRouteSelectorMap({
    super.key,
    required this.pickupLat,
    required this.pickupLng,
    required this.dropLat,
    required this.dropLng,
    required this.pickupAddress,
    required this.dropAddress,
    required this.routes,
    required this.selectedIndex,
    required this.onSelectRoute,
    this.mapHeight = 210,
  });

  @override
  State<MultiRouteSelectorMap> createState() => _MultiRouteSelectorMapState();
}

class _MultiRouteSelectorMapState extends State<MultiRouteSelectorMap> {
  GoogleMapController? _mapController;
  final Map<int, List<LatLng>> _decodedPolylines = {};

  @override
  void initState() {
    super.initState();
    _decodeAllRoutes();
  }

  @override
  void didUpdateWidget(covariant MultiRouteSelectorMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.routes != widget.routes ||
        oldWidget.pickupLat != widget.pickupLat ||
        oldWidget.pickupLng != widget.pickupLng ||
        oldWidget.dropLat != widget.dropLat ||
        oldWidget.dropLng != widget.dropLng) {
      _decodeAllRoutes();
      WidgetsBinding.instance.addPostFrameCallback((_) => _fitCameraBounds(animate: true));
    }
  }

  @override
  void dispose() {
    _mapController?.dispose();
    super.dispose();
  }

  void _decodeAllRoutes() {
    _decodedPolylines.clear();
    for (int i = 0; i < widget.routes.length; i++) {
      final encoded = widget.routes[i].encodedPolyline;
      if (encoded.isNotEmpty) {
        final pts = MapGeo.decodePolyline(encoded);
        if (pts.length >= 2) {
          _decodedPolylines[i] = pts;
        }
      }
    }
  }

  Future<void> _fitCameraBounds({bool animate = false}) async {
    final controller = _mapController;
    if (controller == null) return;

    final allPoints = <LatLng>[
      LatLng(widget.pickupLat, widget.pickupLng),
      LatLng(widget.dropLat, widget.dropLng),
    ];
    for (final pts in _decodedPolylines.values) {
      allPoints.addAll(pts);
    }

    double minLat = allPoints.first.latitude;
    double maxLat = allPoints.first.latitude;
    double minLng = allPoints.first.longitude;
    double maxLng = allPoints.first.longitude;

    for (final p in allPoints) {
      minLat = math.min(minLat, p.latitude);
      maxLat = math.max(maxLat, p.latitude);
      minLng = math.min(minLng, p.longitude);
      maxLng = math.max(maxLng, p.longitude);
    }

    if ((maxLat - minLat).abs() < 0.0005 && (maxLng - minLng).abs() < 0.0005) {
      final update = CameraUpdate.newLatLngZoom(LatLng(widget.pickupLat, widget.pickupLng), 14);
      if (animate) {
        await controller.animateCamera(update);
      } else {
        await controller.moveCamera(update);
      }
      return;
    }

    final bounds = LatLngBounds(
      southwest: LatLng(minLat, minLng),
      northeast: LatLng(maxLat, maxLng),
    );
    try {
      final update = CameraUpdate.newLatLngBounds(bounds, 46);
      if (animate) {
        await controller.animateCamera(update);
      } else {
        await controller.moveCamera(update);
      }
    } catch (_) {}
  }

  Set<Marker> _buildMarkers() {
    return {
      Marker(
        markerId: const MarkerId('vendor_pickup'),
        position: LatLng(widget.pickupLat, widget.pickupLng),
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
        infoWindow: InfoWindow(
          title: 'Pickup',
          snippet: widget.pickupAddress,
        ),
      ),
      Marker(
        markerId: const MarkerId('vendor_drop'),
        position: LatLng(widget.dropLat, widget.dropLng),
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
        infoWindow: InfoWindow(
          title: 'Drop',
          snippet: widget.dropAddress,
        ),
      ),
    };
  }

  Set<Polyline> _buildPolylines() {
    final polylines = <Polyline>{};
    for (int i = 0; i < widget.routes.length; i++) {
      final pts = _decodedPolylines[i];
      if (pts == null || pts.length < 2) continue;
      final isSelected = i == widget.selectedIndex;
      polylines.add(
        Polyline(
          polylineId: PolylineId('route_opt_$i'),
          points: pts,
          color: isSelected
              ? AppColors.primary
              : const Color(0xFF94A3B8).withValues(alpha: 0.85),
          width: isSelected ? 5 : 4,
          zIndex: isSelected ? 10 : 2,
          jointType: JointType.round,
          startCap: Cap.roundCap,
          endCap: Cap.roundCap,
          consumeTapEvents: true,
          onTap: () => widget.onSelectRoute(i),
        ),
      );
    }

    // Fallback direct line only if encoded polylines were absent
    if (polylines.isEmpty) {
      polylines.add(
        Polyline(
          polylineId: const PolylineId('route_fallback'),
          points: [
            LatLng(widget.pickupLat, widget.pickupLng),
            LatLng(widget.dropLat, widget.dropLng),
          ],
          color: AppColors.primary,
          width: 4,
          patterns: [PatternItem.dash(12), PatternItem.gap(8)],
        ),
      );
    }
    return polylines;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final safeIndex = widget.routes.isEmpty
        ? 0
        : widget.selectedIndex.clamp(0, widget.routes.length - 1);
    final selectedRoute = widget.routes.isNotEmpty ? widget.routes[safeIndex] : null;
    final shortestKm = widget.routes.isNotEmpty ? widget.routes.first.distanceKm : 0.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // 1. Live Multi-Route Google Map
        ClipRRect(
          borderRadius: BorderRadius.circular(AppRadius.md),
          child: Container(
            height: widget.mapHeight,
            decoration: BoxDecoration(
              border: Border.all(
                color: isDark ? AppColors.borderDark : AppColors.borderLight,
              ),
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: Stack(
              children: [
                GoogleMap(
                  initialCameraPosition: CameraPosition(
                    target: LatLng(
                      (widget.pickupLat + widget.dropLat) / 2,
                      (widget.pickupLng + widget.dropLng) / 2,
                    ),
                    zoom: 12,
                  ),
                  markers: _buildMarkers(),
                  polylines: _buildPolylines(),
                  myLocationButtonEnabled: false,
                  zoomControlsEnabled: false,
                  mapToolbarEnabled: false,
                  compassEnabled: false,
                  gestureRecognizers: <Factory<OneSequenceGestureRecognizer>>{
                    Factory<OneSequenceGestureRecognizer>(() => EagerGestureRecognizer()),
                  },
                  onMapCreated: (controller) {
                    _mapController = controller;
                    WidgetsBinding.instance.addPostFrameCallback(
                      (_) => _fitCameraBounds(animate: false),
                    );
                  },
                ),

                // Top-left floating badge showing Toll-Free + route count
                Positioned(
                  top: 8,
                  left: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: (isDark ? const Color(0xFF18181B) : Colors.white).withValues(alpha: 0.94),
                      borderRadius: BorderRadius.circular(AppRadius.full),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.14),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          selectedRoute?.avoidTolls == true
                              ? Icons.money_off_csred_rounded
                              : Icons.alt_route_rounded,
                          size: 14,
                          color: AppColors.success,
                        ),
                        const SizedBox(width: 5),
                        Text(
                          selectedRoute?.avoidTolls == true
                              ? 'No Tolls • ${widget.routes.length} ${widget.routes.length == 1 ? 'route' : 'routes'}'
                              : '${widget.routes.length} ${widget.routes.length == 1 ? 'route' : 'routes'} found',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: isDark ? Colors.white : const Color(0xFF18181B),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                // Top-right Recenter button
                Positioned(
                  top: 8,
                  right: 8,
                  child: Material(
                    color: (isDark ? const Color(0xFF18181B) : Colors.white).withValues(alpha: 0.94),
                    shape: const CircleBorder(),
                    elevation: 2,
                    child: InkWell(
                      customBorder: const CircleBorder(),
                      onTap: () => _fitCameraBounds(animate: true),
                      child: Padding(
                        padding: const EdgeInsets.all(7),
                        child: Icon(
                          Icons.my_location_rounded,
                          size: 16,
                          color: isDark ? Colors.white : AppColors.primary,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),

        // 2. Selectable 2–3 Route Option Cards (Shortest Auto-Selected)
        if (widget.routes.isNotEmpty) ...[
          const SizedBox(height: 10),
          Row(
            children: [
              Icon(Icons.alt_route_rounded, size: 15, color: AppColors.primary),
              const SizedBox(width: 5),
              Text(
                widget.routes.length > 1
                    ? 'Choose Route (${widget.routes.length} options • Shortest auto-selected)'
                    : 'Shortest Toll-Free Route Selected',
                style: TextStyle(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w700,
                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ...List.generate(widget.routes.length, (i) {
            final route = widget.routes[i];
            final isSelected = i == safeIndex;
            final extraKm = (route.distanceKm - shortestKm);
            final primaryText = isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight;
            final mutedText = isDark ? AppColors.textMutedDark : AppColors.textMutedLight;

            return Padding(
              padding: EdgeInsets.only(bottom: i == widget.routes.length - 1 ? 0 : 8),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () => widget.onSelectRoute(i),
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 160),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppColors.primary.withValues(alpha: isDark ? 0.16 : 0.08)
                          : (isDark ? AppColors.surfaceElevatedDark : Colors.white),
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      border: Border.all(
                        color: isSelected
                            ? AppColors.primary
                            : (isDark ? AppColors.borderDark : AppColors.borderLight),
                        width: isSelected ? 1.6 : 1.0,
                      ),
                    ),
                    child: Row(
                      children: [
                        // Radio selection indicator
                        Container(
                          width: 20,
                          height: 20,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: isSelected ? AppColors.primary : Colors.transparent,
                            border: Border.all(
                              color: isSelected ? AppColors.primary : mutedText,
                              width: 1.8,
                            ),
                          ),
                          child: isSelected
                              ? const Icon(Icons.check_rounded, size: 13, color: Colors.white)
                              : null,
                        ),
                        const SizedBox(width: 10),

                        // Route title + badges
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Flexible(
                                    child: Text(
                                      route.summary.isNotEmpty
                                          ? 'via ${route.summary}'
                                          : 'Route ${i + 1}',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
                                        color: primaryText,
                                      ),
                                    ),
                                  ),
                                  if (route.isShortest) ...[
                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: AppColors.success.withValues(alpha: 0.14),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: const Text(
                                        'Shortest',
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w800,
                                          color: AppColors.success,
                                        ),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                              const SizedBox(height: 2),
                              Text(
                                route.avoidTolls
                                    ? (route.isShortest
                                        ? 'No tolls • Recommended shortest path'
                                        : 'No tolls • +${extraKm.toStringAsFixed(1)} km longer')
                                    : (route.isShortest
                                        ? 'Shortest available path'
                                        : '+${extraKm.toStringAsFixed(1)} km longer'),
                                style: TextStyle(
                                  fontSize: 11,
                                  color: mutedText,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),

                        // Distance & ETA right column
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              route.formattedDistance,
                              style: TextStyle(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w800,
                                color: isSelected ? AppColors.primary : primaryText,
                              ),
                            ),
                            Text(
                              route.formattedEta,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: mutedText,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          }),
        ],
      ],
    );
  }
}
