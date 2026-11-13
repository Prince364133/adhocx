import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/illustrations/auth_illustrations.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

class TransportUnavailableScreen extends StatelessWidget {
  const TransportUnavailableScreen({super.key});

  void _handleContactHr(BuildContext context) {
    AppBottomSheet.show<void>(
      context: context,
      title: 'Corporate Transport Support',
      child: Builder(
        builder: (ctx) {
          final p = EmployeePalette.of(ctx);
          return Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'To activate your daily employee commute roster, please contact your internal company facilities or HR desk.',
                style: AppTypography.body(color: p.textSecondary),
              ),
              const SizedBox(height: AppSpacing.lg),
              Container(
                padding: AppSpacing.paddingLg,
                decoration: BoxDecoration(
                  color: p.surfaceElevated,
                  borderRadius: AppRadius.borderLg,
                  border: Border.all(color: p.border, width: 1.2),
                ),
                child: Row(
                  children: [
                    Icon(Icons.mail_outline_rounded, color: p.accent),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Facilities & Transport Desk',
                            style: AppTypography.label(
                              color: p.textPrimary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'transport-desk@company.com',
                            style: AppTypography.caption(color: p.textSecondary),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              EmployeeSecondaryButton(
                label: 'Close',
                onPressed: () => Navigator.pop(ctx),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return EmployeeCenteredLayout(
      // Soft red badge with cross
      illustration: const AccessUnavailableBadge(),
      title: 'Transport Access\nNot Available',
      message:
          'Your account is not mapped to an active employee transport program. Please contact your HR team for assistance.',
      actions: [
        EmployeeSecondaryButton(
          label: 'Contact HR',
          icon: Icons.headset_mic_outlined,
          onPressed: () => _handleContactHr(context),
        ),
        EmployeeTextLink(
          label: 'Back to Login',
          onPressed: () => context.go(AppRoutes.mobileNumber),
        ),
      ],
    );
  }
}
