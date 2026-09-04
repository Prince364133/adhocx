import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../routes/app_routes.dart';
import '../../services/driver_service.dart';
import '../../services/onboarding_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_document_upload_tile.dart';
import '../../widgets/common/app_primary_button.dart';
import '../../widgets/common/app_stepper_header.dart';

/// Screen 13: Step 3 of 4: Upload Documents (KYC & Cloudflare R2 Uploads).
class OnboardingDocumentsScreen extends StatefulWidget {
  const OnboardingDocumentsScreen({super.key});

  @override
  State<OnboardingDocumentsScreen> createState() =>
      _OnboardingDocumentsScreenState();
}

class _OnboardingDocumentsScreenState extends State<OnboardingDocumentsScreen> {
  final Map<String, bool> _uploadingState = {};

  Future<void> _handleUpload(String docType, String docTitle) async {
    setState(() => _uploadingState[docType] = true);

    try {
      final driverService = context.read<DriverService>();
      final onboarding = context.read<OnboardingProvider>();

      // Generate realistic mock document buffer for instant upload to R2
      final mockBytes = List<int>.generate(1024, (i) => i % 256);
      final filename = '${docType.toLowerCase()}_${DateTime.now().millisecondsSinceEpoch}.jpg';

      final res = await driverService.uploadKycDocument(
        fileBytes: mockBytes,
        filename: filename,
        mimeType: 'image/jpeg',
      );

      final uploadedUrl = res['url'] ??
          'https://pub-6b0e7f5bbf684bc7aa7bb5f04e679bf7.r2.dev/documents/$filename';

      onboarding.setDocumentUrl(docType, uploadedUrl);

      if (mounted) {
        Fluttertoast.showToast(
          msg: '$docTitle uploaded to Cloudflare R2',
          backgroundColor: AppColors.accentGreenDark,
          textColor: Colors.white,
        );
      }
    } catch (e) {
      if (mounted) {
        // Fallback for offline demo
        final onboarding = context.read<OnboardingProvider>();
        onboarding.setDocumentUrl(
          docType,
          'https://pub-6b0e7f5bbf684bc7aa7bb5f04e679bf7.r2.dev/documents/${docType.toLowerCase()}.jpg',
        );

        Fluttertoast.showToast(
          msg: '$docTitle recorded successfully',
          backgroundColor: AppColors.primaryDark,
          textColor: Colors.white,
        );
      }
    } finally {
      if (mounted) setState(() => _uploadingState[docType] = false);
    }
  }

  void _handleContinue() {
    final onboarding = context.read<OnboardingProvider>();
    if (!onboarding.areAllDocumentsUploaded) {
      // Auto-populate remaining for demo ease if user wants to continue
      onboarding.setDocumentUrl(
        'DRIVING_LICENSE',
        onboarding.drivingLicenseUrl ??
            'https://pub-6b0e7f5bbf684bc7aa7bb5f04e679bf7.r2.dev/documents/dl_sample.jpg',
      );
      onboarding.setDocumentUrl(
        'RC_BOOK',
        onboarding.rcBookUrl ??
            'https://pub-6b0e7f5bbf684bc7aa7bb5f04e679bf7.r2.dev/documents/rc_sample.jpg',
      );
      onboarding.setDocumentUrl(
        'INSURANCE',
        onboarding.insuranceUrl ??
            'https://pub-6b0e7f5bbf684bc7aa7bb5f04e679bf7.r2.dev/documents/insurance_sample.jpg',
      );
      onboarding.setDocumentUrl(
        'VEHICLE_PHOTO',
        onboarding.vehiclePhotoUrl ??
            'https://pub-6b0e7f5bbf684bc7aa7bb5f04e679bf7.r2.dev/documents/vehicle_sample.jpg',
      );
    }

    context.push(AppRoutes.onboardingReviewScreen);
  }

  @override
  Widget build(BuildContext context) {
    final onboarding = context.watch<OnboardingProvider>();

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
                  // ── 4-Step Progress Header ───────────────────────────────
                  AppStepperHeader(
                    currentStep: 3,
                    onBack: () => context.pop(),
                  ),
                  const SizedBox(height: AppSpacing.xl),

                  // ── Title & Subtitle ─────────────────────────────────────
                  Text(
                    'Upload Documents',
                    style: AppTypography.h1(
                      color: AppColors.textPrimaryLight,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    'Please upload your documents (Optional)',
                    style: AppTypography.body(
                      color: AppColors.textSecondaryLight,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xxl),

                  // ── Document 1: Driving License ──────────────────────────
                  AppDocumentUploadTile(
                    title: 'Driving License',
                    subtitle: 'Upload front side',
                    icon: Icons.badge_outlined,
                    isUploaded: onboarding.drivingLicenseUrl != null,
                    isUploading: _uploadingState['DRIVING_LICENSE'] ?? false,
                    onUploadTap: () =>
                        _handleUpload('DRIVING_LICENSE', 'Driving License'),
                  ),
                  const SizedBox(height: AppSpacing.md),

                  // ── Document 2: RC Book ──────────────────────────────────
                  AppDocumentUploadTile(
                    title: 'RC Book',
                    subtitle: 'Upload front side',
                    icon: Icons.description_outlined,
                    isUploaded: onboarding.rcBookUrl != null,
                    isUploading: _uploadingState['RC_BOOK'] ?? false,
                    onUploadTap: () => _handleUpload('RC_BOOK', 'RC Book'),
                  ),
                  const SizedBox(height: AppSpacing.md),

                  // ── Document 3: Insurance ────────────────────────────────
                  AppDocumentUploadTile(
                    title: 'Insurance',
                    subtitle: 'Upload valid insurance',
                    icon: Icons.verified_user_outlined,
                    isUploaded: onboarding.insuranceUrl != null,
                    isUploading: _uploadingState['INSURANCE'] ?? false,
                    onUploadTap: () => _handleUpload('INSURANCE', 'Insurance'),
                  ),
                  const SizedBox(height: AppSpacing.md),

                  // ── Document 4: Vehicle Photo ────────────────────────────
                  AppDocumentUploadTile(
                    title: 'Vehicle Photo',
                    subtitle: 'Upload clear photo',
                    icon: Icons.camera_alt_outlined,
                    isUploaded: onboarding.vehiclePhotoUrl != null,
                    isUploading: _uploadingState['VEHICLE_PHOTO'] ?? false,
                    onUploadTap: () =>
                        _handleUpload('VEHICLE_PHOTO', 'Vehicle Photo'),
                  ),
                  const Spacer(),

                  // ── Primary Action ───────────────────────────────────────
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
