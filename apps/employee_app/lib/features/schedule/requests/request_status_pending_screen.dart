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
  const RequestStatusPendingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () async {
        final requests = await loadScheduleSection('change_requests');
        return requests?['pending'] as Map<String, dynamic>?;
      },
      builder: (context, data) {
        final p = EmployeePalette.of(context);

        return Scaffold(
          backgroundColor: p.background,
          appBar: const EmployeeAppBar(),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.xxl,
                AppSpacing.sm,
                AppSpacing.xxl,
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
                            data['message'] ??
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
                          value: data['requestType'] ?? 'Change Pickup Location',
                        ),
                        TripInfoItem(
                          icon: Icons.location_on_outlined,
                          label: 'New Location',
                          value: data['newLocation'] ?? 'Green Meadows, Kondapur',
                        ),
                        TripInfoItem(
                          icon: Icons.calendar_month_outlined,
                          label: 'Trip Date',
                          value: data['tripDate'] ?? 'Tue, 09 Dec 2026',
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xxxl),
                  // DEMO ONLY: preview the review outcomes in the mock flow;
                  // remove before release when the backend pushes the result.
                  EmployeeTextLink(
                    label: 'Simulate Approval Result →',
                    emphasised: false,
                    onPressed: () => context.push(AppRoutes.requestApproved),
                  ),
                  EmployeeTextLink(
                    label: 'Simulate Rejection Result →',
                    emphasised: false,
                    onPressed: () => context.push(AppRoutes.requestRejected),
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
