import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_service.dart';
import '../../services/driver_service.dart';
import '../../services/global_dispatch_overlay_service.dart';
import '../../core/utils/name_utils.dart';
import '../../core/networking/api_client.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../shared/widgets/trip_rating_bottom_sheet.dart';
import '../../shared/widgets/trip_start_otp_bottom_sheet.dart';
import '../../shared/widgets/app_adaptive_skeleton.dart';
import '../../shared/widgets/app_profile_avatar.dart';
import 'package:geolocator/geolocator.dart';
import '../../services/edge_case_manager.dart';
import '../../services/permission_service.dart';
import '../../services/location_monitor_service.dart';
import '../../utils/vehicle_utils.dart';
import '../../services/language_service.dart';
import '../common/app_update_banner.dart';
import '../../services/app_update_service.dart';

enum DriverHomeState { offline, available, offerAttention, assignedTrip, activeTrip, completedTrip }

/// Main Driver Home Screen supporting live driver operational states & real-time backend sync.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  DriverHomeState _currentState = DriverHomeState.offline;
  bool _isLoading = true;
  String _driverName = 'Driver';
  double _todayEarnings = 0.0;
  int _todayTripsCount = 0;
  double _trustScore = 100.0;
  String _trustTier = 'Platinum';
  Map<String, dynamic>? _liveOffer;
  Map<String, dynamic>? _liveTrip;
  double _platformCommissionPercent = 10.0;
  Timer? _autoRefreshTimer;
  StreamSubscription<Map<String, dynamic>>? _tripEventsSubscription;
  final TextEditingController _otpController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadLiveDriverData();
    _startAutoRefresh();
    _listenToTripLifecycleEvents();
    AppUpdateService.instance.checkForUpdate();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkStartupPermissionStatus();
      AppRoutes.checkAndHandlePendingNotification(context);
    });
  }

  void _listenToTripLifecycleEvents() {
    _tripEventsSubscription?.cancel();
    _tripEventsSubscription = DriverService.instance.tripEventsStream.listen((event) {
      debugPrint('🚗 [HomeScreen] Realtime trip event received: $event -> force syncing live state');
      if (mounted) {
        _loadLiveDriverData(silent: true, force: true);
      }
    });
  }

  Future<void> _checkStartupPermissionStatus() async {
    try {
      // Strictly READ-ONLY check: Never trigger an OS runtime permission prompt at startup!
      // This strictly follows Google Play User Data & Prominent Disclosure policy.
      final hasLocation = await PermissionService.instance.isLocationPermissionGranted();
      if (!hasLocation) {
        EdgeCaseManager.instance.showLocationDisclosureModal();
      } else {
        EdgeCaseManager.instance.grantLocationPermission();
      }
    } catch (e) {
      debugPrint('Error checking startup permissions: $e');
    }
  }

  @override
  void dispose() {
    _autoRefreshTimer?.cancel();
    _tripEventsSubscription?.cancel();
    _otpController.dispose();
    GlobalDispatchOverlayService.instance.stopRealtimeListener();
    LocationMonitorService.instance.stopMonitoring();
    super.dispose();
  }

  bool _isSyncing = false;

  void _startAutoRefresh() {
    _autoRefreshTimer?.cancel();
    _autoRefreshTimer = Timer.periodic(const Duration(seconds: 6), (_) {
      if (GlobalDispatchOverlayService.instance.isPaymentFlowActive) return;
      if (mounted && _currentState != DriverHomeState.offline) {
        final isOnTrip = _currentState == DriverHomeState.assignedTrip || _currentState == DriverHomeState.activeTrip;
        _loadLiveDriverData(silent: true, force: isOnTrip);
      }
    });
  }

  Future<void> _loadLiveDriverData({bool silent = false, bool? force}) async {
    if (_isSyncing || GlobalDispatchOverlayService.instance.isPaymentFlowActive) return;
    _isSyncing = true;
    final forceFetch = force ?? !silent;

    if (!silent) setState(() => _isLoading = true);
    try {
      final results = await Future.wait([
        silent ? Future.value(null) : DriverService.instance.getProfile(forceRefresh: forceFetch).catchError((_) => null),
        silent ? Future.value(null) : DriverService.instance.getWalletSummary(forceRefresh: forceFetch).catchError((_) => null),
        DriverService.instance.getOffers(forceRefresh: forceFetch).catchError((_) => []),
        Future.value([]),
        DriverService.instance.getTrips(forceRefresh: forceFetch).catchError((_) => []),
        silent ? Future.value(null) : DriverService.instance.getPolicyConfig(forceRefresh: forceFetch).catchError((_) => null),
      ]);

      final pRaw = results[0];
      final profile = pRaw is Map<String, dynamic>
          ? (pRaw['data'] is Map<String, dynamic> ? pRaw['data'] as Map<String, dynamic> : pRaw)
          : null;

      final wRaw = results[1];
      final wallet = wRaw is Map<String, dynamic>
          ? (wRaw['data'] is Map<String, dynamic> ? wRaw['data'] as Map<String, dynamic> : wRaw)
          : null;

      final oRaw = results[2];
      final offers = oRaw is List
          ? oRaw
          : (oRaw is Map && oRaw['data'] is List ? oRaw['data'] as List<dynamic> : []);

      final tRaw = results[4];
      final trips = tRaw is List
          ? tRaw
          : (tRaw is Map && tRaw['data'] is List ? tRaw['data'] as List<dynamic> : []);

      final polRaw = results[5];
      if (polRaw is Map && polRaw['commissionPercent'] != null) {
        final cp = double.tryParse(polRaw['commissionPercent'].toString());
        if (cp != null && cp >= 0) {
          _platformCommissionPercent = cp;
        }
      }

      if (mounted) {
        setState(() {
          if (profile != null) {
            final user = profile['user'] as Map<String, dynamic>?;
            final rawName = profile['fullName'] as String? ??
                user?['name'] as String? ??
                user?['fullName'] as String? ??
                AuthService.instance.currentUser?.fullName;
            _driverName = !isPlaceholderName(rawName) ? rawName! : 'Partner';
            final num? scoreNum = profile['trustScore'] as num? ??
                profile['trust_score'] as num? ??
                profile['currentScore'] as num?;
            final rawScore = scoreNum?.toDouble() ?? 100.0;
            _trustScore = rawScore;
            _trustTier = rawScore >= 90 ? 'Platinum' : rawScore >= 80 ? 'Gold' : rawScore >= 70 ? 'Silver' : 'Bronze';

            final avail = profile['availabilityStatus'] as String? ?? 'OFFLINE';
            if (avail == 'AVAILABLE') {
              if (_currentState == DriverHomeState.offline) {
                _currentState = DriverHomeState.available;
              }
              _ensureRealtimeConnected();
              GlobalDispatchOverlayService.instance.startAssistiveBubble();
              if (!LocationMonitorService.instance.isMonitoring) {
                LocationMonitorService.instance.startMonitoring(
                  onAutoOffline: () {
                    if (mounted) {
                      setState(() {
                        _currentState = DriverHomeState.offline;
                      });
                      GlobalDispatchOverlayService.instance.stopAssistiveBubble();
                      Fluttertoast.showToast(
                        msg: 'GPS was turned off. You have been automatically set to OFFLINE.',
                        backgroundColor: AppColors.error,
                        toastLength: Toast.LENGTH_LONG,
                      );
                    }
                  },
                );
              }
            }
          }

          if (wallet != null) {
            final num earn = wallet['todayEarnings'] as num? ?? wallet['availableBalance'] as num? ?? 0.0;
            final num count = wallet['completedTripsCount'] as num? ?? wallet['totalTrips'] as num? ?? 0;
            _todayEarnings = earn.toDouble();
            _todayTripsCount = count.toInt();
          }

          // 1. Check if an active / in-progress / arrived trip exists
          final inProgressTrip = trips.firstWhere(
            (t) => t['status'] == 'IN_PROGRESS' || t['status'] == 'ARRIVED',
            orElse: () => null,
          );
          if (inProgressTrip != null) {
            _liveTrip = inProgressTrip as Map<String, dynamic>;
            _currentState = DriverHomeState.activeTrip;
            GlobalDispatchOverlayService.instance.syncActiveTripToBubble(_liveTrip);
            return;
          }

          // 2. Check if assigned trip exists
          final assignedTrip = trips.firstWhere(
            (t) => t['status'] == 'ASSIGNED' || t['status'] == 'DRIVER_ASSIGNED',
            orElse: () => null,
          );
          if (assignedTrip != null) {
            _liveTrip = assignedTrip as Map<String, dynamic>;
            _currentState = DriverHomeState.assignedTrip;
            GlobalDispatchOverlayService.instance.syncActiveTripToBubble(_liveTrip);
            return;
          }

          // Neither active nor assigned trip exists: clear stale trip and release driver state!
          _liveTrip = null;
          GlobalDispatchOverlayService.instance.syncActiveTripToBubble(null);
          if (_currentState == DriverHomeState.assignedTrip || _currentState == DriverHomeState.activeTrip) {
            _currentState = DriverHomeState.available;
          }

          // Resolve driver vehicle category
          String driverVehicle = VehicleUtils.extractVehicleType(profile);
          if (driverVehicle.isEmpty) {
            driverVehicle = VehicleUtils.extractVehicleType(AuthService.instance.currentUser?.driverProfile);
          }
          if (driverVehicle.isEmpty) {
            driverVehicle = 'SEDAN';
          }

          // 3. Check for direct dispatch offers strictly matching driver vehicle type
          final sentOffers = offers.where((o) {
            final st = o['status'];
            if (st != 'SENT' && st != null) return false;
            final reqMap = o['requirement'] as Map<String, dynamic>?;
            final reqVType = (reqMap?['vehicleType'] ?? o['vehicleType'])?.toString();
            return VehicleUtils.isCompatible(
              driverVehicle: driverVehicle,
              requiredVehicle: reqVType,
            );
          }).toList();

          // Sync filtered dispatch offers to floating overlay window
          GlobalDispatchOverlayService.instance.syncOffersToBubble(sentOffers);

          if (sentOffers.isNotEmpty) {
            final activeOffer = sentOffers.first as Map<String, dynamic>;
            _liveOffer = activeOffer;
            if (_currentState == DriverHomeState.available) {
              GlobalDispatchOverlayService.instance.showIncomingOffer(activeOffer);
            }
          } else {
            _liveOffer = null;
          }

          // 4. If driver is available and has no active trip, ensure available state
          if (_currentState != DriverHomeState.offline &&
              _currentState != DriverHomeState.completedTrip) {
            _currentState = DriverHomeState.available;
          }
        });
      }
    } catch (e) {
      debugPrint('Driver home sync notice: $e');
    } finally {
      _isSyncing = false;
      if (!silent && mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _ensureRealtimeConnected() async {
    if (GlobalDispatchOverlayService.instance.isListening) return;
    try {
      final token = await ApiClient.instance.getToken();
      final user = AuthService.instance.currentUser;
      if (token != null) {
        GlobalDispatchOverlayService.instance.startRealtimeListener(
          apiBaseUrl: ApiClient.instance.baseUrl,
          authToken: token,
          channel: user != null ? 'user:${user.id}' : null,
        );
      }
    } catch (_) {}
  }

  Future<void> _toggleOnline(bool goOnline) async {
    try {
      await AuthService.instance.ensureAuthenticatedSession(role: 'DRIVER');

      Position? currentPos;
      if (goOnline) {
        // Enforce location permission and active GPS service
        final hasLocation = await PermissionService.instance.isLocationPermissionGranted();
        final gpsEnabled = await PermissionService.instance.isLocationServiceEnabled();

        if (!hasLocation || !gpsEnabled) {
          // Present the in-app prominent disclosure modal first, DO NOT prompt OS directly
          EdgeCaseManager.instance.showLocationDisclosureModal();
          if (mounted) {
            Fluttertoast.showToast(
              msg: 'Location permission and GPS are required to go online and receive trips.',
              backgroundColor: AppColors.warning,
              toastLength: Toast.LENGTH_LONG,
            );
          }
          return;
        }

        currentPos = await PermissionService.instance.getCurrentPosition();
        if (currentPos == null) {
          final gpsOn = await PermissionService.instance.isLocationServiceEnabled();
          if (!gpsOn) {
            if (mounted) {
              Fluttertoast.showToast(
                msg: 'Please enable GPS / Location services on your device to go online.',
                backgroundColor: AppColors.error,
                toastLength: Toast.LENGTH_LONG,
              );
            }
            return;
          }
        }
        // MANDATORY: Check & Enforce "Display Over Other Apps" (Overlay Permission)
        if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
          if (!mounted) return;
          final hasOverlay = await GlobalDispatchOverlayService.ensureOverlayPermissionMandatory(context);
          if (!hasOverlay) {
            if (mounted) {
              Fluttertoast.showToast(
                msg: 'Display over other apps permission is mandatory to go online.',
                backgroundColor: AppColors.error,
                toastLength: Toast.LENGTH_LONG,
              );
            }
            return;
          }
        }
      }

      final newStatus = goOnline ? 'AVAILABLE' : 'OFFLINE';
      final lat = currentPos?.latitude ?? 17.4435;
      final lng = currentPos?.longitude ?? 78.3772;

      await DriverService.instance.updateAvailability(newStatus, lat: lat, lng: lng);

      if (mounted) {
        setState(() {
          _currentState = goOnline ? DriverHomeState.available : DriverHomeState.offline;
        });
        if (goOnline) {
          _ensureRealtimeConnected();
          GlobalDispatchOverlayService.instance.startAssistiveBubble();

          // Start GPS background monitor: auto-switches to OFFLINE if GPS is switched off
          LocationMonitorService.instance.startMonitoring(
            onAutoOffline: () {
              if (mounted) {
                setState(() {
                  _currentState = DriverHomeState.offline;
                });
                GlobalDispatchOverlayService.instance.stopAssistiveBubble();
                Fluttertoast.showToast(
                  msg: 'GPS was turned off. You have been automatically switched to OFFLINE.',
                  backgroundColor: AppColors.error,
                  toastLength: Toast.LENGTH_LONG,
                );
              }
            },
          );
        } else {
          LocationMonitorService.instance.stopMonitoring();
          GlobalDispatchOverlayService.instance.stopRealtimeListener();
          GlobalDispatchOverlayService.instance.stopAssistiveBubble();
        }
        Fluttertoast.showToast(
          msg: goOnline ? 'You are now ONLINE & Available for trips' : 'You are now OFFLINE',
          backgroundColor: goOnline ? AppColors.accentGreenDark : AppColors.slate700,
        );
        _loadLiveDriverData(silent: true);
      }
    } catch (e) {
      if (mounted) {
        Fluttertoast.showToast(
          msg: 'Failed to update status: $e',
          backgroundColor: AppColors.error,
        );
      }
    }
  }

  Widget _buildStatusPill(bool isDark) {
    final (label, color, bgColor) = switch (_currentState) {
      DriverHomeState.offline => (
          'Offline',
          AppColors.textMutedLight,
          isDark ? AppColors.surfaceElevatedDark : AppColors.borderLight,
        ),
      DriverHomeState.available => (
          'Online & Scanning',
          AppColors.accentGreenDark,
          AppColors.accentGreenDark.withValues(alpha: 0.12),
        ),
      DriverHomeState.offerAttention => (
          'Offer Pending',
          AppColors.warning,
          AppColors.warning.withValues(alpha: 0.14),
        ),
      DriverHomeState.assignedTrip => (
          'Assigned',
          AppColors.primary,
          AppColors.primary.withValues(alpha: 0.14),
        ),
      DriverHomeState.activeTrip => (
          'Busy • On Trip',
          AppColors.brandOrange,
          AppColors.brandOrange.withValues(alpha: 0.14),
        ),
      DriverHomeState.completedTrip => (
          'Completed',
          AppColors.accentPurple,
          AppColors.accentPurple.withValues(alpha: 0.14),
        ),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(AppRadius.full),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 5),
          Text(
            context.tr(label),
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    context.watch<LanguageProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

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
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              context.tr('Welcome back,'),
                              style: AppTypography.caption(
                                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                              ).copyWith(fontSize: 11),
                            ),
                            Row(
                              children: [
                                Flexible(
                                  child: Text(
                                    (_driverName.toLowerCase() == 'driver' || _driverName.toLowerCase() == 'partner')
                                        ? context.tr(_driverName)
                                        : _driverName,
                                    style: AppTypography.body(
                                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                      fontWeight: FontWeight.bold,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                _buildStatusPill(isDark),
                              ],
                            ),
                            const SizedBox(height: 3),
                            GestureDetector(
                              onTap: () => context.push(AppRoutes.driverScoreScreen),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [Color(0xFF6366F1), Color(0xFF4F46E5)],
                                  ),
                                  borderRadius: BorderRadius.circular(AppRadius.full),
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(0xFF6366F1).withValues(alpha: 0.35),
                                      blurRadius: 4,
                                      offset: const Offset(0, 1),
                                    ),
                                  ],
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.shield, size: 11, color: Colors.white),
                                    const SizedBox(width: 4),
                                    Text(
                                      '${context.tr('Trust Score')}: ${_trustScore.toStringAsFixed(0)}/100 • $_trustTier',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(width: 2),
                                    const Icon(Icons.chevron_right, size: 12, color: Colors.white70),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () => context.push(AppRoutes.notificationsFeedScreen),
                        icon: Icon(
                          Icons.notifications_none_rounded,
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        ),
                      ),
                      GestureDetector(
                        onTap: () async {
                          await context.push(AppRoutes.personalInfoScreen);
                          if (mounted) {
                            try {
                              await AuthService.instance.fetchCurrentUser(forceRefresh: true);
                            } catch (_) {}
                            setState(() {});
                          }
                        },
                        child: AppProfileAvatar(
                          radius: 18,
                          name: _driverName,
                          isDark: isDark,
                        ),
                      ),
                    ],
                  ),
                ),

                // ── App Update Notice Banner ─────────────────────────────────
                const AppUpdateBanner(),

                // ── Dynamic State Body ───────────────────────────────────────
                Expanded(
                  child: AdaptiveSkeleton(
                    isLoading: _isLoading && _liveOffer == null && _liveTrip == null,
                    child: RefreshIndicator(
                      onRefresh: () => _loadLiveDriverData(silent: false),
                      child: ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.all(AppSpacing.lg),
                        children: [
                          switch (_currentState) {
                            DriverHomeState.offline => _buildOfflineState(isDark),
                            DriverHomeState.available => _buildAvailableState(isDark),
                            DriverHomeState.offerAttention => _buildOfferAttentionState(isDark),
                            DriverHomeState.assignedTrip => _buildAssignedState(isDark),
                            DriverHomeState.activeTrip => _buildActiveTripState(isDark),
                            DriverHomeState.completedTrip => _buildCompletedTripState(isDark),
                          },
                          const SizedBox(height: 100),
                        ],
                      ),
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

  // ───────────────────────────────────────────────────────────────────────────
  // STATE 1: OFFLINE STATE
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildOfflineState(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(AppSpacing.lg),
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : AppColors.surfaceElevatedDark,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(
              color: isDark ? AppColors.borderDark : Colors.transparent,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                context.tr('Availability'),
                style: AppTypography.caption(color: Colors.white70),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Container(
                    width: 12,
                    height: 12,
                    decoration: const BoxDecoration(
                      color: AppColors.slate400,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    context.tr('Offline'),
                    style: AppTypography.h2(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 2),
              Text(
                context.tr('You are currently offline. Go online to receive trip offers.'),
                style: AppTypography.caption(color: Colors.white70),
              ),
              const SizedBox(height: AppSpacing.lg),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: () => _toggleOnline(true),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                  ),
                  child: Center(
                    child: Text(
                      context.tr('GO ONLINE'),
                      style: AppTypography.button(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        overflow: TextOverflow.visible,
                      ).copyWith(height: 1.1),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.xl),

        Center(
          child: Column(
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceElevatedDark : AppColors.borderLight.withValues(alpha: 0.4),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.directions_car_outlined,
                  size: 40,
                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                context.tr('You are offline'),
                style: AppTypography.h3(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                context.tr('Go online to receive trip opportunities in real-time'),
                style: AppTypography.caption(
                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              _buildBullet(context.tr('Go online to get live trip dispatches'), isDark),
              const SizedBox(height: 4),
              _buildBullet(context.tr("We'll notify you automatically on new requests"), isDark),
              const SizedBox(height: 4),
              _buildBullet(context.tr('You can go offline anytime with one tap'), isDark),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.xl),
        _buildActivityCard(
          trips: '$_todayTripsCount',
          earnings: '₹ ${_todayEarnings.toStringAsFixed(0)}',
          isDark: isDark,
        ),
      ],
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // STATE 2: AVAILABLE STATE
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildAvailableState(bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_liveOffer != null) ...[
          Builder(
            builder: (context) {
              final bool offerHasEscort = _liveOffer?['hasEscort'] == true ||
                  _liveOffer?['escortRequired'] == true ||
                  _liveOffer?['requirement']?['hasEscort'] == true ||
                  _liveOffer?['requirement']?['escortRequired'] == true ||
                  _liveOffer?['zonal']?['hasEscort'] == true ||
                  (_liveOffer?['notes']?.toString().toLowerCase().contains('escort') ?? false) ||
                  (_liveOffer?['requirement']?['notes']?.toString().toLowerCase().contains('escort') ?? false);

              return GestureDetector(
                onTap: () => GlobalDispatchOverlayService.instance.showIncomingOffer(_liveOffer!),
                child: Container(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  margin: const EdgeInsets.only(bottom: AppSpacing.md),
                  decoration: BoxDecoration(
                    color: AppColors.accentGreenDark.withValues(alpha: isDark ? 0.2 : 0.12),
                    borderRadius: BorderRadius.circular(AppRadius.lg),
                    border: Border.all(color: AppColors.accentGreenDark, width: 1.5),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.notifications_active, color: AppColors.accentGreenDark),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  'Live Dispatch Offer Available',
                                  style: AppTypography.body(
                                    fontWeight: FontWeight.bold,
                                    color: isDark ? Colors.white : AppColors.textPrimaryLight,
                                  ),
                                ),
                                if (offerHasEscort) ...[
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: Colors.purple.withValues(alpha: 0.2),
                                      borderRadius: BorderRadius.circular(AppRadius.sm),
                                      border: Border.all(color: Colors.purple.withValues(alpha: 0.6)),
                                    ),
                                    child: const Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(Icons.shield_outlined, size: 10, color: Colors.purple),
                                        SizedBox(width: 3),
                                        Text(
                                          'ESCORT',
                                          style: TextStyle(
                                            fontSize: 9,
                                            fontWeight: FontWeight.w900,
                                            color: Colors.purple,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            Text(
                              offerHasEscort
                                  ? 'Tap to view route & accept guaranteed fare • Escort included'
                                  : 'Tap to view route & accept guaranteed fare',
                              style: AppTypography.caption(
                                color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.accentGreenDark),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
        Container(
          padding: const EdgeInsets.all(AppSpacing.lg),
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(
              color: AppColors.accentGreenDark.withValues(alpha: isDark ? 0.5 : 0.3),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                context.tr('Availability'),
                style: AppTypography.caption(
                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Container(
                    width: 12,
                    height: 12,
                    decoration: const BoxDecoration(
                      color: AppColors.accentGreenDark,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    context.tr('Available'),
                    style: AppTypography.h2(
                      color: isDark ? AppColors.accentGreen : AppColors.accentGreenDark,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 2),
              Text(
                context.tr('You are online and listening for live nearby trips'),
                style: AppTypography.caption(
                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: OutlinedButton(
                  onPressed: () => _toggleOnline(false),
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(
                      color: isDark ? AppColors.borderDark : AppColors.borderLight,
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                  ),
                  child: Center(
                    child: Text(
                      context.tr('GO OFFLINE'),
                      style: AppTypography.button(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                        overflow: TextOverflow.visible,
                      ).copyWith(height: 1.1),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.lg),

        // Live Radar Pulse Card
        Container(
          padding: const EdgeInsets.all(AppSpacing.lg),
          decoration: BoxDecoration(
            color: AppColors.accentGreenDark.withValues(alpha: isDark ? 0.12 : 0.08),
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(
              color: AppColors.accentGreenDark.withValues(alpha: isDark ? 0.35 : 0.2),
            ),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      context.tr("You're available"),
                      style: AppTypography.body(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      context.tr('Auto-scanning for incoming booking requests...'),
                      style: AppTypography.caption(
                        color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.accentGreenDark.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.radar, color: AppColors.accentGreenDark),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.xl),

        _buildActivityCard(
          trips: '$_todayTripsCount',
          earnings: '₹ ${_todayEarnings.toStringAsFixed(0)}',
          isDark: isDark,
        ),
      ],
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // STATE 3: LIVE OFFER / OPPORTUNITY ATTENTION STATE
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildOfferAttentionState(bool isDark) {
    final offer = _liveOffer;
    final isDirectOffer = offer != null;

    final offerId = offer?['id'] as String?;
    final requirementId = (offer?['requirementId'] ?? offer?['id']) as String? ?? '';
    final rawDisplayId = requirementId.length > 8 ? 'REQ-${requirementId.substring(0, 8).toUpperCase()}' : requirementId;

    final reqObj = offer?['requirement'] as Map<String, dynamic>?;
    final vehicle = (offer?['vehicleType'] ?? reqObj?['vehicleType'] ?? 'Sedan').toString();
    final pickup = (offer?['pickupLocation']?['address'] ?? offer?['pickup'] ?? reqObj?['pickupAddress'] ?? 'Pickup Location').toString();
    final drop = (offer?['dropLocation']?['address'] ?? offer?['drop'] ?? reqObj?['dropAddress'] ?? 'Drop Location').toString();
    
    final num rate = DriverService.resolveDriverPayout(offer);
    final rateStr = rate > 0 ? '₹ ${rate.toStringAsFixed(0)} Net' : '₹ Net';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(AppSpacing.lg),
          decoration: BoxDecoration(
            color: isDark ? AppColors.warningContainer.withValues(alpha: 0.15) : AppColors.warningContainer,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(
              color: AppColors.warning,
              width: 1.5,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.flash_on_rounded,
                        size: 16,
                        color: AppColors.warning,
                      ),
                      const SizedBox(width: 4),
                      const Text(
                        'Direct Dispatch Trip Offer',
                        style: TextStyle(
                          color: AppColors.warning,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.warning.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(AppRadius.xs),
                    ),
                    child: Text(
                      rawDisplayId,
                      style: const TextStyle(
                        color: AppColors.warning,
                        fontWeight: FontWeight.bold,
                        fontSize: 10,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Corporate Transfer',
                    style: AppTypography.h3(
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                    ),
                    child: Text(
                      vehicle,
                      style: const TextStyle(
                        color: AppColors.primaryLight,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),

              // Route details
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.circle, size: 10, color: AppColors.accentGreenDark),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Pickup',
                          style: TextStyle(
                            fontSize: 10,
                            color: isDark ? AppColors.textMutedDark : AppColors.slate500,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          pickup,
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 13,
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.circle, size: 10, color: AppColors.error),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Destination',
                          style: TextStyle(
                            fontSize: 10,
                            color: isDark ? AppColors.textMutedDark : AppColors.slate500,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          drop,
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 13,
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),

              // Rate Row
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  border: Border.all(
                    color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Guaranteed Net Payout:',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? AppColors.textSecondaryDark : AppColors.slate600,
                      ),
                    ),
                    Text(
                      rateStr,
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 18,
                        color: isDark ? AppColors.accentGreen : AppColors.accentGreenDark,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.lg),

              // Action Buttons: 100% Direct Dispatch
              if (isDirectOffer) ...[
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () async {
                          try {
                            if (offerId != null) {
                              await DriverService.instance.declineOffer(offerId);
                            }
                            Fluttertoast.showToast(msg: 'Offer declined');
                          } catch (_) {}
                          _loadLiveDriverData(silent: false);
                        },
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AppColors.error),
                          foregroundColor: AppColors.error,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                        ),
                        child: const Text('DECLINE', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      flex: 2,
                      child: ElevatedButton(
                        onPressed: () async {
                          try {
                            if (offerId != null) {
                              await DriverService.instance.acceptOffer(offerId);
                            }
                            Fluttertoast.showToast(msg: 'Trip Accepted successfully!', backgroundColor: AppColors.accentGreenDark);
                            _loadLiveDriverData(silent: false);
                          } catch (e) {
                            Fluttertoast.showToast(msg: 'Accept failed: $e', backgroundColor: AppColors.error);
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.accentGreenDark,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                        ),
                        child: const Text('ACCEPT TRIP', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.xl),
        _buildActivityCard(
          trips: '$_todayTripsCount',
          earnings: '₹ ${_todayEarnings.toStringAsFixed(0)}',
          isDark: isDark,
        ),
      ],
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // STATE 4: ASSIGNED STATE
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildAssignedState(bool isDark) {
    final trip = _liveTrip;
    final tripId = trip?['id'] as String? ?? 'LIVE';
    final pickup = (trip?['pickupLocation']?['address'] ?? trip?['pickupAddress'] ?? 'Pickup Point').toString();
    final drop = (trip?['dropLocation']?['address'] ?? trip?['dropAddress'] ?? 'Destination').toString();
    final vehicle = (trip?['vehicleType'] ?? 'Sedan').toString();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: 12),
          decoration: const BoxDecoration(
            color: AppColors.primary,
            borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.lg)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Trip Assigned',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
              ),
              Text(
                'Trip ID: ${tripId.length > 8 ? tripId.substring(0, 8).toUpperCase() : tripId}',
                style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 12),
              ),
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.all(AppSpacing.lg),
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            borderRadius: const BorderRadius.vertical(bottom: Radius.circular(AppRadius.lg)),
            border: Border.all(
              color: isDark ? AppColors.borderDark : AppColors.borderLight,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Assigned Booking',
                    style: AppTypography.h3(
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    vehicle,
                    style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primaryLight),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.circle, size: 8, color: AppColors.accentGreenDark),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      pickup,
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.circle, size: 8, color: AppColors.error),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      drop,
                      style: TextStyle(
                        color: isDark ? AppColors.textSecondaryDark : AppColors.slate600,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: () async {
                    try {
                      await DriverService.instance.markArrived(tripId);
                      Fluttertoast.showToast(msg: 'Marked arrived! Ask passenger for OTP.', backgroundColor: AppColors.primary);
                      await _loadLiveDriverData(silent: false, force: true);
                    } catch (e) {
                      // Stale trip or already completed/cancelled: force re-sync
                      DriverService.instance.notifyTripChanged(tripId: tripId);
                      await _loadLiveDriverData(silent: true, force: true);
                      if (!mounted) return;
                      if (_liveTrip == null || _currentState != DriverHomeState.assignedTrip) {
                        Fluttertoast.showToast(
                          msg: 'Trip is already completed or cancelled. State updated.',
                          backgroundColor: AppColors.accentGreenDark,
                        );
                      } else {
                        Fluttertoast.showToast(msg: '$e', backgroundColor: AppColors.error);
                      }
                    }
                  },
                  icon: const Icon(Icons.pin_drop_rounded, color: Colors.white),
                  label: const Text('ARRIVED AT PICKUP LOCATION', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // STATE 5: ACTIVE TRIP STATE
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildActiveTripState(bool isDark) {
    final trip = _liveTrip;
    final tripId = trip?['id'] as String? ?? '';
    final status = (trip?['status'] as String? ?? 'IN_PROGRESS');
    final drop = (trip?['dropLocation']?['address'] ?? trip?['dropAddress'] ?? 'Destination').toString();
    final rawPayout = trip?['driverRate'] ??
        trip?['totalDriverEarnings'] ??
        trip?['driverEarnings'] ??
        trip?['fare'] ??
        trip?['rate'];
    final num? parsedPayout = rawPayout != null
        ? ((rawPayout is num) ? rawPayout : num.tryParse(rawPayout.toString()))
        : null;
    final payout = (parsedPayout != null && parsedPayout > 0)
        ? parsedPayout.toStringAsFixed(0)
        : (rawPayout?.toString() ?? '--');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: 12),
          decoration: BoxDecoration(
            color: status == 'ARRIVED' ? AppColors.warning : AppColors.primary,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.lg)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                status == 'ARRIVED' ? 'Arrived at Pickup (Enter OTP)' : 'Trip in Progress',
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
              ),
              Text(
                'Trip: ${tripId.length > 8 ? tripId.substring(0, 8).toUpperCase() : tripId}',
                style: const TextStyle(color: Colors.white, fontSize: 12),
              ),
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.all(AppSpacing.lg),
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            borderRadius: const BorderRadius.vertical(bottom: Radius.circular(AppRadius.lg)),
            border: Border.all(
              color: isDark ? AppColors.borderDark : AppColors.borderLight,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (status == 'ARRIVED') ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.pin_outlined, color: AppColors.primary, size: 28),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '4-Digit Start OTP Required',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                              ),
                            ),
                            Text(
                              'Ask passenger for their 4-digit PIN to begin trip',
                              style: TextStyle(
                                fontSize: 11,
                                color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      final rawName = trip?['passengerName'] ??
                          trip?['userName'] ??
                          trip?['customerName'] ??
                          trip?['user']?['fullName'] ??
                          trip?['vendor']?['user']?['fullName'];
                      final sanitized = sanitizeRealName(rawName?.toString());
                      final pName = sanitized.isNotEmpty ? sanitized : 'Passenger';
                      final started = await TripStartOtpBottomSheet.show(
                        context: context,
                        tripId: tripId,
                        passengerName: pName,
                      );
                      if (started == true) {
                        Fluttertoast.showToast(
                          msg: 'Trip Started! Drive safely.',
                          backgroundColor: AppColors.success,
                        );
                        _loadLiveDriverData(silent: false);
                      }
                    },
                    icon: const Icon(Icons.verified_outlined, color: Colors.white, size: 20),
                    label: const Text(
                      'ENTER 4-DIGIT OTP & START TRIP →',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        letterSpacing: 0.5,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.accentGreenDark,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AppRadius.md),
                      ),
                    ),
                  ),
                ),
              ] else ...[
                Text(
                  'Driving to Destination',
                  style: AppTypography.h3(
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Drop: $drop',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: () => _showCompleteTripModal(context, tripId, drop, payout),
                    icon: const Icon(Icons.check_circle_rounded, color: Colors.white),
                    label: const Text('COMPLETE TRIP', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.accentGreenDark,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  void _showCompleteTripModal(BuildContext context, String tripId, String dropAddress, String rawFare) {
    final baseFare = double.tryParse(rawFare.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 0.0;
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final isDark = Theme.of(ctx).brightness == Brightness.dark;
          final bottomInset = MediaQuery.of(ctx).viewInsets.bottom;
          final isCorporate = (_liveTrip?['requirement']?['fulfillmentMode'] ?? _liveTrip?['fulfillmentMode']) == 'CORPORATE_DISPATCH' || _liveTrip?['localityTier'] != null;
          final commissionPercent = _platformCommissionPercent;
          final platformFee = isCorporate ? 0.0 : (baseFare * (commissionPercent / 100.0)).roundToDouble();
          final netPayout = (baseFare - platformFee).clamp(0.0, 9999999.0);

          return SafeArea(
            top: false,
            child: Container(
              padding: EdgeInsets.only(
                left: AppSpacing.lg,
                right: AppSpacing.lg,
                top: AppSpacing.lg,
                bottom: AppSpacing.lg + bottomInset,
              ),
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
              ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Complete Dropoff',
                        style: AppTypography.h2(
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.of(ctx).pop(),
                        icon: const Icon(Icons.close),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Arrived at: $dropAddress',
                    style: TextStyle(fontSize: 12, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                  ),
                  const Divider(height: 24),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.slate800 : AppColors.slate100,
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Base Fare', style: TextStyle(fontSize: 12)),
                            Text('₹ ${baseFare.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                          ],
                        ),
                        if (platformFee > 0) ...[
                          const SizedBox(height: 4),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Platform Commission (${commissionPercent.toStringAsFixed(0)}%)', style: const TextStyle(fontSize: 12, color: AppColors.error)),
                              Text('-₹ ${platformFee.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.error)),
                            ],
                          ),
                        ],
                        const Divider(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Net Driver Wallet Credit', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                            Text(
                              '₹ ${netPayout.toStringAsFixed(0)}',
                              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppColors.primary),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: isSubmitting
                          ? null
                          : () async {
                              setModalState(() => isSubmitting = true);
                              try {
                                await DriverService.instance.completeTrip(
                                  tripId,
                                );
                                if (ctx.mounted) Navigator.of(ctx).pop();
                                Fluttertoast.showToast(msg: 'Trip Completed! ₹${netPayout.toStringAsFixed(0)} credited.', backgroundColor: AppColors.success);
                                setState(() => _currentState = DriverHomeState.completedTrip);
                                _loadLiveDriverData(silent: false);
                              } catch (e) {
                                setModalState(() => isSubmitting = false);
                                Fluttertoast.showToast(msg: 'Failed: $e', backgroundColor: AppColors.error);
                              }
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.accentGreenDark,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                      ),
                      child: isSubmitting
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Text('CONFIRM & COMPLETE TRIP', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    ),
  );
}

  // ───────────────────────────────────────────────────────────────────────────
  // STATE 6: COMPLETED TRIP STATE
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildCompletedTripState(bool isDark) {
    final tripId = _liveTrip?['id']?.toString() ?? '';
    final vendor = _liveTrip?['vendor'] as Map<String, dynamic>?;
    final customerName = vendor?['organizationName'] ?? vendor?['fullName'] ?? 'Passenger';

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(AppSpacing.xl),
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(
              color: AppColors.accentGreenDark.withValues(alpha: isDark ? 0.5 : 0.3),
            ),
          ),
          child: Column(
            children: [
              const Icon(Icons.check_circle_rounded, size: 64, color: AppColors.accentGreenDark),
              const SizedBox(height: 12),
              Text(
                'Trip Successfully Completed!',
                style: AppTypography.h2(
                  color: isDark ? AppColors.accentGreen : AppColors.accentGreenDark,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Earnings credited directly to your AdhocX Driver Wallet.',
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? AppColors.textSecondaryDark : AppColors.slate600,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              if (tripId.isNotEmpty) ...[
                OutlinedButton.icon(
                  onPressed: () {
                    TripRatingBottomSheet.show(
                      context: context,
                      tripId: tripId,
                      targetName: customerName,
                      isReviewingDriver: false,
                    );
                  },
                  icon: const Icon(Icons.star_rounded, color: AppColors.starAmber),
                  label: const Text('Rate Passenger ⭐', style: TextStyle(fontWeight: FontWeight.bold)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.starAmber,
                    side: const BorderSide(color: AppColors.starAmber),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                    minimumSize: const Size.fromHeight(44),
                  ),
                ),
                const SizedBox(height: 10),
              ],
              ElevatedButton(
                onPressed: () {
                  setState(() => _currentState = DriverHomeState.available);
                  _loadLiveDriverData(silent: false);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  minimumSize: const Size.fromHeight(48),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                ),
                child: const Text('LOOK FOR NEXT TRIP →', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildActivityCard({
    required String trips,
    required String earnings,
    required bool isDark,
  }) {
    return Container(
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
            context.tr("Today's Activity"),
            style: AppTypography.caption(
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      context.tr('Trips'),
                      style: AppTypography.caption(
                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                      ),
                    ),
                    Text(
                      trips,
                      style: AppTypography.h2(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      context.tr('Earnings'),
                      style: AppTypography.caption(
                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                      ),
                    ),
                    Text(
                      earnings,
                      style: AppTypography.h2(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBullet(String text, bool isDark) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Icon(Icons.check, size: 14, color: AppColors.accentGreenDark),
        const SizedBox(width: 6),
        Text(
          text,
          style: TextStyle(
            fontSize: 12,
            color: isDark ? AppColors.textSecondaryDark : AppColors.slate600,
          ),
        ),
      ],
    );
  }
}
