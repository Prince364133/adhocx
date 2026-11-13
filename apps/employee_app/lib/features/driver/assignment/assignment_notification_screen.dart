import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/driver_widgets.dart';

/// Screen 1: Assignment Notification (simulated phone lock screen).
///
/// The lock-screen wallpaper is a fixed dark brand gradient in both modes;
/// the notification card follows the app theme.
class AssignmentNotificationScreen extends StatelessWidget {
  const AssignmentNotificationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadAssignmentSection('notification'),
      builder: (context, data) {
        final p = EmployeePalette.of(context);
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
                    data['time'] ?? '8:10',
                    style: AppTypography.display(
                      color: Colors.white,
                      fontSize: 72,
                      fontWeight: FontWeight.w200,
                      overflow: null,
                    ).copyWith(letterSpacing: -2),
                  ),
                  Text(
                    data['date'] ?? 'Tue, 09 Dec',
                    style: AppTypography.h3(
                      color: Colors.white.withAlpha(217),
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.huge),
                  Padding(
                    padding:
                        const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
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
                                      data['app'] ?? 'AdhocX',
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
                                data['title'] ?? 'Cab Assigned',
                                style: AppTypography.h4(
                                  color: p.textPrimary,
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: AppSpacing.xs),
                              Text(
                                data['message'] ??
                                    'Your login trip (8:15 AM) has been assigned to driver Suresh R.',
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
                      AppSpacing.xl,
                      0,
                      AppSpacing.xl,
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
                            horizontal: AppSpacing.xxl,
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
