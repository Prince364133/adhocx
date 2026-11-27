import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/state/employee_auth_provider.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/state/employee_feature_provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Profile (My Details) — Profile tab backed by GET /corporate/me.
class ProfileMyDetailsScreen extends StatefulWidget {
  const ProfileMyDetailsScreen({super.key});

  @override
  State<ProfileMyDetailsScreen> createState() => _ProfileMyDetailsScreenState();
}

class _ProfileMyDetailsScreenState extends State<ProfileMyDetailsScreen> {
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadProfile());
  }

  Future<void> _loadProfile({bool force = false}) async {
    EmployeeDataProvider? data;
    try {
      data = context.read<EmployeeDataProvider>();
    } catch (_) {
      data = null;
    }
    if (data != null) {
      await data.loadProfile(force: force);
    }
    if (mounted) setState(() => _initialized = true);
  }

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    final features = context.watch<EmployeeFeatureProvider>();
    EmployeeDataProvider? data;
    EmployeeAuthProvider? auth;
    try {
      data = context.watch<EmployeeDataProvider>();
    } catch (_) {}
    try {
      auth = context.watch<EmployeeAuthProvider>();
    } catch (_) {}

    if (!_initialized && (data?.loadingProfile ?? false)) {
      return const EmployeeLoadingScaffold(
        skeletonLayout: SkeletonLayout.profile,
      );
    }

    final profile = data?.profile;
    final user = auth?.currentUser;

    final fullName = profile?['fullName']?.toString() ?? user?.fullName ?? '';
    final employeeId =
        profile?['employeeCode']?.toString() ?? user?.employeeId ?? '';
    final orgName = (profile?['tenant'] is Map
            ? (profile!['tenant'] as Map)['name']?.toString()
            : null) ??
        user?.organization ??
        '';
    final email = profile?['email']?.toString() ?? user?.email ?? '';
    final phone = profile?['phoneNumber']?.toString() ?? user?.phone ?? '';
    final pickupAddr = profile?['defaultPickupLocation'] is Map
        ? (profile!['defaultPickupLocation'] as Map)['addressText']?.toString()
        : null;
    final officeName = profile?['office'] is Map
        ? (profile!['office'] as Map)['name']?.toString()
        : user?.office;

    return Scaffold(
      backgroundColor: p.background,
      body: RefreshIndicator(
        onRefresh: () => _loadProfile(force: true),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            children: [
              EmployeeEntrance(
                child: _ProfileHeader(
                  name: fullName.isNotEmpty ? fullName : 'Commuter',
                  employeeId: employeeId,
                ),
              ),
              const SizedBox(height: AppSpacing.xxl),
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.pageHorizontal,
                ),
                child: Column(
                  children: [
                    EmployeeEntrance(
                      delay: const Duration(milliseconds: 100),
                      child: TripInfoCard(
                        items: [
                          TripInfoItem(
                            icon: Icons.apartment_rounded,
                            label: 'Organization',
                            value: orgName.isNotEmpty
                                ? (officeName?.isNotEmpty == true
                                    ? '$orgName • $officeName'
                                    : orgName)
                                : 'Not set',
                          ),
                          TripInfoItem(
                            icon: Icons.email_outlined,
                            label: 'Email',
                            value: email.isNotEmpty ? email : 'Not set',
                          ),
                          TripInfoItem(
                            icon: Icons.phone_outlined,
                            label: 'Phone Number',
                            value: phone.isNotEmpty ? phone : 'Not set',
                          ),
                          TripInfoItem(
                            icon: Icons.location_on_outlined,
                            label: 'Address',
                            value: pickupAddr?.isNotEmpty == true
                                ? pickupAddr!
                                : 'Not set',
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xl),
                    FeatureSectionCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                Icons.home_work_rounded,
                                color: p.accent,
                                size: 20,
                              ),
                              const SizedBox(width: AppSpacing.sm),
                              Expanded(
                                child: Text(
                                  'Registered Address',
                                  style: AppTypography.bodyMedium(
                                    color: p.textPrimary,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                              RequestStatusBadge(
                                status: features.addressRequests.any(
                                  (request) =>
                                      request['status']
                                          ?.toString()
                                          .toUpperCase() ==
                                      'PENDING',
                                )
                                    ? 'Pending Approval'
                                    : 'Registered',
                              ),
                            ],
                          ),
                          const SizedBox(height: AppSpacing.sm),
                          Text(
                            features.registeredAddress.fullAddress,
                            style: AppTypography.small(
                              color: p.textSecondary,
                            ),
                          ),
                          const SizedBox(height: AppSpacing.md),
                          EmployeeSecondaryButton(
                            label: 'Request Address Change',
                            icon: Icons.edit_location_alt_rounded,
                            onPressed: () =>
                                context.push(AppRoutes.addressRequestStatus),
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
                            (
                              Icons.edit_outlined,
                              'Edit Profile',
                              AppRoutes.editProfile
                            ),
                            (
                              Icons.settings_outlined,
                              'Settings',
                              AppRoutes.settingsOverview
                            ),
                            (
                              Icons.language_rounded,
                              'Language',
                              AppRoutes.settingsLanguage
                            ),
                            (
                              Icons.contact_phone_outlined,
                              'Manage Contacts',
                              AppRoutes.manageEmergencyContacts
                            ),
                            (
                              Icons.headset_mic_outlined,
                              'Support',
                              AppRoutes.safetyReportIncident
                            ),
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
      ),
      bottomNavigationBar: const EmployeeBottomNavBar(currentIndex: 3),
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
          colors: [
            AppColors.primaryGradientStart,
            AppColors.primaryGradientEnd
          ],
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
              if (employeeId.isNotEmpty) ...[
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
            ],
          ),
        ),
      ),
    );
  }
}
