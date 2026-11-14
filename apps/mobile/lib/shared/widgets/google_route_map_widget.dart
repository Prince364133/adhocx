import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../services/live_location_hub.dart';
import '../../services/location_service.dart';
import '../maps/map_assets.dart';
import '../maps/map_geo.dart';
import '../theme/app_colors.dart';
import '../theme/app_radius.dart';
import '../theme/app_typography.dart';

/// Which leg of the trip the map is showing (drives the route line and the camera).
enum TripMapPhase {
  /// Not the driver's trip yet (opportunity preview): pickup → drop only, no driver tracking.
  preview,

  /// Assigned, driving to the pickup: driver → pickup.
  toPickup,

  /// At the pickup, waiting for the passenger: pickup → drop.
  atPickup,

  /// Passenger on board: driver → drop.
  toDrop,
}

TripMapPhase tripMapPhaseForStatus(String? status) {
  switch (status?.toUpperCase()) {
    case 'ASSIGNED':
    case 'DRIVER_ASSIGNED':
    case 'ACCEPTED':
      return TripMapPhase.toPickup;
    case 'ARRIVED':
      return TripMapPhase.atPickup;
    case 'IN_PROGRESS':
    case 'STARTED':
      return TripMapPhase.toDrop;
    default:
      return TripMapPhase.preview;
  }
}

/// Live Google map for a trip: pickup/drop pins, the road route, and the driver's own position as a
/// heading arrow that glides between GPS fixes.
///
/// - Card mode ([interactive] false): no map gestures (the page keeps scrolling), the camera keeps
///   driver + next stop in view; tap opens [onExpand] (or turn-by-turn navigation).
/// - Full-screen mode ([interactive] true): pinch/drag/zoom, camera follows the driver until the
///   driver pans the map, then a Recenter button brings it back.
class GoogleRouteMapWidget extends StatefulWidget {
  final double pickupLat;
  final double pickupLng;
  final double dropLat;
  final double dropLng;

  /// Fallback driver position from the trip pinger (used when the device stream has no fix yet).
  final double? driverLat;
  final double? driverLng;
  final String? pickupAddress;
  final String? dropAddress;
  final VoidCallback? onNavigate;
  final VoidCallback? onExpand;
  final bool driverLocationIsLive;
  final double height;
  final TripMapPhase phase;
  final bool interactive;

  /// Subscribe to this device's GPS (navigation-grade) to draw the driver arrow. Use on the driver's
  /// own active trip only.
  final bool trackDevice;

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
    this.phase = TripMapPhase.preview,
    this.interactive = false,
    this.trackDevice = false,
  });

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

  @override
  State<GoogleRouteMapWidget> createState() => _GoogleRouteMapWidgetState();
}

class _GoogleRouteMapWidgetState extends State<GoogleRouteMapWidget> with SingleTickerProviderStateMixin {
  static const Duration _glide = Duration(milliseconds: 900);
  static const Duration _staleAfter = Duration(seconds: 30);
  static const double _offRouteM = 60;
  static const Duration _minRerouteGap = Duration(seconds: 30);

  GoogleMapController? _map;
  MapMarkerIcons? _icons;

  // Driver arrow: animated from _from → _to; _shown is what is drawn this frame.
  late final AnimationController _anim;
  LatLng? _from, _to, _shown;
  double _headingFrom = 0, _headingTo = 0, _headingShown = 0;
  bool _hasHeading = false;
  DateTime _lastFrameAt = DateTime.fromMillisecondsSinceEpoch(0);
  DateTime? _lastFixAt;
  final FixGate _gate = FixGate();
  final HeadingFilter _headingFilter = HeadingFilter();
  StreamSubscription<Position>? _deviceSub;
  Timer? _staleTimer;

  // Camera
  bool _follow = true;
  bool _programmaticMove = false;
  DateTime _lastCardFitAt = DateTime.fromMillisecondsSinceEpoch(0);

  // Route
  List<LatLng> _route = const [];
  String? _routeKey;
  DateTime? _routeFetchedAt;
  int _offRouteStrikes = 0;
  bool _routeLoading = false;
  RoutePath? _routeMeta;
  // Route ahead of the driver, re-trimmed once per GPS fix (not per animation frame: a new point list
  // every frame would resend the whole polyline over the platform channel ~30×/s).
  List<LatLng> _routeAhead = const [];

  LatLng? get _pickup =>
      MapGeo.isKnown(widget.pickupLat, widget.pickupLng) ? LatLng(widget.pickupLat, widget.pickupLng) : null;
  LatLng? get _drop => MapGeo.isKnown(widget.dropLat, widget.dropLng) ? LatLng(widget.dropLat, widget.dropLng) : null;

  bool get _tracksDriver => widget.phase != TripMapPhase.preview;
  bool get _isLive => _shown != null && _lastFixAt != null && DateTime.now().difference(_lastFixAt!) <= _staleAfter;

  /// Where the driver is heading now (null: nothing to drive to).
  LatLng? get _nextStop => switch (widget.phase) {
        TripMapPhase.toPickup => _pickup ?? _drop,
        TripMapPhase.toDrop => _drop,
        TripMapPhase.atPickup || TripMapPhase.preview => null,
      };

  @override
  void initState() {
    super.initState();
    _anim = AnimationController(vsync: this, duration: _glide)..addListener(_onAnimTick);
    MapAssets.icons().then((icons) {
      if (mounted) setState(() => _icons = icons);
    });
    _applyExternalFix();
    _syncDeviceStream();
    _staleTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      if (mounted) setState(() {}); // refresh the Live / Waiting badge
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => _ensureRoute());
  }

  @override
  void didUpdateWidget(covariant GoogleRouteMapWidget old) {
    super.didUpdateWidget(old);
    if (old.trackDevice != widget.trackDevice || old.phase != widget.phase) _syncDeviceStream();
    if (old.driverLat != widget.driverLat || old.driverLng != widget.driverLng) _applyExternalFix();
    if (old.phase != widget.phase ||
        old.pickupLat != widget.pickupLat ||
        old.pickupLng != widget.pickupLng ||
        old.dropLat != widget.dropLat ||
        old.dropLng != widget.dropLng) {
      _ensureRoute();
      _fitOverview(animate: true);
    }
  }

  @override
  void dispose() {
    _deviceSub?.cancel();
    _staleTimer?.cancel();
    _anim.dispose();
    super.dispose();
  }

  // ── Driver position ─────────────────────────────────────────────────────

  void _syncDeviceStream() {
    final want = widget.trackDevice && _tracksDriver;
    if (want && _deviceSub == null) {
      final last = LiveLocationHub.instance.latest;
      if (last != null) _onPosition(last);
      _deviceSub = LiveLocationHub.instance.watch(precise: true).listen(_onPosition, onError: (_) {});
    } else if (!want && _deviceSub != null) {
      _deviceSub?.cancel();
      _deviceSub = null;
    }
  }

  void _applyExternalFix() {
    if (!_tracksDriver || !widget.driverLocationIsLive) return;
    if (!MapGeo.isKnown(widget.driverLat, widget.driverLng)) return;
    // The device stream is fresher; only use the pinger's fix while that stream is silent.
    if (_deviceSub != null && _isLive) return;
    _acceptFix(LatLng(widget.driverLat!, widget.driverLng!),
        accuracy: 30, speed: 0, deviceHeading: null, at: DateTime.now());
  }

  void _onPosition(Position p) {
    if (!mounted || !_tracksDriver) return;
    final age = DateTime.now().difference(p.timestamp);
    if (age > const Duration(seconds: 60)) return;
    _acceptFix(
      LatLng(p.latitude, p.longitude),
      accuracy: p.accuracy,
      speed: p.speed,
      deviceHeading: p.heading,
      at: p.timestamp,
    );
  }

  void _acceptFix(LatLng p,
      {required double accuracy, required double speed, double? deviceHeading, required DateTime at}) {
    if (!_gate.accept(p, accuracyM: accuracy, at: at)) return;
    final heading = _headingFilter.update(p, speedMps: speed.isFinite ? speed : 0, deviceHeading: deviceHeading);
    final first = _shown == null;
    _lastFixAt = DateTime.now();

    _from = _shown ?? p;
    _to = p;
    _headingFrom = _headingShown;
    if (heading != null) {
      _headingTo = heading;
      if (!_hasHeading) _headingFrom = heading;
      _hasHeading = true;
    } else if (!_hasHeading) {
      // Not moved yet: point the arrow at where the driver is going.
      final stop = _nextStop;
      if (stop != null) {
        _headingTo = _headingFrom = MapGeo.bearingDeg(p, stop);
        _hasHeading = true;
      }
    }

    if (first) {
      setState(() {
        _shown = p;
        _headingShown = _headingTo;
      });
    } else {
      _anim.forward(from: 0);
    }
    _retrimRoute();
    _checkOffRoute(p);
    _cameraOnFix(p, first: first);
  }

  void _onAnimTick() {
    final from = _from, to = _to;
    if (from == null || to == null) return;
    final t = Curves.easeInOut.transform(_anim.value);
    final now = DateTime.now();
    // ~30 fps is smooth for a marker and halves platform-channel marker updates.
    if (_anim.value < 1 && now.difference(_lastFrameAt) < const Duration(milliseconds: 33)) return;
    _lastFrameAt = now;
    setState(() {
      _shown = MapGeo.lerpLatLng(from, to, t);
      _headingShown = MapGeo.lerpAngleDeg(_headingFrom, _headingTo, t);
    });
  }

  // ── Camera ──────────────────────────────────────────────────────────────

  Future<void> _moveCamera(CameraUpdate update, {bool animate = true}) async {
    final map = _map;
    if (map == null) return;
    _programmaticMove = true;
    try {
      if (animate) {
        await map.animateCamera(update, duration: const Duration(milliseconds: 700));
      } else {
        await map.moveCamera(update);
      }
    } catch (_) {
      // Bounds before layout / disposed controller: the next fix retries.
    }
  }

  void _cameraOnFix(LatLng p, {required bool first}) {
    if (_map == null) return;
    if (widget.interactive) {
      if (!_follow) return;
      if (first) {
        _moveCamera(CameraUpdate.newLatLngZoom(p, 16.5));
      } else {
        _moveCamera(CameraUpdate.newLatLng(p));
      }
      return;
    }
    // Card: keep the driver and the next stop framed, without chasing every fix.
    final now = DateTime.now();
    if (first || now.difference(_lastCardFitAt) > const Duration(seconds: 8)) {
      _lastCardFitAt = now;
      _fitOverview(animate: !first);
    }
  }

  List<LatLng> _overviewPoints() {
    final pts = <LatLng>[];
    final driver = _to ?? _shown;
    final stop = _nextStop;
    if (driver != null && _tracksDriver && stop != null) {
      pts
        ..add(driver)
        ..add(stop);
    } else {
      if (_pickup != null) pts.add(_pickup!);
      if (_drop != null) pts.add(_drop!);
      if (driver != null && _tracksDriver) pts.add(driver);
    }
    return pts;
  }

  Future<void> _fitOverview({bool animate = true}) async {
    final bounds = MapGeo.boundsOf(_overviewPoints());
    if (bounds == null) return;
    await _moveCamera(CameraUpdate.newLatLngBounds(bounds, widget.interactive ? 72 : 44), animate: animate);
  }

  void _recenter() {
    setState(() => _follow = true);
    final p = _to ?? _shown;
    if (p != null) {
      _moveCamera(CameraUpdate.newLatLngZoom(p, 16.5));
    } else {
      _fitOverview();
    }
  }

  // ── Route ───────────────────────────────────────────────────────────────

  static final Map<String, (RoutePath, DateTime)> _routeCache = {};

  ({LatLng from, LatLng to})? _routeEnds() {
    final pickup = _pickup, drop = _drop, driver = _to ?? _shown;
    switch (widget.phase) {
      case TripMapPhase.toPickup:
        final dest = pickup ?? drop;
        if (driver != null && dest != null) return (from: driver, to: dest);
        if (pickup != null && drop != null) return (from: pickup, to: drop);
        return null;
      case TripMapPhase.toDrop:
        final origin = driver ?? pickup;
        if (origin != null && drop != null) return (from: origin, to: drop);
        return null;
      case TripMapPhase.atPickup:
      case TripMapPhase.preview:
        if (pickup != null && drop != null) return (from: pickup, to: drop);
        return null;
    }
  }

  String _key(LatLng a, LatLng b) =>
      '${a.latitude.toStringAsFixed(4)},${a.longitude.toStringAsFixed(4)}>${b.latitude.toStringAsFixed(4)},${b.longitude.toStringAsFixed(4)}';

  Future<void> _ensureRoute({bool force = false}) async {
    final ends = _routeEnds();
    // No map surface (tests) → nothing to draw, so don't spend a Routes API call.
    if (ends == null || _routeLoading || !MapAssets.nativeMapsAvailable) return;
    // The route identity is the leg (phase + destination); a moving origin does not trigger a refetch.
    final legKey = '${widget.phase.name}>${ends.to.latitude},${ends.to.longitude}|${_to == null ? 'static' : 'driver'}';
    if (!force && legKey == _routeKey && _route.isNotEmpty) return;
    if (force && _routeFetchedAt != null && DateTime.now().difference(_routeFetchedAt!) < _minRerouteGap) return;

    final cacheKey = _key(ends.from, ends.to);
    final cached = _routeCache[cacheKey];
    RoutePath? path;
    if (cached != null && DateTime.now().difference(cached.$2) < const Duration(minutes: 3)) {
      path = cached.$1;
    } else {
      _routeLoading = true;
      path = await LocationService.instance.fetchRoutePath(
        startLat: ends.from.latitude,
        startLng: ends.from.longitude,
        endLat: ends.to.latitude,
        endLng: ends.to.longitude,
      );
      _routeLoading = false;
      if (path != null) _routeCache[cacheKey] = (path, DateTime.now());
    }
    if (!mounted) return;
    _routeKey = legKey;
    _routeFetchedAt = DateTime.now();
    _offRouteStrikes = 0;
    setState(() {
      _routeMeta = path;
      _route = path == null ? const [] : MapGeo.decodePolyline(path.encodedPolyline);
      _retrimRoute();
    });
  }

  void _checkOffRoute(LatLng p) {
    if (_routeKey == null || _route.isEmpty) {
      _ensureRoute();
      return;
    }
    if (_nextStop == null) return;
    final near = MapGeo.nearestOnPolyline(p, _route);
    _offRouteStrikes = near.meters > _offRouteM ? _offRouteStrikes + 1 : 0;
    if (_offRouteStrikes >= 3) _ensureRoute(force: true);
    // Leg changed from static preview to driver-based once the first fix arrives.
    if (!(_routeKey ?? '').endsWith('|driver')) _ensureRoute();
  }

  void _retrimRoute() {
    final driver = _to;
    _routeAhead =
        (_route.length < 2 || driver == null || _nextStop == null) ? _route : MapGeo.remainingRoute(driver, _route);
  }

  List<LatLng> _visibleRoute() => _routeAhead;

  // ── Actions ─────────────────────────────────────────────────────────────

  Future<void> _launchGoogleMaps() async {
    if (widget.onNavigate != null) {
      widget.onNavigate!();
      return;
    }
    final uri = GoogleRouteMapWidget.directionsUri(
      pickupLat: widget.pickupLat,
      pickupLng: widget.pickupLng,
      dropLat: widget.dropLat,
      dropLng: widget.dropLng,
    );
    if (uri == null) return;
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  // ── Build ───────────────────────────────────────────────────────────────

  Set<Marker> _markers() {
    final icons = _icons;
    final set = <Marker>{};
    final pickup = _pickup, drop = _drop;
    if (pickup != null) {
      set.add(Marker(
        markerId: const MarkerId('pickup'),
        position: pickup,
        icon: icons?.pickup ?? BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
        anchor: const Offset(0.5, 1),
        infoWindow: InfoWindow(title: 'Pickup', snippet: widget.pickupAddress),
        alpha: widget.phase == TripMapPhase.toDrop ? 0.55 : 1,
        zIndexInt: 1,
      ));
    }
    if (drop != null) {
      set.add(Marker(
        markerId: const MarkerId('drop'),
        position: drop,
        icon: icons?.drop ?? BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
        anchor: const Offset(0.5, 1),
        infoWindow: InfoWindow(title: 'Drop', snippet: widget.dropAddress),
        zIndexInt: 1,
      ));
    }
    final driver = _shown;
    if (driver != null && _tracksDriver && icons != null) {
      set.add(Marker(
        markerId: const MarkerId('driver'),
        position: driver,
        icon: icons.driver,
        rotation: _hasHeading ? _headingShown : 0,
        flat: true, // stays aligned to the road when the map is rotated/tilted
        anchor: const Offset(0.5, 0.5),
        zIndexInt: 3,
        consumeTapEvents: true,
      ));
    }
    return set;
  }

  Set<Polyline> _polylines(bool isDark) {
    final pts = _visibleRoute();
    if (pts.length < 2) return const {};
    final color = isDark ? AppColors.primaryLight : AppColors.primary;
    return {
      Polyline(
        polylineId: const PolylineId('route_casing'),
        points: pts,
        color: isDark ? Colors.black54 : Colors.white,
        width: 8,
        zIndex: 1,
        startCap: Cap.roundCap,
        endCap: Cap.roundCap,
        jointType: JointType.round,
      ),
      Polyline(
        polylineId: const PolylineId('route'),
        points: pts,
        color: color,
        width: 5,
        zIndex: 2,
        startCap: Cap.roundCap,
        endCap: Cap.roundCap,
        jointType: JointType.round,
      ),
    };
  }

  CameraPosition _initialCamera() {
    final pts = _overviewPoints();
    if (pts.isEmpty) return MapAssets.indiaFallback;
    final lat = pts.map((p) => p.latitude).reduce((a, b) => a + b) / pts.length;
    final lng = pts.map((p) => p.longitude).reduce((a, b) => a + b) / pts.length;
    return CameraPosition(target: LatLng(lat, lng), zoom: pts.length == 1 ? 15 : 12);
  }

  Widget _buildMap(bool isDark) {
    if (!MapAssets.nativeMapsAvailable || (_pickup == null && _drop == null && _shown == null)) {
      return _buildFallbackMap(isDark);
    }
    final interactive = widget.interactive;
    return GoogleMap(
      initialCameraPosition: _initialCamera(),
      style: MapAssets.styleFor(isDark ? Brightness.dark : Brightness.light),
      markers: _markers(),
      polylines: _polylines(isDark),
      onMapCreated: (c) {
        _map = c;
        // Frame the trip once the view has a size (bounds need layout).
        WidgetsBinding.instance.addPostFrameCallback((_) {
          final driver = _to ?? _shown;
          if (interactive && driver != null && _follow) {
            _moveCamera(CameraUpdate.newLatLngZoom(driver, 16.5), animate: false);
          } else {
            _fitOverview(animate: false);
          }
        });
      },
      onCameraMoveStarted: () {
        if (!_programmaticMove && interactive && _follow) setState(() => _follow = false);
      },
      onCameraIdle: () => _programmaticMove = false,
      scrollGesturesEnabled: interactive,
      zoomGesturesEnabled: interactive,
      rotateGesturesEnabled: interactive,
      tiltGesturesEnabled: false,
      zoomControlsEnabled: false,
      myLocationButtonEnabled: false,
      mapToolbarEnabled: false,
      compassEnabled: interactive,
      buildingsEnabled: true,
      trafficEnabled: interactive && _tracksDriver,
      minMaxZoomPreference: const MinMaxZoomPreference(4, 20),
      padding: interactive ? const EdgeInsets.only(top: 56, bottom: 132) : const EdgeInsets.only(top: 28),
      onTap: interactive ? null : (_) => (widget.onExpand ?? _launchGoogleMaps)(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final live = _isLive || (widget.driverLocationIsLive && widget.driverLat != null && widget.driverLng != null);

    return Container(
      height: widget.height,
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(widget.interactive ? 0 : AppRadius.lg),
        border: widget.interactive ? null : Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          Positioned.fill(child: _buildMap(isDark)),

          // Card: whole surface opens the full-screen map (map gestures are off, page keeps scrolling).
          if (!widget.interactive)
            Positioned.fill(
              child: Material(
                color: Colors.transparent,
                child: InkWell(onTap: widget.onExpand ?? _launchGoogleMaps),
              ),
            ),

          if (_tracksDriver) Positioned(top: 12, left: 12, child: _statusPill(isDark, live)),

          if (widget.onExpand != null)
            Positioned(
              top: 8,
              right: 8,
              child: _roundButton(
                isDark: isDark,
                icon: Icons.fullscreen_rounded,
                tooltip: 'Expand map',
                onTap: widget.onExpand!,
              ),
            ),

          if (widget.interactive) ...[
            Positioned(
              right: 12,
              top: 64,
              child: Column(
                children: [
                  _roundButton(
                      isDark: isDark,
                      icon: Icons.add_rounded,
                      tooltip: 'Zoom in',
                      onTap: () => _moveCamera(CameraUpdate.zoomIn())),
                  const SizedBox(height: 8),
                  _roundButton(
                      isDark: isDark,
                      icon: Icons.remove_rounded,
                      tooltip: 'Zoom out',
                      onTap: () => _moveCamera(CameraUpdate.zoomOut())),
                  const SizedBox(height: 8),
                  _roundButton(
                      isDark: isDark,
                      icon: Icons.alt_route_rounded,
                      tooltip: 'Show whole route',
                      onTap: () {
                        setState(() => _follow = false);
                        _fitOverview();
                      }),
                ],
              ),
            ),
            if (!_follow && _tracksDriver && _shown != null)
              Positioned(
                left: 12,
                bottom: 148,
                child: FloatingActionButton.extended(
                  heroTag: 'trip_map_recenter',
                  onPressed: _recenter,
                  backgroundColor: isDark ? AppColors.surfaceDark : Colors.white,
                  foregroundColor: AppColors.primary,
                  icon: const Icon(Icons.navigation_rounded, size: 18),
                  label: const Text('Recenter', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            Positioned(left: 12, right: 12, bottom: 12, child: _tripInfoCard(isDark)),
          ] else
            Positioned(bottom: 12, right: 12, child: _navigateChip(isDark)),
        ],
      ),
    );
  }

  Widget _statusPill(bool isDark, bool live) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: (isDark ? AppColors.surfaceDark : Colors.white).withValues(alpha: 0.94),
        borderRadius: BorderRadius.circular(AppRadius.full),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.12), blurRadius: 6, offset: const Offset(0, 2))],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration:
                BoxDecoration(color: live ? AppColors.accentGreenDark : AppColors.warning, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Text(
            live ? 'Live driver location' : 'Waiting for GPS',
            style: AppTypography.caption(
              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _navigateChip(bool isDark) {
    return InkWell(
      onTap: _launchGoogleMaps,
      borderRadius: BorderRadius.circular(AppRadius.full),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          gradient:
              LinearGradient(colors: [isDark ? AppColors.primaryLight : AppColors.primary, AppColors.primaryDark]),
          borderRadius: BorderRadius.circular(AppRadius.full),
          boxShadow: [
            BoxShadow(color: AppColors.primary.withValues(alpha: 0.35), blurRadius: 8, offset: const Offset(0, 3))
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.navigation_rounded, size: 14, color: Colors.white),
            const SizedBox(width: 6),
            Text('Google Maps', style: AppTypography.caption(color: Colors.white, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }

  /// Full-screen bottom card: next stop, remaining distance/ETA, and turn-by-turn.
  Widget _tripInfoCard(bool isDark) {
    final (label, address, color) = switch (widget.phase) {
      TripMapPhase.toPickup => ('Heading to pickup', widget.pickupAddress, AppColors.success),
      TripMapPhase.toDrop => ('Heading to drop', widget.dropAddress, const Color(0xFFEA4335)),
      TripMapPhase.atPickup => ('At pickup · next: drop', widget.dropAddress, const Color(0xFFEA4335)),
      TripMapPhase.preview => ('Pickup → Drop', widget.dropAddress, AppColors.primary),
    };
    String? metrics;
    final meta = _routeMeta;
    if (meta != null && meta.distanceMeters > 0) {
      final total = meta.distanceMeters;
      final remaining = (_shown != null && _nextStop != null) ? math.min(total, _pathLength(_visibleRoute())) : total;
      final secs = meta.durationSeconds * (total == 0 ? 1 : remaining / total);
      final km = remaining / 1000;
      final dist = km < 1 ? '${remaining.round()} m' : '${km.toStringAsFixed(1)} km';
      final mins = math.max(1, (secs / 60).round());
      metrics = '$dist · ${mins < 60 ? '$mins min' : '${mins ~/ 60}h ${mins % 60}m'}';
    }
    final fg = isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight;
    final muted = isDark ? AppColors.textMutedDark : AppColors.textMutedLight;
    return Material(
      color: isDark ? AppColors.surfaceDark : Colors.white,
      elevation: 6,
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 12, 12, 12),
        child: Row(
          children: [
            Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(label, style: AppTypography.caption(color: muted, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 2),
                  Text(
                    (address == null || address.isEmpty) ? '—' : address,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: fg),
                  ),
                  if (metrics != null) ...[
                    const SizedBox(height: 2),
                    Text(metrics,
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.primary)),
                  ],
                ],
              ),
            ),
            const SizedBox(width: 8),
            ElevatedButton.icon(
              onPressed: _launchGoogleMaps,
              icon: const Icon(Icons.navigation_rounded, size: 18),
              label: const Text('Navigate'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static double _pathLength(List<LatLng> pts) {
    var d = 0.0;
    for (var i = 0; i < pts.length - 1; i++) {
      d += MapGeo.distanceM(pts[i], pts[i + 1]);
    }
    return d;
  }

  Widget _roundButton(
      {required bool isDark, required IconData icon, required String tooltip, required VoidCallback onTap}) {
    return Material(
      color: (isDark ? AppColors.surfaceDark : Colors.white).withValues(alpha: 0.96),
      shape: const CircleBorder(),
      elevation: 2,
      child: IconButton(
        tooltip: tooltip,
        onPressed: onTap,
        icon: Icon(icon, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
      ),
    );
  }

  Widget _buildFallbackMap(bool isDark) {
    return Container(
      color: isDark ? AppColors.surfaceElevatedDark : AppColors.borderLight,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.map_rounded,
                size: 40, color: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.5)),
            const SizedBox(height: 6),
            Text(
              'Route Map',
              style: AppTypography.body(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    );
  }
}
