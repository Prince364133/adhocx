import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Assignment Notification preview backed by live notifications & next trip.
class AssignmentNotificationScreen extends StatelessWidget {
  const AssignmentNotificationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () async {
        final data = maybeEmployeeData(context);
        if (data == null) return const {};
        final notifications = await data.loadNotifications();
        final next = await data.loadNextTrip();
        return {
          if (notifications.isNotEmpty) 'notification': notifications.first,
          if (next != null) 'nextTrip': next,
        };
      },
      builder: (context, data) {
        final p = EmployeePalette.of(context);
        final notif = data['notification'] as Map?;
        final next = data['nextTrip'] as Map?;
        final now = DateTime.now();
        final clockTime =
            '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
        final dateLabel =
            EmployeeDataProvider.formatDisplayDate(now.toIso8601String());
        final driver = next?['driver'] as Map?;
        final driverName = driver?['name']?.toString() ??
            driver?['fullName']?.toString();
        final title = notif?['title']?.toString() ?? 'Cab Assignment Update';
        final message = notif?['message']?.toString() ??
            (driverName != null
                ? 'Your upcoming commute has been assigned to $driverName.'
                : 'Tap to view your current cab assignment details.');

        void open() => context.push(AppRoutes.cabAssignedOverview);

        return Scaffold(
          backgroundColor: AppColors.slate900,
          body: Container(
            width: double.infinity,
            height: double.infinity,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  AppColors.slate900,
                  AppColors.primaryDark,
                  AppColors.primaryHover,
                ],
              ),
            ),
            child: SafeArea(
              child: Column(
                children: [
                  const SizedBox(height: AppSpacing.xxxl + AppSpacing.sm),
                  Icon(Icons.lock_rounded,
                      color: Colors.white.withAlpha(179), size: 20),
                  const SizedBox(height: AppSpacing.md),
                  Text(
                    clockTime,
                    style: AppTypography.display(
                      color: Colors.white,
                      fontSize: 72,
                      fontWeight: FontWeight.w200,
                      overflow: null,
                    ).copyWith(letterSpacing: -2),
                  ),
                  Text(
                    dateLabel,
                    style: AppTypography.h3(
                      color: Colors.white.withAlpha(217),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.huge),
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.pageHorizontal,
                    ),
                    child: Material(
                      color: p.surface,
                      borderRadius: AppRadius.borderXxl,
                      elevation: 6,
                      shadowColor: Colors.black45,
                      child: InkWell(
                        onTap: open,
                        borderRadius: AppRadius.borderXxl,
                        child: Padding(
                          padding: AppSpacing.paddingLg,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    width: 24,
                                    height: 24,
                                    alignment: Alignment.center,
                                    decoration: BoxDecoration(
                                      color: AppColors.primary,
                                      borderRadius: AppRadius.borderMd,
                                    ),
                                    child: Text(
                                      'A',
                                      style: AppTypography.caption(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w900,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: AppSpacing.sm),
                                  Expanded(
                                    child: Text(
                                      'AdhocX',
                                      style: AppTypography.small(
                                        color: p.textPrimary,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ),
                                  Text('now',
                                      style: AppTypography.caption(
                                          color: p.textMuted)),
                                ],
                              ),
                              const SizedBox(height: AppSpacing.sm + 2),
                              Text(
                                title,
                                style: AppTypography.h4(
                                  color: p.textPrimary,
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: AppSpacing.xs),
                              Text(
                                message,
                                style: AppTypography.small(
                                  color: p.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  const Spacer(),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(
                      AppSpacing.pageHorizontal,
                      0,
                      AppSpacing.pageHorizontal,
                      AppSpacing.xxl,
                    ),
                    child: Material(
                      color: Colors.white.withAlpha(38),
                      shape: StadiumBorder(
                        side: BorderSide(color: Colors.white.withAlpha(64)),
                      ),
                      child: InkWell(
                        customBorder: const StadiumBorder(),
                        onTap: open,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.pageHorizontal,
                            vertical: AppSpacing.md,
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.touch_app_rounded,
                                  color: Colors.white, size: 18),
                              const SizedBox(width: AppSpacing.sm),
                              Flexible(
                                child: Text(
                                  'Tap notification to open app',
                                  style: AppTypography.small(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
