import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/illustrations/trip_illustrations.dart';
import 'package:adhocx_employee/state/employee_auth_provider.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/state/employee_feature_provider.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

class HomeNoUpcomingTripScreen extends StatefulWidget {
  const HomeNoUpcomingTripScreen({super.key});

  @override
  State<HomeNoUpcomingTripScreen> createState() =>
      _HomeNoUpcomingTripScreenState();
}

class _HomeNoUpcomingTripScreenState extends State<HomeNoUpcomingTripScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      try {
        final data = context.read<EmployeeDataProvider>();
        data.loadProfile();
        data.loadNotifications();
      } catch (_) {}
    });
  }

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    EmployeeDataProvider? dataProvider;
    EmployeeAuthProvider? authProvider;
    EmployeeFeatureProvider? features;
    try {
      dataProvider = context.watch<EmployeeDataProvider>();
    } catch (_) {}
    try {
      authProvider = context.watch<EmployeeAuthProvider>();
    } catch (_) {}
    try {
      features = context.watch<EmployeeFeatureProvider>();
    } catch (_) {}

    final name = dataProvider?.profile?['fullName']?.toString() ??
        authProvider?.currentUser?.fullName ??
        'Commuter';
    final unreadCount = dataProvider?.unreadNotificationsCount ?? 0;

    return Scaffold(
      backgroundColor: p.background,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) => SingleChildScrollView(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.pageHorizontal,
              vertical: AppSpacing.lg,
            ),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                minHeight: constraints.maxHeight - AppSpacing.lg * 2,
              ),
              child: IntrinsicHeight(
                child: Column(
                  children: [
                    EmployeeGreetingHeader(
                      name: name.isNotEmpty ? name : 'Commuter',
                      unreadNotificationsCount: unreadCount,
                      onNotificationTap: () =>
                          context.push(AppRoutes.notificationsCenter),
                      onSosTap: () => context.push(AppRoutes.safetySos),
                      onNoShowTap: () => context.push(AppRoutes.myNoShows),
                      noShowCount: features?.noShowCount ?? 0,
                      onProfileTap: () =>
                          context.push(AppRoutes.profileDetails),
                    ),
                    const SizedBox(height: AppSpacing.xxl),
                    const Spacer(),
                    const EmptyScheduleIllustration(),
                    const SizedBox(height: AppSpacing.xxl + 4),
                    Text(
                      'No Upcoming Trips',
                      textAlign: TextAlign.center,
                      style: AppTypography.h2(color: p.textPrimary),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.pageHorizontal,
                      ),
                      child: Text(
                        "You don't have any scheduled transport for today.",
                        textAlign: TextAlign.center,
                        style: AppTypography.body(color: p.textSecondary),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xxl + 4),
                    Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.xxxl,
                      ),
                      child: EmployeeSecondaryButton(
                        label: 'View Schedule',
                        icon: Icons.calendar_month_outlined,
                        textColor: p.accent,
                        borderColor: p.accent,
                        onPressed: () => context.go(AppRoutes.scheduleToday),
                      ),
                    ),
                    const Spacer(),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
      bottomNavigationBar: const EmployeeBottomNavBar(currentIndex: 0),
    );
  }
}
