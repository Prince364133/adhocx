import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../routes/app_routes.dart';
import '../../services/onboarding_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_primary_button.dart';
import '../../widgets/common/app_role_select_card.dart';

/// Screen 10: Choose your role matching exact design mockup.
class ChooseRoleScreen extends StatefulWidget {
  const ChooseRoleScreen({super.key});

  @override
  State<ChooseRoleScreen> createState() => _ChooseRoleScreenState();
}

class _ChooseRoleScreenState extends State<ChooseRoleScreen> {
  String _selectedRole = 'DRIVER';

  @override
  void initState() {
    super.initState();
    final onboarding = context.read<OnboardingProvider>();
    _selectedRole = onboarding.role;
  }

  void _handleContinue() {
    final onboarding = context.read<OnboardingProvider>();
    onboarding.setRole(_selectedRole);

    context.push(AppRoutes.onboardingPersonalScreen);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.xxl,
                vertical: AppSpacing.lg,
              ),
              child: SingleChildScrollView(
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    minHeight: MediaQuery.of(context).size.height - MediaQuery.of(context).padding.top - MediaQuery.of(context).padding.bottom - 48,
                  ),
                  child: IntrinsicHeight(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // ── Top Navigation Bar ─────────────────────────────────────
                        Row(
                          children: [
                            IconButton(
                              onPressed: () => context.pop(),
                              icon: Icon(
                                Icons.arrow_back,
                                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                              ),
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.xl),

                        // ── Title & Subtitle ───────────────────────────────────────
                        Text(
                          'Choose your role',
                          style: AppTypography.h1(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          'Select how you want to join AdhocX',
                          style: AppTypography.body(
                            color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xxl),

                        // ── Role 1: User / Booker ─────────────────────────────────
                        AppRoleSelectCard(
                          role: 'USER',
                          title: 'Book Rides & Bulk Fleets',
                          subtitle: 'For outstation trips, events & corporate travel',
                          isSelected: _selectedRole == 'USER' || _selectedRole == 'VENDOR',
                          onTap: () => setState(() => _selectedRole = 'USER'),
                          iconWidget: Icon(
                            Icons.person_pin_circle_rounded,
                            size: 32,
                            color: isDark ? AppColors.primaryLight : AppColors.primary,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.lg),

                        // ── Role 2: Driver ─────────────────────────────────
                        AppRoleSelectCard(
                          role: 'DRIVER',
                          title: 'Driver',
                          subtitle: 'Drive your vehicle and earn with verified rides',
                          isSelected: _selectedRole == 'DRIVER',
                          onTap: () => setState(() => _selectedRole = 'DRIVER'),
                          iconWidget: Icon(
                            Icons.drive_eta_rounded,
                            size: 32,
                            color: isDark ? AppColors.primaryLight : AppColors.primary,
                          ),
                        ),
                        const Spacer(),
                        const SizedBox(height: AppSpacing.xl),

                        // ── Bottom Action ──────────────────────────────────────────
                        AppPrimaryButton(
                          text: 'Continue',
                          onPressed: _handleContinue,
                        ),
                        const SizedBox(height: AppSpacing.md),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
