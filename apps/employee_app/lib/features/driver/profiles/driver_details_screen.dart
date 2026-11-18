import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Driver Details backed by live nextTrip + tracking APIs.
class DriverDetailsScreen extends StatelessWidget {
  const DriverDetailsScreen({super.key});

  Future<void> _call(BuildContext context, String phone) async {
    final clean = phone.replaceAll(RegExp(r'[^0-9+]'), '');
    if (clean.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Driver contact number not available yet.')),
      );
      return;
    }
    final uri = Uri.parse('tel:$clean');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadLiveTripSnapshot(context),
      builder: (context, snapshot) {
        final p = EmployeePalette.of(context);
        final next = (snapshot['nextTrip'] as Map<String, dynamic>?) ?? const {};
        final tracking =
            (snapshot['tracking'] as Map<String, dynamic>?) ?? const {};
        final driver = (tracking['driver'] ?? next['driver']) as Map?;
        final name = driver?['fullName']?.toString() ??
            driver?['name']?.toString() ??
            'Not yet assigned';
        final phone = driver?['phoneNumber']?.toString() ??
            driver?['phone']?.toString() ??
            '';
        final rating = driver?['rating'];

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
                horizontal: AppSpacing.pageHorizontal,
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
                      if (driver != null)
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
                  if (rating != null)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.star_rounded,
                            size: 18, color: AppColors.starAmber),
                        const SizedBox(width: AppSpacing.xs),
                        Text(
                          '$rating',
                          style: AppTypography.bodyMedium(
                            color: p.textSecondary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  const SizedBox(height: AppSpacing.sm),
                  EmployeeStatusBadge(
                    label: driver != null ? 'Verified Driver' : 'Pending Assignment',
                    variant: driver != null
                        ? BadgeVariant.approved
                        : BadgeVariant.pending,
                    icon: Icons.verified_user_rounded,
                  ),
                  const SizedBox(height: AppSpacing.xxl),
                  Row(
                    children: [
                      Expanded(
                        child: EmployeePrimaryButton(
                          label: 'Call',
                          icon: Icons.call_rounded,
                          onPressed: () => _call(context, phone),
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
                        detail(
                          Icons.phone_outlined,
                          'Contact',
                          phone.isNotEmpty ? phone : 'Available on assignment',
                        ),
                        Divider(color: p.border, height: AppSpacing.xxl),
                        detail(
                          Icons.badge_rounded,
                          'License (Commercial)',
                          driver != null ? 'Verified' : 'Pending',
                          verified: driver != null,
                        ),
                        Divider(color: p.border, height: AppSpacing.xxl),
                        detail(
                          Icons.security_rounded,
                          'Background Check',
                          driver != null ? 'Completed' : 'Pending',
                          verified: driver != null,
                        ),
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
