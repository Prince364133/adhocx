import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/illustrations/schedule_illustrations.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';

class RequestStatusRejectedScreen extends StatelessWidget {
  final Map<String, dynamic>? request;

  const RequestStatusRejectedScreen({super.key, this.request});

  @override
  Widget build(BuildContext context) {
    Map<String, dynamic>? extra;
    try {
      final raw = GoRouterState.of(context).extra;
      if (raw is Map) extra = Map<String, dynamic>.from(raw);
    } catch (_) {}
    final data = request ?? extra ?? const <String, dynamic>{};

    return EmployeeCenteredLayout(
      appBar: const EmployeeAppBar(),
      illustration: const RequestRejectedBadge(),
      title: 'Change Request\nRejected',
      message: data['message']?.toString() ??
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
              data['reason']?.toString() ??
                  'Request was submitted after the organization cutoff window.',
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
    );
  }
}
