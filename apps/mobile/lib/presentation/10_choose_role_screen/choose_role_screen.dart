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
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.xxl,
                vertical: AppSpacing.lg,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // ── Top Navigation Bar ─────────────────────────────────────
                  Row(
                    children: [
                      IconButton(
                        onPressed: () => context.pop(),
                        icon: const Icon(
                          Icons.arrow_back,
                          color: AppColors.textPrimaryLight,
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
                      color: AppColors.textPrimaryLight,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    'Select how you want to join AdhocX',
                    style: AppTypography.body(
                      color: AppColors.textSecondaryLight,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xxl),

                  // ── Role 1: Driver Partner ─────────────────────────────────
                  AppRoleSelectCard(
                    role: 'DRIVER',
                    title: 'Driver',
                    subtitle: 'I want to drive and earn',
                    isSelected: _selectedRole == 'DRIVER',
                    onTap: () => setState(() => _selectedRole = 'DRIVER'),
                    iconWidget: const Icon(
                      Icons.drive_eta_rounded,
                      size: 32,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),

                  // ── Role 2: Fleet Vendor ───────────────────────────────────
                  AppRoleSelectCard(
                    role: 'VENDOR',
                    title: 'Vendor',
                    subtitle: 'I want to create trip requirements',
                    isSelected: _selectedRole == 'VENDOR',
                    onTap: () => setState(() => _selectedRole = 'VENDOR'),
                    iconWidget: const Icon(
                      Icons.local_shipping_rounded,
                      size: 32,
                      color: AppColors.primary,
                    ),
                  ),
                  const Spacer(),

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
    );
  }
}
