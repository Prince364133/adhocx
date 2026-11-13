import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/illustrations/trip_illustrations.dart';
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
  Map<String, dynamic>? _profile;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadJsonData();
  }

  Future<void> _loadJsonData() async {
    final profile = await MockDataService.getEmployeeProfile();
    if (mounted) {
      setState(() {
        _profile = profile;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) return const EmployeeLoadingScaffold();

    final p = EmployeePalette.of(context);
    final name = _profile?['name'] ?? 'Ravi Kumar';

    return Scaffold(
      backgroundColor: p.background,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) => SingleChildScrollView(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.xl,
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
                      name: name,
                      unreadNotificationsCount: 1,
                      onNotificationTap: () =>
                          context.push(AppRoutes.notificationsCenter),
                      onSosTap: () => context.push(AppRoutes.safetySos),
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
                        horizontal: AppSpacing.xxl,
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
