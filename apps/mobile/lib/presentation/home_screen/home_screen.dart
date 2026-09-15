import 'dart:async';
import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_service.dart';
import '../../services/driver_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../opportunities_screen/driver_submit_bid_sheet.dart';

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
  String _driverName = 'Driver Partner';
  double _todayEarnings = 0.0;
  int _todayTripsCount = 0;
  Map<String, dynamic>? _liveOffer;
  Map<String, dynamic>? _liveTrip;
  Timer? _autoRefreshTimer;
  final TextEditingController _otpController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadLiveDriverData();
    _startAutoRefresh();
  }

  @override
  void dispose() {
    _autoRefreshTimer?.cancel();
    _otpController.dispose();
    super.dispose();
  }

  void _startAutoRefresh() {
    _autoRefreshTimer?.cancel();
    _autoRefreshTimer = Timer.periodic(const Duration(milliseconds: 3500), (_) {
      if (mounted && (_currentState == DriverHomeState.available || _currentState == DriverHomeState.offerAttention)) {
        _loadLiveDriverData(silent: true);
      }
    });
  }

  Future<void> _loadLiveDriverData({bool silent = false}) async {
    if (!silent) setState(() => _isLoading = true);
    try {
      await AuthService.instance.ensureAuthenticatedSession(role: 'DRIVER');
      final results = await Future.wait([
        DriverService.instance.getProfile().catchError((_) => null),
        DriverService.instance.getWalletSummary().catchError((_) => null),
        DriverService.instance.getOffers().catchError((_) => []),
        DriverService.instance.getBiddingOpportunities().catchError((_) => []),
        DriverService.instance.getTrips().catchError((_) => []),
      ]);

      final profile = results[0] as Map<String, dynamic>?;
      final wallet = results[1] as Map<String, dynamic>?;
      final offers = results[2] is List ? results[2] as List<dynamic> : [];
      final biddingOps = results[3] is List ? results[3] as List<dynamic> : [];
      final trips = results[4] is List ? results[4] as List<dynamic> : [];

      if (mounted) {
        setState(() {
          if (profile != null) {
            final user = profile['user'] as Map<String, dynamic>?;
            _driverName = profile['fullName'] as String? ?? user?['name'] as String? ?? 'Driver Partner';
            final avail = profile['availabilityStatus'] as String? ?? 'OFFLINE';
            if (avail == 'AVAILABLE' && _currentState == DriverHomeState.offline) {
              _currentState = DriverHomeState.available;
            }
          }

          if (wallet != null) {
            _todayEarnings = (wallet['todayEarnings'] ?? wallet['availableBalance'] ?? 0.0).toDouble();
            _todayTripsCount = (wallet['completedTripsCount'] ?? 0).toInt();
          }

          // 1. Check if an active / in-progress / arrived trip exists
          final inProgressTrip = trips.firstWhere(
            (t) => t['status'] == 'IN_PROGRESS' || t['status'] == 'ARRIVED',
            orElse: () => null,
          );
          if (inProgressTrip != null) {
            _liveTrip = inProgressTrip as Map<String, dynamic>;
            _currentState = DriverHomeState.activeTrip;
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
            return;
          }

          // 3. Check for direct dispatch offers
          final sentOffers = offers.where((o) => o['status'] == 'SENT' || o['status'] == null).toList();
          if (sentOffers.isNotEmpty) {
            _liveOffer = sentOffers.first as Map<String, dynamic>;
            _currentState = DriverHomeState.offerAttention;
            return;
          }

          // 4. Check for open bidding opportunities
          if (biddingOps.isNotEmpty) {
            _liveOffer = biddingOps.first as Map<String, dynamic>;
            _currentState = DriverHomeState.offerAttention;
            return;
          }

          // 5. If no active trip or offer, and status is not offline, keep available
          if (_currentState == DriverHomeState.offerAttention) {
            _liveOffer = null;
            _currentState = DriverHomeState.available;
          }
        });
      }
    } catch (e) {
      debugPrint('Driver home sync notice: $e');
    } finally {
      if (!silent && mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _toggleOnline(bool goOnline) async {
    try {
      await AuthService.instance.ensureAuthenticatedSession(role: 'DRIVER');
      final newStatus = goOnline ? 'AVAILABLE' : 'OFFLINE';
      await DriverService.instance.updateAvailability(newStatus, lat: 28.4950, lng: 77.0895);
      if (mounted) {
        setState(() {
          _currentState = goOnline ? DriverHomeState.available : DriverHomeState.offline;
        });
        Fluttertoast.showToast(
          msg: goOnline ? '🟢 You are now ONLINE & Available for trips' : '⚪ You are now OFFLINE',
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

  void _setDriverState(DriverHomeState state) {
    setState(() => _currentState = state);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
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
                    color: AppColors.surfaceLight,
                    border: Border(
                      bottom: BorderSide(color: AppColors.borderLight),
                    ),
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () => _loadLiveDriverData(silent: false),
                        icon: Icon(
                          Icons.refresh,
                          color: AppColors.textPrimaryLight,
                        ),
                        tooltip: 'Sync Live Offers',
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Welcome back,',
                              style: AppTypography.caption(
                                color: AppColors.textMutedLight,
                              ).copyWith(fontSize: 11),
                            ),
                            Text(
                              _driverName,
                              style: AppTypography.body(
                                color: AppColors.textPrimaryLight,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () => context.push(AppRoutes.notificationsSettingsScreen),
                        icon: Icon(
                          Icons.notifications_none_rounded,
                          color: AppColors.textPrimaryLight,
                        ),
                      ),
                      GestureDetector(
                        onTap: () => context.push(AppRoutes.personalInfoScreen),
                        child: const CircleAvatar(
                          radius: 18,
                          backgroundColor: AppColors.borderLight,
                          child: Icon(Icons.person, size: 20, color: AppColors.textSecondaryLight),
                        ),
                      ),
                    ],
                  ),
                ),

                // ── Live Driver State Simulator Bar ──────────────────────────
                Container(
                  color: AppColors.surfaceLight,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: DriverHomeState.values.map((state) {
                        final isSelected = _currentState == state;
                        final label = switch (state) {
                          DriverHomeState.offline => '1. Offline',
                          DriverHomeState.available => '2. Available',
                          DriverHomeState.offerAttention => '3. Offer',
                          DriverHomeState.assignedTrip => '4. Assigned',
                          DriverHomeState.activeTrip => '5. Active Trip',
                          DriverHomeState.completedTrip => '6. Completed',
                        };

                        return GestureDetector(
                          onTap: () {
                            if (state == DriverHomeState.available) {
                              _toggleOnline(true);
                            } else if (state == DriverHomeState.offline) {
                              _toggleOnline(false);
                            } else {
                              _setDriverState(state);
                            }
                          },
                          child: Container(
                            margin: const EdgeInsets.only(right: 6),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: isSelected ? AppColors.primary : AppColors.bgLight,
                              borderRadius: BorderRadius.circular(AppRadius.full),
                              border: Border.all(
                                color: isSelected ? AppColors.primary : AppColors.borderLight,
                              ),
                            ),
                            child: Text(
                              label,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                color: isSelected ? Colors.white : AppColors.textPrimaryLight,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ),
                Divider(height: 1, color: AppColors.borderLight),

                // ── Dynamic State Body ───────────────────────────────────────
                Expanded(
                  child: _isLoading && _liveOffer == null && _liveTrip == null
                      ? const Center(child: CircularProgressIndicator())
                      : RefreshIndicator(
                          onRefresh: () => _loadLiveDriverData(silent: false),
                          child: ListView(
                            padding: const EdgeInsets.all(AppSpacing.lg),
                            children: [
                              switch (_currentState) {
                                DriverHomeState.offline => _buildOfflineState(),
                                DriverHomeState.available => _buildAvailableState(),
                                DriverHomeState.offerAttention => _buildOfferAttentionState(),
                                DriverHomeState.assignedTrip => _buildAssignedState(),
                                DriverHomeState.activeTrip => _buildActiveTripState(),
                                DriverHomeState.completedTrip => _buildCompletedTripState(),
                              },
                              const SizedBox(height: 100),
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

  // ───────────────────────────────────────────────────────────────────────────
  // STATE 1: OFFLINE STATE
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildOfflineState() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(AppSpacing.lg),
          decoration: BoxDecoration(
            color: AppColors.surfaceElevatedDark,
            borderRadius: BorderRadius.circular(AppRadius.lg),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Availability',
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
                    'Offline',
                    style: AppTypography.h2(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 2),
              Text(
                'You are currently offline. Go online to receive trip offers.',
                style: AppTypography.caption(color: Colors.white70),
              ),
              const SizedBox(height: AppSpacing.lg),
              SizedBox(
                width: double.infinity,
                height: 44,
                child: ElevatedButton(
                  onPressed: () => _toggleOnline(true),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                  ),
                  child: Text(
                    'GO ONLINE',
                    style: AppTypography.body(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
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
                  color: AppColors.borderLight.withValues(alpha: 0.4),
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.directions_car_outlined, size: 40, color: AppColors.textMutedLight),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                'You are offline',
                style: AppTypography.h3(
                  color: AppColors.textPrimaryLight,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Go online to receive trip opportunities in real-time',
                style: AppTypography.caption(color: AppColors.textMutedLight),
              ),
              const SizedBox(height: AppSpacing.lg),
              _buildBullet('Go online to get live trip dispatches'),
              const SizedBox(height: 4),
              _buildBullet("We'll notify you automatically on new requests"),
              const SizedBox(height: 4),
              _buildBullet('You can go offline anytime with one tap'),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.xl),
        _buildActivityCard(trips: '$_todayTripsCount', earnings: '₹ ${_todayEarnings.toStringAsFixed(0)}'),
      ],
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // STATE 2: AVAILABLE STATE
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildAvailableState() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(AppSpacing.lg),
          decoration: BoxDecoration(
            color: AppColors.surfaceLight,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: AppColors.accentGreenDark.withValues(alpha: 0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Availability', style: AppTypography.caption(color: AppColors.textMutedLight)),
              const SizedBox(height: 8),
              Row(
                children: [
                  Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: AppColors.accentGreenDark,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'Available',
                    style: AppTypography.h2(
                      color: AppColors.accentGreenDark,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 2),
              Text(
                'You are online and listening for live nearby trips',
                style: AppTypography.caption(color: AppColors.textSecondaryLight),
              ),
              const SizedBox(height: AppSpacing.lg),
              SizedBox(
                width: double.infinity,
                height: 44,
                child: OutlinedButton(
                  onPressed: () => _toggleOnline(false),
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(color: AppColors.borderLight),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                  ),
                  child: Text(
                    'GO OFFLINE',
                    style: AppTypography.body(
                      color: AppColors.textPrimaryLight,
                      fontWeight: FontWeight.bold,
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
            color: AppColors.accentGreenDark.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: AppColors.accentGreenDark.withValues(alpha: 0.2)),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "You're available",
                      style: AppTypography.body(
                        color: AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Auto-scanning for incoming booking requests...',
                      style: AppTypography.caption(color: AppColors.textSecondaryLight),
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
                child: Icon(Icons.radar, color: AppColors.accentGreenDark),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.xl),

        _buildActivityCard(trips: '$_todayTripsCount', earnings: '₹ ${_todayEarnings.toStringAsFixed(0)}'),
        const SizedBox(height: AppSpacing.lg),

        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: () => context.push(AppRoutes.opportunitiesScreen),
            icon: const Icon(Icons.near_me_outlined),
            label: const Text('View All Live Opportunities'),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
            ),
          ),
        ),
      ],
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // STATE 3: LIVE OFFER / OPPORTUNITY ATTENTION STATE
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildOfferAttentionState() {
    final offer = _liveOffer;
    final isDirectOffer = offer != null && offer['offeredRate'] != null;
    final isBidding = offer != null && (offer['fulfillmentMode'] == 'BIDDING' || offer['suggestedBudget'] != null);

    final offerId = offer?['id'] as String?;
    final requirementId = (offer?['requirementId'] ?? offer?['id']) as String? ?? '';
    final rawDisplayId = requirementId.length > 8 ? 'REQ-${requirementId.substring(0, 8).toUpperCase()}' : requirementId;

    final reqObj = offer?['requirement'] as Map<String, dynamic>?;
    final vehicle = (offer?['vehicleType'] ?? reqObj?['vehicleType'] ?? 'Sedan').toString();
    final pickup = (offer?['pickupLocation']?['address'] ?? offer?['pickup'] ?? reqObj?['pickupAddress'] ?? 'Pickup Location').toString();
    final drop = (offer?['dropLocation']?['address'] ?? offer?['drop'] ?? reqObj?['dropAddress'] ?? 'Drop Location').toString();
    
    final num rate = (offer?['offeredRate'] ?? offer?['suggestedBudget'] ?? offer?['offeredPrice'] ?? reqObj?['ratePerVehicle'] ?? 850) as num;
    final rateStr = '₹ ${rate.toStringAsFixed(0)}';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(AppSpacing.lg),
          decoration: BoxDecoration(
            color: isBidding ? AppColors.primary.withValues(alpha: 0.08) : AppColors.warningContainer,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(
              color: isBidding ? AppColors.primary : AppColors.warning,
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
                      Icon(
                        isBidding ? Icons.gavel_rounded : Icons.flash_on_rounded,
                        size: 16,
                        color: isBidding ? AppColors.primary : AppColors.warning,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        isBidding ? 'New Outstation Bidding Trip' : 'Direct Dispatch Trip Offer',
                        style: TextStyle(
                          color: isBidding ? AppColors.primary : AppColors.warning,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: isBidding ? AppColors.primary.withValues(alpha: 0.15) : AppColors.warning.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(AppRadius.xs),
                    ),
                    child: Text(
                      rawDisplayId,
                      style: TextStyle(
                        color: isBidding ? AppColors.primary : AppColors.warning,
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
                    isBidding ? 'Outstation Booking' : 'Corporate Transfer',
                    style: AppTypography.h3(
                      color: AppColors.textPrimaryLight,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                    ),
                    child: Text(
                      vehicle,
                      style: TextStyle(
                        color: AppColors.primary,
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
                        const Text('Pickup', style: TextStyle(fontSize: 10, color: AppColors.slate500, fontWeight: FontWeight.bold)),
                        Text(pickup, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
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
                        const Text('Destination', style: TextStyle(fontSize: 10, color: AppColors.slate500, fontWeight: FontWeight.bold)),
                        Text(drop, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
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
                  color: AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  border: Border.all(color: AppColors.borderLight),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      isBidding ? 'Suggested Budget / Guide Price:' : 'Offered Payout:',
                      style: const TextStyle(fontSize: 12, color: AppColors.slate600),
                    ),
                    Text(
                      rateStr,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppColors.accentGreenDark),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.lg),

              // Action Buttons
              if (isDirectOffer && offerId != null) ...[
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () async {
                          try {
                            await DriverService.instance.declineOffer(offerId);
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
                        child: const Text('DECLINE ✕', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      flex: 2,
                      child: ElevatedButton(
                        onPressed: () async {
                          try {
                            await DriverService.instance.acceptOffer(offerId);
                            Fluttertoast.showToast(msg: 'Trip Accepted successfully! ✓', backgroundColor: AppColors.accentGreenDark);
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
                        child: const Text('ACCEPT TRIP ✓', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      ),
                    ),
                  ],
                ),
              ] else if (isBidding) ...[
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () {
                          showModalBottomSheet(
                            context: context,
                            isScrollControlled: true,
                            backgroundColor: Colors.transparent,
                            builder: (ctx) => DriverSubmitBidSheet(
                              opportunity: offer,
                              onBidSubmitted: () {
                                Fluttertoast.showToast(msg: 'Quote submitted successfully! ✓', backgroundColor: AppColors.primary);
                                _loadLiveDriverData(silent: false);
                              },
                            ),
                          );
                        },
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                        ),
                        child: const Text('Custom Quote', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      flex: 2,
                      child: ElevatedButton(
                        onPressed: () async {
                          try {
                            await DriverService.instance.submitBid(
                              requirementId: requirementId,
                              bidAmount: rate.toDouble(),
                              etaMinutes: 15,
                            );
                            Fluttertoast.showToast(msg: 'Quick Quote $rateStr placed! ✓', backgroundColor: AppColors.primary);
                            _loadLiveDriverData(silent: false);
                          } catch (e) {
                            Fluttertoast.showToast(msg: 'Bid submission failed: $e', backgroundColor: AppColors.error);
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                        ),
                        child: Text('QUICK BID ($rateStr) →', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.xl),
        _buildActivityCard(trips: '$_todayTripsCount', earnings: '₹ ${_todayEarnings.toStringAsFixed(0)}'),
      ],
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // STATE 4: ASSIGNED STATE
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildAssignedState() {
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
          decoration: BoxDecoration(
            color: AppColors.primary,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.lg)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Trip Assigned ✓',
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
            color: AppColors.surfaceLight,
            borderRadius: const BorderRadius.vertical(bottom: Radius.circular(AppRadius.lg)),
            border: Border.all(color: AppColors.borderLight),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Assigned Booking', style: AppTypography.h3(color: AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                  Text(vehicle, style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary)),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.circle, size: 8, color: AppColors.accentGreenDark),
                  const SizedBox(width: 8),
                  Expanded(child: Text(pickup, style: const TextStyle(fontWeight: FontWeight.w600))),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.circle, size: 8, color: AppColors.error),
                  const SizedBox(width: 8),
                  Expanded(child: Text(drop, style: const TextStyle(color: AppColors.slate600))),
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
                      _loadLiveDriverData(silent: false);
                    } catch (e) {
                      Fluttertoast.showToast(msg: 'Error: $e', backgroundColor: AppColors.error);
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
  Widget _buildActiveTripState() {
    final trip = _liveTrip;
    final tripId = trip?['id'] as String? ?? '';
    final status = (trip?['status'] as String? ?? 'IN_PROGRESS');
    final pickup = (trip?['pickupLocation']?['address'] ?? trip?['pickupAddress'] ?? 'Pickup Point').toString();
    final drop = (trip?['dropLocation']?['address'] ?? trip?['dropAddress'] ?? 'Destination').toString();

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
                status == 'ARRIVED' ? 'Arrived at Pickup (Enter OTP)' : 'Trip in Progress 🚗',
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
            color: AppColors.surfaceLight,
            borderRadius: const BorderRadius.vertical(bottom: Radius.circular(AppRadius.lg)),
            border: Border.all(color: AppColors.borderLight),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (status == 'ARRIVED') ...[
                const Text(
                  'Enter Passenger Start OTP',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: _otpController,
                  keyboardType: TextInputType.number,
                  maxLength: 4,
                  decoration: InputDecoration(
                    hintText: 'Enter 4-digit OTP (e.g. 1234)',
                    prefixIcon: const Icon(Icons.lock_clock_outlined),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  height: 46,
                  child: ElevatedButton(
                    onPressed: () async {
                      final otp = _otpController.text.trim();
                      if (otp.isEmpty) {
                        Fluttertoast.showToast(msg: 'Please enter OTP');
                        return;
                      }
                      try {
                        await DriverService.instance.startTrip(tripId, otp);
                        Fluttertoast.showToast(msg: 'Trip Started! Drive safely.', backgroundColor: AppColors.success);
                        _loadLiveDriverData(silent: false);
                      } catch (e) {
                        Fluttertoast.showToast(msg: 'Invalid OTP: $e', backgroundColor: AppColors.error);
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.accentGreenDark,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                    ),
                    child: const Text('START TRIP →', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                ),
              ] else ...[
                Text('Driving to Destination', style: AppTypography.h3(color: AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Text('Drop: $drop', style: const TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: AppSpacing.lg),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      try {
                        await DriverService.instance.completeTrip(tripId);
                        Fluttertoast.showToast(msg: 'Trip Completed! Payout credited.', backgroundColor: AppColors.success);
                        _setDriverState(DriverHomeState.completedTrip);
                      } catch (e) {
                        Fluttertoast.showToast(msg: 'Failed to complete trip: $e', backgroundColor: AppColors.error);
                      }
                    },
                    icon: const Icon(Icons.check_circle_rounded, color: Colors.white),
                    label: const Text('COMPLETE TRIP ✓', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
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

  // ───────────────────────────────────────────────────────────────────────────
  // STATE 6: COMPLETED TRIP STATE
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildCompletedTripState() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(AppSpacing.xl),
          decoration: BoxDecoration(
            color: AppColors.surfaceLight,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: AppColors.accentGreenDark.withValues(alpha: 0.3)),
          ),
          child: Column(
            children: [
              const Icon(Icons.check_circle_rounded, size: 64, color: AppColors.accentGreenDark),
              const SizedBox(height: 12),
              Text('Trip Successfully Completed!', style: AppTypography.h2(color: AppColors.accentGreenDark, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              const Text('Fare has been credited to your AdhocX Wallet.', style: TextStyle(fontSize: 12, color: AppColors.slate600)),
              const SizedBox(height: AppSpacing.xl),
              ElevatedButton(
                onPressed: () {
                  _setDriverState(DriverHomeState.available);
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

  Widget _buildActivityCard({required String trips, required String earnings}) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("Today's Activity", style: AppTypography.caption(color: AppColors.textMutedLight)),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Trips', style: AppTypography.caption(color: AppColors.textMutedLight)),
                    Text(trips, style: AppTypography.h2(color: AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Earnings', style: AppTypography.caption(color: AppColors.textMutedLight)),
                    Text(earnings, style: AppTypography.h2(color: AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBullet(String text) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(Icons.check, size: 14, color: AppColors.accentGreenDark),
        const SizedBox(width: 6),
        Text(text, style: const TextStyle(fontSize: 12, color: AppColors.slate600)),
      ],
    );
  }
}
