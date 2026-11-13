import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/schedule_widgets.dart';

/// Schedule tab: today's pickup + drop on the brand card.
class ScheduleTodayOverviewScreen extends StatelessWidget {
  const ScheduleTodayOverviewScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () async => {
        'profile': await MockDataService.getEmployeeProfile(),
        'today': await loadScheduleSection('today'),
      },
      builder: (context, data) {
        final p = EmployeePalette.of(context);
        final profile = data['profile'] as Map<String, dynamic>?;
        final today = data['today'] as Map<String, dynamic>?;
        final pickup = today?['pickup'] as Map<String, dynamic>?;
        final drop = today?['drop'] as Map<String, dynamic>?;

        return Scaffold(
          backgroundColor: p.background,
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.xl,
                vertical: AppSpacing.lg,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  EmployeeGreetingHeader(
                    name: profile?['name'] ?? 'Ravi Kumar',
                    unreadNotificationsCount: 1,
                    onNotificationTap: () =>
                        context.push(AppRoutes.notificationsCenter),
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
                          today?['date'] ?? 'Tue, 09 Dec 2026',
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
                                'Confirmed',
                                style: AppTypography.micro(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.lg),
                        ScheduleLegRow(
                          isDrop: false,
                          time: pickup?['time'] ?? '8:15 AM',
                          route: pickup?['route'] ?? 'Home → Office',
                          tiled: true,
                        ),
                        const SizedBox(height: AppSpacing.md),
                        ScheduleLegRow(
                          isDrop: true,
                          time: drop?['time'] ?? '6:30 PM',
                          route: drop?['route'] ?? 'Office → Home',
                          tiled: true,
                        ),
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
          bottomNavigationBar: const EmployeeBottomNavBar(currentIndex: 1),
        );
      },
    );
  }
}
