import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_service.dart';
import '../../services/onboarding_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Screen 1: Personal Information screen matching exact design mockup.
class PersonalInformationScreen extends StatelessWidget {
  const PersonalInformationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final onboarding = context.watch<OnboardingProvider>();
    final authService = context.watch<AuthService>();
    final user = authService.currentUser;

    final name = onboarding.fullName.isNotEmpty
        ? onboarding.fullName
        : (user?.fullName?.isNotEmpty == true ? user!.fullName! : 'Partner Profile');
    final phone = onboarding.phoneNumber.isNotEmpty
        ? onboarding.phoneNumber
        : (user?.phone?.isNotEmpty == true ? user!.phone! : '+91 98765 43210');
    final email = onboarding.email.isNotEmpty
        ? onboarding.email
        : (user?.email?.isNotEmpty == true ? user!.email! : 'partner@adhocx.com');
    final dob = onboarding.dateOfBirth != null
        ? '${onboarding.dateOfBirth!.day}/${onboarding.dateOfBirth!.month}/${onboarding.dateOfBirth!.year}'
        : '15 Aug 1990';
    final gender = onboarding.gender.isNotEmpty ? onboarding.gender : 'Male';

    return Scaffold(
      backgroundColor: AppColors.bgLight,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Column(
              children: [
                // ── App Header ───────────────────────────────────────────────
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.lg,
                    vertical: AppSpacing.md,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceLight,
                    border: Border(
                      bottom: BorderSide(color: AppColors.borderLight),
                    ),
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () {
                          if (context.canPop()) {
                            context.pop();
                          } else {
                            context.go(AppRoutes.profileScreen);
                          }
                        },
                        icon: Icon(
                          Icons.arrow_back,
                          color: AppColors.textPrimaryLight,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Personal Information',
                          style: AppTypography.h3(
                            color: AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      TextButton(
                        onPressed: () {
                          context.push(AppRoutes.editPersonalInfoScreen);
                        },
                        child: Text(
                          'Edit',
                          style: AppTypography.body(
                            color: AppColors.primary,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // ── Scrollable Body Content ──────────────────────────────────
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    children: [
                      // ── Profile Hero Header Card ───────────────────────────
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.xl),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(color: AppColors.borderLight),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.03),
                              blurRadius: 4,
                              offset: Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            Stack(
                              children: [
                                CircleAvatar(
                                  radius: 36,
                                  backgroundColor: AppColors.primaryLight.withValues(alpha: 0.2),
                                  child: Text(
                                    name.isNotEmpty ? name[0].toUpperCase() : 'R',
                                    style: AppTypography.h1(
                                      color: AppColors.primary,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                Positioned(
                                  right: 0,
                                  bottom: 0,
                                  child: Container(
                                    padding: const EdgeInsets.all(4),
                                    decoration: BoxDecoration(
                                      color: AppColors.primary,
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(
                                      Icons.camera_alt,
                                      size: 12,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(width: AppSpacing.lg),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text(
                                        name,
                                        style: AppTypography.h3(
                                          color: AppColors.textPrimaryLight,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 2,
                                        ),
                                        decoration: BoxDecoration(
                                          color: AppColors.accentGreenDark.withValues(alpha: 0.12),
                                          borderRadius: BorderRadius.circular(AppRadius.full),
                                        ),
                                        child: Text(
                                          'Verified',
                                          style: AppTypography.caption(
                                            color: AppColors.accentGreenDark,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Driver ID: DRV123455',
                                    style: AppTypography.caption(
                                      color: AppColors.textMutedLight,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Row(
                                    children: [
                                      Icon(Icons.phone_outlined, size: 14, color: AppColors.textSecondaryLight),
                                      const SizedBox(width: 6),
                                      Text(
                                        phone,
                                        style: AppTypography.caption(color: AppColors.textSecondaryLight),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      Icon(Icons.email_outlined, size: 14, color: AppColors.textSecondaryLight),
                                      const SizedBox(width: 6),
                                      Text(
                                        email,
                                        style: AppTypography.caption(color: AppColors.textSecondaryLight),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),

                      // ── Personal Details Section Title ─────────────────────
                      Text(
                        'Personal Details',
                        style: AppTypography.body(
                          color: AppColors.textPrimaryLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),

                      // ── Details Container Card ─────────────────────────────
                      Container(
                        decoration: BoxDecoration(
                          color: AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(color: AppColors.borderLight),
                        ),
                        child: Column(
                          children: [
                            _buildDetailTile(
                              icon: Icons.person_outline,
                              label: 'Full Name',
                              value: name,
                            ),
                            Divider(height: 1, color: AppColors.borderLight),
                            _buildDetailTile(
                              icon: Icons.cake_outlined,
                              label: 'Date of Birth',
                              value: dob,
                            ),
                            Divider(height: 1, color: AppColors.borderLight),
                            _buildDetailTile(
                              icon: Icons.alternate_email,
                              label: 'Gender',
                              value: gender,
                            ),
                            Divider(height: 1, color: AppColors.borderLight),
                            _buildDetailTile(
                              icon: Icons.location_on_outlined,
                              label: 'Address',
                              value: 'DLF Phase 2, Gurugram,\nHaryana 122002',
                            ),
                            Divider(height: 1, color: AppColors.borderLight),
                            _buildDetailTile(
                              icon: Icons.emergency_outlined,
                              label: 'Emergency Contact',
                              value: 'Priya Sharma (Wife)\n+91 91234 56789',
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDetailTile({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.md,
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: AppColors.primary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: AppTypography.caption(color: AppColors.textMutedLight),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: AppTypography.body(
                    color: AppColors.textPrimaryLight,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          Icon(Icons.chevron_right, size: 18, color: AppColors.textMutedLight),
        ],
      ),
    );
  }
}
