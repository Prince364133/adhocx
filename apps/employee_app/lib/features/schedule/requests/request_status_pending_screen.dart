import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/schedule_illustrations.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/schedule_widgets.dart';

class RequestStatusPendingScreen extends StatelessWidget {
  final Map<String, dynamic>? request;

  const RequestStatusPendingScreen({super.key, this.request});

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    Map<String, dynamic>? extra;
    try {
      final raw = GoRouterState.of(context).extra;
      if (raw is Map) extra = Map<String, dynamic>.from(raw);
    } catch (_) {}
    final data = request ?? extra ?? const <String, dynamic>{};

    final requestType =
        data['requestType']?.toString() ?? 'Schedule Change Request';
    final newValue = data['newValue']?.toString() ??
        data['newLocation']?.toString() ??
        'Pending review';
    final tripDate = data['tripDate']?.toString() ??
        formatScheduleDayLabel(DateTime.now());
    final valueLabel =
        requestType.endsWith('Time') ? 'New Time' : 'New Location';

    return Scaffold(
      backgroundColor: p.background,
      appBar: const EmployeeAppBar(),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.pageHorizontal,
            AppSpacing.sm,
            AppSpacing.pageHorizontal,
            AppSpacing.xxl,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Request Status',
                textAlign: TextAlign.center,
                style: AppTypography.h2(color: p.textPrimary),
              ),
              const SizedBox(height: AppSpacing.xxl),
              EmployeeEntrance(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    vertical: AppSpacing.xxl,
                    horizontal: AppSpacing.xl,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.warningContainer,
                    borderRadius: AppRadius.borderXxl,
                    border: Border.all(
                      color: AppColors.warning.withAlpha(90),
                      width: 1.5,
                    ),
                  ),
                  child: Column(
                    children: [
                      const PendingClockBadge(),
                      const SizedBox(height: AppSpacing.md + 2),
                      Text(
                        'Pending Approval',
                        style: AppTypography.h3(
                          color: AppColors.warningText,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xs + 2),
                      Text(
                        data['message']?.toString() ??
                            'Your change request is under review by your transport team.',
                        textAlign: TextAlign.center,
                        style: AppTypography.small(
                          color: AppColors.warningText,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.xxl + 4),
              EmployeeEntrance(
                delay: const Duration(milliseconds: 100),
                child: TripInfoCard(
                  items: [
                    TripInfoItem(
                      icon: Icons.edit_note_rounded,
                      label: 'Request Type',
                      value: requestType,
                    ),
                    TripInfoItem(
                      icon: Icons.location_on_outlined,
                      label: valueLabel,
                      value: newValue,
                    ),
                    TripInfoItem(
                      icon: Icons.calendar_month_outlined,
                      label: 'Trip Date',
                      value: tripDate,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.xxxl),
              EmployeeSecondaryButton(
                label: 'Back to My Schedule',
                icon: Icons.calendar_month_outlined,
                textColor: p.accent,
                borderColor: p.accent,
                onPressed: () => context.go(AppRoutes.scheduleDaily),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
