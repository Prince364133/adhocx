import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../core/utils/app_toast.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_provider.dart';
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
  final _makeModelFocusNode = FocusNode();
  final _plateController = TextEditingController();
  final _yearController = TextEditingController();
  final _colorController = TextEditingController();

  bool _showModelDropdown = false;
  String _category = 'Sedan';
  bool _isSubmitting = false;
  String? _inlineErrorMessage;
  final Map<String, bool> _uploadingState = {};
  final ImagePicker _picker = ImagePicker();

  List<Map<String, dynamic>> _vehicleOptions = [
    {
      'id': 'SEDAN',
      'label': 'Prime Sedan',
      'subtitle': '4 + 1 Passengers • Ac Commercial',
      'icon': Icons.directions_car_rounded,
      'perKmRate': 14.5,
      'baseFare': 800.0,
      'baseKm': 40,
      'driverSharePercent': 90,
      'description': 'Compact & executive 4-seater sedans (Dzire, Aura, Etios)',
    },
    {
      'id': 'SUV',
      'label': 'SUV 7 Seater',
      'subtitle': '6 + 1 Passengers • Extra Luggage',
      'icon': Icons.airport_shuttle_rounded,
      'perKmRate': 19.0,
      'baseFare': 1400.0,
      'baseKm': 40,
      'driverSharePercent': 90,
      'description': '6-7 seater commercial SUVs (Innova Crysta, Ertiga, Carens)',
    },
    {
      'id': 'HATCHBACK',
      'label': 'Compact Hatchback',
      'subtitle': '4 + 1 Passengers • City Budget',
      'icon': Icons.directions_car_rounded,
      'perKmRate': 11.0,
      'baseFare': 500.0,
      'baseKm': 20,
      'driverSharePercent': 90,
      'description': 'Budget city runabout cabs (WagonR, Tiago, Celerio)',
    },
    {
      'id': 'BUS',
      'label': 'Commercial Coach Bus',
      'subtitle': '24 - 40 Passengers • Coach Bus',
      'icon': Icons.directions_bus_rounded,
      'perKmRate': 45.0,
      'baseFare': 6500.0,
      'baseKm': 100,
      'driverSharePercent': 88,
      'description': 'High-capacity commercial coaches & mini-coaches',
    },
  ];
  bool _loadingCategories = true;

  @override
  void initState() {
    super.initState();
    final onboarding = context.read<OnboardingProvider>();
    _category = onboarding.vehicleType.isNotEmpty ? onboarding.vehicleType.toUpperCase() : 'SEDAN';
    _makeModelController.text = onboarding.carModel;
    _plateController.text = onboarding.registrationNumber;
    _yearController.text = onboarding.modelYear;
    _colorController.text = onboarding.color;

    _makeModelController.addListener(_clearErrorOnType);
    _plateController.addListener(_clearErrorOnType);
    _yearController.addListener(_clearErrorOnType);
    _colorController.addListener(_clearErrorOnType);
    _makeModelFocusNode.addListener(() {
      if (mounted && _makeModelFocusNode.hasFocus) {
        setState(() => _showModelDropdown = true);
      }
    });

    _loadDynamicCategories();
    _loadExistingData();
  }

  void _clearErrorOnType() {
    if (_inlineErrorMessage != null && mounted) {
      setState(() => _inlineErrorMessage = null);
    }
  }

  Future<void> _loadExistingData() async {
    try {
      final onboarding = context.read<OnboardingProvider>();
      final profile = await DriverService.instance.getProfile();
      if (!mounted) return;
      if (_makeModelController.text.isEmpty && profile['vehicleModel'] != null) {
        _makeModelController.text = profile['vehicleModel'].toString();
      }
      if (_plateController.text.isEmpty && profile['vehiclePlate'] != null) {
        _plateController.text = profile['vehiclePlate'].toString();
      }
      if (profile['vehicleType'] != null && onboarding.vehicleType.isEmpty) {
        setState(() {
          _category = profile['vehicleType'].toString().toUpperCase();
        });
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
      setState(() {});
    } catch (_) {}
  }

  List<Map<String, dynamic>> _getFilteredVehicleSuggestions(String query) {
    final clean = query.trim().toLowerCase();
    if (clean.isEmpty) {
      return _vehicleOptions;
    }
    return _vehicleOptions.where((v) {
      final label = (v['label'] as String? ?? '').toLowerCase();
      final id = (v['id'] as String? ?? '').toLowerCase();
      final subtitle = (v['subtitle'] as String? ?? '').toLowerCase();
      final desc = (v['description'] as String? ?? '').toLowerCase();
      return label.contains(clean) ||
          id.contains(clean) ||
          subtitle.contains(clean) ||
          desc.contains(clean);
    }).toList();
  }

  void _selectVehicleModel(Map<String, dynamic> item) {
    final label = item['label'] as String? ?? item['id'] as String? ?? 'Vehicle';
    final catId = (item['id'] as String? ?? 'SEDAN').toUpperCase();
    _makeModelController.text = label;
    _category = catId;
    _showModelDropdown = false;
    _makeModelFocusNode.unfocus();
    context.read<OnboardingProvider>().setVehicleDetails(
      vehicleType: _category,
      carModel: label,
      color: _colorController.text.trim(),
      registrationNumber: _plateController.text.trim(),
      modelYear: _yearController.text.trim(),
    );
    setState(() {});
  }

  Future<void> _loadDynamicCategories() async {
    try {
      final tiers = await DriverService.instance.getVehicleCategories(forceRefresh: true);
      final activeTiers = tiers.where((t) => t['isActive'] != false).toList();
      if (activeTiers.isNotEmpty && mounted) {
        setState(() {
          _vehicleOptions = activeTiers.map((t) {
            final vType = (t['vehicleType'] as String? ?? 'SEDAN').toUpperCase();
            final iconKey = t['iconKey'] as String? ?? '';
            IconData icon = Icons.directions_car_rounded;
            if (vType == 'BIKE' || iconKey == 'bike') {
              icon = Icons.two_wheeler_rounded;
            } else if (vType == 'BUS' || iconKey == 'bus') {
              icon = Icons.directions_bus_rounded;
            } else if (vType == 'SUV') {
              icon = Icons.airport_shuttle_rounded;
            } else if (vType == 'TEMPO_TRAVELLER' || vType == 'TATA_ACE' || vType == 'PICKUP_TRUCK' || iconKey == 'truck') {
              icon = Icons.local_shipping_rounded;
            }

            return {
              'id': vType,
              'label': t['categoryLabel'] ?? vType,
              'subtitle': t['seatingCapacity'] ?? t['description'] ?? '',
              'icon': icon,
              'perKmRate': (t['perKmRate'] as num?)?.toDouble() ?? 14.5,
              'baseFare': (t['baseFare'] as num?)?.toDouble() ?? 800.0,
              'baseKm': (t['baseKm'] as num?)?.toInt() ?? 40,
              'driverSharePercent': (t['driverSharePercent'] as num?)?.toInt() ?? 90,
              'description': t['description'] ?? '',
            };
          }).toList();

          if (!_vehicleOptions.any((v) => v['id'] == _category) && _vehicleOptions.isNotEmpty) {
            _category = _vehicleOptions.first['id'] as String;
          }
        });
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loadingCategories = false);
    }
  }

  @override
  void dispose() {
    _makeModelController.removeListener(_clearErrorOnType);
    _plateController.removeListener(_clearErrorOnType);
    _yearController.removeListener(_clearErrorOnType);
    _colorController.removeListener(_clearErrorOnType);
    _makeModelFocusNode.dispose();
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

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) {
      const msg = 'Please fill in all mandatory vehicle details correctly.';
      setState(() => _inlineErrorMessage = msg);
      AppToast.showError(msg, context: context);
      return;
    }

    final onboarding = context.read<OnboardingProvider>();
    final driverService = context.read<DriverService>();

    if (onboarding.rcFrontUrl == null && onboarding.rcBookUrl == null) {
      const msg = 'Please upload your Vehicle RC (Front) document.';
      setState(() => _inlineErrorMessage = msg);
      AppToast.showError(msg, context: context);
      return;
    }

    if (onboarding.rcBackUrl == null) {
      const msg = 'Please upload your Vehicle RC (Back) document.';
      setState(() => _inlineErrorMessage = msg);
      AppToast.showError(msg, context: context);
      return;
    }

    if (onboarding.insuranceUrl == null) {
      const msg = 'Please upload your Commercial Vehicle Insurance Certificate.';
      setState(() => _inlineErrorMessage = msg);
      AppToast.showError(msg, context: context);
      return;
    }

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

    setState(() {
      _isSubmitting = true;
      _inlineErrorMessage = null;
    });

    try {
      final rcFUrl = onboarding.rcFrontUrl ?? onboarding.rcBookUrl;
      final rcBUrl = onboarding.rcBackUrl;

      final docList = [
        if (onboarding.profilePhotoUrl != null) onboarding.profilePhotoUrl!,
        if (onboarding.drivingLicenseUrl != null) onboarding.drivingLicenseUrl!,
        if (onboarding.aadharFrontUrl != null) onboarding.aadharFrontUrl!,
        if (onboarding.aadharBackUrl != null) onboarding.aadharBackUrl!,
        if (onboarding.panCardUrl != null) onboarding.panCardUrl!,
        if (rcFUrl != null) rcFUrl,
        if (rcBUrl != null) rcBUrl,
        if (onboarding.insuranceUrl != null) onboarding.insuranceUrl!,
      ];

      // 1. Submit complete KYC & Vehicle details to Backend API
      await driverService.submitKyc(
        licenseNumber: plate.isNotEmpty ? 'DL-$plate' : 'DL-PENDING',
        licenseExpiry: DateTime.now().add(const Duration(days: 365 * 5)),
        documentUrls: docList,
        profilePhotoUrl: onboarding.profilePhotoUrl,
        dlFrontUrl: onboarding.drivingLicenseUrl,
        rcDocUrl: rcFUrl,
        rcFrontUrl: rcFUrl,
        rcBackUrl: rcBUrl,
        insuranceDocUrl: onboarding.insuranceUrl,
        vehiclePhotoUrl: onboarding.vehiclePhotoUrl,
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
      final updatedUser = await AuthService.instance.fetchCurrentUser(forceRefresh: true);
      if (updatedUser != null && mounted) {
        context.read<AuthProvider>().setUser(updatedUser);
      }

      if (mounted) {
        AppToast.showSuccess(
          'Application submitted successfully! Your documents are now under review.',
          context: context,
        );

        // 4. Move to Verification Gate Wall screen
        context.go(AppRoutes.waitlistGateScreen);
      }
    } catch (e) {
      debugPrint('Error submitting vehicle for approval: $e');
      if (mounted) {
        final cleanMsg = AppToast.cleanErrorMessage(e);
        setState(() => _inlineErrorMessage = cleanMsg);
        AppToast.showError(cleanMsg, context: context);
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
                            onBack: () {
                              if (context.canPop()) {
                                context.pop();
                              } else {
                                context.go(AppRoutes.onboardingDocumentsScreen);
                              }
                            },
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
                          const SizedBox(height: AppSpacing.lg),

                          // ── Inline Red Alert Banner ────────────────────────
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

                          // ── Vehicle Make & Model (with Suggestions Dropdown) ──
                          _buildMakeModelAutocompleteField(isDark),
                          const SizedBox(height: AppSpacing.lg),

                          // ── Vehicle Category ───────────────────────────────
                          Text(
                            'Vehicle Category *',
                            style: AppTypography.caption(
                              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 6),

                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 4),
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                              borderRadius: BorderRadius.circular(AppRadius.md),
                              border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                value: _vehicleOptions.any((v) => v['id'] == _category)
                                    ? _category
                                    : (_vehicleOptions.isNotEmpty ? _vehicleOptions.first['id'] as String : 'SEDAN'),
                                isExpanded: true,
                                itemHeight: 64.0,
                                icon: _loadingCategories
                                    ? const SizedBox(
                                        width: 18,
                                        height: 18,
                                        child: CircularProgressIndicator(strokeWidth: 2),
                                      )
                                    : Icon(Icons.keyboard_arrow_down_rounded, color: AppColors.primary),
                                dropdownColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                                borderRadius: BorderRadius.circular(AppRadius.md),
                                selectedItemBuilder: (BuildContext context) {
                                  return _vehicleOptions.map((v) {
                                    return Row(
                                      crossAxisAlignment: CrossAxisAlignment.center,
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.all(6),
                                          decoration: BoxDecoration(
                                            color: AppColors.primary.withValues(alpha: 0.1),
                                            borderRadius: BorderRadius.circular(AppRadius.sm),
                                          ),
                                          child: Icon(v['icon'] as IconData, size: 18, color: AppColors.primary),
                                        ),
                                        const SizedBox(width: 10),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            mainAxisAlignment: MainAxisAlignment.center,
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Text(
                                                v['label'] as String,
                                                style: AppTypography.body(
                                                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                              Text(
                                                v['subtitle'] as String,
                                                style: TextStyle(
                                                  fontSize: 11,
                                                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                                ),
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    );
                                  }).toList();
                                },
                                items: _vehicleOptions.map((v) {
                                  final isSelected = v['id'] == _category;
                                  return DropdownMenuItem<String>(
                                    value: v['id'] as String,
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.center,
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.all(8),
                                          decoration: BoxDecoration(
                                            color: isSelected
                                                ? AppColors.primary.withValues(alpha: 0.15)
                                                : (isDark ? AppColors.slate800 : AppColors.slate100),
                                            borderRadius: BorderRadius.circular(AppRadius.sm),
                                          ),
                                          child: Icon(
                                            v['icon'] as IconData,
                                            size: 20,
                                            color: isSelected
                                                ? AppColors.primary
                                                : (isDark ? AppColors.slate400 : AppColors.slate600),
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            mainAxisAlignment: MainAxisAlignment.center,
                                            children: [
                                              Text(
                                                v['label'] as String,
                                                style: TextStyle(
                                                  fontSize: 14,
                                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                                                  color: isSelected
                                                      ? AppColors.primary
                                                      : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                                                ),
                                              ),
                                              Text(
                                                v['subtitle'] as String,
                                                style: TextStyle(
                                                  fontSize: 12,
                                                  color: isDark ? AppColors.slate400 : AppColors.slate600,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        if (isSelected)
                                          const Icon(Icons.check_circle_rounded, color: AppColors.primary, size: 20),
                                      ],
                                    ),
                                  );
                                }).toList(),
                                onChanged: (val) {
                                  if (val != null) {
                                    setState(() {
                                      _category = val;
                                    });
                                    context.read<OnboardingProvider>().setVehicleDetails(
                                      vehicleType: val,
                                      carModel: _makeModelController.text.trim(),
                                      color: _colorController.text.trim(),
                                      registrationNumber: _plateController.text.trim(),
                                      modelYear: _yearController.text.trim(),
                                    );
                                  }
                                },
                              ),
                            ),
                          ),
                          const SizedBox(height: AppSpacing.lg),

                          // ── Registration Number (Plate) ────────────────────
                          _buildTextField(
                            label: 'Registration Number (Plate) *',
                            controller: _plateController,
                            icon: Icons.badge_outlined,
                            hint: 'e.g. HR 26 AB 1234',
                            isDark: isDark,
                            validator: (val) {
                              if (val == null || val.trim().length < 6) {
                                return 'Please enter valid registration plate number';
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
                                  label: 'Model Year *',
                                  controller: _yearController,
                                  icon: Icons.calendar_today_outlined,
                                  keyboardType: TextInputType.number,
                                  hint: 'e.g. 2022',
                                  isDark: isDark,
                                  validator: (val) {
                                    if (val == null || val.trim().length < 4) {
                                      return 'Enter 4-digit year';
                                    }
                                    return null;
                                  },
                                ),
                              ),
                              const SizedBox(width: AppSpacing.md),
                              Expanded(
                                child: _buildTextField(
                                  label: 'Color *',
                                  controller: _colorController,
                                  icon: Icons.palette_outlined,
                                  hint: 'e.g. White',
                                  isDark: isDark,
                                  validator: (val) {
                                    if (val == null || val.trim().length < 2) {
                                      return 'Enter color';
                                    }
                                    return null;
                                  },
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: AppSpacing.xl),

                          // ── Upload Vehicle Documents ───────────────────────
                          Text(
                            'Upload Vehicle Documents (Mandatory)',
                            style: AppTypography.h3(
                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: AppSpacing.md),

                          // ── Vehicle RC Front ─────────────────────────────
                          _buildUploadTile(
                            title: 'Vehicle RC Photo (Front) *',
                            isDark: isDark,
                            isUploaded: onboarding.rcFrontUrl != null || onboarding.rcBookUrl != null,
                            isUploading: _uploadingState['RC_FRONT'] ?? false,
                            onTap: () => _showDocumentSourcePicker('RC_FRONT', 'Vehicle RC Photo (Front)'),
                          ),
                          const SizedBox(height: AppSpacing.md),

                          // ── Vehicle RC Back ──────────────────────────────
                          _buildUploadTile(
                            title: 'Vehicle RC Photo (Back) *',
                            isDark: isDark,
                            isUploaded: onboarding.rcBackUrl != null,
                            isUploading: _uploadingState['RC_BACK'] ?? false,
                            onTap: () => _showDocumentSourcePicker('RC_BACK', 'Vehicle RC Photo (Back)'),
                          ),
                          const SizedBox(height: AppSpacing.md),

                          // ── Commercial Insurance Certificate ─────────────
                          _buildUploadTile(
                            title: 'Commercial Insurance Certificate *',
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

  Widget _buildMakeModelAutocompleteField(bool isDark) {
    final query = _makeModelController.text.trim();
    final suggestions = _getFilteredVehicleSuggestions(query);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Vehicle Make & Model *',
              style: AppTypography.caption(
                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                fontWeight: FontWeight.bold,
              ),
            ),
            if (_showModelDropdown)
              GestureDetector(
                onTap: () => setState(() => _showModelDropdown = false),
                child: Text(
                  'Close',
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? AppColors.primaryLight : AppColors.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 6),
        TextFormField(
          controller: _makeModelController,
          focusNode: _makeModelFocusNode,
          validator: (val) {
            if (val == null || val.trim().length < 2) {
              return 'Please enter vehicle make and model';
            }
            return null;
          },
          onChanged: (val) {
            setState(() {
              _showModelDropdown = true;
            });
          },
          style: AppTypography.body(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
          ),
          decoration: InputDecoration(
            hintText: 'e.g. Prime Sedan, SUV 7 Seater',
            hintStyle: AppTypography.body(
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            ),
            prefixIcon: Icon(
              Icons.directions_car_outlined,
              size: 20,
              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
            ),
            suffixIcon: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (_makeModelController.text.isNotEmpty)
                  IconButton(
                    icon: const Icon(Icons.clear_rounded, size: 18),
                    onPressed: () {
                      _makeModelController.clear();
                      setState(() {
                        _showModelDropdown = true;
                      });
                    },
                  ),
                IconButton(
                  icon: Icon(
                    _showModelDropdown
                        ? Icons.keyboard_arrow_up_rounded
                        : Icons.keyboard_arrow_down_rounded,
                    color: isDark ? AppColors.primaryLight : AppColors.primary,
                  ),
                  onPressed: () {
                    setState(() {
                      _showModelDropdown = !_showModelDropdown;
                    });
                  },
                ),
              ],
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
        if (_showModelDropdown) ...[
          const SizedBox(height: 6),
          Container(
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceElevatedDark : Colors.white,
              borderRadius: BorderRadius.circular(AppRadius.md),
              border: Border.all(
                color: isDark ? AppColors.borderDark : AppColors.primary.withValues(alpha: 0.3),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.08),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: isDark
                        ? AppColors.surfaceDark
                        : AppColors.primary.withValues(alpha: 0.06),
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(AppRadius.md),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          query.isEmpty
                              ? 'ADMIN REGISTERED VEHICLES (TAP TO SELECT)'
                              : 'MATCHING VEHICLES (${suggestions.length})',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.5,
                            color: isDark ? AppColors.textMutedDark : AppColors.primary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      InkWell(
                        onTap: () => setState(() => _showModelDropdown = false),
                        child: const Icon(Icons.close_rounded, size: 16),
                      ),
                    ],
                  ),
                ),
                if (suggestions.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'No matching vehicle in admin fleet.',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'You can keep typing above to enter any custom vehicle name.',
                          style: TextStyle(
                            fontSize: 11,
                            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxHeight: 220),
                    child: ListView.separated(
                      shrinkWrap: true,
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      itemCount: suggestions.length,
                      separatorBuilder: (_, __) => Divider(
                        height: 1,
                        color: isDark ? AppColors.borderDark : AppColors.borderLight,
                      ),
                      itemBuilder: (context, index) {
                        final item = suggestions[index];
                        final label = item['label'] as String? ?? item['id'] as String? ?? 'Vehicle';
                        final catId = (item['id'] as String? ?? 'SEDAN').toUpperCase();
                        final subtitle = item['subtitle'] as String? ?? '';
                        final icon = item['icon'] as IconData? ?? Icons.directions_car_rounded;
                        final isSelected = _category == catId ||
                            _makeModelController.text.trim().toLowerCase() == label.toLowerCase();

                        return InkWell(
                          onTap: () {
                            _selectVehicleModel(item);
                          },
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: BoxDecoration(
                                    color: isSelected
                                        ? AppColors.primary.withValues(alpha: 0.15)
                                        : (isDark
                                            ? AppColors.surfaceDark
                                            : AppColors.primary.withValues(alpha: 0.08)),
                                    borderRadius: BorderRadius.circular(AppRadius.sm),
                                  ),
                                  child: Icon(
                                    icon,
                                    size: 18,
                                    color: AppColors.primary,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        label,
                                        style: TextStyle(
                                          fontSize: 13,
                                          fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                                          color: isSelected
                                              ? AppColors.primary
                                              : (isDark
                                                  ? AppColors.textPrimaryDark
                                                  : AppColors.textPrimaryLight),
                                        ),
                                      ),
                                      if (subtitle.isNotEmpty)
                                        Text(
                                          subtitle,
                                          style: TextStyle(
                                            fontSize: 11,
                                            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: isDark
                                        ? AppColors.surfaceDark
                                        : AppColors.slate100,
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(
                                      color: isDark ? AppColors.borderDark : AppColors.borderLight,
                                    ),
                                  ),
                                  child: Text(
                                    catId,
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w600,
                                      color: isDark ? AppColors.textMutedDark : AppColors.slate700,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
              ],
            ),
          ),
        ],
      ],
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
