import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Home dashboard for an upcoming pickup (login) or drop (logout) trip:
/// greeting header, hero trip card, assigned driver, track / change / cancel
/// actions. Shared by HomeUpcomingPickupScreen and HomeUpcomingDropScreen.
class HomeUpcomingTripView extends StatefulWidget {
  /// Key into MockDataService trips ('upcoming_pickup' / 'upcoming_drop').
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
  Map<String, dynamic>? _profile;
  Map<String, dynamic>? _trip;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadJsonData();
  }

  Future<void> _loadJsonData() async {
    final profile = await MockDataService.getEmployeeProfile();
    final trip = await MockDataService.getTrip(widget.tripKey);
    if (mounted) {
      setState(() {
        _profile = profile;
        _trip = trip;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) return const EmployeeLoadingScaffold();

    final p = EmployeePalette.of(context);
    final name = _profile?['name'] ?? 'Ravi Kumar';
    final tripType = _trip?['type'] ?? widget.fallbackTitle;
    final date = _trip?['date'] ?? 'Today, 09 Dec 2026';
    final time = _trip?['time'] ?? widget.fallbackTime;
    final driverStatus = '${_trip?['status'] ?? 'Assigned'}';
    final driver = _trip?['driver'] as Map<String, dynamic>?;
    final driverName = driver?['name'] ?? 'Suresh R';
    final vehicleNumber = driver?['vehicleNumber'] ?? 'TS09UB7845';
    final vehicleModel = driver?['vehicleModel'] ?? 'Swift Dzire (White)';

    return Scaffold(
      backgroundColor: p.background,
      body: SafeArea(
        child: SingleChildScrollView(
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
                unreadNotificationsCount: 1,
                onNotificationTap: () =>
                    context.push(AppRoutes.notificationsCenter),
                onSosTap: () => context.push(AppRoutes.safetySos),
                onProfileTap: () => context.push(AppRoutes.profileDetails),
              ),
              const SizedBox(height: AppSpacing.xxl),
              EmployeeHeroTripCard(
                title: tripType,
                date: date,
                time: time,
                isDrop: widget.isDrop,
                badgeText: 'Next Trip',
                driverName: driverName,
                vehicleNumber: vehicleNumber,
                primaryActionLabel: 'Track Cab',
                onPrimaryAction: () =>
                    context.push(AppRoutes.liveTrackingOverview),
                secondaryActionLabel: 'Details',
                onSecondaryAction: () => context.push(AppRoutes.tripDetails),
              ),
              const SizedBox(height: AppSpacing.lg),
              _DriverStatusCard(status: driverStatus),
              const SizedBox(height: AppSpacing.lg),
              EmployeeDriverCard(
                name: driverName,
                vehicleNumber: vehicleNumber,
                vehicleModel: vehicleModel,
                rating: 4.8,
                experience: '6+ yrs',
                onCall: () => context.push(AppRoutes.contactDriverSheet),
                onChat: () => context.push(AppRoutes.contactDriverSheet),
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
                        // Opens the cancellation request (with confirmation),
                        // not the "trip cancelled" result screen.
                        onPressed: () => context.push(AppRoutes.cancelTrip),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.xxl),
            ],
          ),
        ),
      ),
      bottomNavigationBar: const EmployeeBottomNavBar(currentIndex: 0),
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
        return 'Approaching';
      case 'ARRIVED':
        return 'Arrived';
      default:
        return 'Assigned';
    }
  }

  int get _activeStep {
    switch (_statusLabel) {
      case 'Approaching':
        return 1;
      case 'Arrived':
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
