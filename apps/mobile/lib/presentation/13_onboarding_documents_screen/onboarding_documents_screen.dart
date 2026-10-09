import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../core/utils/app_toast.dart';
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

/// Screen 13: Step 2 of 3: Verify Driver Identity (Profile Photo, Aadhaar Front & Back, PAN Card).
class OnboardingDocumentsScreen extends StatefulWidget {
  const OnboardingDocumentsScreen({super.key});

  @override
  State<OnboardingDocumentsScreen> createState() =>
      _OnboardingDocumentsScreenState();
}

class _OnboardingDocumentsScreenState extends State<OnboardingDocumentsScreen> {
  final Map<String, bool> _uploadingState = {};
  final ImagePicker _picker = ImagePicker();
  String? _inlineErrorMessage;

  @override
  void initState() {
    super.initState();
    _loadExistingDocuments();
  }

  Future<void> _loadExistingDocuments() async {
    try {
      final onboarding = context.read<OnboardingProvider>();
      final profile = await DriverService.instance.getProfile();
      if (!mounted || profile is! Map) return;

      final vehiclePhoto = profile['vehiclePhotoUrl']?.toString();
      final profilePhoto = profile['profilePhotoUrl']?.toString();
      final isValidProfilePhoto = profilePhoto != null &&
          profilePhoto.trim().isNotEmpty &&
          profilePhoto != 'null' &&
          profilePhoto != 'undefined' &&
          profilePhoto != vehiclePhoto;

      if (isValidProfilePhoto &&
          (onboarding.profilePhotoUrl == null || onboarding.profilePhotoUrl!.isEmpty)) {
        onboarding.setDocumentUrl('PROFILE_PHOTO', profilePhoto);
      }
      if (profile['dlFrontUrl'] != null && onboarding.drivingLicenseUrl == null) {
        onboarding.setDocumentUrl('DRIVING_LICENSE', profile['dlFrontUrl'].toString());
      }
      if (profile['aadharFrontUrl'] != null && onboarding.aadharFrontUrl == null) {
        onboarding.setDocumentUrl('AADHAR_FRONT', profile['aadharFrontUrl'].toString());
      }
      if (profile['aadharBackUrl'] != null && onboarding.aadharBackUrl == null) {
        onboarding.setDocumentUrl('AADHAR_BACK', profile['aadharBackUrl'].toString());
      }
      if (profile['panDocUrl'] != null && onboarding.panCardUrl == null) {
        onboarding.setDocumentUrl('PAN_CARD', profile['panDocUrl'].toString());
      }
      if (profile['rcFrontUrl'] != null && onboarding.rcFrontUrl == null) {
        onboarding.setDocumentUrl('RC_FRONT', profile['rcFrontUrl'].toString());
      }
      if (profile['rcBackUrl'] != null && onboarding.rcBackUrl == null) {
        onboarding.setDocumentUrl('RC_BACK', profile['rcBackUrl'].toString());
      }
      if (profile['rcDocUrl'] != null && onboarding.rcFrontUrl == null) {
        onboarding.setDocumentUrl('RC_FRONT', profile['rcDocUrl'].toString());
      }
      if (profile['insuranceDocUrl'] != null && onboarding.insuranceUrl == null) {
        onboarding.setDocumentUrl('INSURANCE', profile['insuranceDocUrl'].toString());
      }

      final rawDocs = profile['documents'] ?? profile['kycDocuments'];
      if (rawDocs is List) {
        for (final doc in rawDocs) {
          if (doc is Map && doc['documentType'] != null && doc['fileUrl'] != null) {
            final docType = doc['documentType'].toString();
            final fileUrl = doc['fileUrl'].toString();
            if (docType == 'PROFILE_PHOTO' && fileUrl == vehiclePhoto) {
              continue;
            }
            onboarding.setDocumentUrl(docType, fileUrl);
          }
        }
      } else if (rawDocs is Map) {
        for (final entry in rawDocs.values) {
          if (entry is Map && entry['documentType'] != null && entry['fileUrl'] != null) {
            final docType = entry['documentType'].toString();
            final fileUrl = entry['fileUrl'].toString();
            if (docType == 'PROFILE_PHOTO' && fileUrl == vehiclePhoto) {
              continue;
            }
            onboarding.setDocumentUrl(docType, fileUrl);
          }
        }
        if (rawDocs['profilePhotoUrl'] != null &&
            (onboarding.profilePhotoUrl == null || onboarding.profilePhotoUrl!.isEmpty)) {
          final rawPhoto = rawDocs['profilePhotoUrl'].toString();
          if (rawPhoto.trim().isNotEmpty &&
              rawPhoto != 'null' &&
              rawPhoto != 'undefined' &&
              rawPhoto != vehiclePhoto) {
            onboarding.setDocumentUrl('PROFILE_PHOTO', rawPhoto);
          }
        }
      }

      setState(() {});
    } catch (_) {}
  }

  Future<void> _showImageSourcePicker(String docType, String docTitle) async {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showModalBottomSheet(
      context: context,
      useRootNavigator: true,
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
    final driverService = context.read<DriverService>();
    final onboarding = context.read<OnboardingProvider>();

    try {
      final XFile? pickedFile = await _picker.pickImage(
        source: source,
        imageQuality: 85,
        maxWidth: 1920,
        maxHeight: 1920,
      );

      if (pickedFile == null) return;

      setState(() {
        _uploadingState[docType] = true;
        _inlineErrorMessage = null;
      });

      final bytes = await pickedFile.readAsBytes();
      final ext = pickedFile.name.split('.').last.toLowerCase();
      final mimeType = (ext == 'png') ? 'image/png' : 'image/jpeg';
      final filename = '${docType.toLowerCase()}_${DateTime.now().millisecondsSinceEpoch}.$ext';

      final res = await driverService.uploadKycDocument(
        documentType: docType,
        fileBytes: bytes,
        filename: filename,
        mimeType: mimeType,
      );

      final uploadedUrl = res['url'];
      if (uploadedUrl == null || uploadedUrl.toString().isEmpty) {
        throw Exception('Upload succeeded but no URL returned from server');
      }

      onboarding.setDocumentUrl(docType, uploadedUrl);

      if (mounted) {
        AppToast.showSuccess('$docTitle uploaded successfully', context: context);
      }
    } catch (e) {
      if (mounted) {
        final cleanMsg = AppToast.cleanErrorMessage(e);
        setState(() => _inlineErrorMessage = 'Failed to upload $docTitle: $cleanMsg');
        AppToast.showError('Failed to upload $docTitle: $cleanMsg', context: context);
      }
    } finally {
      if (mounted) setState(() => _uploadingState[docType] = false);
    }
  }

  void _handleContinue() {
    final onboarding = context.read<OnboardingProvider>();

    if (onboarding.profilePhotoUrl == null ||
        onboarding.profilePhotoUrl!.trim().isEmpty ||
        onboarding.profilePhotoUrl == 'null' ||
        onboarding.profilePhotoUrl == 'undefined') {
      const msg = 'Please upload your Driver Profile Photo before proceeding';
      setState(() => _inlineErrorMessage = msg);
      AppToast.showError(msg, context: context);
      return;
    }

    if (onboarding.drivingLicenseUrl == null) {
      const msg = 'Please upload your Driving License before proceeding';
      setState(() => _inlineErrorMessage = msg);
      AppToast.showError(msg, context: context);
      return;
    }

    if (onboarding.aadharFrontUrl == null) {
      const msg = 'Please upload Aadhaar Card (Front) before proceeding';
      setState(() => _inlineErrorMessage = msg);
      AppToast.showError(msg, context: context);
      return;
    }

    if (onboarding.aadharBackUrl == null) {
      const msg = 'Please upload Aadhaar Card (Back) before proceeding';
      setState(() => _inlineErrorMessage = msg);
      AppToast.showError(msg, context: context);
      return;
    }

    if (onboarding.panCardUrl == null) {
      const msg = 'Please upload PAN Card (Front) before proceeding';
      setState(() => _inlineErrorMessage = msg);
      AppToast.showError(msg, context: context);
      return;
    }

    setState(() => _inlineErrorMessage = null);
    // Step 3 of 3: Vehicle Verification (Add Vehicle)
    context.push(AppRoutes.onboardingVehicleScreen);
  }

  @override
  Widget build(BuildContext context) {
    final onboarding = context.watch<OnboardingProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final bool hasProfilePhoto = onboarding.profilePhotoUrl != null &&
        onboarding.profilePhotoUrl!.trim().isNotEmpty &&
        onboarding.profilePhotoUrl != 'null' &&
        onboarding.profilePhotoUrl != 'undefined';

    final int uploadedCount = (hasProfilePhoto ? 1 : 0) +
        (onboarding.drivingLicenseUrl != null ? 1 : 0) +
        (onboarding.aadharFrontUrl != null ? 1 : 0) +
        (onboarding.aadharBackUrl != null ? 1 : 0) +
        (onboarding.panCardUrl != null ? 1 : 0);

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
                        // ── 3-Step Progress Header ───────────────────────────
                        AppStepperHeader(
                          currentStep: 2,
                          totalSteps: 3,
                          onBack: () {
                            if (context.canPop()) {
                              context.pop();
                            } else {
                              context.go(AppRoutes.waitlistGateScreen);
                            }
                          },
                        ),
                        const SizedBox(height: AppSpacing.xl),

                        // ── Title & Subtitle ─────────────────────────────────
                        Text(
                          'Verify Identity',
                          style: AppTypography.h1(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          'Step 2 of 3: Upload your photo and mandatory government documents ($uploadedCount/5 uploaded)',
                          style: AppTypography.body(
                            color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.lg),

                        // ── Inline Red Alert Banner ──────────────────────────
                        if (_inlineErrorMessage != null) ...[
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            decoration: BoxDecoration(
                              color: AppColors.error.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(AppRadius.md),
                              border: Border.all(color: AppColors.error.withValues(alpha: 0.4)),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 20),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    _inlineErrorMessage!,
                                    style: AppTypography.body(
                                      color: isDark ? AppColors.errorContainer : AppColors.error,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: AppSpacing.md),
                        ],

                        // ── Document 1: Profile Photo ────────────────────────
                        AppDocumentUploadTile(
                          title: 'Driver Profile Photo *',
                          subtitle: 'Clear front-facing selfie or portrait',
                          icon: Icons.account_circle_outlined,
                          isUploaded: hasProfilePhoto,
                          isUploading: _uploadingState['PROFILE_PHOTO'] ?? false,
                          onUploadTap: () =>
                              _showImageSourcePicker('PROFILE_PHOTO', 'Driver Profile Photo'),
                        ),
                        const SizedBox(height: AppSpacing.md),

                        // ── Document 2: Driving License ──────────────────────
                        AppDocumentUploadTile(
                          title: 'Driving License *',
                          subtitle: 'Front side of commercial / transport driving license',
                          icon: Icons.badge_outlined,
                          isUploaded: onboarding.drivingLicenseUrl != null,
                          isUploading: _uploadingState['DRIVING_LICENSE'] ?? false,
                          onUploadTap: () =>
                              _showImageSourcePicker('DRIVING_LICENSE', 'Driving License'),
                        ),
                        const SizedBox(height: AppSpacing.md),

                        // ── Document 3: Aadhar Card Front ───────────────────
                        AppDocumentUploadTile(
                          title: 'Aadhaar Card (Front) *',
                          subtitle: 'Front side with photo and Aadhaar number',
                          icon: Icons.credit_card_rounded,
                          isUploaded: onboarding.aadharFrontUrl != null,
                          isUploading: _uploadingState['AADHAR_FRONT'] ?? false,
                          onUploadTap: () =>
                              _showImageSourcePicker('AADHAR_FRONT', 'Aadhaar Card (Front)'),
                        ),
                        const SizedBox(height: AppSpacing.md),

                        // ── Document 4: Aadhar Card Back ────────────────────
                        AppDocumentUploadTile(
                          title: 'Aadhaar Card (Back) *',
                          subtitle: 'Back side showing residential address',
                          icon: Icons.credit_card_outlined,
                          isUploaded: onboarding.aadharBackUrl != null,
                          isUploading: _uploadingState['AADHAR_BACK'] ?? false,
                          onUploadTap: () =>
                              _showImageSourcePicker('AADHAR_BACK', 'Aadhaar Card (Back)'),
                        ),
                        const SizedBox(height: AppSpacing.md),

                        // ── Document 5: PAN Card Front ──────────────────────
                        AppDocumentUploadTile(
                          title: 'PAN Card (Front) *',
                          subtitle: 'Front side with PAN number and signature',
                          icon: Icons.assignment_ind_outlined,
                          isUploaded: onboarding.panCardUrl != null,
                          isUploading: _uploadingState['PAN_CARD'] ?? false,
                          onUploadTap: () =>
                              _showImageSourcePicker('PAN_CARD', 'PAN Card (Front)'),
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
                    text: 'CONTINUE TO VEHICLE DETAILS',
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
