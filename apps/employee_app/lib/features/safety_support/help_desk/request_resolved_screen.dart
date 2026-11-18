import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/illustrations/boarding_illustrations.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';

/// Request Resolved screen backed by route extra ticket payload.
class RequestResolvedScreen extends StatelessWidget {
  const RequestResolvedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    Map<String, dynamic>? ticket;
    try {
      final extra = GoRouterState.of(context).extra;
      if (extra is Map) ticket = Map<String, dynamic>.from(extra);
    } catch (_) {}

    final ticketRef = ticket?['ticketNumber']?.toString() ??
        ticket?['id']?.toString() ??
        '';
    final resolution = ticket?['resolutionNotes']?.toString() ??
        'Your request has been reviewed and resolved by the corporate transport desk.';

    return EmployeeCenteredLayout(
      appBar: const EmployeeAppBar(),
      illustration: const BoardingSuccessBadge(),
      illustrationGap: AppSpacing.xxl,
      title: 'Request Resolved',
      message: ticketRef.isNotEmpty
          ? 'Your request ($ticketRef)\nhas been resolved.'
          : 'Your support request\nhas been resolved.',
      content: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(AppSpacing.lg + 2),
        decoration: BoxDecoration(
          color: AppColors.successContainer,
          borderRadius: AppRadius.borderXxl,
          border: Border.all(color: AppColors.success.withAlpha(77)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.check_circle_rounded,
                    color: AppColors.success, size: 18),
                const SizedBox(width: AppSpacing.sm),
                Text(
                  'Resolution',
                  style: AppTypography.small(
                    color: AppColors.successText,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              resolution,
              style: AppTypography.body(color: AppColors.successText),
            ),
          ],
        ),
      ),
      actions: [
        EmployeePrimaryButton(
          label: 'View Details',
          onPressed: () => context.push(
            AppRoutes.requestDetailsTracking,
            extra: ticket,
          ),
        ),
        EmployeeTextLink(
          label: 'Back to Requests',
          onPressed: () => context.push(AppRoutes.myRequestsTickets),
        ),
      ],
    );
  }
}
