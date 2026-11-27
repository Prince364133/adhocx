import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/state/employee_auth_provider.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/state/employee_feature_provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/schedule_widgets.dart';

/// Schedule tab: today's pickup + drop on the brand card backed by live API.
class ScheduleTodayOverviewScreen extends StatefulWidget {
  const ScheduleTodayOverviewScreen({super.key});

  @override
  State<ScheduleTodayOverviewScreen> createState() =>
      _ScheduleTodayOverviewScreenState();
}

class _ScheduleTodayOverviewScreenState
    extends State<ScheduleTodayOverviewScreen> {
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadData());
  }

  Future<void> _loadData({bool force = false}) async {
    EmployeeDataProvider? data;
    try {
      data = context.read<EmployeeDataProvider>();
    } catch (_) {
      data = null;
    }
    if (data == null) {
      if (mounted) setState(() => _initialized = true);
      return;
    }
    final now = DateTime.now();
    await Future.wait([
      data.loadProfile(force: force),
      data.loadSchedule(
        startDate: DateTime(now.year, now.month, now.day),
        endDate: DateTime(now.year, now.month, now.day).add(const Duration(days: 7)),
        force: force,
      ),
      data.loadNotifications(force: force),
    ]);
    if (mounted) setState(() => _initialized = true);
  }

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    EmployeeDataProvider? dataProvider;
    EmployeeAuthProvider? authProvider;
    try {
      dataProvider = context.watch<EmployeeDataProvider>();
    } catch (_) {}
    try {
      authProvider = context.watch<EmployeeAuthProvider>();
    } catch (_) {}

    if (!_initialized && (dataProvider?.loadingSchedule ?? false)) {
      return const EmployeeLoadingScaffold(
        skeletonLayout: SkeletonLayout.schedule,
      );
    }

    final now = DateTime.now();
    final todayIso = EmployeeDataProvider.formatIsoDate(now);
    final items = dataProvider?.scheduleItems ?? const [];
    final todayItems = items.where((item) => item['date'] == todayIso).toList();

    final name = dataProvider?.profile?['fullName']?.toString() ??
        authProvider?.currentUser?.fullName ??
        'Commuter';
    final unreadCount = dataProvider?.unreadNotificationsCount ?? 0;
    final features = context.watch<EmployeeFeatureProvider>();

    return Scaffold(
      backgroundColor: p.background,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => _loadData(force: true),
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
                  name: name.isNotEmpty ? name : 'Commuter',
                  unreadNotificationsCount: unreadCount,
                  onNotificationTap: () =>
                      context.push(AppRoutes.notificationsCenter),
                  onSosTap: () => context.push(AppRoutes.safetySos),
                  onNoShowTap: () => context.push(AppRoutes.myNoShows),
                  noShowCount: features.noShowCount,
                  onProfileTap: () => context.push(AppRoutes.profileDetails),
                ),
                const SizedBox(height: AppSpacing.xxl),
                Row(
                  children: [
                    Icon(Icons.calendar_month_rounded,
                        color: p.accent, size: 20),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Text(
                        formatScheduleDayLabel(now),
                        style: AppTypography.h4(
                          color: p.textPrimary,
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    OutlinedButton(
                      onPressed: () => context.push(AppRoutes.scheduleWeekly),
                      style: OutlinedButton.styleFrom(
                        backgroundColor: p.surface,
                        side: BorderSide(color: p.border, width: 1.2),
                        shape: RoundedRectangleBorder(
                          borderRadius: AppRadius.borderMd,
                        ),
                        visualDensity: VisualDensity.compact,
                      ),
                      child: Text(
                        'Weekly',
                        style: AppTypography.caption(
                          color: p.accent,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.lg),
                Container(
                  width: double.infinity,
                  padding: AppSpacing.paddingXl,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        AppColors.primaryGradientStart,
                        AppColors.primaryGradientEnd,
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
                              "Today's Schedule",
                              style: AppTypography.h3(color: Colors.white),
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
                              todayItems.isEmpty
                                  ? 'No Rides'
                                  : '${todayItems.length} Scheduled',
                              style: AppTypography.micro(
                                color: Colors.white,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      if (todayItems.isEmpty)
                        Container(
                          width: double.infinity,
                          padding: AppSpacing.paddingLg,
                          decoration: BoxDecoration(
                            color: p.surface,
                            borderRadius: AppRadius.borderLg,
                          ),
                          child: Text(
                            items.isEmpty
                                ? 'No scheduled commute rides for today.'
                                : 'No rides today. You have ${items.length} upcoming ride${items.length == 1 ? '' : 's'} this week.',
                            style: AppTypography.small(color: p.textSecondary),
                          ),
                        )
                      else if (features.transportationBlocked)
                        Container(
                          width: double.infinity,
                          padding: AppSpacing.paddingLg,
                          decoration: BoxDecoration(
                            color: p.surface,
                            borderRadius: AppRadius.borderLg,
                          ),
                          child: Text(
                            'Future transportation is blocked. Your current count is 3. Request reactivation from My No-Shows.',
                            style: AppTypography.small(
                              color: AppColors.error,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        )
                      else
                        for (var i = 0; i < todayItems.length; i++) ...[
                          if (i > 0) const SizedBox(height: AppSpacing.md),
                          _buildLegFromScheduleItem(todayItems[i], tiled: true),
                        ],
                      const SizedBox(height: AppSpacing.xl),
                      SizedBox(
                        width: double.infinity,
                        height: 46,
                        child: ElevatedButton(
                          onPressed: () =>
                              context.push(AppRoutes.scheduleDaily),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: AppColors.primaryHover,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: AppRadius.borderMd,
                            ),
                          ),
                          child: Text(
                            'View Full Schedule  →',
                            style: AppTypography.button(
                              color: AppColors.primaryHover,
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
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
      ),
      bottomNavigationBar: const EmployeeBottomNavBar(currentIndex: 1),
    );
  }

  Widget _buildLegFromScheduleItem(
    Map<String, dynamic> item, {
    required bool tiled,
  }) {
    final dir = (item['direction'] ?? '').toString().toUpperCase();
    final isDrop = dir == 'LOGOUT' || dir == 'DROP';
    final time = EmployeeDataProvider.formatDisplayTime(
      item['pickupTime']?.toString() ?? item['shiftTime']?.toString(),
    );
    final pickup = item['pickupAddress']?.toString() ?? 'Pickup';
    final office = item['officeAddress']?.toString() ?? 'Office';
    final routeText = isDrop ? '$office → $pickup' : '$pickup → $office';
    return ScheduleLegRow(
      isDrop: isDrop,
      time: time.isNotEmpty ? time : 'Scheduled',
      route: routeText,
      tiled: tiled,
    );
  }
}
