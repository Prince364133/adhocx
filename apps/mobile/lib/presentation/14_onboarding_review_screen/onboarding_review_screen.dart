import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_provider.dart';
import '../../services/auth_service.dart';
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

      // Validate all required documents are uploaded
      final missingDocs = <String>[];
      if (onboarding.drivingLicenseUrl == null) missingDocs.add('Driving License');
      if (onboarding.rcBookUrl == null) missingDocs.add('RC Book');
      if (onboarding.insuranceUrl == null) missingDocs.add('Insurance');
      if (onboarding.vehiclePhotoUrl == null) missingDocs.add('Vehicle Photo');
      if (onboarding.aadharFrontUrl == null) missingDocs.add('Aadhaar Front');
      if (onboarding.aadharBackUrl == null) missingDocs.add('Aadhaar Back');
      if (onboarding.panCardUrl == null) missingDocs.add('PAN Card');

      if (missingDocs.isNotEmpty) {
        Fluttertoast.showToast(
          msg: 'Please upload: ${missingDocs.join(", ")}',
          backgroundColor: AppColors.error,
          textColor: Colors.white,
          toastLength: Toast.LENGTH_LONG,
        );
        setState(() => _isSubmitting = false);
        return;
      }

      // Validate vehicle details
      if (onboarding.carModel.isEmpty || onboarding.registrationNumber.isEmpty) {
        Fluttertoast.showToast(
          msg: 'Please provide vehicle model and registration number.',
          backgroundColor: AppColors.error,
          textColor: Colors.white,
        );
        setState(() => _isSubmitting = false);
        return;
      }

      final dlUrl = onboarding.drivingLicenseUrl!;
      final rcUrl = onboarding.rcBookUrl!;
      final insUrl = onboarding.insuranceUrl!;
      final vehUrl = onboarding.vehiclePhotoUrl!;
      final aadharFUrl = onboarding.aadharFrontUrl!;
      final aadharBUrl = onboarding.aadharBackUrl!;
      final panUrl = onboarding.panCardUrl!;

      final docList = [dlUrl, rcUrl, insUrl, vehUrl, aadharFUrl, aadharBUrl, panUrl];

      await driverService.submitKyc(
        licenseNumber: onboarding.registrationNumber.isNotEmpty
            ? 'DL-${onboarding.registrationNumber}'
            : '',
        licenseExpiry: DateTime.now().add(const Duration(days: 365 * 5)),
        documentUrls: docList,
        dlFrontUrl: dlUrl,
        rcDocUrl: rcUrl,
        insuranceDocUrl: insUrl,
        vehiclePhotoUrl: vehUrl,
        aadharFrontUrl: aadharFUrl,
        aadharBackUrl: aadharBUrl,
        panDocUrl: panUrl,
        vehicleDetails: {
          'type': onboarding.vehicleType,
          'model': onboarding.carModel,
          'color': onboarding.color,
          'registrationNumber': onboarding.registrationNumber,
        },
      );

      // Also persist personal details to driver profile
      try {
        await driverService.updateProfile({
          if (onboarding.fullName.isNotEmpty) 'fullName': onboarding.fullName,
          if (onboarding.dateOfBirth != null)
            'dateOfBirth': '${onboarding.dateOfBirth!.day}/${onboarding.dateOfBirth!.month}/${onboarding.dateOfBirth!.year}',
          if (onboarding.gender.isNotEmpty) 'gender': onboarding.gender,
        });
      } catch (_) {}

      // Refresh live authenticated session
      final updatedUser = await AuthService.instance.fetchCurrentUser(forceRefresh: true);
      if (updatedUser != null && mounted) {
        context.read<AuthProvider>().setUser(updatedUser);
      }

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
        Fluttertoast.showToast(
          msg: 'KYC submission failed: ${e.toString().replaceAll('Exception: ', '')}',
          backgroundColor: Colors.redAccent,
          textColor: Colors.white,
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Widget _buildDocThumbnail(String label, IconData icon, bool isUploaded, bool isDark) {
    return Container(
      width: 78,
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm, horizontal: 4),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceElevatedLight,
        borderRadius: BorderRadius.circular(AppRadius.sm),
        border: Border.all(
          color: isUploaded
              ? (isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark)
              : (isDark ? AppColors.borderDark : AppColors.borderLight),
          width: isUploaded ? 1.5 : 1,
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            size: 20,
            color: isUploaded
                ? (isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark)
                : (isDark ? AppColors.primaryLight : AppColors.primary),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            ),
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final onboarding = context.watch<OnboardingProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
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
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    'Please verify your details',
                    style: AppTypography.body(
                      color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xxl),

                  // ── Section 1: Personal Details Card ─────────────────────
                  AppCard(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                    borderColor: isDark ? AppColors.borderDark : AppColors.borderLight,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Personal Details',
                          style: AppTypography.caption(
                            color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          onboarding.fullName.isNotEmpty
                              ? onboarding.fullName
                              : 'Partner Account',
                          style: AppTypography.h3(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (onboarding.companyName.isNotEmpty) ...[
                          const SizedBox(height: 2),
                          Text(
                            onboarding.companyName,
                            style: AppTypography.caption(
                              color: isDark ? AppColors.primaryLight : AppColors.primary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                        const SizedBox(height: 2),
                        Text(
                          onboarding.phoneNumber.isNotEmpty
                              ? onboarding.phoneNumber
                              : (AuthService.instance.currentUser?.phone ?? '—'),
                          style: AppTypography.body(
                            color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),

                  // ── Section 2: Vehicle Details Card ──────────────────────
                  AppCard(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                    borderColor: isDark ? AppColors.borderDark : AppColors.borderLight,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Vehicle Details',
                          style: AppTypography.caption(
                            color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          '${onboarding.carModel.isNotEmpty ? onboarding.carModel : '—'} • ${onboarding.vehicleType} • ${onboarding.color.isNotEmpty ? onboarding.color : '—'}',
                          style: AppTypography.body(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          onboarding.registrationNumber.isNotEmpty
                              ? onboarding.registrationNumber
                              : '—',
                          style: AppTypography.caption(
                            color: isDark ? AppColors.primaryLight : AppColors.primary,
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
                    backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                    borderColor: isDark ? AppColors.borderDark : AppColors.borderLight,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'KYC Documents',
                              style: AppTypography.caption(
                                color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            Text(
                              '${onboarding.uploadedCount}/7 Ready',
                              style: AppTypography.caption(
                                color: isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSpacing.md),
                        SingleChildScrollView(
                          scrollDirection: Axis.horizontal,
                          child: Row(
                            children: [
                              _buildDocThumbnail('DL', Icons.badge, onboarding.drivingLicenseUrl != null, isDark),
                              const SizedBox(width: AppSpacing.sm),
                              _buildDocThumbnail('RC Book', Icons.description, onboarding.rcBookUrl != null, isDark),
                              const SizedBox(width: AppSpacing.sm),
                              _buildDocThumbnail('Insurance', Icons.verified_user, onboarding.insuranceUrl != null, isDark),
                              const SizedBox(width: AppSpacing.sm),
                              _buildDocThumbnail('Vehicle', Icons.directions_car, onboarding.vehiclePhotoUrl != null, isDark),
                              const SizedBox(width: AppSpacing.sm),
                              _buildDocThumbnail('Aadhar Front', Icons.credit_card, onboarding.aadharFrontUrl != null, isDark),
                              const SizedBox(width: AppSpacing.sm),
                              _buildDocThumbnail('Aadhar Back', Icons.credit_card_outlined, onboarding.aadharBackUrl != null, isDark),
                              const SizedBox(width: AppSpacing.sm),
                              _buildDocThumbnail('PAN Card', Icons.assignment_ind, onboarding.panCardUrl != null, isDark),
                            ],
                          ),
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
                        activeColor: isDark ? AppColors.primaryLight : AppColors.primary,
                        checkColor: isDark ? AppColors.bgDark : Colors.white,
                      ),
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            'I confirm that all the information is correct and documents are genuine.',
                            style: AppTypography.caption(
                              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
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
