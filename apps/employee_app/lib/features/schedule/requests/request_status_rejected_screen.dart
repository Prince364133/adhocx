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
import '../widgets/schedule_widgets.dart';

class RequestStatusRejectedScreen extends StatelessWidget {
  const RequestStatusRejectedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () async {
        final requests = await loadScheduleSection('change_requests');
        return requests?['rejected'] as Map<String, dynamic>?;
      },
      builder: (context, data) => EmployeeCenteredLayout(
        appBar: const EmployeeAppBar(),
        illustration: const RequestRejectedBadge(),
        title: 'Change Request\nRejected',
        message: data['message'] ??
            'Your change request was not approved as it is outside the allowed policy.',
        content: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(AppSpacing.lg + 2),
          decoration: BoxDecoration(
            color: AppColors.errorContainer,
            borderRadius: AppRadius.borderXxl,
            border: Border.all(color: AppColors.error.withAlpha(77)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Reason',
                style: AppTypography.caption(
                  color: AppColors.errorText,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                data['reason'] ??
                    'Request is after the cutoff time (6:00 PM, 08 Dec 2026).',
                style: AppTypography.small(color: AppColors.errorText),
              ),
            ],
          ),
        ),
        actions: [
          EmployeePrimaryButton(
            label: 'OK',
            onPressed: () => context.go(AppRoutes.scheduleDaily),
          ),
        ],
      ),
    );
  }
}
