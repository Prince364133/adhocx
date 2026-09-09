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

enum DriverHomeState { offline, available, offerAttention, assignedTrip, activeTrip, completedTrip }

/// Main Driver Home Screen supporting live driver operational states & backend sync.
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

  @override
  void initState() {
    super.initState();
    _loadLiveDriverData();
  }

  Future<void> _loadLiveDriverData() async {
    setState(() => _isLoading = true);
    try {
      await AuthService.instance.ensureAuthenticatedSession(role: 'DRIVER');
      final results = await Future.wait([
        DriverService.instance.getProfile().catchError((_) => null),
        DriverService.instance.getWalletSummary().catchError((_) => null),
        DriverService.instance.getOffers().catchError((_) => []),
        DriverService.instance.getTrips().catchError((_) => []),
      ]);

      final profile = results[0] as Map<String, dynamic>?;
      final wallet = results[1] as Map<String, dynamic>?;
      final offers = results[2] is List ? results[2] as List<dynamic> : [];
      final trips = results[3] is List ? results[3] as List<dynamic> : [];

      if (mounted) {
        setState(() {
          if (profile != null) {
            final user = profile['user'] as Map<String, dynamic>?;
            _driverName = user?['name'] as String? ?? 'Driver Partner';
            final avail = profile['availabilityStatus'] as String? ?? 'OFFLINE';
            if (avail == 'AVAILABLE') {
              _currentState = DriverHomeState.available;
            } else {
              _currentState = DriverHomeState.offline;
            }
          }

          if (wallet != null) {
            _todayEarnings = (wallet['todayEarnings'] ?? wallet['availableBalance'] ?? 0.0).toDouble();
            _todayTripsCount = (wallet['completedTripsCount'] ?? 0).toInt();
          }

          // Check if active trip exists
          final inProgressTrip = trips.firstWhere(
            (t) => t['status'] == 'IN_PROGRESS' || t['status'] == 'ARRIVED',
            orElse: () => null,
          );
          if (inProgressTrip != null) {
            _liveTrip = inProgressTrip as Map<String, dynamic>;
            _currentState = DriverHomeState.activeTrip;
          } else {
            final assignedTrip = trips.firstWhere(
              (t) => t['status'] == 'ASSIGNED' || t['status'] == 'DRIVER_ASSIGNED',
              orElse: () => null,
            );
            if (assignedTrip != null) {
              _liveTrip = assignedTrip as Map<String, dynamic>;
              _currentState = DriverHomeState.assignedTrip;
            } else if (offers.isNotEmpty) {
              _liveOffer = offers.first as Map<String, dynamic>;
              _currentState = DriverHomeState.offerAttention;
            }
          }
        });
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _toggleOnline(bool goOnline) async {
    try {
      await AuthService.instance.ensureAuthenticatedSession(role: 'DRIVER');
      final newStatus = goOnline ? 'AVAILABLE' : 'OFFLINE';
      await DriverService.instance.updateAvailability(newStatus);
      if (mounted) {
        setState(() {
          _currentState = goOnline ? DriverHomeState.available : DriverHomeState.offline;
        });
        Fluttertoast.showToast(
          msg: goOnline ? 'You are now ONLINE' : 'You are now OFFLINE',
          backgroundColor: goOnline ? AppColors.accentGreenDark : AppColors.slate700,
        );
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
                        onPressed: _loadLiveDriverData,
                        icon: Icon(
                          Icons.refresh,
                          color: AppColors.textPrimaryLight,
                        ),
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
        // Availability Dark Card
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
                'You are currently offline',
                style: AppTypography.caption(color: Colors.white70),
              ),
              const SizedBox(height: AppSpacing.lg),
              SizedBox(
                width: double.infinity,
                height: 44,
                child: ElevatedButton(
                  onPressed: () => _toggleOnline(true),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.borderDark,
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

        // Offline Guide Illustration & Text
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
                'Go online to receive trip opportunities',
                style: AppTypography.caption(color: AppColors.textMutedLight),
              ),
              const SizedBox(height: AppSpacing.lg),
              _buildBullet('Go online to get trip offers'),
              const SizedBox(height: 4),
              _buildBullet("We'll notify you on new requests"),
              const SizedBox(height: 4),
              _buildBullet('You can go offline anytime'),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.xl),

        // Today's Activity Card
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
        // Availability White Card
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
                'You are online and available for trips',
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

        // Radar Scanning Card
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
                      'Looking for nearby trips...',
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

        // Today's Activity Card
        _buildActivityCard(trips: '$_todayTripsCount', earnings: '₹ ${_todayEarnings.toStringAsFixed(0)}'),
        const SizedBox(height: AppSpacing.lg),

        // Opportunities button
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: () => context.push(AppRoutes.opportunitiesScreen),
            icon: const Icon(Icons.near_me_outlined),
            label: const Text('View Live Nearby Opportunities'),
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
  // STATE 3: OFFER ATTENTION STATE
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildOfferAttentionState() {
    final req = _liveOffer?['requirement'] as Map<String, dynamic>?;
    final title = req?['title'] as String? ?? 'Corporate Transfer';
    final vehicle = req?['vehicleType'] as String? ?? 'Sedan';
    final pickup = req?['pickupAddress'] as String? ?? _liveOffer?['pickup'] as String? ?? 'DLF Cyber City, Gurugram';
    final drop = req?['dropAddress'] as String? ?? _liveOffer?['drop'] as String? ?? 'Indira Gandhi Airport, T3';
    final earnings = '₹ ${(_liveOffer?['offeredPrice'] ?? req?['budgetPerVehicle'] ?? 850)}';
    final offerId = _liveOffer?['id'] as String?;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Time-Sensitive Offer Card
        Container(
          padding: const EdgeInsets.all(AppSpacing.lg),
          decoration: BoxDecoration(
            color: AppColors.warningContainer,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: AppColors.warningContainer, width: 1.5),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'New Trip Opportunity',
                    style: AppTypography.caption(
                      color: AppColors.warning,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.warningContainer,
                      borderRadius: BorderRadius.circular(AppRadius.xs),
                    ),
                    child: Text(
                      'Expires soon',
                      style: AppTypography.caption(
                        color: AppColors.warning,
                        fontWeight: FontWeight.bold,
                      ).copyWith(fontSize: 10),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    title,
                    style: AppTypography.h3(
                      color: AppColors.textPrimaryLight,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    vehicle,
                    style: AppTypography.caption(
                      color: AppColors.textMutedLight,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.circle, size: 8, color: AppColors.accentGreenDark),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      pickup,
                      style: AppTypography.caption(color: AppColors.textSecondaryLight),
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
                      style: AppTypography.caption(color: AppColors.textSecondaryLight),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  const Icon(Icons.navigation_outlined, size: 14, color: AppColors.textMutedLight),
                  const SizedBox(width: 4),
                  Text('12.4 km away', style: AppTypography.caption(color: AppColors.textMutedLight)),
                  const SizedBox(width: 16),
                  const Icon(Icons.currency_rupee, size: 14, color: AppColors.accentGreenDark),
                  const SizedBox(width: 4),
                  Text(earnings, style: AppTypography.caption(color: AppColors.accentGreenDark, fontWeight: FontWeight.bold)),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () async {
                        if (offerId != null) {
                          try {
                            await DriverService.instance.declineOffer(offerId);
                          } catch (_) {}
                        }
                        _setDriverState(DriverHomeState.available);
                      },
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AppColors.warning),
                        foregroundColor: AppColors.warning,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppRadius.md),
                        ),
                      ),
                      child: const Text('DECLINE'),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () async {
                        if (offerId != null) {
                          try {
                            await DriverService.instance.acceptOffer(offerId);
                            Fluttertoast.showToast(msg: 'Offer accepted!', backgroundColor: AppColors.accentGreenDark);
                            context.push(AppRoutes.tripsScreen);
                            return;
                          } catch (e) {
                            Fluttertoast.showToast(msg: 'Failed: $e', backgroundColor: AppColors.error);
                          }
                        }
                        _setDriverState(DriverHomeState.assignedTrip);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.warning,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppRadius.md),
                        ),
                      ),
                      child: const Text('ACCEPT', style: TextStyle(color: Colors.white)),
                    ),
                  ),
                ],
              ),
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
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Blue Banner
        Container(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: 12),
          decoration: BoxDecoration(
            color: AppColors.primary,
            borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.lg)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Trip Assigned',
                style: AppTypography.caption(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                'Starts in 15:42',
                style: AppTypography.caption(color: Colors.white.withValues(alpha: 0.9)),
              ),
            ],
          ),
        ),

        // Main Trip Card
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
                  Text(
                    'Corporate Transfer',
                    style: AppTypography.h3(
                      color: AppColors.textPrimaryLight,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text('Sedan', style: AppTypography.caption(color: AppColors.textMutedLight)),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.circle, size: 8, color: AppColors.accentGreenDark),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'DLF Cyber City, Gurugram',
                      style: AppTypography.caption(color: AppColors.textSecondaryLight),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.circle, size: 8, color: AppColors.error),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Indira Gandhi Airport, T3',
                      style: AppTypography.caption(color: AppColors.textSecondaryLight),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  Icon(Icons.calendar_today_outlined, size: 14, color: AppColors.textMutedLight),
                  const SizedBox(width: 4),
                  Text('Today, 6:30 PM', style: AppTypography.caption(color: AppColors.textMutedLight)),
                  const SizedBox(width: 16),
                  Icon(Icons.person_outline, size: 14, color: AppColors.textMutedLight),
                  const SizedBox(width: 4),
                  Text('1 Passenger', style: AppTypography.caption(color: AppColors.textMutedLight)),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              SizedBox(
                width: double.infinity,
                height: 44,
                child: ElevatedButton(
                  onPressed: () => _setDriverState(DriverHomeState.activeTrip),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                  ),
                  child: Text(
                    'VIEW TRIP DETAILS',
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
        const SizedBox(height: AppSpacing.lg),

        // "Be ready" info box
        Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: AppColors.primaryLight.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(AppRadius.md),
          ),
          child: Row(
            children: [
              Icon(Icons.access_time_filled_rounded, color: AppColors.primary),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Be ready',
                      style: AppTypography.body(
                        color: AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      'Please reach pickup location 5-10 minutes early',
                      style: AppTypography.caption(color: AppColors.textSecondaryLight),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.xl),

        _buildActivityCard(trips: '2', earnings: '₹1,600'),
      ],
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // STATE 5: ACTIVE TRIP STATE
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildActiveTripState() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Purple Active Trip Banner
        Container(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: 12),
          decoration: BoxDecoration(
            color: AppColors.primary,
            borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.lg)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Active Trip',
                style: AppTypography.caption(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                'Trip ID: AY10234',
                style: AppTypography.caption(color: Colors.white.withValues(alpha: 0.9)),
              ),
            ],
          ),
        ),

        // Route Card
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
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.circle, size: 8, color: AppColors.accentGreenDark),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Pickup',
                          style: AppTypography.caption(color: AppColors.textMutedLight),
                        ),
                        Text(
                          'DLF Cyber City, Gurugram',
                          style: AppTypography.body(
                            color: AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.circle, size: 8, color: AppColors.error),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Drop',
                          style: AppTypography.caption(color: AppColors.textMutedLight),
                        ),
                        Text(
                          'Indira Gandhi Airport, T3',
                          style: AppTypography.body(
                            color: AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          'Est. 6:40 PM',
                          style: AppTypography.caption(color: AppColors.textMutedLight),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),

              // Mock Live Map Preview
              Container(
                height: 140,
                decoration: BoxDecoration(
                  color: AppColors.borderLight,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                child: Stack(
                  children: [
                    Center(
                      child: Icon(
                        Icons.map_outlined,
                        size: 64,
                        color: AppColors.infoContainer,
                      ),
                    ),
                    Positioned(
                      bottom: 8,
                      right: 8,
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Fluttertoast.showToast(msg: 'Opening GPS Navigation...');
                        },
                        icon: const Icon(Icons.navigation_outlined, size: 16),
                        label: const Text('Navigate'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primaryHover,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),

              // Trip Progress
              Text(
                'Trip progress',
                style: AppTypography.caption(
                  color: AppColors.textMutedLight,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildStepNode(title: 'Accepted', isDone: true),
                  Expanded(child: _buildStepLine(isDone: true)),
                  _buildStepNode(title: 'Pickup', isDone: true),
                  Expanded(child: _buildStepLine(isDone: true)),
                  _buildStepNode(title: 'In Progress', isDone: true, isActive: true),
                  Expanded(child: _buildStepLine(isDone: false)),
                  _buildStepNode(title: 'Completed', isDone: false),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              SizedBox(
                width: double.infinity,
                height: 44,
                child: ElevatedButton(
                  onPressed: () => _setDriverState(DriverHomeState.completedTrip),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.accentGreenDark,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                  ),
                  child: Text(
                    'COMPLETE TRIP',
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
      ],
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // STATE 6: COMPLETED TRIP STATE (Home after trip)
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildCompletedTripState() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Green Banner
        Container(
          padding: const EdgeInsets.all(AppSpacing.lg),
          decoration: BoxDecoration(
            color: AppColors.accentGreenDark,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.lg)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Trip Completed',
                style: AppTypography.h3(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Icon(Icons.check_circle, color: Colors.white, size: 24),
            ],
          ),
        ),

        // Summary Card
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
                  Text(
                    'Corporate Transfer',
                    style: AppTypography.body(
                      color: AppColors.textPrimaryLight,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text('Sedan', style: AppTypography.caption(color: AppColors.textMutedLight)),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Earnings',
                    style: AppTypography.caption(color: AppColors.textMutedLight),
                  ),
                  Text(
                    '₹850',
                    style: AppTypography.h2(
                      color: AppColors.accentGreenDark,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Trip ID: AY10234',
                    style: AppTypography.caption(color: AppColors.textMutedLight),
                  ),
                  Text(
                    'Today, 6:12 PM',
                    style: AppTypography.caption(color: AppColors.textMutedLight),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              SizedBox(
                width: double.infinity,
                height: 44,
                child: OutlinedButton(
                  onPressed: () => context.push(AppRoutes.tripDetailsScreen),
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(color: AppColors.accentGreenDark),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                  ),
                  child: Text(
                    'VIEW TRIP SUMMARY',
                    style: AppTypography.body(
                      color: AppColors.accentGreenDark,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.lg),

        // Online Switch Box
        Container(
          padding: const EdgeInsets.all(AppSpacing.md),
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
                      "You're still online",
                      style: AppTypography.body(
                        color: AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      "You'll receive new trip opportunities.",
                      style: AppTypography.caption(color: AppColors.textSecondaryLight),
                    ),
                  ],
                ),
              ),
              Switch(
                value: true,
                onChanged: (val) => _setDriverState(DriverHomeState.offline),
                activeColor: AppColors.accentGreenDark,
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.xl),

        _buildActivityCard(trips: '4', earnings: '₹3,300'),
      ],
    );
  }

  Widget _buildBullet(String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.check_circle_outline, size: 16, color: AppColors.accentGreenDark),
        const SizedBox(width: 8),
        Text(text, style: AppTypography.caption(color: AppColors.textSecondaryLight)),
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
          Text(
            "Today's Activity",
            style: AppTypography.caption(
              color: AppColors.textMutedLight,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Trips', style: AppTypography.caption(color: AppColors.textMutedLight)),
                    Text(
                      trips,
                      style: AppTypography.h1(
                        color: AppColors.textPrimaryLight,
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
                    Text('Earnings', style: AppTypography.caption(color: AppColors.textMutedLight)),
                    Text(
                      earnings,
                      style: AppTypography.h1(
                        color: AppColors.textPrimaryLight,
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

  Widget _buildStepNode({required String title, required bool isDone, bool isActive = false}) {
    return Column(
      children: [
        Container(
          width: 18,
          height: 18,
          decoration: BoxDecoration(
            color: isActive
                ? AppColors.primary
                : (isDone ? AppColors.accentGreenDark : AppColors.borderLight),
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.check, size: 12, color: Colors.white),
        ),
        const SizedBox(height: 4),
        Text(
          title,
          style: TextStyle(
            fontSize: 9,
            fontWeight: isDone || isActive ? FontWeight.bold : FontWeight.w500,
            color: isDone || isActive ? AppColors.textPrimaryLight : AppColors.textMutedLight,
          ),
        ),
      ],
    );
  }

  Widget _buildStepLine({required bool isDone}) {
    return Container(
      height: 2,
      color: isDone ? AppColors.accentGreenDark : AppColors.borderLight,
    );
  }
}
