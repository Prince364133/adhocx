import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../services/driver_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

class TripsScreen extends StatefulWidget {
  const TripsScreen({super.key});

  @override
  State<TripsScreen> createState() => _TripsScreenState();
}

class _TripsScreenState extends State<TripsScreen>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  late TabController _tabController;
  bool _isLoading = true;
  List<dynamic> _allTrips = [];
  StreamSubscription<Map<String, dynamic>>? _tripSubscription;
  Timer? _pollingTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(_onTabChanged);
    _loadTrips(forceRefresh: true);

    // 1. Listen for real-time and client-side trip state changes
    _tripSubscription = DriverService.instance.tripEventsStream.listen((event) {
      debugPrint('🚗 [TripsScreen] Realtime trip event received: $event');
      if (mounted) {
        final tripId = event['tripId']?.toString();
        final status = event['status']?.toString();
        if (tripId != null && status != null) {
          // Optimistically update in-memory trip status immediately
          setState(() {
            for (var i = 0; i < _allTrips.length; i++) {
              if (_allTrips[i] is Map && _allTrips[i]['id']?.toString() == tripId) {
                final updated = Map<String, dynamic>.from(_allTrips[i] as Map);
                updated['status'] = status;
                _allTrips[i] = updated;
              }
            }
          });
        }
        _loadTrips(forceRefresh: true, silent: true);
        if (status == 'COMPLETED' && _tabController.index != 2) {
          _tabController.animateTo(2);
        }
      }
    });

    // 2. Background polling: automatically synchronizes every 12 seconds
    _pollingTimer = Timer.periodic(const Duration(seconds: 12), (_) {
      if (mounted) {
        _loadTrips(forceRefresh: true, silent: true);
      }
    });
  }

  void _onTabChanged() {
    if (!_tabController.indexIsChanging && mounted) {
      _loadTrips(forceRefresh: true, silent: true);
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && mounted) {
      _loadTrips(forceRefresh: true, silent: true);
    }
  }

  Future<void> _loadTrips({bool forceRefresh = false, bool silent = false}) async {
    if (!silent && mounted) setState(() => _isLoading = true);
    try {
      final list = await DriverService.instance.getTrips(forceRefresh: forceRefresh);
      if (mounted) setState(() => _allTrips = list);
    } catch (_) {
    } finally {
      if (!silent && mounted) setState(() => _isLoading = false);
    }
  }

  List<dynamic> get _upcomingTrips => _allTrips.where((t) {
        final st = (t['status'] ?? '').toString().toUpperCase();
        return st == 'ASSIGNED' || st == 'DRIVER_ASSIGNED' || st == 'SCHEDULED';
      }).toList();

  List<dynamic> get _activeTrips => _allTrips.where((t) {
        final st = (t['status'] ?? '').toString().toUpperCase();
        return st == 'ARRIVED' || st == 'IN_PROGRESS' || st == 'STARTED';
      }).toList();

  List<dynamic> get _completedTrips => _allTrips.where((t) {
        final st = (t['status'] ?? '').toString().toUpperCase();
        return st == 'COMPLETED';
      }).toList();

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _tabController.removeListener(_onTabChanged);
    _tabController.dispose();
    _tripSubscription?.cancel();
    _pollingTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
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
                      IconButton(
                        onPressed: () => _loadTrips(forceRefresh: true),
                        icon: Icon(
                          Icons.refresh,
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Trips',
                          style: AppTypography.h2(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      IconButton(
                        onPressed: () => context.push(AppRoutes.notificationsFeedScreen),
                        icon: Icon(
                          Icons.notifications_none_rounded,
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        ),
                      ),
                    ],
                  ),
                ),

                // ── 3 Tabs Bar ───────────────────────────────────────────────
                Container(
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  child: TabBar(
                    controller: _tabController,
                    indicatorColor: AppColors.primary,
                    indicatorWeight: 3,
                    labelColor: AppColors.primary,
                    unselectedLabelColor: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                    labelStyle: AppTypography.body(fontWeight: FontWeight.bold),
                    tabs: [
                      Tab(text: 'Upcoming (${_upcomingTrips.length})'),
                      Tab(text: 'Active (${_activeTrips.length})'),
                      Tab(text: 'Completed (${_completedTrips.length})'),
                    ],
                  ),
                ),

                // ── Tab Views ────────────────────────────────────────────────
                Expanded(
                  child: _isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : TabBarView(
                          controller: _tabController,
                          children: [
                            _buildUpcomingTab(isDark),
                            _buildActiveTab(isDark),
                            _buildCompletedTab(isDark),
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
  // TAB 1: UPCOMING TRIPS VIEW
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildUpcomingTab(bool isDark) {
    if (_upcomingTrips.isEmpty) {
      return RefreshIndicator(
        onRefresh: () => _loadTrips(forceRefresh: true),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Container(
            constraints: BoxConstraints(
              minHeight: MediaQuery.of(context).size.height * 0.7,
            ),
            alignment: Alignment.center,
            padding: const EdgeInsets.all(AppSpacing.xxl),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: isDark ? 0.15 : 0.08),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.calendar_today_outlined,
                    size: 48,
                    color: AppColors.primary,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                Text(
                  'No Upcoming Trips',
                  style: AppTypography.h3(
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Check the Opportunities tab to accept available requests in your area.',
                  textAlign: TextAlign.center,
                  style: AppTypography.body(
                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                  ),
                ),
                const SizedBox(height: AppSpacing.xl),
                ElevatedButton.icon(
                  onPressed: () => context.go(AppRoutes.opportunitiesScreen),
                  icon: const Icon(Icons.flash_on_rounded, size: 18),
                  label: const Text('VIEW OPPORTUNITIES'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => _loadTrips(forceRefresh: true),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          Text(
            'Scheduled Trips (${_upcomingTrips.length})',
            style: AppTypography.caption(
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          ..._upcomingTrips.map((trip) {
            final req = trip['requirement'] as Map<String, dynamic>? ?? {};
            final pickup = trip['pickupLocation']?['address'] ??
                req['pickupLocation']?['address'] ??
                'Pickup Location';
            final drop = trip['dropLocation']?['address'] ??
                req['dropLocation']?['address'] ??
                'Drop Location';
            final vehicle = req['vehicleType']?.toString() ?? 'Sedan';
            final rawAmount = trip['driverRate'] ??
                trip['driverEarnings'] ??
                trip['totalDriverEarnings'] ??
                trip['fare'] ??
                req['ratePerVehicle'] ??
                req['budget'] ??
                req['suggestedBudget'];
            final num parsedPayout = rawAmount != null
                ? ((rawAmount is num) ? rawAmount : (num.tryParse(rawAmount.toString()) ?? 0))
                : 0;
            final payout = parsedPayout > 0 ? '₹${parsedPayout.toStringAsFixed(0)}' : '₹--';
            final status = (trip['status'] ?? 'ASSIGNED').toString().toUpperCase();
            final title = '${vehicle.toUpperCase()} Booking';
            final time = trip['reportingTime'] != null
                ? trip['reportingTime'].toString().split('T').last.substring(0, 5)
                : 'Now';

            return Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.md),
              child: _buildUpcomingTripCard(
                trip: trip,
                time: time,
                title: title,
                badgeText: status,
                pickup: pickup,
                drop: drop,
                vehicle: vehicle,
                passengers: '1 Passenger',
                payout: payout,
                isDark: isDark,
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildUpcomingTripCard({
    required dynamic trip,
    required String time,
    required String title,
    required String badgeText,
    required String pickup,
    required String drop,
    required String vehicle,
    required String passengers,
    required String payout,
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
          Row(
            children: [
              Text(
                time,
                style: AppTypography.body(
                  color: AppColors.primary,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: AppTypography.body(
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.primaryLight.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(AppRadius.xs),
                ),
                child: Text(
                  badgeText,
                  style: AppTypography.caption(
                    color: AppColors.primaryLight,
                    fontWeight: FontWeight.bold,
                  ).copyWith(fontSize: 10),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),

          // Pickup Location
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.circle, size: 8, color: AppColors.accentGreenDark),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  pickup,
                  style: AppTypography.caption(
                    color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),

          // Drop Location
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.circle, size: 8, color: AppColors.error),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  drop,
                  style: AppTypography.caption(
                    color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Divider(
            height: 1,
            color: isDark ? AppColors.borderDark : AppColors.borderLight,
          ),
          const SizedBox(height: AppSpacing.md),

          Row(
            children: [
              Icon(
                Icons.directions_car_outlined,
                size: 14,
                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
              ),
              const SizedBox(width: 4),
              Text(
                vehicle,
                style: AppTypography.caption(
                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                ),
              ),
              const SizedBox(width: 16),
              Icon(
                Icons.person_outline,
                size: 14,
                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
              ),
              const SizedBox(width: 4),
              Text(
                passengers,
                style: AppTypography.caption(
                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                ),
              ),
              const Spacer(),
              Text(
                payout,
                style: AppTypography.body(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),

          GestureDetector(
            onTap: () async {
              await context.push(AppRoutes.tripDetailsScreen, extra: trip);
              if (mounted) {
                _loadTrips(forceRefresh: true, silent: true);
              }
            },
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'VIEW DETAILS',
                  style: AppTypography.caption(
                    color: isDark ? AppColors.primaryLight : AppColors.primary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(width: 4),
                Icon(
                  Icons.chevron_right,
                  size: 16,
                  color: isDark ? AppColors.primaryLight : AppColors.primary,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TAB 2: ACTIVE TRIP VIEW
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildActiveTab(bool isDark) {
    if (_activeTrips.isEmpty) {
      return RefreshIndicator(
        onRefresh: () => _loadTrips(forceRefresh: true),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Container(
            constraints: BoxConstraints(
              minHeight: MediaQuery.of(context).size.height * 0.7,
            ),
            alignment: Alignment.center,
            padding: const EdgeInsets.all(AppSpacing.xxl),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: AppColors.accentGreenDark.withValues(alpha: isDark ? 0.15 : 0.08),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.navigation_outlined,
                    size: 48,
                    color: AppColors.accentGreenDark,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                Text(
                  'No Active Trips',
                  style: AppTypography.h3(
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'When you accept a booking and arrive or start a trip, live telemetry and route progress will appear here.',
                  textAlign: TextAlign.center,
                  style: AppTypography.body(
                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => _loadTrips(forceRefresh: true),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: _activeTrips.map((trip) {
        final req = trip['requirement'] as Map<String, dynamic>? ?? {};
        final tripId = (trip['id'] ?? 'TRIP').toString();
        final shortTripId = tripId.length > 8 ? tripId.substring(0, 8).toUpperCase() : tripId.toUpperCase();
        final status = (trip['status'] ?? 'IN_PROGRESS').toString().toUpperCase();
        final isArrived = status == 'ARRIVED';
        final isInProgress = status == 'IN_PROGRESS' || status == 'STARTED';
        final pickup = trip['pickupLocation']?['address'] ??
            req['pickupLocation']?['address'] ??
            'Pickup Location';
        final drop = trip['dropLocation']?['address'] ??
            req['dropLocation']?['address'] ??
            'Drop Location';
        final payout = '₹${trip['driverEarnings'] ?? trip['fare'] ?? trip['ratePerVehicle'] ?? 0}';
        final passengerName = req['vendor']?['businessName'] ?? req['vendor']?['companyName'] ?? 'Requester Passenger';
        final passengerPhone = req['vendor']?['phone'] ?? '\u2014';
        final vehicle = req['vehicleType']?.toString() ?? 'Commercial Vehicle';

        return Column(
          children: [
            // Green Banner
            Container(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: 12),
              decoration: const BoxDecoration(
                color: AppColors.accentGreenDark,
                borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.lg)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'ONGOING TRIP',
                    style: AppTypography.caption(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    'Trip ID: $shortTripId',
                    style: AppTypography.caption(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),

            // Main Active Trip Card
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
                        '$vehicle Transfer',
                        style: AppTypography.h3(
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.accentGreenDark.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(AppRadius.xs),
                        ),
                        child: Text(
                          status,
                          style: AppTypography.caption(
                            color: isDark ? AppColors.accentGreen : AppColors.accentGreenDark,
                            fontWeight: FontWeight.bold,
                          ).copyWith(fontSize: 10),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),

                  // Pickup Location
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.circle, size: 8, color: AppColors.accentGreenDark),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Pickup',
                              style: AppTypography.caption(
                                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
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

                  // Drop Location
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.circle, size: 8, color: AppColors.error),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Drop',
                              style: AppTypography.caption(
                                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
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
                  const SizedBox(height: AppSpacing.lg),

                  // Map Preview
                  Container(
                    height: 140,
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.surfaceElevatedDark : AppColors.borderLight,
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                    child: Stack(
                      children: [
                        Center(
                          child: Icon(
                            Icons.map_outlined,
                            size: 64,
                            color: isDark ? AppColors.textMutedDark : AppColors.infoContainer,
                          ),
                        ),
                        Positioned(
                          bottom: 8,
                          right: 8,
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: const BoxDecoration(
                              color: AppColors.primary,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.navigation_outlined,
                              size: 16,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),

                  // Trip Progress Stepper
                  Text(
                    'Trip Progress',
                    style: AppTypography.caption(
                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildStepNode(title: 'Assigned', isDone: true, isDark: isDark),
                      Expanded(child: _buildStepLine(isDone: isArrived || isInProgress, isDark: isDark)),
                      _buildStepNode(title: 'Arrived', isDone: isArrived || isInProgress, isActive: isArrived, isDark: isDark),
                      Expanded(child: _buildStepLine(isDone: isInProgress, isDark: isDark)),
                      _buildStepNode(title: 'In Progress', isDone: isInProgress, isActive: isInProgress, isDark: isDark),
                      Expanded(child: _buildStepLine(isDone: false, isDark: isDark)),
                      _buildStepNode(title: 'Completed', isDone: false, isDark: isDark),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  Divider(
                    height: 1,
                    color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  ),
                  const SizedBox(height: AppSpacing.md),

                  // Passenger & Payout Row
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Passenger / Requester',
                              style: AppTypography.caption(
                                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                              ),
                            ),
                            Text(
                              passengerName,
                              style: AppTypography.body(
                                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              passengerPhone,
                              style: AppTypography.caption(
                                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            'Earnings',
                            style: AppTypography.caption(
                              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                            ),
                          ),
                          Text(
                            payout,
                            style: AppTypography.h3(
                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            'Est.',
                            style: AppTypography.caption(
                              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.xl),

                  // Action Button
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: () async {
                        await context.push(AppRoutes.tripDetailsScreen, extra: trip);
                        if (mounted) {
                          _loadTrips(forceRefresh: true, silent: true);
                        }
                      },
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
          ],
        );
      }).toList(),
      ),
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TAB 3: COMPLETED TRIPS VIEW
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildCompletedTab(bool isDark) {
    final double totalEarnings = _completedTrips.fold(
      0.0,
      (sum, trip) => sum + (double.tryParse((trip['driverEarnings'] ?? trip['fare'] ?? '0').toString()) ?? 0.0),
    );

    if (_completedTrips.isEmpty) {
      return RefreshIndicator(
        onRefresh: () => _loadTrips(forceRefresh: true),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Container(
            constraints: BoxConstraints(
              minHeight: MediaQuery.of(context).size.height * 0.6,
            ),
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.xxl),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceElevatedDark : AppColors.slate200,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.check_circle_outline,
                        size: 48,
                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    Text(
                      'No Completed Trips Yet',
                      style: AppTypography.h3(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Trips you conclude will be archived here with detailed earnings breakdown.',
                      textAlign: TextAlign.center,
                      style: AppTypography.body(
                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () => _loadTrips(forceRefresh: true),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(AppSpacing.lg),
        children: [
          // Summary Card
          Container(
            padding: const EdgeInsets.all(AppSpacing.lg),
            decoration: BoxDecoration(
              color: AppColors.accentGreenDark.withValues(alpha: isDark ? 0.12 : 0.08),
              borderRadius: BorderRadius.circular(AppRadius.lg),
              border: Border.all(
                color: AppColors.accentGreenDark.withValues(alpha: isDark ? 0.35 : 0.2),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "Completed Summary",
                  style: AppTypography.caption(
                    color: isDark ? AppColors.accentGreen : AppColors.accentGreenDark,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _buildSummaryMetric('Trips', '${_completedTrips.length}', isDark),
                    _buildSummaryMetric('Earnings', '₹${totalEarnings.toStringAsFixed(0)}', isDark),
                    _buildSummaryMetric('Status', 'Settled', isDark),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          Text(
            'Trip History',
            style: AppTypography.caption(
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),

          ..._completedTrips.map((trip) {
            final req = trip['requirement'] as Map<String, dynamic>? ?? {};
            final pickup = trip['pickupLocation']?['address'] ??
                req['pickupLocation']?['address'] ??
                'Pickup Location';
            final drop = trip['dropLocation']?['address'] ??
                req['dropLocation']?['address'] ??
                'Drop Location';
            final vehicle = req['vehicleType']?.toString() ?? 'Sedan';
            final rawAmount = trip['totalDriverEarnings'] ??
                trip['driverRate'] ??
                trip['driverEarnings'] ??
                trip['fare'] ??
                req['ratePerVehicle'] ??
                req['budget'];
            final num parsedPayout = rawAmount != null
                ? ((rawAmount is num) ? rawAmount : (num.tryParse(rawAmount.toString()) ?? 0))
                : 0;
            final payout = parsedPayout > 0 ? '₹${parsedPayout.toStringAsFixed(0)}' : '₹--';
            final time = trip['completedAt'] != null
                ? trip['completedAt'].toString().split('T').first
                : 'Completed';

            return Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.md),
              child: GestureDetector(
                onTap: () async {
                  await context.push(AppRoutes.tripDetailsScreen, extra: trip);
                  if (mounted) {
                    _loadTrips(forceRefresh: true, silent: true);
                  }
                },
                child: _buildCompletedTripCard(
                  time: time,
                  title: '$vehicle Transfer',
                  payout: payout,
                  pickup: pickup,
                  drop: drop,
                  vehicle: vehicle,
                  passengers: '1 Passenger',
                  isDark: isDark,
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildCompletedTripCard({
    required String time,
    required String title,
    required String payout,
    required String pickup,
    required String drop,
    required String vehicle,
    required String passengers,
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
          Row(
            children: [
              Text(
                time,
                style: AppTypography.body(
                  color: AppColors.primary,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: AppTypography.body(
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              Text(
                payout,
                style: AppTypography.body(
                  color: isDark ? AppColors.accentGreen : AppColors.accentGreenDark,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),

          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.circle, size: 8, color: AppColors.accentGreenDark),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  pickup,
                  style: AppTypography.caption(
                    color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),

          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.circle, size: 8, color: AppColors.error),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  drop,
                  style: AppTypography.caption(
                    color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Divider(
            height: 1,
            color: isDark ? AppColors.borderDark : AppColors.borderLight,
          ),
          const SizedBox(height: AppSpacing.md),

          Row(
            children: [
              Icon(
                Icons.directions_car_outlined,
                size: 14,
                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
              ),
              const SizedBox(width: 4),
              Text(
                vehicle,
                style: AppTypography.caption(
                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                ),
              ),
              const SizedBox(width: 16),
              Icon(
                Icons.person_outline,
                size: 14,
                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
              ),
              const SizedBox(width: 4),
              Text(
                passengers,
                style: AppTypography.caption(
                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.accentGreenDark.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(AppRadius.xs),
                ),
                child: Text(
                  'Completed',
                  style: AppTypography.caption(
                    color: isDark ? AppColors.accentGreen : AppColors.accentGreenDark,
                    fontWeight: FontWeight.bold,
                  ).copyWith(fontSize: 10),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStepNode({
    required String title,
    required bool isDone,
    bool isActive = false,
    required bool isDark,
  }) {
    return Column(
      children: [
        Container(
          width: 18,
          height: 18,
          decoration: BoxDecoration(
            color: isActive
                ? AppColors.primary
                : (isDone
                    ? AppColors.accentGreenDark
                    : (isDark ? AppColors.surfaceElevatedDark : AppColors.borderLight)),
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.check,
            size: 12,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          title,
          style: TextStyle(
            fontSize: 10,
            fontWeight: isDone || isActive ? FontWeight.bold : FontWeight.w500,
            color: isDone || isActive
                ? (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight)
                : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
          ),
        ),
      ],
    );
  }

  Widget _buildStepLine({required bool isDone, required bool isDark}) {
    return Container(
      height: 2,
      color: isDone
          ? AppColors.accentGreenDark
          : (isDark ? AppColors.borderDark : AppColors.borderLight),
    );
  }

  Widget _buildSummaryMetric(String label, String value, bool isDark) {
    return Column(
      children: [
        Text(
          label,
          style: AppTypography.caption(
            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: AppTypography.h3(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }
}