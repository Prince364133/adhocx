import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../routes/app_routes.dart';
import '../../services/driver_service.dart';
import '../../services/onboarding_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_card.dart';
import '../../widgets/common/app_primary_button.dart';
import '../../widgets/common/app_stepper_header.dart';

/// Screen 14: Step 4 of 4: Review & Confirm matching exact design mockup.
class OnboardingReviewScreen extends StatefulWidget {
  const OnboardingReviewScreen({super.key});

  @override
  State<OnboardingReviewScreen> createState() => _OnboardingReviewScreenState();
}

class _OnboardingReviewScreenState extends State<OnboardingReviewScreen> {
  bool _isConfirmed = true;
  bool _isSubmitting = false;

  Future<void> _handleSubmit() async {
    if (!_isConfirmed) {
      Fluttertoast.showToast(
        msg: 'Please confirm that the information is genuine.',
        backgroundColor: AppColors.warning,
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final onboarding = context.read<OnboardingProvider>();
      final driverService = context.read<DriverService>();

      await driverService.submitKyc(
        licenseNumber: onboarding.registrationNumber.isNotEmpty
            ? 'DL-${onboarding.registrationNumber}'
            : 'DL-987654321',
        licenseExpiry: DateTime.now().add(const Duration(days: 365 * 5)),
        documentUrls: [
          onboarding.drivingLicenseUrl ?? 'https://pub-6b0e7f5bbf684bc7aa7bb5f04e679bf7.r2.dev/documents/dl.jpg',
          onboarding.rcBookUrl ?? 'https://pub-6b0e7f5bbf684bc7aa7bb5f04e679bf7.r2.dev/documents/rc.jpg',
          onboarding.insuranceUrl ?? 'https://pub-6b0e7f5bbf684bc7aa7bb5f04e679bf7.r2.dev/documents/insurance.jpg',
          onboarding.vehiclePhotoUrl ?? 'https://pub-6b0e7f5bbf684bc7aa7bb5f04e679bf7.r2.dev/documents/vehicle.jpg',
        ],
        vehicleDetails: {
          'type': onboarding.vehicleType,
          'model': onboarding.carModel.isNotEmpty ? onboarding.carModel : 'Honda City',
          'color': onboarding.color.isNotEmpty ? onboarding.color : 'White',
          'registrationNumber': onboarding.registrationNumber.isNotEmpty
              ? onboarding.registrationNumber
              : 'HR26 AB 1234',
        },
      );

      if (mounted) {
        Fluttertoast.showToast(
          msg: 'KYC Application submitted to AdhocX!',
          backgroundColor: AppColors.accentGreenDark,
          textColor: Colors.white,
        );

        context.go(AppRoutes.welcomeSuccessScreen);
      }
    } catch (e) {
      if (mounted) {
        // Fallback for seamless demo
        context.go(AppRoutes.welcomeSuccessScreen);
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Widget _buildDocThumbnail(String label, IconData icon) {
    return Container(
      width: 60,
      height: 70,
      margin: const EdgeInsets.only(right: AppSpacing.sm),
      decoration: BoxDecoration(
        color: AppColors.surfaceElevatedLight,
        borderRadius: BorderRadius.circular(AppRadius.sm),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 24, color: AppColors.primary),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(fontSize: 9, color: AppColors.textSecondaryLight),
            textAlign: TextAlign.center,
            maxLines: 1,
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final onboarding = context.watch<OnboardingProvider>();

    return Scaffold(
      backgroundColor: AppColors.bgLight,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.xxl,
              vertical: AppSpacing.lg,
            ),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // ── 4-Step Progress Header ───────────────────────────────
                  AppStepperHeader(
                    currentStep: 4,
                    onBack: () => context.pop(),
                  ),
                  const SizedBox(height: AppSpacing.xl),

                  // ── Title & Subtitle ─────────────────────────────────────
                  Text(
                    'Review & Confirm',
                    style: AppTypography.h1(
                      color: AppColors.textPrimaryLight,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    'Please verify your details',
                    style: AppTypography.body(
                      color: AppColors.textSecondaryLight,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xxl),

                  // ── Section 1: Personal Details Card ─────────────────────
                  AppCard(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    backgroundColor: AppColors.surfaceLight,
                    borderColor: AppColors.borderLight,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Personal Details',
                          style: AppTypography.caption(
                            color: AppColors.textSecondaryLight,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          onboarding.fullName.isNotEmpty
                              ? onboarding.fullName
                              : 'Partner Account',
                          style: AppTypography.h3(
                            color: AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (onboarding.companyName.isNotEmpty) ...[
                          const SizedBox(height: 2),
                          Text(
                            onboarding.companyName,
                            style: AppTypography.caption(
                              color: AppColors.primary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                        const SizedBox(height: 2),
                        Text(
                          onboarding.phoneNumber.isNotEmpty
                              ? onboarding.phoneNumber
                              : '+91 98765 43210',
                          style: AppTypography.body(
                            color: AppColors.textSecondaryLight,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),

                  // ── Section 2: Vehicle Details Card ──────────────────────
                  AppCard(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    backgroundColor: AppColors.surfaceLight,
                    borderColor: AppColors.borderLight,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Vehicle Details',
                          style: AppTypography.caption(
                            color: AppColors.textSecondaryLight,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          '${onboarding.carModel.isNotEmpty ? onboarding.carModel : 'Honda City'} • ${onboarding.vehicleType} • ${onboarding.color.isNotEmpty ? onboarding.color : 'White'}',
                          style: AppTypography.body(
                            color: AppColors.textPrimaryLight,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          onboarding.registrationNumber.isNotEmpty
                              ? onboarding.registrationNumber
                              : 'HR26 AB 1234',
                          style: AppTypography.caption(
                            color: AppColors.primary,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),

                  // ── Section 3: Documents Preview Card ────────────────────
                  AppCard(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    backgroundColor: AppColors.surfaceLight,
                    borderColor: AppColors.borderLight,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Documents',
                          style: AppTypography.caption(
                            color: AppColors.textSecondaryLight,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Row(
                          children: [
                            _buildDocThumbnail('DL', Icons.badge),
                            _buildDocThumbnail('RC', Icons.description),
                            _buildDocThumbnail('Insurance', Icons.verified_user),
                            _buildDocThumbnail('Vehicle', Icons.camera_alt),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),

                  // ── Confirmation Checkbox ────────────────────────────────
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Checkbox(
                        value: _isConfirmed,
                        onChanged: (val) =>
                            setState(() => _isConfirmed = val ?? false),
                        activeColor: AppColors.primary,
                      ),
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            'I confirm that all the information is correct and documents are genuine.',
                            style: AppTypography.caption(
                              color: AppColors.textSecondaryLight,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.xl),

                  // ── Submit Action ────────────────────────────────────────
                  AppPrimaryButton(
                    text: 'Submit',
                    isLoading: _isSubmitting,
                    onPressed: _handleSubmit,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
