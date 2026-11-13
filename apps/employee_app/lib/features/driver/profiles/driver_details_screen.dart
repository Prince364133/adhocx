import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Screen 3: Driver Details
class DriverDetailsScreen extends StatelessWidget {
  const DriverDetailsScreen({super.key});

  Future<void> _call(String phone) async {
    final uri = Uri.parse('tel:${phone.replaceAll(RegExp(r'[^0-9+]'), '')}');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () async => (await MockDataService.getDriverAssignment())['driver']
          as Map<String, dynamic>?,
      builder: (context, driver) {
        final p = EmployeePalette.of(context);
        final name = driver['name'] ?? 'Suresh R';
        final phone = driver['phone'] ?? '+91 98765 00111';

        Widget detail(IconData icon, String title, String value,
            {bool verified = false}) {
          return Row(
            children: [
              Icon(icon, size: 22, color: p.textSecondary),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Text(
                  title,
                  style: AppTypography.small(
                    color: p.textPrimary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Flexible(
                child: Text(
                  value,
                  textAlign: TextAlign.end,
                  style: AppTypography.small(
                    color: verified ? AppColors.successText : p.textPrimary,
                    fontWeight: verified ? FontWeight.w600 : FontWeight.w700,
                  ),
                ),
              ),
              if (verified) ...[
                const SizedBox(width: AppSpacing.xs),
                const Icon(Icons.check_circle_rounded,
                    size: 16, color: AppColors.success),
              ],
            ],
          );
        }

        return Scaffold(
          backgroundColor: p.background,
          appBar: const EmployeeAppBar(title: 'Driver Details'),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.xxl,
                vertical: AppSpacing.xl,
              ),
              child: Column(
                children: [
                  Stack(
                    alignment: Alignment.bottomRight,
                    children: [
                      CircleAvatar(
                        radius: 46,
                        backgroundColor: p.accentTint,
                        child: Icon(Icons.person, size: 54, color: p.accent),
                      ),
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.xs),
                        decoration: const BoxDecoration(
                          color: AppColors.success,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.check,
                            size: 14, color: Colors.white),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Text(name,
                      style: AppTypography.h2(
                          color: p.textPrimary, fontSize: 20)),
                  const SizedBox(height: AppSpacing.xs),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.star_rounded,
                          size: 18, color: AppColors.starAmber),
                      const SizedBox(width: AppSpacing.xs),
                      Flexible(
                        child: Text(
                          '${(driver['rating'] ?? 4.8).toDouble()} (${driver['tripsCompleted'] ?? 412} trips)',
                          style: AppTypography.bodyMedium(
                            color: p.textSecondary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  const EmployeeStatusBadge(
                    label: 'Verified Driver',
                    variant: BadgeVariant.approved,
                    icon: Icons.verified_user_rounded,
                  ),
                  const SizedBox(height: AppSpacing.xxl),
                  Row(
                    children: [
                      Expanded(
                        child: EmployeePrimaryButton(
                          label: 'Call',
                          icon: Icons.call_rounded,
                          // Was a "Calling…" snackbar; now dials the driver.
                          onPressed: () => _call(phone),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: EmployeeSecondaryButton(
                          label: 'Message',
                          icon: Icons.chat_bubble_outline_rounded,
                          textColor: p.accent,
                          borderColor: p.accent,
                          onPressed: () =>
                              context.push(AppRoutes.contactDriverSheet),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.xxl + 4),
                  AppCard(
                    width: double.infinity,
                    child: Column(
                      children: [
                        detail(Icons.drive_eta_rounded, 'Driving Experience',
                            driver['experience'] ?? '6+ years'),
                        Divider(color: p.border, height: AppSpacing.xxl),
                        detail(Icons.badge_rounded, 'License (Commercial)',
                            driver['licenseStatus'] ?? 'Verified',
                            verified: true),
                        Divider(color: p.border, height: AppSpacing.xxl),
                        detail(Icons.security_rounded, 'Background Check',
                            driver['backgroundCheck'] ?? 'Completed',
                            verified: true),
                      ],
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
