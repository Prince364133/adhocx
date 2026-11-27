import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/illustrations/trip_illustrations.dart';
import 'package:adhocx_employee/state/employee_auth_provider.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import 'package:adhocx_employee/state/employee_feature_provider.dart';

/// Home dashboard for an upcoming pickup (login) or drop (logout) trip:
/// greeting header, hero trip card, route/stops & OTP summary, assigned driver,
/// and track / change / cancel actions backed by live backend APIs.
class HomeUpcomingTripView extends StatefulWidget {
  final String tripKey;
  final bool isDrop;
  final String greeting;
  final String fallbackTitle;
  final String fallbackTime;

  const HomeUpcomingTripView({
    super.key,
    required this.tripKey,
    required this.isDrop,
    required this.greeting,
    required this.fallbackTitle,
    required this.fallbackTime,
  });

  @override
  State<HomeUpcomingTripView> createState() => _HomeUpcomingTripViewState();
}

class _HomeUpcomingTripViewState extends State<HomeUpcomingTripView> {
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadLiveData());
  }

  Future<void> _loadLiveData({bool force = false}) async {
    EmployeeDataProvider? dataProvider;
    try {
      dataProvider = context.read<EmployeeDataProvider>();
    } catch (_) {
      dataProvider = null;
    }
    if (dataProvider == null) {
      if (mounted) setState(() => _initialized = true);
      return;
    }
    await Future.wait([
      dataProvider.loadProfile(force: force),
      dataProvider.loadNextTrip(force: force),
      dataProvider.loadNotifications(force: force),
    ]);
    if (mounted) setState(() => _initialized = true);
  }

  EmployeeDataProvider? _watchDataProvider(BuildContext context) {
    try {
      return context.watch<EmployeeDataProvider>();
    } catch (_) {
      return null;
    }
  }

  EmployeeAuthProvider? _watchAuthProvider(BuildContext context) {
    try {
      return context.watch<EmployeeAuthProvider>();
    } catch (_) {
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    final dataProvider = _watchDataProvider(context);
    final authProvider = _watchAuthProvider(context);
    final features = context.watch<EmployeeFeatureProvider>();

    final isLoading =
        !_initialized && (dataProvider?.loadingNextTrip ?? false);
    if (isLoading) {
      return const EmployeeLoadingScaffold(
        skeletonLayout: SkeletonLayout.home,
      );
    }

    final profile = dataProvider?.profile;
    final authUser = authProvider?.currentUser;
    final name = _firstNonEmpty([
      profile?['fullName']?.toString(),
      authUser?.fullName,
      'Commuter',
    ]);
    final unreadCount = dataProvider?.unreadNotificationsCount ?? 0;
    final nextTrip = dataProvider?.nextTrip;
    final hasActiveTrip = nextTrip?['hasActiveTrip'] == true;

    return Scaffold(
      backgroundColor: p.background,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => _loadLiveData(force: true),
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.pageHorizontal,
              vertical: AppSpacing.lg,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                EmployeeGreetingHeader(
                  name: name,
                  greeting: widget.greeting,
                  unreadNotificationsCount: unreadCount,
                  onNotificationTap: () =>
                      context.push(AppRoutes.notificationsCenter),
                  onSosTap: () => context.push(AppRoutes.safetySos),
                  onNoShowTap: () => context.push(AppRoutes.myNoShows),
                  noShowCount: features.noShowCount,
                  onProfileTap: () => context.push(AppRoutes.profileDetails),
                ),
                const SizedBox(height: AppSpacing.xxl),
                if (dataProvider?.nextTripError != null && nextTrip == null)
                  _HomeErrorCard(
                    message: dataProvider!.nextTripError!,
                    onRetry: () => _loadLiveData(force: true),
                  )
                else if (features.transportationBlocked)
                  AppCard(
                    padding: AppSpacing.paddingXl,
                    child: Column(
                      children: [
                        const Icon(
                          Icons.block_rounded,
                          size: 40,
                          color: AppColors.error,
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Text(
                          'Transportation Access Blocked',
                          textAlign: TextAlign.center,
                          style: AppTypography.h4(
                            color: AppColors.error,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          'Future trips are restricted. General app access remains active.',
                          textAlign: TextAlign.center,
                          style: AppTypography.small(
                            color: p.textSecondary,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.lg),
                        EmployeePrimaryButton(
                          label: 'View My No-Shows',
                          icon: Icons.event_busy_rounded,
                          onPressed: () =>
                              context.push(AppRoutes.myNoShows),
                        ),
                      ],
                    ),
                  )
                else if (!hasActiveTrip)
                  _NoUpcomingTripContent(
                    message: nextTrip?['message']?.toString() ??
                        'No upcoming trips assigned yet.',
                  )
                else
                  _ActiveTripContent(
                    trip: nextTrip!,
                    defaultIsDrop: widget.isDrop,
                    fallbackTitle: widget.fallbackTitle,
                  ),
                const SizedBox(height: AppSpacing.xxl),
              ],
            ),
          ),
        ),
      ),
      bottomNavigationBar: const EmployeeBottomNavBar(currentIndex: 0),
    );
  }

  static String _firstNonEmpty(List<String?> candidates) {
    for (final c in candidates) {
      if (c != null && c.trim().isNotEmpty) return c.trim();
    }
    return '';
  }
}

class _ActiveTripContent extends StatelessWidget {
  final Map<String, dynamic> trip;
  final bool defaultIsDrop;
  final String fallbackTitle;

  const _ActiveTripContent({
    required this.trip,
    required this.defaultIsDrop,
    required this.fallbackTitle,
  });

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    final direction = (trip['direction'] ?? '').toString().toUpperCase();
    final isDrop = direction.isEmpty
        ? defaultIsDrop
        : (direction == 'LOGOUT' || direction == 'DROP');
    final tripType = direction.isEmpty
        ? fallbackTitle
        : (isDrop ? 'Office Drop (Logout)' : 'Office Pickup (Login)');
    final routeNumber = trip['routeNumber']?.toString() ?? '';
    final date = EmployeeDataProvider.formatDisplayDate(
      trip['shiftDate']?.toString(),
    );
    final etaTime = EmployeeDataProvider.formatDisplayTime(
      trip['plannedEta']?.toString() ?? trip['shiftTime']?.toString(),
    );
    final stopStatus = (trip['stopStatus'] ?? trip['routeStatus'] ?? 'PLANNED')
        .toString();
    final boardingOtp = trip['boardingOtp']?.toString() ?? '';
    final pickupLoc = trip['pickupLocation'] is Map
        ? Map<String, dynamic>.from(trip['pickupLocation'] as Map)
        : null;
    final officeDest = trip['officeDestination'] is Map
        ? Map<String, dynamic>.from(trip['officeDestination'] as Map)
        : null;
    final pickupAddress = pickupLoc?['addressText']?.toString() ?? '';
    final officeAddress = officeDest?['name']?.toString() ??
        officeDest?['addressText']?.toString() ??
        '';
    final driver = trip['driver'] is Map
        ? Map<String, dynamic>.from(trip['driver'] as Map)
        : null;
    final vehicle = trip['vehicle'] is Map
        ? Map<String, dynamic>.from(trip['vehicle'] as Map)
        : null;
    final driverName = driver?['name']?.toString() ??
        driver?['fullName']?.toString() ??
        'Not yet assigned';
    final vehicleNumber = vehicle?['registrationNumber']?.toString() ??
        vehicle?['plateNumber']?.toString() ??
        'Pending assignment';
    final vehicleModel = vehicle?['model']?.toString() ??
        vehicle?['vehicleType']?.toString() ??
        '';
    final routeStops = trip['routeStops'] is List
        ? (trip['routeStops'] as List)
            .whereType<Map>()
            .map((e) => Map<String, dynamic>.from(e))
            .toList()
        : const <Map<String, dynamic>>[];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        EmployeeHeroTripCard(
          title: routeNumber.isNotEmpty ? '$tripType • $routeNumber' : tripType,
          date: date.isNotEmpty ? date : 'Upcoming Shift',
          time: etaTime.isNotEmpty ? etaTime : 'Scheduled',
          isDrop: isDrop,
          badgeText: 'Next Trip',
          driverName: driverName,
          vehicleNumber: vehicleNumber,
          primaryActionLabel: 'Track Cab',
          onPrimaryAction: () => context.push(AppRoutes.liveTrackingOverview),
          secondaryActionLabel: 'Details',
          onSecondaryAction: () => context.push(AppRoutes.tripDetails),
        ),
        const SizedBox(height: AppSpacing.lg),
        if (pickupAddress.isNotEmpty || officeAddress.isNotEmpty) ...[
          AppCard(
            padding: AppSpacing.paddingMd,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.route_rounded, size: 18, color: p.accent),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Text(
                        'Trip Route',
                        style: AppTypography.small(
                          color: p.textPrimary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    if (boardingOtp.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.sm + 2,
                          vertical: AppSpacing.xs,
                        ),
                        decoration: BoxDecoration(
                          color: p.accentTint,
                          borderRadius: AppRadius.borderPill,
                        ),
                        child: Text(
                          'OTP: $boardingOtp',
                          style: AppTypography.caption(
                            color: p.accent,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                if (pickupAddress.isNotEmpty)
                  _RoutePointRow(
                    icon: Icons.radio_button_checked,
                    color: AppColors.success,
                    label: isDrop ? 'Drop' : 'Pickup',
                    address: pickupAddress,
                  ),
                if (pickupAddress.isNotEmpty && officeAddress.isNotEmpty)
                  const SizedBox(height: AppSpacing.sm),
                if (officeAddress.isNotEmpty)
                  _RoutePointRow(
                    icon: Icons.location_on_rounded,
                    color: p.accent,
                    label: isDrop ? 'Pickup' : 'Office',
                    address: officeAddress,
                  ),
                if (routeStops.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    '${routeStops.length} stop${routeStops.length == 1 ? '' : 's'} on this route',
                    style: AppTypography.caption(color: p.textSecondary),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
        ],
        _DriverStatusCard(status: stopStatus),
        const SizedBox(height: AppSpacing.lg),
        EmployeeDriverCard(
          name: driverName,
          vehicleNumber: vehicleNumber,
          vehicleModel:
              vehicleModel.isNotEmpty ? vehicleModel : 'Corporate Cab',
          rating: (driver?['rating'] is num)
              ? (driver!['rating'] as num).toDouble()
              : 5.0,
          onCall: driver != null
              ? () => context.push(AppRoutes.contactDriverSheet)
              : null,
          onChat: driver != null
              ? () => context.push(AppRoutes.contactDriverSheet)
              : null,
          onViewDetails: () => context.push(AppRoutes.driverDetails),
        ),
        const SizedBox(height: AppSpacing.xl),
        EmployeeEntrance(
          delay: const Duration(milliseconds: 170),
          child: EmployeePrimaryButton(
            label: 'Track Trip',
            icon: Icons.navigation_rounded,
            onPressed: () => context.push(AppRoutes.liveTrackingOverview),
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        EmployeeEntrance(
          delay: const Duration(milliseconds: 230),
          child: Row(
            children: [
              Expanded(
                child: EmployeeSecondaryButton(
                  label: 'Request Change',
                  icon: Icons.edit_calendar_rounded,
                  onPressed: () =>
                      context.push(AppRoutes.requestChangeOptions),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: EmployeeSecondaryButton(
                  label: 'Cancel Trip',
                  icon: Icons.cancel_outlined,
                  textColor: AppColors.error,
                  borderColor: AppColors.error.withAlpha(110),
                  onPressed: () => context.push(AppRoutes.cancelTrip),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _RoutePointRow extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;
  final String address;

  const _RoutePointRow({
    required this.icon,
    required this.color,
    required this.label,
    required this.address,
  });

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: color),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: Text(
            '$label: $address',
            style: AppTypography.small(
              color: p.textPrimary,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ],
    );
  }
}

class _NoUpcomingTripContent extends StatelessWidget {
  final String message;

  const _NoUpcomingTripContent({required this.message});

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    return AppCard(
      padding: AppSpacing.paddingXl,
      child: Column(
        children: [
          const EmptyScheduleIllustration(),
          const SizedBox(height: AppSpacing.xl),
          Text(
            'No Upcoming Trips',
            textAlign: TextAlign.center,
            style: AppTypography.h2(color: p.textPrimary),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            message,
            textAlign: TextAlign.center,
            style: AppTypography.body(color: p.textSecondary),
          ),
          const SizedBox(height: AppSpacing.xl),
          Row(
            children: [
              Expanded(
                child: EmployeePrimaryButton(
                  label: 'Schedule',
                  icon: Icons.calendar_month_outlined,
                  onPressed: () => context.go(AppRoutes.scheduleToday),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: EmployeeSecondaryButton(
                  label: 'Trip History',
                  icon: Icons.history_rounded,
                  onPressed: () => context.push(AppRoutes.historyOverview),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _HomeErrorCard extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _HomeErrorCard({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    return AppCard(
      padding: AppSpacing.paddingXl,
      child: Column(
        children: [
          Icon(Icons.cloud_off_rounded, size: 40, color: p.textMuted),
          const SizedBox(height: AppSpacing.md),
          Text(
            'Unable to load upcoming trip',
            style: AppTypography.h4(color: p.textPrimary),
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(
            message,
            textAlign: TextAlign.center,
            style: AppTypography.small(color: p.textSecondary),
          ),
          const SizedBox(height: AppSpacing.lg),
          EmployeePrimaryButton(
            label: 'Retry',
            icon: Icons.refresh_rounded,
            onPressed: onRetry,
          ),
        ],
      ),
    );
  }
}

class _DriverStatusCard extends StatelessWidget {
  final String status;

  const _DriverStatusCard({required this.status});

  String get _statusLabel {
    switch (status.trim().toUpperCase()) {
      case 'APPROACHING':
      case 'EN_ROUTE':
      case 'IN_TRANSIT':
      case 'DISPATCHING':
        return 'Approaching';
      case 'ARRIVED':
        return 'Arrived';
      case 'BOARDED':
        return 'Boarded';
      case 'PLANNED':
        return 'Planned';
      default:
        return 'Assigned';
    }
  }

  int get _activeStep {
    switch (_statusLabel) {
      case 'Approaching':
        return 1;
      case 'Arrived':
      case 'Boarded':
        return 2;
      default:
        return 0;
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

    return AppCard(
      padding: AppSpacing.paddingMd,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.directions_car_filled_rounded,
                  size: 18, color: p.accent),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  'Driver Status',
                  style: AppTypography.small(
                    color: p.textPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Text(
                _statusLabel,
                style: AppTypography.caption(
                  color: p.accent,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          EmployeeStepTracker(
            currentStep: _activeStep,
            labels: const ['Assigned', 'Approaching', 'Arrived'],
          ),
        ],
      ),
    );
  }
}
