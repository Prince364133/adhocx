import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/state/employee_auth_provider.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import 'package:adhocx_employee/widgets/employee_brand_logo.dart';

/// Main home dashboard (`/home`): welcome banner, next trip, assigned driver,
/// quick actions, quick services and the 24/7 transport desk banner.
class HomeScreenPlaceholder extends StatefulWidget {
  const HomeScreenPlaceholder({super.key});

  @override
  State<HomeScreenPlaceholder> createState() => _HomeScreenPlaceholderState();
}

class _HomeScreenPlaceholderState extends State<HomeScreenPlaceholder> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      try {
        context.read<EmployeeDataProvider>().refreshHome();
      } catch (_) {}
    });
  }

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    EmployeeAuthProvider? authProvider;
    EmployeeDataProvider? dataProvider;
    try {
      authProvider = context.watch<EmployeeAuthProvider>();
    } catch (_) {}
    try {
      dataProvider = context.watch<EmployeeDataProvider>();
    } catch (_) {}

    final user = authProvider?.currentUser;
    final profile = dataProvider?.profile;
    final nextTrip = dataProvider?.nextTrip;
    final hasActiveTrip = nextTrip?['hasActiveTrip'] == true;
    final unreadCount = dataProvider?.unreadNotificationsCount ?? 0;

    final employeeId = profile?['employeeCode']?.toString() ??
        user?.employeeId ??
        '';
    final name = profile?['fullName']?.toString() ??
        user?.fullName ??
        'Commuter';
    final orgName = (profile?['tenant'] is Map
            ? (profile!['tenant'] as Map)['name']?.toString()
            : null) ??
        user?.organization ??
        '';
    final officeName = (profile?['office'] is Map
            ? (profile!['office'] as Map)['name']?.toString()
            : null) ??
        user?.office ??
        '';
    final subtitleParts = [
      if (orgName.isNotEmpty) orgName,
      if (officeName.isNotEmpty) officeName,
    ];

    final driver = (hasActiveTrip && nextTrip?['driver'] is Map)
        ? Map<String, dynamic>.from(nextTrip!['driver'] as Map)
        : null;
    final vehicle = (hasActiveTrip && nextTrip?['vehicle'] is Map)
        ? Map<String, dynamic>.from(nextTrip!['vehicle'] as Map)
        : null;

    return Scaffold(
      backgroundColor: p.background,
      appBar: EmployeeAppBar(
        showBackButton: false,
        centerTitle: false,
        titleWidget: const EmployeeBrandLogo(fontSize: 22),
        actions: [
          EmployeeSosButton(
            size: EmployeeSosButton.compactSize,
            onPressed: () => context.push(AppRoutes.safetySos),
          ),
          const SizedBox(width: AppSpacing.xs),
          EmployeeNotificationBell(
            unreadCount: unreadCount,
            onPressed: () => context.push(AppRoutes.notificationsCenter),
          ),
          const SizedBox(width: AppSpacing.lg),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async {
            try {
              await context.read<EmployeeDataProvider>().refreshHome();
            } catch (_) {}
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.pageHorizontal,
              vertical: AppSpacing.lg,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                EmployeeEntrance(
                  child: _WelcomeBanner(
                    employeeId: employeeId,
                    name: name.isNotEmpty ? name : 'Commuter',
                    subtitle: subtitleParts.join(' • '),
                  ),
                ),
                const SizedBox(height: AppSpacing.xl),
                EmployeeEntrance(
                  delay: const Duration(milliseconds: 90),
                  child: hasActiveTrip
                      ? _NextTripCard(trip: nextTrip!)
                      : _EmptyTripBanner(
                          message: nextTrip?['message']?.toString() ??
                              'No upcoming trips assigned yet.',
                        ),
                ),
                if (hasActiveTrip) ...[
                  const SizedBox(height: AppSpacing.lg),
                  EmployeeDriverCard(
                    name: driver?['name']?.toString() ??
                        driver?['fullName']?.toString() ??
                        'Not yet assigned',
                    vehicleNumber: vehicle?['registrationNumber']?.toString() ??
                        vehicle?['plateNumber']?.toString() ??
                        'Pending assignment',
                    vehicleModel: vehicle?['model']?.toString() ??
                        vehicle?['vehicleType']?.toString() ??
                        'Corporate Cab',
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
                  const SizedBox(height: AppSpacing.md),
                  Row(
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
                ],
                const SizedBox(height: AppSpacing.xxl),
                const EmployeeSectionHeader(
                  title: 'Quick Services',
                  padding: EdgeInsets.zero,
                ),
                const SizedBox(height: AppSpacing.md),
                const _ServicesGrid(),
                const SizedBox(height: AppSpacing.xl),
                _HelplineBanner(
                  onTap: () => context.push(AppRoutes.safetyOverview),
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
}

class _WelcomeBanner extends StatelessWidget {
  final String employeeId;
  final String name;
  final String subtitle;

  const _WelcomeBanner({
    required this.employeeId,
    required this.name,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: AppSpacing.paddingXl,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppColors.primaryGradientStart,
            AppColors.primaryGradientEnd
          ],
        ),
        borderRadius: AppRadius.borderXxl,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Welcome back,',
                  style:
                      AppTypography.small(color: Colors.white.withAlpha(217)),
                ),
              ),
              if (employeeId.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.sm + 2,
                    vertical: AppSpacing.xs,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withAlpha(51),
                    borderRadius: AppRadius.borderPill,
                  ),
                  child: Text(
                    employeeId,
                    style: AppTypography.micro(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          Text(name, style: AppTypography.h2(color: Colors.white)),
          if (subtitle.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.xs + 2),
            Text(
              subtitle,
              style: AppTypography.caption(
                color: AppColors.primarySubtle,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _EmptyTripBanner extends StatelessWidget {
  final String message;

  const _EmptyTripBanner({required this.message});

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    return AppCard(
      width: double.infinity,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.event_available_rounded, size: 20, color: p.accent),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  'No Upcoming Trips',
                  style: AppTypography.h4(
                    color: p.textPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            message,
            style: AppTypography.small(color: p.textSecondary),
          ),
          const SizedBox(height: AppSpacing.md),
          EmployeeSecondaryButton(
            label: 'View Schedule',
            icon: Icons.calendar_month_outlined,
            onPressed: () => context.go(AppRoutes.scheduleToday),
          ),
        ],
      ),
    );
  }
}

class _NextTripCard extends StatelessWidget {
  final Map<String, dynamic> trip;

  const _NextTripCard({required this.trip});

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    final direction = (trip['direction'] ?? '').toString().toUpperCase();
    final isDrop = direction == 'LOGOUT' || direction == 'DROP';
    final title =
        isDrop ? 'Office Drop (Logout)' : 'Office Pickup (Login)';
    final date =
        EmployeeDataProvider.formatDisplayDate(trip['shiftDate']?.toString());
    final time = EmployeeDataProvider.formatDisplayTime(
      trip['plannedEta']?.toString() ?? trip['shiftTime']?.toString(),
    );
    final status =
        (trip['stopStatus'] ?? trip['routeStatus'] ?? 'PLANNED').toString();
    final pickupLoc = trip['pickupLocation'] is Map
        ? Map<String, dynamic>.from(trip['pickupLocation'] as Map)
        : null;
    final officeDest = trip['officeDestination'] is Map
        ? Map<String, dynamic>.from(trip['officeDestination'] as Map)
        : null;
    final pickupAddress = pickupLoc?['addressText']?.toString() ?? 'Pickup point';
    final officeAddress = officeDest?['name']?.toString() ??
        officeDest?['addressText']?.toString() ??
        'Corporate Office';
    final boardingOtp = trip['boardingOtp']?.toString() ?? '';

    final upperStatus = status.toUpperCase();
    final activeStep = upperStatus == 'ARRIVED' || upperStatus == 'BOARDED'
        ? 2
        : (upperStatus == 'IN_TRANSIT' || upperStatus == 'DISPATCHING' ? 1 : 0);

    return AppCard(
      width: double.infinity,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(AppSpacing.xs + 2),
                decoration: BoxDecoration(
                  color: p.accentTint,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.directions_car_filled_rounded,
                  size: 16,
                  color: p.accent,
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  title,
                  maxLines: 1,
                  style: AppTypography.h4(
                    color: p.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              EmployeeStatusBadge(
                label: status,
                variant: BadgeVariant.approved,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.sm + 2,
            ),
            decoration: BoxDecoration(
              color: p.surfaceElevated,
              borderRadius: AppRadius.borderMd,
            ),
            child: Row(
              children: [
                Icon(Icons.access_time_filled_rounded,
                    size: 18, color: p.accent),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Text(
                    [if (date.isNotEmpty) date, if (time.isNotEmpty) time]
                        .join(' • '),
                    style: AppTypography.bodyMedium(
                      color: p.textPrimary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                if (boardingOtp.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.sm,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: p.accentTint,
                      borderRadius: AppRadius.borderSm,
                    ),
                    child: Text(
                      'OTP $boardingOtp',
                      style: AppTypography.caption(
                        color: p.accent,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Column(
                children: [
                  const Icon(Icons.radio_button_checked,
                      size: 16, color: AppColors.success),
                  Container(width: 2, height: 26, color: p.border),
                  Icon(Icons.location_on, size: 16, color: p.accent),
                ],
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Pickup: $pickupAddress',
                      style: AppTypography.small(
                        color: p.textPrimary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    Text(
                      'Drop: $officeAddress',
                      style: AppTypography.small(
                        color: p.textPrimary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          EmployeeStepTracker(
            currentStep: activeStep,
            labels: const ['Assigned', 'Approaching', 'Arrived'],
          ),
          const SizedBox(height: AppSpacing.lg),
          Row(
            children: [
              Expanded(
                flex: 2,
                child: EmployeePrimaryButton(
                  label: 'Track Cab',
                  icon: Icons.navigation_rounded,
                  onPressed: () => context.push(AppRoutes.liveTrackingOverview),
                ),
              ),
              const SizedBox(width: AppSpacing.sm + 2),
              Expanded(
                child: EmployeeSecondaryButton(
                  label: 'Details',
                  onPressed: () => context.push(AppRoutes.tripDetails),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ServicesGrid extends StatelessWidget {
  const _ServicesGrid();

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

    Widget tile({
      required IconData icon,
      required Color color,
      required String title,
      required String subtitle,
      required String route,
    }) {
      return Expanded(
        child: AppCard(
          padding: const EdgeInsets.all(AppSpacing.md + 2),
          onTap: () => context.push(route),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(AppSpacing.sm),
                decoration: BoxDecoration(
                  color: color.withAlpha(p.isDark ? 46 : 26),
                  borderRadius: AppRadius.borderLg,
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(height: AppSpacing.sm + 2),
              Text(
                title,
                maxLines: 1,
                style: AppTypography.small(
                  color: p.textPrimary,
                  fontWeight: FontWeight.w700,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                maxLines: 1,
                style: AppTypography.micro(
                  color: p.textSecondary,
                  fontWeight: FontWeight.w400,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Column(
      children: [
        Row(
          children: [
            tile(
              icon: Icons.calendar_month_rounded,
              color: AppColors.primary,
              title: 'My Schedule',
              subtitle: 'Shifts & Roster',
              route: AppRoutes.scheduleToday,
            ),
            const SizedBox(width: AppSpacing.md),
            tile(
              icon: Icons.shield_rounded,
              color: AppColors.error,
              title: 'Safety Center',
              subtitle: 'SOS & 24/7 Helpline',
              route: AppRoutes.safetyOverview,
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.md),
        Row(
          children: [
            tile(
              icon: Icons.history_rounded,
              color: AppColors.info,
              title: 'Trip History',
              subtitle: 'Past rides & receipts',
              route: AppRoutes.historyOverview,
            ),
            const SizedBox(width: AppSpacing.md),
            tile(
              icon: Icons.headset_mic_rounded,
              color: AppColors.accentPurple,
              title: 'Support Desk',
              subtitle: 'Live chat & tickets',
              route: AppRoutes.safetyLiveChat,
            ),
          ],
        ),
      ],
    );
  }
}

class _HelplineBanner extends StatelessWidget {
  final VoidCallback onTap;

  const _HelplineBanner({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: AppRadius.borderLg,
        child: Container(
          padding: const EdgeInsets.all(AppSpacing.md + 2),
          decoration: BoxDecoration(
            color: AppColors.warningContainer,
            borderRadius: AppRadius.borderLg,
            border: Border.all(color: AppColors.warning.withAlpha(90)),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(AppSpacing.sm),
                decoration: BoxDecoration(
                  color: AppColors.warning.withAlpha(38),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.support_agent_rounded,
                  color: AppColors.warningText,
                  size: 20,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '24/7 Corporate Transport Desk',
                      style: AppTypography.small(
                        color: AppColors.warningText,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Tap for Safety Center & Support',
                      style: AppTypography.micro(color: AppColors.warningText),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.arrow_forward_ios_rounded,
                  size: 14, color: AppColors.warningText),
            ],
          ),
        ),
      ),
    );
  }
}
