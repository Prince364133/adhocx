import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/safety_illustrations.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/safety_widgets.dart';

/// Screen 1: Safety Center (Overview)
class SafetyCenterOverviewScreen extends StatelessWidget {
  const SafetyCenterOverviewScreen({super.key});

  static const _tools = <(IconData, String, String, String)>[
    (Icons.flag_outlined, 'Report an Issue',
        'Driver behavior, route deviation, delay', AppRoutes.reportIncident),
    (Icons.rate_review_outlined, 'Raise a Complaint',
        'File ticket with corporate transport desk', AppRoutes.raiseComplaint),
    (Icons.backpack_outlined, 'Lost Property',
        'Report items left inside the vehicle', AppRoutes.lostProperty),
    (Icons.headset_mic_outlined, 'Get Help / Live Chat',
        'Chat directly with AdhocX transport support',
        AppRoutes.liveSupportChat),
    (Icons.contact_phone_outlined, 'Emergency Contacts',
        'Company desk, security & local services',
        AppRoutes.emergencyContacts),
    (Icons.verified_user_outlined, 'Safety Tips & Guidelines',
        'Best practices for safe daily commute',
        AppRoutes.safetyTipsGuidelines),
    (Icons.confirmation_number_outlined, 'My Support Requests',
        'Track submitted issues and resolutions', AppRoutes.myRequestsTickets),
  ];

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadSafetySection('center'),
      builder: (context, data) {
        final p = EmployeePalette.of(context);

        return Scaffold(
          backgroundColor: p.background,
          appBar: EmployeeAppBar(
            title: data['title'] ?? 'Safety Center',
            onBack: () => context.canPop()
                ? context.pop()
                : context.go(AppRoutes.homeUpcomingPickup),
          ),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.xl,
                vertical: AppSpacing.lg,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: AppSpacing.sm),
                  const Center(child: SafetyCenterShieldBadge()),
                  const SizedBox(height: AppSpacing.lg),
                  Text(
                    data['subtitle'] ?? 'Your safety is our priority',
                    textAlign: TextAlign.center,
                    style: AppTypography.h2(color: p.textPrimary, fontSize: 20),
                  ),
                  const SizedBox(height: AppSpacing.xs + 2),
                  Text(
                    data['description'] ??
                        'Quick access to emergency, support and safety tools.',
                    textAlign: TextAlign.center,
                    style: AppTypography.small(color: p.textSecondary),
                  ),
                  const SizedBox(height: AppSpacing.xxl),
                  // SOS banner (error semantic colours)
                  Material(
                    color: AppColors.errorContainer,
                    shape: RoundedRectangleBorder(
                      borderRadius: const BorderRadius.all(Radius.circular(16)),
                      side: BorderSide(
                        color: AppColors.error.withAlpha(110),
                        width: 1.5,
                      ),
                    ),
                    clipBehavior: Clip.antiAlias,
                    child: InkWell(
                      onTap: () => context.push(AppRoutes.sosActivate),
                      child: Padding(
                        padding: AppSpacing.paddingLg,
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(AppSpacing.sm + 2),
                              decoration: const BoxDecoration(
                                color: AppColors.error,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.notifications_active_rounded,
                                color: Colors.white,
                                size: 20,
                              ),
                            ),
                            const SizedBox(width: AppSpacing.md + 2),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'SOS — Emergency Help',
                                    style: AppTypography.h4(
                                      color: AppColors.errorText,
                                      fontSize: 15,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                  Text(
                                    'Instant 24/7 security dispatch alert',
                                    style: AppTypography.caption(
                                      color: AppColors.errorText,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const Icon(Icons.chevron_right_rounded,
                                color: AppColors.errorText),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  for (final (icon, title, subtitle, route) in _tools) ...[
                    EmployeeNavTile(
                      icon: icon,
                      title: title,
                      subtitle: subtitle,
                      onTap: () => context.push(route),
                    ),
                    const SizedBox(height: AppSpacing.sm + 2),
                  ],
                ],
              ),
            ),
          ),
          bottomNavigationBar: const EmployeeBottomNavBar(currentIndex: -1),
        );
      },
    );
  }
}
