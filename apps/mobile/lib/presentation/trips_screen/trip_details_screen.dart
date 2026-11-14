import 'dart:async';

import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../routes/app_routes.dart';
import '../../services/dispatch_location.dart';
import '../../services/driver_service.dart';
import '../../services/driver_location_heartbeat_service.dart';
import '../../services/location_service.dart';
import '../../shared/widgets/google_route_map_widget.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_primary_button.dart';
import '../../core/utils/app_toast.dart';
import '../../core/utils/name_utils.dart';
import '../../shared/widgets/app_profile_avatar.dart';
import '../../shared/widgets/trip_start_otp_bottom_sheet.dart';
import '../../services/language_service.dart';

/// Screen 3: Trip Details with live backend integration and full lifecycle support.
class TripDetailsScreen extends StatefulWidget {
  final dynamic initialTrip;
  const TripDetailsScreen({super.key, this.initialTrip});

  @override
  State<TripDetailsScreen> createState() => _TripDetailsScreenState();
}

class _TripDetailsScreenState extends State<TripDetailsScreen> {
  dynamic _trip;
  bool _isActionInProgress = false;
  StreamSubscription<DispatchFix>? _driverLocationSubscription;
  Timer? _driverLocationExpiryTimer;
  double? _driverLat;
  double? _driverLng;
  DateTime? _lastDriverFixAt;
  bool _driverLocationIsLive = false;
  StateSetter? _expandedMapSetState;

  @override
  void initState() {
    super.initState();
    _trip = widget.initialTrip;
    _syncDriverLocationUpdates();
    _fetchTripDetails();
  }

  bool get _hasActiveTrip {
    final trip = _trip is Map ? _trip as Map : const <String, dynamic>{};
    final status = trip['status']?.toString().toUpperCase();
    return const {'ASSIGNED', 'DRIVER_ASSIGNED', 'ARRIVED', 'IN_PROGRESS', 'STARTED'}.contains(status);
  }

  TripMapPhase get _mapPhase {
    final trip = _trip is Map ? _trip as Map : const <String, dynamic>{};
    return tripMapPhaseForStatus(trip['status']?.toString());
  }

  void _syncDriverLocationUpdates({bool showLatestFix = false}) {
    if (_hasActiveTrip) {
      _driverLocationSubscription ??= tripLocationFixes.listen(_onDriverLocationFix);
      _driverLocationExpiryTimer ??= Timer.periodic(
        const Duration(seconds: 15),
        (_) => _expireDriverLocation(),
      );
      if (showLatestFix) {
        final latest = latestTripLocationFix;
        if (latest != null) _onDriverLocationFix(latest);
      }
      return;
    }

    _driverLocationSubscription?.cancel();
    _driverLocationSubscription = null;
    _driverLocationExpiryTimer?.cancel();
    _driverLocationExpiryTimer = null;
    _driverLat = null;
    _driverLng = null;
    _lastDriverFixAt = null;
    _driverLocationIsLive = false;
  }

  void _onDriverLocationFix(DispatchFix fix) {
    if (!mounted || !_hasActiveTrip) return;
    final position = fix.position;
    final now = DateTime.now();
    final age = now.difference(position.timestamp);
    if (position.accuracy > 100 || age.isNegative || age > const Duration(seconds: 60)) {
      return;
    }

    // Every accepted fix moves the marker; the map widget itself glides between fixes.
    setState(() {
      _driverLat = position.latitude;
      _driverLng = position.longitude;
      _lastDriverFixAt = now;
      _driverLocationIsLive = true;
    });
    _expandedMapSetState?.call(() {});
  }

  void _expireDriverLocation() {
    if (!mounted) return;
    final isFresh = _lastDriverFixAt != null && DateTime.now().difference(_lastDriverFixAt!) <= const Duration(seconds: 30);
    if (_driverLocationIsLive == isFresh && (isFresh || _driverLat == null)) {
      return;
    }
    setState(() {
      _driverLocationIsLive = isFresh;
      if (!isFresh) {
        _driverLat = null;
        _driverLng = null;
      }
    });
    _expandedMapSetState?.call(() {});
  }

  Future<void> _fetchTripDetails() async {
    String? tripId;
    if (_trip is Map && _trip['id'] != null) {
      tripId = _trip['id'].toString();
    } else if (widget.initialTrip is String) {
      tripId = widget.initialTrip as String;
    }

    if (tripId == null) {
      // Find the first active or upcoming trip from DriverService
      try {
        final trips = await DriverService.instance.getTrips();
        if (trips.isNotEmpty && mounted) {
          setState(() => _trip = trips.first);
          _syncDriverLocationUpdates(showLatestFix: true);
        }
      } catch (_) {}
      return;
    }

    try {
      final updated = await DriverService.instance.getTrip(tripId);
      if (updated != null && mounted) {
        setState(() {
          if (updated is Map && _trip is Map) {
            _trip = Map<String, dynamic>.from(_trip as Map)..addAll(Map<String, dynamic>.from(updated));
          } else {
            _trip = updated;
          }
        });
        _syncDriverLocationUpdates(showLatestFix: true);
      }
    } catch (_) {}
  }

  Future<void> _callPassenger(String? phone) async {
    final rawPhone = (phone ?? '').trim();
    final cleanDigits = rawPhone.replaceAll(RegExp(r'[^\d+]'), '');
    if (cleanDigits.isEmpty || cleanDigits == '—' || cleanDigits == '-') {
      Fluttertoast.showToast(
        msg: 'Contact phone number not available for this booking',
        backgroundColor: AppColors.error,
      );
      return;
    }

    final uri = Uri.parse('tel:$cleanDigits');
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        await launchUrl(uri);
      }
    } catch (e) {
      Fluttertoast.showToast(
        msg: 'Could not open phone dialer for $cleanDigits',
        backgroundColor: AppColors.error,
      );
    }
  }

  void _openChat(Map<String, dynamic> trip, String otherPartyName, String otherPartyPhone) {
    context.push(AppRoutes.tripChatScreen, extra: {
      'tripId': trip['id'] ?? trip['tripId'],
      'otherPartyName': otherPartyName,
      'otherPartyPhone': otherPartyPhone,
      'otherPartyRole': 'USER',
      'status': trip['status'] ?? 'IN_PROGRESS',
      'trip': trip,
    });
  }

  Future<void> _openNavigation() async {
    final trip = _trip is Map ? _trip as Map<String, dynamic> : <String, dynamic>{};
    final req = (trip['requirement'] as Map<String, dynamic>?) ?? {};
    final status = trip['status']?.toString() ?? 'ASSIGNED';
    final isDropTarget = status == 'IN_PROGRESS' || status == 'STARTED';

    final pLat = (trip['pickupLocation']?['latitude'] as num?)?.toDouble() ?? (req['pickupLat'] as num?)?.toDouble() ?? 0.0;
    final pLng = (trip['pickupLocation']?['longitude'] as num?)?.toDouble() ?? (req['pickupLng'] as num?)?.toDouble() ?? 0.0;
    final dLat = (trip['dropLocation']?['latitude'] as num?)?.toDouble() ?? (req['dropLat'] as num?)?.toDouble() ?? 0.0;
    final dLng = (trip['dropLocation']?['longitude'] as num?)?.toDouble() ?? (req['dropLng'] as num?)?.toDouble() ?? 0.0;

    final targetLat = isDropTarget ? dLat : pLat;
    final targetLng = isDropTarget ? dLng : pLng;
    final targetAddress = isDropTarget
        ? (trip['dropLocation']?['address'] ?? req['dropAddress'] ?? 'Drop Location')
        : (trip['pickupLocation']?['address'] ?? req['pickupAddress'] ?? 'Pickup Location');

    if (targetLat == 0.0 || targetLng == 0.0) {
      // No pinned coordinate for this leg: don't send the driver to an invented point.
      Fluttertoast.showToast(msg: 'Exact location is missing for $targetAddress. Please call the customer.');
      return;
    }

    // 1. Android Google Navigation Intent (direct turn-by-turn navigation from live GPS location)
    final navUri = Uri.parse('google.navigation:q=$targetLat,$targetLng&mode=d');
    // 2. Standard Google Maps Directions URL (works across all platforms with origin defaulting to current location)
    final webDirUri = Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$targetLat,$targetLng&travelmode=driving');

    try {
      if (await canLaunchUrl(navUri)) {
        await launchUrl(navUri, mode: LaunchMode.externalApplication);
      } else if (await canLaunchUrl(webDirUri)) {
        await launchUrl(webDirUri, mode: LaunchMode.externalApplication);
      } else {
        await launchUrl(webDirUri);
      }
    } catch (e) {
      Fluttertoast.showToast(msg: 'Opening Google Maps navigation to $targetAddress...');
      try {
        await launchUrl(webDirUri, mode: LaunchMode.externalApplication);
      } catch (_) {}
    }
  }

  Future<void> _showExpandedMap({
    required double pickupLat,
    required double pickupLng,
    required double dropLat,
    required double dropLng,
    required String pickupAddress,
    required String dropAddress,
  }) async {
    try {
      await showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (dialogContext) => StatefulBuilder(
          builder: (context, setDialogState) {
            _expandedMapSetState = setDialogState;
            return Dialog.fullscreen(
              child: Scaffold(
                appBar: AppBar(
                  leading: IconButton(
                    tooltip: context.tr('Back'),
                    onPressed: () => Navigator.of(dialogContext).pop(),
                    icon: const Icon(Icons.arrow_back_rounded),
                  ),
                  title: Text(context.tr('Trip Map')),
                ),
                body: SafeArea(
                  child: LayoutBuilder(
                    builder: (context, constraints) => GoogleRouteMapWidget(
                      pickupLat: pickupLat,
                      pickupLng: pickupLng,
                      dropLat: dropLat,
                      dropLng: dropLng,
                      pickupAddress: pickupAddress,
                      dropAddress: dropAddress,
                      driverLat: _driverLocationIsLive ? _driverLat : null,
                      driverLng: _driverLocationIsLive ? _driverLng : null,
                      driverLocationIsLive: _driverLocationIsLive,
                      onNavigate: _openNavigation,
                      height: constraints.maxHeight,
                      phase: _mapPhase,
                      interactive: true,
                      trackDevice: _hasActiveTrip,
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      );
    } finally {
      _expandedMapSetState = null;
    }
  }

  Future<void> _handleMarkArrived(String tripId) async {
    setState(() => _isActionInProgress = true);
    try {
      await DriverService.instance.markArrived(tripId);
      Fluttertoast.showToast(
        msg: 'Marked arrived at pickup location!',
        backgroundColor: AppColors.accentGreenDark,
      );
      await _fetchTripDetails();
    } catch (e) {
      DriverService.instance.notifyTripChanged(tripId: tripId);
      await _fetchTripDetails();
      if (mounted) {
        AppToast.showError(e, context: context);
      }
    } finally {
      if (mounted) setState(() => _isActionInProgress = false);
    }
  }

  Future<void> _handleStartTrip(String tripId, {String? passengerName}) async {
    final verified = await TripStartOtpBottomSheet.show(
      context: context,
      tripId: tripId,
      passengerName: passengerName,
    );

    if (verified == true) {
      Fluttertoast.showToast(
        msg: 'Trip started successfully!',
        backgroundColor: AppColors.accentGreenDark,
      );
      await _fetchTripDetails();
    }
  }

  Future<void> _handleCompleteTrip(String tripId, String payout) async {
    setState(() => _isActionInProgress = true);
    try {
      await DriverService.instance.completeTrip(tripId);
      DriverService.instance.notifyTripChanged(tripId: tripId, status: 'COMPLETED');
      if (mounted) {
        Fluttertoast.showToast(
          msg: 'Trip completed! $payout credited to your wallet.',
          backgroundColor: AppColors.accentGreenDark,
        );
        if (context.canPop()) {
          context.pop(true);
        } else {
          context.go(AppRoutes.homeScreen);
        }
      }
    } catch (e) {
      if (mounted) {
        AppToast.showError(e, context: context);
      }
    } finally {
      if (mounted) setState(() => _isActionInProgress = false);
    }
  }

  @override
  void dispose() {
    _driverLocationSubscription?.cancel();
    _driverLocationExpiryTimer?.cancel();
    _expandedMapSetState = null;
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final trip = _trip as Map<String, dynamic>? ?? {};
    final req = trip['requirement'] as Map<String, dynamic>? ?? {};
    final tripId = (trip['id'] ?? '').toString();
    final shortTripId = tripId.length > 8 ? tripId.substring(0, 8).toUpperCase() : (tripId.isNotEmpty ? tripId.toUpperCase() : 'TRP');
    final status = (trip['status'] ?? 'IN_PROGRESS').toString().toUpperCase();
    final isAssigned = status == 'ASSIGNED' || status == 'DRIVER_ASSIGNED';
    final isArrived = status == 'ARRIVED';
    final isInProgress = status == 'IN_PROGRESS' || status == 'STARTED';
    final isCompleted = status == 'COMPLETED';

    final pickup = trip['pickupLocation']?['address'] ?? req['pickupLocation']?['address'] ?? '—';
    final drop = trip['dropLocation']?['address'] ?? req['dropLocation']?['address'] ?? '—';

    final pLat = (trip['pickupLocation']?['latitude'] as num?)?.toDouble() ?? (req['pickupLat'] as num?)?.toDouble() ?? 0.0;
    final pLng = (trip['pickupLocation']?['longitude'] as num?)?.toDouble() ?? (req['pickupLng'] as num?)?.toDouble() ?? 0.0;
    final dLat = (trip['dropLocation']?['latitude'] as num?)?.toDouble() ?? (req['dropLat'] as num?)?.toDouble() ?? 0.0;
    final dLng = (trip['dropLocation']?['longitude'] as num?)?.toDouble() ?? (req['dropLng'] as num?)?.toDouble() ?? 0.0;

    final num? rawDist = trip['distanceKm'] ?? trip['tripDistanceKm'] ?? req['distanceKm'];
    double computedDistance = rawDist != null ? rawDist.toDouble() : 0.0;
    final hasBothPins = pLat != 0.0 && pLng != 0.0 && dLat != 0.0 && dLng != 0.0;
    if (hasBothPins && (computedDistance <= 0.0 || (computedDistance > 14.5 && computedDistance < 15.0))) {
      computedDistance = LocationService.estimateRoadDistanceKm(pLat, pLng, dLat, dLng);
    }
    final distanceStr = '${computedDistance.toStringAsFixed(1)} km';

    final num? rawDuration = trip['durationMinutes'] ?? trip['tripEtaMinutes'] ?? req['durationMinutes'];
    final int computedDuration = rawDuration != null ? rawDuration.toInt() : LocationService.estimateRoadEtaMinutes(computedDistance);
    final durationStr = '$computedDuration min';

    final payout = DriverService.resolveDriverPayoutFormatted(trip);

    final List<String?> nameCandidates = [
      trip['requesterName']?.toString(),
      trip['vendorName']?.toString(),
      trip['vendor']?['user']?['fullName']?.toString(),
      req['vendor']?['user']?['fullName']?.toString(),
      trip['vendor']?['fullName']?.toString(),
      req['vendor']?['fullName']?.toString(),
      trip['vendorOrganizationName']?.toString(),
      trip['vendor']?['organizationName']?.toString(),
      req['vendor']?['organizationName']?.toString(),
      req['vendor']?['businessName']?.toString(),
      req['vendor']?['companyName']?.toString(),
      trip['user']?['fullName']?.toString(),
      trip['passengerName']?.toString(),
      trip['customerName']?.toString(),
      trip['userName']?.toString(),
    ];

    String passengerName = '';
    for (final candidate in nameCandidates) {
      final sanitized = sanitizeRealName(candidate);
      if (sanitized.isNotEmpty) {
        passengerName = sanitized;
        break;
      }
    }
    if (passengerName.isEmpty) {
      passengerName = 'Customer';
    }

    final List<String?> phoneCandidates = [
      trip['passengerPhone']?.toString(),
      trip['customerPhone']?.toString(),
      trip['userPhone']?.toString(),
      trip['user']?['phone']?.toString(),
      trip['vendor']?['user']?['phone']?.toString(),
      trip['vendor']?['phone']?.toString(),
      trip['vendorPhone']?.toString(),
      req['vendor']?['user']?['phone']?.toString(),
      req['vendor']?['phone']?.toString(),
      req['user']?['phone']?.toString(),
    ];

    String passengerPhone = '';
    for (final candidate in phoneCandidates) {
      final p = (candidate ?? '').trim();
      if (p.isNotEmpty && p != '—' && p != '-' && p != '+91 98765 43210') {
        passengerPhone = p;
        break;
      }
    }

    final passengerPhoto = trip['passengerPhoto'] ??
        trip['vendorPhoto'] ??
        trip['requesterPhoto'] ??
        trip['vendor']?['photoUrl'] ??
        trip['vendor']?['user']?['photoUrl'] ??
        trip['vendor']?['logoUrl'] ??
        req['vendor']?['photoUrl'] ??
        req['vendor']?['logoUrl'];
    final vehicle = req['vehicleType']?.toString() ?? 'Commercial Vehicle';
    final startOtp = trip['startOtp'] ?? req['startOtp'];

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Column(
              children: [
                // ── App Header ───────────────────────────────────────────────
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.lg,
                    vertical: AppSpacing.md,
                  ),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                    border: Border(
                      bottom: BorderSide(
                        color: isDark ? AppColors.borderDark : AppColors.borderLight,
                      ),
                    ),
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () {
                          if (context.canPop()) {
                            context.pop();
                          } else {
                            context.go(AppRoutes.homeScreen);
                          }
                        },
                        icon: Icon(
                          Icons.arrow_back,
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          context.tr('Trip Details'),
                          style: AppTypography.h3(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // ── Scrollable Body ──────────────────────────────────────────
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: _fetchTripDetails,
                    child: ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      children: [
                        // ── Banner Card ─────────────────────────────────
                        Container(
                          padding: const EdgeInsets.all(AppSpacing.lg),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: isCompleted
                                  ? [AppColors.accentGreenDark, AppColors.accentGreenDark.withValues(alpha: 0.85)]
                                  : (isArrived ? [AppColors.accentPurple, isDark ? AppColors.primaryLight : AppColors.primary] : [AppColors.primary, AppColors.primaryHover]),
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(AppRadius.lg),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    isCompleted
                                        ? context.tr('TRIP COMPLETED')
                                        : (isArrived ? context.tr('ARRIVED AT PICKUP') : (isAssigned ? context.tr('DRIVER ASSIGNED') : context.tr('TRIP IN PROGRESS'))),
                                    style: AppTypography.caption(
                                      color: Colors.white.withValues(alpha: 0.9),
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  if (startOtp != null)
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: Colors.white.withValues(alpha: 0.25),
                                        borderRadius: BorderRadius.circular(AppRadius.xs),
                                      ),
                                      child: Text(
                                        'OTP: $startOtp',
                                        style: AppTypography.caption(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      '${context.tr('Trip ID')}: $shortTripId',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: AppTypography.body(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: AppSpacing.sm),
                                  Flexible(
                                    child: Text(
                                      context.tr(status),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      textAlign: TextAlign.end,
                                      style: AppTypography.caption(
                                        color: Colors.white.withValues(alpha: 0.8),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: AppSpacing.lg),

                        // ── Route Details Card ─────────────────────────────────
                        Container(
                          padding: const EdgeInsets.all(AppSpacing.lg),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                            borderRadius: BorderRadius.circular(AppRadius.lg),
                            border: Border.all(
                              color: isDark ? AppColors.borderDark : AppColors.borderLight,
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Route ($vehicle)',
                                style: AppTypography.caption(
                                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: AppSpacing.md),

                              // Pickup Row
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    width: 10,
                                    height: 10,
                                    margin: const EdgeInsets.only(top: 4),
                                    decoration: const BoxDecoration(
                                      color: AppColors.accentGreenDark,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Pickup',
                                          style: AppTypography.body(
                                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          pickup,
                                          style: AppTypography.caption(
                                            color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: AppSpacing.md),

                              // Drop Row
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    width: 10,
                                    height: 10,
                                    margin: const EdgeInsets.only(top: 4),
                                    decoration: const BoxDecoration(
                                      color: AppColors.error,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Drop',
                                          style: AppTypography.body(
                                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          drop,
                                          style: AppTypography.caption(
                                            color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: AppSpacing.lg),

                        // ── Real Live Google Route Map ────────────────────────
                        GoogleRouteMapWidget(
                          pickupLat: pLat,
                          pickupLng: pLng,
                          dropLat: dLat,
                          dropLng: dLng,
                          driverLat: _driverLocationIsLive ? _driverLat : null,
                          driverLng: _driverLocationIsLive ? _driverLng : null,
                          driverLocationIsLive: _driverLocationIsLive,
                          pickupAddress: pickup,
                          dropAddress: drop,
                          onNavigate: _openNavigation,
                          onExpand: () => _showExpandedMap(
                            pickupLat: pLat,
                            pickupLng: pLng,
                            dropLat: dLat,
                            dropLng: dLng,
                            pickupAddress: pickup.toString(),
                            dropAddress: drop.toString(),
                          ),
                          height: 190,
                          phase: _mapPhase,
                          trackDevice: _hasActiveTrip,
                        ),
                        const SizedBox(height: AppSpacing.lg),

                        // ── Metrics Grid (Distance, Duration, Earnings) ───────
                        Row(
                          children: [
                            Expanded(
                              child: _buildMetricCard(
                                icon: Icons.navigation_outlined,
                                label: 'Distance',
                                value: distanceStr,
                                isDark: isDark,
                              ),
                            ),
                            const SizedBox(width: AppSpacing.md),
                            Expanded(
                              child: _buildMetricCard(
                                icon: Icons.access_time,
                                label: 'Est. duration',
                                value: durationStr,
                                isDark: isDark,
                              ),
                            ),
                            const SizedBox(width: AppSpacing.md),
                            Expanded(
                              child: _buildMetricCard(
                                icon: Icons.account_balance_wallet_outlined,
                                label: 'Earnings',
                                value: payout,
                                valueColor: isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark,
                                isDark: isDark,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.lg),

                        // ── Real User / Requester Info Card ───────────────────
                        Container(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                            borderRadius: BorderRadius.circular(AppRadius.lg),
                            border: Border.all(
                              color: isDark ? AppColors.borderDark : AppColors.borderLight,
                            ),
                          ),
                          child: Row(
                            children: [
                              AppProfileAvatar(
                                radius: 20,
                                imageUrl: passengerPhoto?.toString(),
                                name: passengerName,
                                isDark: isDark,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'User: $passengerName',
                                      style: AppTypography.body(
                                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                        fontWeight: FontWeight.bold,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    Text(
                                      passengerPhone.isNotEmpty ? passengerPhone : 'Corporate Booker',
                                      style: AppTypography.caption(
                                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              IconButton(
                                tooltip: 'Call User',
                                onPressed: () => _callPassenger(passengerPhone),
                                icon: Icon(
                                  Icons.phone_outlined,
                                  color: isDark ? AppColors.primaryLight : AppColors.primary,
                                ),
                              ),
                              IconButton(
                                tooltip: 'Chat with User',
                                onPressed: () => _openChat(trip, passengerName, passengerPhone),
                                icon: Icon(
                                  Icons.chat_bubble_outline_rounded,
                                  color: isDark ? AppColors.primaryLight : AppColors.primary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xl),

                        // ── Bottom Action Buttons Based on Status ─────────────
                        if (isAssigned) ...[
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: _openNavigation,
                                  icon: const Icon(Icons.navigation_outlined, size: 18),
                                  label: Text(context.tr('NAVIGATE')),
                                  style: OutlinedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(vertical: 14),
                                    side: BorderSide(
                                      color: isDark ? AppColors.primaryLight : AppColors.primary,
                                    ),
                                    foregroundColor: isDark ? AppColors.primaryLight : AppColors.primary,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(AppRadius.md),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: AppSpacing.md),
                              Expanded(
                                child: AppPrimaryButton(
                                  text: context.tr('MARK ARRIVED'),
                                  isLoading: _isActionInProgress,
                                  onPressed: () => _handleMarkArrived(tripId),
                                ),
                              ),
                            ],
                          ),
                        ] else if (isArrived) ...[
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: _openNavigation,
                                  icon: const Icon(Icons.navigation_outlined, size: 18),
                                  label: Text(context.tr('NAVIGATE')),
                                  style: OutlinedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(vertical: 14),
                                    side: BorderSide(
                                      color: isDark ? AppColors.primaryLight : AppColors.primary,
                                    ),
                                    foregroundColor: isDark ? AppColors.primaryLight : AppColors.primary,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(AppRadius.md),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: AppSpacing.md),
                              Expanded(
                                child: AppPrimaryButton(
                                  text: context.tr('START TRIP (OTP)'),
                                  isLoading: _isActionInProgress,
                                  onPressed: () => _handleStartTrip(tripId, passengerName: passengerName),
                                ),
                              ),
                            ],
                          ),
                        ] else if (isInProgress) ...[
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: _openNavigation,
                                  icon: const Icon(Icons.navigation_outlined, size: 18),
                                  label: Text(context.tr('NAVIGATE')),
                                  style: OutlinedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(vertical: 14),
                                    side: BorderSide(
                                      color: isDark ? AppColors.primaryLight : AppColors.primary,
                                    ),
                                    foregroundColor: isDark ? AppColors.primaryLight : AppColors.primary,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(AppRadius.md),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: AppSpacing.md),
                              Expanded(
                                child: AppPrimaryButton(
                                  text: context.tr('COMPLETE TRIP'),
                                  isLoading: _isActionInProgress,
                                  onPressed: () => _handleCompleteTrip(tripId, payout),
                                ),
                              ),
                            ],
                          ),
                        ] else if (isCompleted) ...[
                          Container(
                            padding: const EdgeInsets.all(AppSpacing.md),
                            decoration: BoxDecoration(
                              color: AppColors.accentGreenDark.withValues(alpha: isDark ? 0.2 : 0.12),
                              borderRadius: BorderRadius.circular(AppRadius.md),
                              border: Border.all(
                                color: isDark ? AppColors.accentGreenDark.withValues(alpha: 0.3) : Colors.transparent,
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.check_circle,
                                  color: isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  '${context.tr('Trip Settled & Payout Complete')} ($payout)',
                                  style: AppTypography.body(
                                    color: isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMetricCard({
    required IconData icon,
    required String label,
    required String value,
    required bool isDark,
    Color? valueColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
      ),
      child: Column(
        children: [
          Icon(
            icon,
            size: 18,
            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
          ),
          const SizedBox(height: 4),
          Text(
            context.tr(label),
            style: AppTypography.caption(
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            ).copyWith(fontSize: 11),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: AppTypography.body(
              color: valueColor ?? (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}
