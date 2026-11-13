import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/state/employee_auth_provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import 'package:adhocx_employee/widgets/employee_brand_logo.dart';

/// Main home dashboard (`/home`): welcome banner, next trip, assigned driver,
/// quick actions, quick services and the 24/7 transport desk banner.
class HomeScreenPlaceholder extends StatelessWidget {
  const HomeScreenPlaceholder({super.key});

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    final user = context.watch<EmployeeAuthProvider>().currentUser;

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
            unreadCount: 1,
            onPressed: () => context.push(AppRoutes.notificationsCenter),
          ),
          const SizedBox(width: AppSpacing.lg),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.xl,
            vertical: AppSpacing.lg,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              EmployeeEntrance(
                child: _WelcomeBanner(
                  employeeId: user?.employeeId ?? 'EMP10294',
                  name: user?.fullName ?? 'Ravi Kumar',
                  subtitle:
                      '${user?.organization ?? "Estemporaneo Tech Pvt. Ltd."} • ${user?.office ?? "HITEC City Office, Hyderabad"}',
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              const EmployeeEntrance(
                delay: Duration(milliseconds: 90),
                child: _NextTripCard(),
              ),
              const SizedBox(height: AppSpacing.lg),
              EmployeeDriverCard(
                name: 'Suresh R',
                vehicleNumber: 'TS09UB7845',
                vehicleModel: 'Maruti Ertiga (White)',
                rating: 4.8,
                experience: '6+ yrs',
                onCall: () => context.push(AppRoutes.contactDriverSheet),
                onChat: () => context.push(AppRoutes.contactDriverSheet),
                onViewDetails: () => context.push(AppRoutes.driverDetails),
              ),
              const SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  Expanded(
                    child: EmployeeSecondaryButton(
                      label: 'Request Change',
                      icon: Icons.edit_calendar_rounded,
                      onPressed: () => context.push(AppRoutes.tripPlanning),
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
      bottomNavigationBar: const EmployeeBottomNavBar(currentIndex: 0),
    );
  }
}

/// Brand gradient banner with the employee's name, id and office.
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
          colors: [AppColors.primaryGradientStart, AppColors.primaryGradientEnd],
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
                  style: AppTypography.small(color: Colors.white.withAlpha(217)),
                ),
              ),
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
          const SizedBox(height: AppSpacing.xs + 2),
          Text(
            subtitle,
            style: AppTypography.caption(
              color: AppColors.primarySubtle,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

/// Next trip summary: type + status, time / ETA, route and actions.
class _NextTripCard extends StatelessWidget {
  const _NextTripCard();

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
                  'Office Pickup (Login)',
                  maxLines: 1,
                  style: AppTypography.h4(
                    color: p.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              const EmployeeStatusBadge(
                label: 'Confirmed',
                variant: BadgeVariant.approved,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),

          // Time & ETA
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
                    'Today • 08:15 AM',
                    style: AppTypography.bodyMedium(
                      color: p.textPrimary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
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
                    'ETA ~6 mins',
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

          // Route
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
                      'Pickup: Flat 402, Green Glen Layout',
                      style: AppTypography.small(
                        color: p.textPrimary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    Text(
                      'Drop: HITEC City Office, Tower B',
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

          // Actions
          Row(
            children: [
              Expanded(
                flex: 2,
                child: EmployeePrimaryButton(
                  label: 'Track Cab',
                  icon: Icons.navigation_rounded,
                  onPressed: () => context.push(AppRoutes.tripAssigned),
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

/// 2×2 grid of quick service shortcuts.
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

/// Amber notice linking to the Safety Center / 24×7 transport desk.
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
                      'Emergency Hotline: 1800-419-7000',
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
