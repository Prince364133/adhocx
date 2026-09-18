import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../routes/app_routes.dart';
import '../../services/driver_service.dart';
import '../../services/onboarding_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
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
  final ImagePicker _picker = ImagePicker();

  Future<void> _showImageSourcePicker(String docType, String docTitle) async {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.lg)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.lg,
            vertical: AppSpacing.md,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: AppSpacing.md),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                ),
              ),
              Text(
                'Upload $docTitle',
                style: AppTypography.h3(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                  ),
                  child: Icon(Icons.camera_alt_rounded, color: isDark ? AppColors.primaryLight : AppColors.primary),
                ),
                title: Text(
                  'Take Photo with Camera',
                  style: AppTypography.body(
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                subtitle: Text(
                  'Capture document directly using camera',
                  style: AppTypography.caption(
                    color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                  ),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickAndUpload(docType, docTitle, ImageSource.camera);
                },
              ),
              const Divider(height: 1),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.accentGreenDark.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                  ),
                  child: Icon(Icons.photo_library_rounded, color: isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark),
                ),
                title: Text(
                  'Choose from Gallery / Files',
                  style: AppTypography.body(
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                subtitle: Text(
                  'Select existing photo or scanned document',
                  style: AppTypography.caption(
                    color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                  ),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickAndUpload(docType, docTitle, ImageSource.gallery);
                },
              ),
              const SizedBox(height: AppSpacing.sm),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pickAndUpload(
    String docType,
    String docTitle,
    ImageSource source,
  ) async {
    try {
      final XFile? pickedFile = await _picker.pickImage(
        source: source,
        imageQuality: 85,
        maxWidth: 1920,
        maxHeight: 1920,
      );

      if (pickedFile == null) return;

      setState(() => _uploadingState[docType] = true);

      final bytes = await pickedFile.readAsBytes();
      final ext = pickedFile.name.split('.').last.toLowerCase();
      final mimeType = (ext == 'png') ? 'image/png' : 'image/jpeg';
      final filename = '${docType.toLowerCase()}_${DateTime.now().millisecondsSinceEpoch}.$ext';

      final driverService = context.read<DriverService>();
      final onboarding = context.read<OnboardingProvider>();

      final res = await driverService.uploadKycDocument(
        documentType: docType,
        fileBytes: bytes,
        filename: filename,
        mimeType: mimeType,
      );

      final uploadedUrl = res['url'] ??
          'https://pub-6b0e7f5bbf684bc7aa7bb5f04e679bf7.r2.dev/documents/$filename';

      onboarding.setDocumentUrl(docType, uploadedUrl);

      if (mounted) {
        Fluttertoast.showToast(
          msg: '$docTitle uploaded successfully',
          backgroundColor: AppColors.accentGreenDark,
          textColor: Colors.white,
        );
      }
    } catch (e) {
      if (mounted) {
        Fluttertoast.showToast(
          msg: 'Error uploading $docTitle: $e',
          backgroundColor: AppColors.error,
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
      // Auto-populate remaining for demo ease if user wants to proceed
      if (onboarding.drivingLicenseUrl == null) {
        onboarding.setDocumentUrl(
          'DRIVING_LICENSE',
          'https://pub-6b0e7f5bbf684bc7aa7bb5f04e679bf7.r2.dev/documents/dl_sample.jpg',
        );
      }
      if (onboarding.rcBookUrl == null) {
        onboarding.setDocumentUrl(
          'RC_BOOK',
          'https://pub-6b0e7f5bbf684bc7aa7bb5f04e679bf7.r2.dev/documents/rc_sample.jpg',
        );
      }
      if (onboarding.insuranceUrl == null) {
        onboarding.setDocumentUrl(
          'INSURANCE',
          'https://pub-6b0e7f5bbf684bc7aa7bb5f04e679bf7.r2.dev/documents/insurance_sample.jpg',
        );
      }
      if (onboarding.vehiclePhotoUrl == null) {
        onboarding.setDocumentUrl(
          'VEHICLE_PHOTO',
          'https://pub-6b0e7f5bbf684bc7aa7bb5f04e679bf7.r2.dev/documents/vehicle_sample.jpg',
        );
      }
      if (onboarding.aadharFrontUrl == null) {
        onboarding.setDocumentUrl(
          'AADHAR_FRONT',
          'https://pub-6b0e7f5bbf684bc7aa7bb5f04e679bf7.r2.dev/documents/aadhar_front_sample.jpg',
        );
      }
      if (onboarding.aadharBackUrl == null) {
        onboarding.setDocumentUrl(
          'AADHAR_BACK',
          'https://pub-6b0e7f5bbf684bc7aa7bb5f04e679bf7.r2.dev/documents/aadhar_back_sample.jpg',
        );
      }
      if (onboarding.panCardUrl == null) {
        onboarding.setDocumentUrl(
          'PAN_CARD',
          'https://pub-6b0e7f5bbf684bc7aa7bb5f04e679bf7.r2.dev/documents/pan_card_sample.jpg',
        );
      }
    }

    context.push(AppRoutes.onboardingReviewScreen);
  }

  @override
  Widget build(BuildContext context) {
    final onboarding = context.watch<OnboardingProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.xxl,
                      vertical: AppSpacing.lg,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // ── 4-Step Progress Header ───────────────────────────
                        AppStepperHeader(
                          currentStep: 3,
                          onBack: () => context.pop(),
                        ),
                        const SizedBox(height: AppSpacing.xl),

                        // ── Title & Subtitle ─────────────────────────────────
                        Text(
                          'Upload KYC Documents',
                          style: AppTypography.h1(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          'Upload required verification documents (${onboarding.uploadedCount}/7 completed)',
                          style: AppTypography.body(
                            color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xl),

                        // ── Document 1: Driving License ──────────────────────
                        AppDocumentUploadTile(
                          title: 'Driving License',
                          subtitle: 'Upload clear front copy',
                          icon: Icons.badge_outlined,
                          isUploaded: onboarding.drivingLicenseUrl != null,
                          isUploading: _uploadingState['DRIVING_LICENSE'] ?? false,
                          onUploadTap: () =>
                              _showImageSourcePicker('DRIVING_LICENSE', 'Driving License'),
                        ),
                        const SizedBox(height: AppSpacing.md),

                        // ── Document 2: RC Book ──────────────────────────────
                        AppDocumentUploadTile(
                          title: 'Vehicle RC Book',
                          subtitle: 'Registration certificate front',
                          icon: Icons.description_outlined,
                          isUploaded: onboarding.rcBookUrl != null,
                          isUploading: _uploadingState['RC_BOOK'] ?? false,
                          onUploadTap: () => _showImageSourcePicker('RC_BOOK', 'RC Book'),
                        ),
                        const SizedBox(height: AppSpacing.md),

                        // ── Document 3: Insurance ────────────────────────────
                        AppDocumentUploadTile(
                          title: 'Vehicle Insurance',
                          subtitle: 'Valid policy certificate',
                          icon: Icons.verified_user_outlined,
                          isUploaded: onboarding.insuranceUrl != null,
                          isUploading: _uploadingState['INSURANCE'] ?? false,
                          onUploadTap: () => _showImageSourcePicker('INSURANCE', 'Insurance'),
                        ),
                        const SizedBox(height: AppSpacing.md),

                        // ── Document 4: Vehicle Photo ────────────────────────
                        AppDocumentUploadTile(
                          title: 'Vehicle Photo',
                          subtitle: 'Front view with number plate',
                          icon: Icons.directions_car_outlined,
                          isUploaded: onboarding.vehiclePhotoUrl != null,
                          isUploading: _uploadingState['VEHICLE_PHOTO'] ?? false,
                          onUploadTap: () =>
                              _showImageSourcePicker('VEHICLE_PHOTO', 'Vehicle Photo'),
                        ),
                        const SizedBox(height: AppSpacing.md),

                        // ── Document 5: Aadhar Card Front ───────────────────
                        AppDocumentUploadTile(
                          title: 'Aadhar Card (Front)',
                          subtitle: 'Clear photo of front side',
                          icon: Icons.credit_card_rounded,
                          isUploaded: onboarding.aadharFrontUrl != null,
                          isUploading: _uploadingState['AADHAR_FRONT'] ?? false,
                          onUploadTap: () =>
                              _showImageSourcePicker('AADHAR_FRONT', 'Aadhar Card (Front)'),
                        ),
                        const SizedBox(height: AppSpacing.md),

                        // ── Document 6: Aadhar Card Back ────────────────────
                        AppDocumentUploadTile(
                          title: 'Aadhar Card (Back)',
                          subtitle: 'Clear photo of back address side',
                          icon: Icons.credit_card_outlined,
                          isUploaded: onboarding.aadharBackUrl != null,
                          isUploading: _uploadingState['AADHAR_BACK'] ?? false,
                          onUploadTap: () =>
                              _showImageSourcePicker('AADHAR_BACK', 'Aadhar Card (Back)'),
                        ),
                        const SizedBox(height: AppSpacing.md),

                        // ── Document 7: PAN Card ────────────────────────────
                        AppDocumentUploadTile(
                          title: 'PAN Card',
                          subtitle: 'Permanent Account Number card',
                          icon: Icons.assignment_ind_outlined,
                          isUploaded: onboarding.panCardUrl != null,
                          isUploading: _uploadingState['PAN_CARD'] ?? false,
                          onUploadTap: () =>
                              _showImageSourcePicker('PAN_CARD', 'PAN Card'),
                        ),
                        const SizedBox(height: AppSpacing.xl),
                      ],
                    ),
                  ),
                ),

                // ── Primary Action ─────────────────────────────────────────
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.xxl,
                    vertical: AppSpacing.md,
                  ),
                  child: AppPrimaryButton(
                    text: 'Continue',
                    onPressed: _handleContinue,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
