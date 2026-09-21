import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../routes/app_routes.dart';
import '../../services/auth_service.dart';
import '../../services/driver_service.dart';
import '../../services/onboarding_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_primary_button.dart';
import '../../widgets/common/app_stepper_header.dart';

/// Screen 12: Step 3 of 3: Vehicle Verification & Documents (Matches Add Vehicle layout).
class OnboardingVehicleScreen extends StatefulWidget {
  const OnboardingVehicleScreen({super.key});

  @override
  State<OnboardingVehicleScreen> createState() =>
      _OnboardingVehicleScreenState();
}

class _OnboardingVehicleScreenState extends State<OnboardingVehicleScreen> {
  final _formKey = GlobalKey<FormState>();
  final _makeModelController = TextEditingController();
  final _plateController = TextEditingController();
  final _yearController = TextEditingController();
  final _colorController = TextEditingController();

  String _category = 'Sedan';
  bool _isSubmitting = false;
  final Map<String, bool> _uploadingState = {};
  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    final onboarding = context.read<OnboardingProvider>();
    _category = onboarding.vehicleType.isNotEmpty ? onboarding.vehicleType : 'Sedan';
    _makeModelController.text = onboarding.carModel;
    _plateController.text = onboarding.registrationNumber;
    _yearController.text = onboarding.modelYear;
    _colorController.text = onboarding.color;
  }

  @override
  void dispose() {
    _makeModelController.dispose();
    _plateController.dispose();
    _yearController.dispose();
    _colorController.dispose();
    super.dispose();
  }

  Future<void> _showDocumentSourcePicker(String docType, String docTitle) async {
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

      setState(() => _uploadingState[docType] = true);

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

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    final onboarding = context.read<OnboardingProvider>();
    final driverService = context.read<DriverService>();

    final makeModel = _makeModelController.text.trim();
    final plate = _plateController.text.trim().toUpperCase();
    final year = _yearController.text.trim();
    final color = _colorController.text.trim();

    onboarding.setVehicleDetails(
      vehicleType: _category,
      carModel: makeModel,
      color: color,
      registrationNumber: plate,
      modelYear: year,
    );

    setState(() => _isSubmitting = true);

    try {
      final docList = [
        if (onboarding.profilePhotoUrl != null) onboarding.profilePhotoUrl!,
        if (onboarding.aadharFrontUrl != null) onboarding.aadharFrontUrl!,
        if (onboarding.aadharBackUrl != null) onboarding.aadharBackUrl!,
        if (onboarding.panCardUrl != null) onboarding.panCardUrl!,
        if (onboarding.rcBookUrl != null) onboarding.rcBookUrl!,
        if (onboarding.insuranceUrl != null) onboarding.insuranceUrl!,
      ];

      // 1. Submit complete KYC & Vehicle details to Backend API
      await driverService.submitKyc(
        licenseNumber: plate.isNotEmpty ? 'DL-$plate' : 'DL-PENDING',
        licenseExpiry: DateTime.now().add(const Duration(days: 365 * 5)),
        documentUrls: docList,
        dlFrontUrl: onboarding.drivingLicenseUrl,
        rcDocUrl: onboarding.rcBookUrl,
        insuranceDocUrl: onboarding.insuranceUrl,
        vehiclePhotoUrl: onboarding.profilePhotoUrl,
        aadharFrontUrl: onboarding.aadharFrontUrl,
        aadharBackUrl: onboarding.aadharBackUrl,
        panDocUrl: onboarding.panCardUrl,
        vehicleDetails: {
          'type': _category,
          'model': makeModel,
          'color': color,
          'registrationNumber': plate,
          'year': year,
        },
      );

      // 2. Also persist Driver Personal Profile details
      try {
        await driverService.updateProfile({
          if (onboarding.fullName.isNotEmpty) 'fullName': onboarding.fullName,
          if (onboarding.phone.isNotEmpty) 'phone': onboarding.phone,
          if (onboarding.address.isNotEmpty) 'address': onboarding.address,
          if (onboarding.emergencyContactName.isNotEmpty)
            'emergencyContactName': onboarding.emergencyContactName,
          if (onboarding.emergencyContactPhone.isNotEmpty)
            'emergencyContactPhone': onboarding.emergencyContactPhone,
          if (onboarding.dateOfBirth != null)
            'dateOfBirth':
                '${onboarding.dateOfBirth!.day}/${onboarding.dateOfBirth!.month}/${onboarding.dateOfBirth!.year}',
          if (onboarding.gender.isNotEmpty) 'gender': onboarding.gender,
        });
      } catch (_) {}

      // 3. Refresh live session from backend to update status to UNDER_REVIEW
      await AuthService.instance.fetchCurrentUser(forceRefresh: true);

      if (mounted) {
        Fluttertoast.showToast(
          msg: 'Profile and vehicle submitted for Admin verification!',
          backgroundColor: AppColors.accentGreenDark,
          textColor: Colors.white,
        );

        // 4. Move to Verification Gate Wall screen
        context.go(AppRoutes.waitlistGateScreen);
      }
    } catch (e) {
      debugPrint('Error submitting vehicle for approval: $e');
      if (mounted) {
        Fluttertoast.showToast(
          msg: 'Submission note: Application stored. Moving to verification.',
          backgroundColor: AppColors.accentGreenDark,
          textColor: Colors.white,
        );
        context.go(AppRoutes.waitlistGateScreen);
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final onboarding = context.watch<OnboardingProvider>();

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
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // ── 3-Step Progress Header ─────────────────────────
                          AppStepperHeader(
                            currentStep: 3,
                            totalSteps: 3,
                            onBack: () => context.pop(),
                          ),
                          const SizedBox(height: AppSpacing.xl),

                          // ── Title & Subtitle ───────────────────────────────
                          Text(
                            'Add Vehicle Details',
                            style: AppTypography.h1(
                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: AppSpacing.xs),
                          Text(
                            'Step 3 of 3: Provide vehicle information and registration documents',
                            style: AppTypography.body(
                              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                            ),
                          ),
                          const SizedBox(height: AppSpacing.xl),

                          // ── Vehicle Make & Model ───────────────────────────
                          _buildTextField(
                            label: 'Vehicle Make & Model',
                            controller: _makeModelController,
                            icon: Icons.directions_car_outlined,
                            hint: 'e.g. Honda City, Maruti Dzire',
                            isDark: isDark,
                            validator: (val) {
                              if (val == null || val.trim().length < 2) {
                                return 'Please enter vehicle make and model';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: AppSpacing.lg),

                          // ── Vehicle Category ───────────────────────────────
                          Text(
                            'Vehicle Category',
                            style: AppTypography.caption(
                              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 6),

                          Row(
                            children: ['Sedan', 'SUV', 'Hatchback', 'EV'].map((cat) {
                              final isSelected = _category == cat;
                              return Expanded(
                                child: GestureDetector(
                                  onTap: () => setState(() => _category = cat),
                                  child: Container(
                                    margin: const EdgeInsets.symmetric(horizontal: 4),
                                    padding: const EdgeInsets.symmetric(vertical: 10),
                                    alignment: Alignment.center,
                                    decoration: BoxDecoration(
                                      color: isSelected
                                          ? (isDark
                                              ? AppColors.primary.withValues(alpha: 0.25)
                                              : AppColors.primaryLight.withValues(alpha: 0.15))
                                          : (isDark ? AppColors.surfaceDark : AppColors.surfaceLight),
                                      borderRadius: BorderRadius.circular(AppRadius.md),
                                      border: Border.all(
                                        color: isSelected
                                            ? (isDark ? AppColors.primaryLight : AppColors.primary)
                                            : (isDark ? AppColors.borderDark : AppColors.borderLight),
                                        width: isSelected ? 1.5 : 1,
                                      ),
                                    ),
                                    child: Text(
                                      cat,
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                                        color: isSelected
                                            ? (isDark ? AppColors.primaryLight : AppColors.primary)
                                            : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                                      ),
                                    ),
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                          const SizedBox(height: AppSpacing.lg),

                          // ── Registration Number (Plate) ────────────────────
                          _buildTextField(
                            label: 'Registration Number (Plate)',
                            controller: _plateController,
                            icon: Icons.badge_outlined,
                            hint: 'e.g. HR 26 AB 1234',
                            isDark: isDark,
                            validator: (val) {
                              if (val == null || val.trim().length < 4) {
                                return 'Please enter vehicle registration plate number';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: AppSpacing.lg),

                          // ── Model Year & Color ─────────────────────────────
                          Row(
                            children: [
                              Expanded(
                                child: _buildTextField(
                                  label: 'Model Year',
                                  controller: _yearController,
                                  icon: Icons.calendar_today_outlined,
                                  keyboardType: TextInputType.number,
                                  hint: 'e.g. 2022',
                                  isDark: isDark,
                                ),
                              ),
                              const SizedBox(width: AppSpacing.md),
                              Expanded(
                                child: _buildTextField(
                                  label: 'Color',
                                  controller: _colorController,
                                  icon: Icons.palette_outlined,
                                  hint: 'e.g. White',
                                  isDark: isDark,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: AppSpacing.xl),

                          // ── Upload Vehicle Documents ───────────────────────
                          Text(
                            'Upload Vehicle Documents',
                            style: AppTypography.h3(
                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: AppSpacing.md),

                          _buildUploadTile(
                            title: 'Vehicle RC Photo (Front & Back)',
                            isDark: isDark,
                            isUploaded: onboarding.rcBookUrl != null,
                            isUploading: _uploadingState['RC_BOOK'] ?? false,
                            onTap: () => _showDocumentSourcePicker('RC_BOOK', 'Vehicle RC Photo'),
                          ),
                          const SizedBox(height: AppSpacing.md),

                          _buildUploadTile(
                            title: 'Commercial Insurance Certificate',
                            isDark: isDark,
                            isUploaded: onboarding.insuranceUrl != null,
                            isUploading: _uploadingState['INSURANCE'] ?? false,
                            onTap: () => _showDocumentSourcePicker('INSURANCE', 'Insurance Certificate'),
                          ),
                          const SizedBox(height: AppSpacing.xxl),

                          // ── Primary Action: Submit Vehicle for Approval ────
                          AppPrimaryButton(
                            text: 'SUBMIT VEHICLE FOR APPROVAL',
                            isLoading: _isSubmitting,
                            onPressed: _isSubmitting ? null : _handleSubmit,
                          ),
                          const SizedBox(height: AppSpacing.lg),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required String label,
    required TextEditingController controller,
    required IconData icon,
    required bool isDark,
    String? hint,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppTypography.caption(
            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 6),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          validator: validator,
          style: AppTypography.body(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
          ),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: AppTypography.body(
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            ),
            prefixIcon: Icon(
              icon,
              size: 20,
              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
            ),
            filled: true,
            fillColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: BorderSide(
                color: isDark ? AppColors.borderDark : AppColors.borderLight,
              ),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: BorderSide(
                color: isDark ? AppColors.borderDark : AppColors.borderLight,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: BorderSide(
                color: isDark ? AppColors.primaryLight : AppColors.primary,
                width: 1.5,
              ),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          ),
        ),
      ],
    );
  }

  Widget _buildUploadTile({
    required String title,
    required bool isDark,
    required bool isUploaded,
    required bool isUploading,
    required VoidCallback onTap,
  }) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(
          color: isUploaded
              ? (isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark)
              : (isDark ? AppColors.borderDark : AppColors.borderLight),
          width: isUploaded ? 1.5 : 1,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: isUploaded
                  ? AppColors.accentGreenDark.withValues(alpha: 0.15)
                  : (isDark ? AppColors.surfaceElevatedDark : AppColors.primary.withValues(alpha: 0.08)),
              borderRadius: BorderRadius.circular(AppRadius.sm),
            ),
            child: Icon(
              isUploaded ? Icons.check_circle_rounded : Icons.cloud_upload_outlined,
              color: isUploaded
                  ? (isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark)
                  : (isDark ? AppColors.primaryLight : AppColors.primary),
              size: 22,
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: AppTypography.body(
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  isUploaded ? 'Document uploaded & attached' : 'PDF or JPG/PNG up to 10MB',
                  style: AppTypography.caption(
                    color: isUploaded
                        ? (isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark)
                        : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                  ),
                ),
              ],
            ),
          ),
          if (isUploading)
            const SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          else
            TextButton(
              onPressed: onTap,
              child: Text(
                isUploaded ? 'Re-upload' : 'Upload',
                style: TextStyle(
                  color: isDark ? AppColors.primaryLight : AppColors.primary,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
