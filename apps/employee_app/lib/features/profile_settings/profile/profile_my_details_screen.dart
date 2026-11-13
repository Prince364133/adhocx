import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Screen 6: Profile (My Details) — Profile tab.
class ProfileMyDetailsScreen extends StatelessWidget {
  const ProfileMyDetailsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () async => (await MockDataService.getHistoryProfileData())['profile']
          as Map<String, dynamic>?,
      builder: (context, profile) {
        final p = EmployeePalette.of(context);

        return Scaffold(
          backgroundColor: p.background,
          body: SingleChildScrollView(
            child: Column(
              children: [
                EmployeeEntrance(
                  child: _ProfileHeader(
                    name: profile['fullName'] ?? 'Ravi Kumar',
                    employeeId: profile['employeeId'] ?? 'EMP001245',
                  ),
                ),
                const SizedBox(height: AppSpacing.xxl),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
                  child: Column(
                    children: [
                      EmployeeEntrance(
                        delay: const Duration(milliseconds: 100),
                        child: TripInfoCard(
                          items: [
                            TripInfoItem(
                              icon: Icons.apartment_rounded,
                              label: 'Organization',
                              value: profile['organization'] ??
                                  'HITEC Technologies',
                            ),
                            TripInfoItem(
                              icon: Icons.email_outlined,
                              label: 'Email',
                              value: profile['email'] ?? 'ravi.kumar@hitec.com',
                            ),
                            TripInfoItem(
                              icon: Icons.phone_outlined,
                              label: 'Phone Number',
                              value: profile['phone'] ?? '+91 98765 43210',
                            ),
                            TripInfoItem(
                              icon: Icons.location_on_outlined,
                              label: 'Address',
                              value: profile['address'] ?? 'Kondapur, Hyderabad',
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),
                      EmployeeEntrance(
                        delay: const Duration(milliseconds: 180),
                        child: Column(
                          children: [
                            for (final (icon, title, route) in const [
                              (Icons.edit_outlined, 'Edit Profile',
                                  AppRoutes.editProfile),
                              // Settings (appearance, language) was
                              // unreachable from the Profile tab.
                              (Icons.settings_outlined, 'Settings',
                                  AppRoutes.settingsOverview),
                              (Icons.language_rounded, 'Language',
                                  AppRoutes.settingsLanguage),
                              (Icons.headset_mic_outlined, 'Support',
                                  AppRoutes.safetyReportIncident),
                            ]) ...[
                              EmployeeNavTile(
                                icon: icon,
                                title: title,
                                onTap: () => context.push(route),
                              ),
                              const SizedBox(height: AppSpacing.sm + 2),
                            ],
                            EmployeeNavTile(
                              icon: Icons.logout_rounded,
                              title: 'Sign Out',
                              iconColor: AppColors.error,
                              onTap: () => context.push(AppRoutes.logoutConfirm),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xxxl),
                    ],
                  ),
                ),
              ],
            ),
          ),
          bottomNavigationBar: const EmployeeBottomNavBar(currentIndex: 3),
        );
      },
    );
  }
}

class _ProfileHeader extends StatelessWidget {
  final String name;
  final String employeeId;

  const _ProfileHeader({required this.name, required this.employeeId});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.primaryGradientStart, AppColors.primaryGradientEnd],
        ),
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(AppRadius.xxl * 2),
          bottomRight: Radius.circular(AppRadius.xxl * 2),
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.xxxl),
          child: Column(
            children: [
              SizedBox(
                height: kToolbarHeight,
                child: Row(
                  children: [
                    IconButton(
                      tooltip: 'Back',
                      icon: const Icon(Icons.arrow_back, color: Colors.white),
                      onPressed: () => context.go(AppRoutes.homeUpcomingPickup),
                    ),
                    Expanded(
                      child: Text(
                        'Profile',
                        textAlign: TextAlign.center,
                        style: AppTypography.h3(color: Colors.white),
                      ),
                    ),
                    const SizedBox(width: 48),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Semantics(
                button: true,
                label: 'Edit profile photo',
                child: GestureDetector(
                  onTap: () => context.push(AppRoutes.editProfile),
                  child: Stack(
                    alignment: Alignment.bottomRight,
                    children: [
                      CircleAvatar(
                        radius: 46,
                        backgroundColor: Colors.white.withAlpha(51),
                        child: const Icon(Icons.person,
                            size: 56, color: Colors.white),
                      ),
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.xs + 2),
                        decoration: const BoxDecoration(
                          color: AppColors.brandOrange,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.edit_rounded,
                            size: 14, color: Colors.white),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.md + 2),
              Text(name, style: AppTypography.h2(color: Colors.white)),
              const SizedBox(height: AppSpacing.xs),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.md,
                  vertical: AppSpacing.xs,
                ),
                decoration: BoxDecoration(
                  color: Colors.white.withAlpha(51),
                  borderRadius: AppRadius.borderPill,
                ),
                child: Text(
                  employeeId,
                  style: AppTypography.caption(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
