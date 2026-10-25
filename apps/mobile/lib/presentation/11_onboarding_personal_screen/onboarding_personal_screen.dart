import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/networking/api_client.dart';
import '../../core/utils/app_logger.dart';
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
import '../../widgets/common/app_text_field.dart';

/// Screen 11: Personal & Organization Details for Driver & Corporate Vendor Onboarding.
class OnboardingPersonalScreen extends StatefulWidget {
  const OnboardingPersonalScreen({super.key});

  @override
  State<OnboardingPersonalScreen> createState() =>
      _OnboardingPersonalScreenState();
}

class _OnboardingPersonalScreenState extends State<OnboardingPersonalScreen> {
  final _formKey = GlobalKey<FormState>();

  // Driver & General fields
  late final TextEditingController _nameController;
  late final TextEditingController _phoneController;
  final _addressController = TextEditingController();
  final _emergencyNameController = TextEditingController();
  final _emergencyPhoneController = TextEditingController();

  // Vendor / Corporate fields
  late final TextEditingController _companyNameController;
  late final TextEditingController _brandNameController;
  late final TextEditingController _panController;
  late final TextEditingController _gstController;
  late final TextEditingController _spocNameController;
  late final TextEditingController _spocDesignationController;
  late final TextEditingController _spocPhoneController;
  late final TextEditingController _billingEmailController;
  final TextEditingController _altPhoneController = TextEditingController();
  late final TextEditingController _cityController;
  late final TextEditingController _stateController;
  late final TextEditingController _pincodeController;

  String _selectedBusinessType = 'IT & Technology Services';
  String _selectedMonthlyTrips = '50 - 200 trips / month';
  DateTime? _selectedDate;
  String _selectedGender = 'Male';
  bool _isSaving = false;
  bool _isManualAddress = false;
  String? _inlineErrorMessage;

  static const List<String> _businessEntityTypes = [
    'IT & Technology Services',
    'BPO / Call Center & KPO',
    'Consulting & Professional Services',
    'Manufacturing & Engineering',
    'Healthcare & Pharmaceuticals',
    'Banking, Financial Services & Insurance',
    'Logistics & Supply Chain',
    'Travel & Corporate Hospitality',
    'Other Corporate Enterprise',
  ];

  static const List<String> _monthlyTripOptions = [
    '10 - 50 trips / month',
    '50 - 200 trips / month',
    '200 - 500 trips / month',
    '500+ trips / month (Enterprise Fleet)',
  ];

  @override
  void initState() {
    super.initState();
    final authUser = AuthService.instance.currentUser;
    final onboarding = context.read<OnboardingProvider>();

    final initialName = onboarding.fullName.isNotEmpty
        ? onboarding.fullName
        : ((authUser?.fullName != null &&
                authUser!.fullName!.isNotEmpty &&
                authUser.fullName != 'Driver' &&
                authUser.fullName != 'Driver Partner' &&
                authUser.fullName != 'Google User' &&
                authUser.fullName != 'Google Partner' &&
                authUser.fullName != 'User')
            ? authUser.fullName!
            : '');

    final initialPhone = onboarding.phoneNumber.isNotEmpty
        ? onboarding.phoneNumber
        : (authUser?.phone ?? '');

    final initialEmail = onboarding.email.isNotEmpty
        ? onboarding.email
        : (authUser?.email ?? '');

    _nameController = TextEditingController(text: initialName);
    _phoneController = TextEditingController(text: initialPhone);
    _addressController.text = onboarding.address;
    _emergencyNameController.text = onboarding.emergencyContactName;
    _emergencyPhoneController.text = onboarding.emergencyContactPhone;
    _selectedGender = onboarding.gender.isNotEmpty ? onboarding.gender : 'Male';
    _selectedDate = onboarding.dateOfBirth;

    // Vendor specific initialization
    _companyNameController = TextEditingController(
      text: onboarding.companyName.isNotEmpty
          ? onboarding.companyName
          : (authUser?.vendorProfile?['organizationName'] ?? ''),
    );
    _brandNameController = TextEditingController(text: onboarding.brandName);
    _selectedBusinessType = onboarding.businessType.isNotEmpty &&
            _businessEntityTypes.contains(onboarding.businessType)
        ? onboarding.businessType
        : 'IT & Technology Services';
    _panController = TextEditingController(text: onboarding.panNumber);
    _gstController = TextEditingController(
      text: onboarding.gstNumber.isNotEmpty
          ? onboarding.gstNumber
          : (authUser?.vendorProfile?['gstNumber'] ?? ''),
    );
    _selectedMonthlyTrips = onboarding.monthlyTrips.isNotEmpty &&
            _monthlyTripOptions.contains(onboarding.monthlyTrips)
        ? onboarding.monthlyTrips
        : '50 - 200 trips / month';
    _spocNameController = TextEditingController(text: initialName);
    _spocDesignationController = TextEditingController(
      text: onboarding.spocDesignation.isNotEmpty
          ? onboarding.spocDesignation
          : 'Corporate Lead',
    );
    _spocPhoneController = TextEditingController(text: initialPhone);
    _billingEmailController = TextEditingController(
      text: onboarding.billingEmail.isNotEmpty
          ? onboarding.billingEmail
          : initialEmail,
    );
    _altPhoneController.text =
        (authUser?.vendorProfile?['alternatePhone'] ?? '').toString();
    if (_emergencyPhoneController.text.isEmpty) {
      _emergencyPhoneController.text =
          (authUser?.vendorProfile?['emergencyContactPhone'] ?? '').toString();
    }
    _cityController = TextEditingController(text: onboarding.city);
    _stateController = TextEditingController(text: onboarding.stateName);
    _pincodeController = TextEditingController(text: onboarding.pincode);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    _emergencyNameController.dispose();
    _emergencyPhoneController.dispose();
    _companyNameController.dispose();
    _brandNameController.dispose();
    _panController.dispose();
    _gstController.dispose();
    _spocNameController.dispose();
    _spocDesignationController.dispose();
    _spocPhoneController.dispose();
    _billingEmailController.dispose();
    _altPhoneController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _pincodeController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? DateTime(1995, 1, 1),
      firstDate: DateTime(1940),
      lastDate: DateTime.now().subtract(const Duration(days: 365 * 18)),
      helpText: 'Select Date of Birth (18+ only)',
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: isDark
                ? ColorScheme.dark(
                    primary: AppColors.primaryLight,
                    onPrimary: Colors.black,
                    surface: AppColors.surfaceDark,
                    onSurface: AppColors.textPrimaryDark,
                  )
                : const ColorScheme.light(
                    primary: AppColors.primary,
                    onPrimary: Colors.white,
                    onSurface: AppColors.textPrimaryLight,
                  ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  Future<void> _pickLocation() async {
    final result = await context.push<Map<String, dynamic>>(
      AppRoutes.universalLocationSearchScreen,
      extra: {
        'title': 'Select Office Location',
        'initialAddress': _addressController.text.trim(),
      },
    );
    if (result != null && mounted) {
      final address = (result['fullAddress'] as String?) ??
          (result['address'] as String?) ??
          (result['title'] as String?) ??
          '';
      if (address.isNotEmpty) {
        setState(() {
          _addressController.text = address;
        });
      }
    }
  }

  Future<void> _handleContinue() async {
    final onboarding = context.read<OnboardingProvider>();

    if (onboarding.isUser) {
      // ── Vendor / Corporate Booker Submission ──
      if (!_formKey.currentState!.validate()) {
        const msg = 'Please fill in all mandatory organization details.';
        setState(() => _inlineErrorMessage = msg);
        AppToast.showError(msg, context: context);
        return;
      }

      final companyName = _companyNameController.text.trim();
      final spocName = _spocNameController.text.trim();
      final spocPhone = _spocPhoneController.text.trim();
      final billingEmail = _billingEmailController.text.trim();
      final altPhone = _altPhoneController.text.trim();
      final emergencyPhone = _emergencyPhoneController.text.trim();
      final location = _addressController.text.trim();

      setState(() {
        _isSaving = true;
        _inlineErrorMessage = null;
      });

      try {
        onboarding.setVendorDetails(
          companyName: companyName,
          businessType: _selectedBusinessType,
          address: location,
          city: location,
          billingAddress: location,
          billingEmail: billingEmail,
          spocName: spocName,
          phone: spocPhone,
          monthlyTrips: _selectedMonthlyTrips,
        );

        // Immediately sync name and phone to session and core User
        AuthService.instance.updateCurrentUser(
          fullName: spocName,
          phone: spocPhone.isNotEmpty ? spocPhone : null,
          email: billingEmail.isNotEmpty ? billingEmail : null,
        );
        try {
          await AuthService.instance.updateUserProfile(
            fullName: spocName,
            phone: spocPhone.isNotEmpty ? spocPhone : null,
          );
        } catch (_) {}

        await ApiClient.instance.post(
          '/vendors/profile',
          body: {
            'organizationName': companyName,
            'fullName': spocName,
            if (spocPhone.isNotEmpty) 'phone': spocPhone,
            if (billingEmail.isNotEmpty) 'email': billingEmail,
            if (billingEmail.isNotEmpty) 'billingEmail': billingEmail,
            if (altPhone.isNotEmpty) 'alternatePhone': altPhone,
            if (emergencyPhone.isNotEmpty) 'emergencyContactPhone': emergencyPhone,
            'address': location.isNotEmpty ? location : 'India',
            'city': location,
            'businessType': _selectedBusinessType,
            'monthlyTrips': _selectedMonthlyTrips,
            if (_brandNameController.text.trim().isNotEmpty) 'brandName': _brandNameController.text.trim(),
            if (_gstController.text.trim().isNotEmpty) 'gstNumber': _gstController.text.trim(),
            if (_panController.text.trim().isNotEmpty) 'panNumber': _panController.text.trim(),
          },
        );

        final updatedUser =
            await AuthService.instance.fetchCurrentUser(forceRefresh: true);
        if (updatedUser != null && mounted) {
          context.read<AuthProvider>().setUser(updatedUser);
        }

        if (mounted) {
          AppToast.showSuccess(
            'Organization Profile submitted for review!',
            context: context,
          );
          context.go(AppRoutes.welcomeSuccessScreen);
        }
      } catch (e) {
        AppLogger.error('Failed to create vendor profile: $e');
        if (mounted) {
          final cleanMsg = AppToast.cleanErrorMessage(e);
          setState(() => _inlineErrorMessage = 'Submission failed: $cleanMsg');
          AppToast.showError('Submission failed: $cleanMsg', context: context);
        }
      } finally {
        if (mounted) setState(() => _isSaving = false);
      }
    } else {
      // ── Driver Submission ──
      if (!_formKey.currentState!.validate()) {
        const msg = 'Please fill in all mandatory personal details correctly.';
        setState(() => _inlineErrorMessage = msg);
        AppToast.showError(msg, context: context);
        return;
      }

      if (_selectedDate == null) {
        const msg = 'Please select your Date of Birth before continuing.';
        setState(() => _inlineErrorMessage = msg);
        AppToast.showError(msg, context: context);
        return;
      }

      final age = DateTime.now().difference(_selectedDate!).inDays ~/ 365;
      if (age < 18) {
        const msg = 'Drivers must be at least 18 years old to onboard.';
        setState(() => _inlineErrorMessage = msg);
        AppToast.showError(msg, context: context);
        return;
      }

      final enteredName = _nameController.text.trim();
      final enteredPhone = _phoneController.text.trim();
      final enteredAddress = _addressController.text.trim();
      final enteredEmergencyName = _emergencyNameController.text.trim();
      final enteredEmergencyPhone = _emergencyPhoneController.text.trim();

      if (enteredAddress.isEmpty) {
        const msg = 'Please enter or select your residential address/location.';
        setState(() => _inlineErrorMessage = msg);
        AppToast.showError(msg, context: context);
        return;
      }

      setState(() => _inlineErrorMessage = null);

      onboarding.setPersonalDetails(
        fullName: enteredName,
        phone: enteredPhone,
        address: enteredAddress,
        emergencyContactName: enteredEmergencyName,
        emergencyContactPhone: enteredEmergencyPhone,
        dateOfBirth: _selectedDate,
        gender: _selectedGender,
      );

      // Immediately sync entered name to session
      AuthService.instance.updateCurrentUser(
        fullName: enteredName,
        phone: enteredPhone.isNotEmpty ? enteredPhone : null,
      );
      try {
        await AuthService.instance.updateUserProfile(
          fullName: enteredName,
          phone: enteredPhone.isNotEmpty ? enteredPhone : null,
        );
      } catch (_) {}

      try {
        await DriverService.instance.updateProfile({
          if (enteredName.isNotEmpty) 'fullName': enteredName,
          if (enteredPhone.isNotEmpty) 'phone': enteredPhone,
          if (enteredAddress.isNotEmpty) 'address': enteredAddress,
          if (enteredEmergencyName.isNotEmpty)
            'emergencyContactName': enteredEmergencyName,
          if (enteredEmergencyPhone.isNotEmpty)
            'emergencyContactPhone': enteredEmergencyPhone,
          if (_selectedDate != null)
            'dateOfBirth':
                '${_selectedDate!.day}/${_selectedDate!.month}/${_selectedDate!.year}',
          if (_selectedGender.isNotEmpty) 'gender': _selectedGender,
        });
      } catch (e) {
        AppLogger.warn('Driver profile update on personal step notice: $e');
      }

      if (mounted) {
        context.push(AppRoutes.onboardingDocumentsScreen);
      }
    }
  }

  static const _months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  String _formatDate(DateTime dt) {
    return '${dt.day.toString().padLeft(2, '0')} ${_months[dt.month - 1]} ${dt.year}';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final onboarding = context.watch<OnboardingProvider>();
    final isDriver = onboarding.isDriver;

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
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // ── Header Bar ──────────────────────────────────────────
                    if (isDriver)
                      AppStepperHeader(
                        currentStep: 1,
                        totalSteps: 3,
                        onBack: () {
                          if (context.canPop()) {
                            context.pop();
                          } else {
                            context.go(AppRoutes.signInScreen);
                          }
                        },
                      )
                    else
                      Row(
                        children: [
                          IconButton(
                            onPressed: () {
                              if (context.canPop()) {
                                context.pop();
                              } else {
                                context.go(AppRoutes.signInScreen);
                              }
                            },
                            icon: Icon(
                              Icons.arrow_back,
                              color: isDark
                                  ? AppColors.textPrimaryDark
                                  : AppColors.textPrimaryLight,
                            ),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                          ),
                          const Spacer(),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: isDark
                                  ? AppColors.primary.withValues(alpha: 0.25)
                                  : AppColors.primarySubtle,
                              borderRadius:
                                  BorderRadius.circular(AppRadius.full),
                            ),
                            child: Text(
                              'Corporate Fleet Booker',
                              style: AppTypography.micro(
                                color: isDark
                                    ? AppColors.primaryLight
                                    : AppColors.primary,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                    const SizedBox(height: AppSpacing.xl),

                    // ── Title & Subtitle ─────────────────────────────────────
                    Text(
                      isDriver
                          ? 'Basic Details'
                          : 'Organization Information',
                      style: AppTypography.h1(
                        color: isDark
                            ? AppColors.textPrimaryDark
                            : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      isDriver
                          ? 'Step 1 of 3: Provide your personal and contact details'
                          : 'Provide your contact and organization details to activate corporate booking',
                      style: AppTypography.body(
                        color: isDark
                            ? AppColors.textSecondaryDark
                            : AppColors.textSecondaryLight,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    // ── Inline Red Alert Banner ──────────────────────────────
                    if (_inlineErrorMessage != null) ...[
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: AppColors.error.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(
                              color: AppColors.error.withValues(alpha: 0.4)),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.error_outline_rounded,
                                color: AppColors.error, size: 20),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                _inlineErrorMessage!,
                                style: AppTypography.body(
                                  color: isDark
                                      ? AppColors.errorContainer
                                      : AppColors.error,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                    ],

                    if (isDriver) ...[
                      // ─────────────────── DRIVER FORM ───────────────────
                      AppTextField(
                        controller: _nameController,
                        label: 'Full Legal Name *',
                        hintText: 'Enter legal name as per Aadhaar/PAN',
                        prefixIcon: const Icon(Icons.person_outline, size: 20),
                        validator: (val) {
                          if (val == null || val.trim().length < 3) {
                            return 'Please enter your legal name (min 3 characters)';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: AppSpacing.lg),

                      AppTextField(
                        controller: _phoneController,
                        label: 'Mobile Phone Number *',
                        hintText: '10-digit mobile number',
                        prefixIcon: const Icon(Icons.phone_outlined, size: 20),
                        keyboardType: TextInputType.phone,
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return 'Please enter your mobile phone number';
                          }
                          final digits = val.replaceAll(RegExp(r'\D'), '');
                          if (digits.length < 10) {
                            return 'Please enter a valid 10-digit mobile number';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: AppSpacing.lg),

                      // Gender selector
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Gender *',
                            style: AppTypography.caption(
                              color: isDark
                                  ? AppColors.textMutedDark
                                  : AppColors.textMutedLight,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: ['Male', 'Female', 'Other'].map((gender) {
                              final isSelected = _selectedGender == gender;
                              return Expanded(
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 4),
                                  child: InkWell(
                                    onTap: () => setState(
                                        () => _selectedGender = gender),
                                    borderRadius:
                                        BorderRadius.circular(AppRadius.md),
                                    child: Container(
                                      height: 44,
                                      alignment: Alignment.center,
                                      decoration: BoxDecoration(
                                        color: isSelected
                                            ? (isDark
                                                ? AppColors.primaryLight
                                                    .withValues(alpha: 0.2)
                                                : AppColors.primary
                                                    .withValues(alpha: 0.12))
                                            : (isDark
                                                ? AppColors.surfaceDark
                                                : AppColors.surfaceLight),
                                        borderRadius: BorderRadius.circular(
                                            AppRadius.md),
                                        border: Border.all(
                                          color: isSelected
                                              ? (isDark
                                                  ? AppColors.primaryLight
                                                  : AppColors.primary)
                                              : (isDark
                                                  ? AppColors.borderDark
                                                  : AppColors.borderLight),
                                          width: isSelected ? 1.5 : 1,
                                        ),
                                      ),
                                      child: Text(
                                        gender,
                                        style: TextStyle(
                                          color: isSelected
                                              ? (isDark
                                                  ? AppColors.primaryLight
                                                  : AppColors.primary)
                                              : (isDark
                                                  ? AppColors.textPrimaryDark
                                                  : AppColors
                                                      .textPrimaryLight),
                                          fontWeight: isSelected
                                              ? FontWeight.bold
                                              : FontWeight.w500,
                                          fontSize: 14,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.lg),

                      // Date of Birth
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Date of Birth (18+ years required) *',
                            style: AppTypography.caption(
                              color: isDark
                                  ? AppColors.textMutedDark
                                  : AppColors.textMutedLight,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 6),
                          InkWell(
                            onTap: _pickDate,
                            borderRadius: BorderRadius.circular(AppRadius.md),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: AppSpacing.lg,
                                vertical: 14,
                              ),
                              decoration: BoxDecoration(
                                color: isDark
                                    ? AppColors.surfaceDark
                                    : AppColors.surfaceLight,
                                borderRadius:
                                    BorderRadius.circular(AppRadius.md),
                                border: Border.all(
                                    color: isDark
                                        ? AppColors.borderDark
                                        : AppColors.borderLight),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    Icons.calendar_today_outlined,
                                    size: 18,
                                    color: isDark
                                        ? AppColors.textSecondaryDark
                                        : AppColors.textSecondaryLight,
                                  ),
                                  const SizedBox(width: AppSpacing.md),
                                  Expanded(
                                    child: Text(
                                      _selectedDate != null
                                          ? _formatDate(_selectedDate!)
                                          : 'Select Date of Birth (DD MMM YYYY)',
                                      overflow: TextOverflow.ellipsis,
                                      style: AppTypography.body(
                                        color: _selectedDate != null
                                            ? (isDark
                                                ? AppColors.textPrimaryDark
                                                : AppColors.textPrimaryLight)
                                            : (isDark
                                                ? AppColors.textMutedDark
                                                : AppColors.textMutedLight),
                                      ),
                                    ),
                                  ),
                                  Icon(
                                    Icons.arrow_drop_down,
                                    color: isDark
                                        ? AppColors.textSecondaryDark
                                        : AppColors.textSecondaryLight,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.lg),

                      // Residential Address
                      AppTextField(
                        controller: _addressController,
                        label: 'Residential Address / Location *',
                        hintText: 'Enter your residential address/city',
                        prefixIcon:
                            const Icon(Icons.location_on_outlined, size: 20),
                        validator: (val) {
                          if (val == null || val.trim().length < 3) {
                            return 'Please enter residential address';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: AppSpacing.lg),

                      // Emergency Contact
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: BoxDecoration(
                          color: isDark
                              ? AppColors.surfaceDark
                              : AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(
                              color: isDark
                                  ? AppColors.borderDark
                                  : AppColors.borderLight),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: BoxDecoration(
                                    color: AppColors.error
                                        .withValues(alpha: 0.12),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(
                                      Icons.contact_phone_outlined,
                                      size: 16,
                                      color: AppColors.error),
                                ),
                                const SizedBox(width: AppSpacing.sm),
                                Text(
                                  'Emergency Contact',
                                  style: AppTypography.body(
                                    color: isDark
                                        ? AppColors.textPrimaryDark
                                        : AppColors.textPrimaryLight,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: AppSpacing.sm),
                            AppTextField(
                              controller: _emergencyNameController,
                              label: 'Contact Name & Relation',
                              hintText: 'e.g. Priya Sharma (Wife)',
                              prefixIcon:
                                  const Icon(Icons.person_outline, size: 18),
                            ),
                            const SizedBox(height: AppSpacing.md),
                            AppTextField(
                              controller: _emergencyPhoneController,
                              label: 'Emergency Phone Number',
                              hintText: 'e.g. +91 98765 43210',
                              prefixIcon:
                                  const Icon(Icons.phone_outlined, size: 18),
                              keyboardType: TextInputType.phone,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),
                    ] else ...[
                      // ─────────────────── VENDOR / CORPORATE FORM ───────────────────
                      // SECTION 1: User & Contact Details
                      _buildSectionHeader(
                        context,
                        icon: Icons.person_pin_rounded,
                        title: 'User & Contact Details',
                        subtitle: 'Primary account manager and contact details',
                      ),
                      const SizedBox(height: AppSpacing.md),

                      AppTextField(
                        controller: _spocNameController,
                        label: 'Full Name *',
                        hintText: 'Enter your name as the app user',
                        prefixIcon: const Icon(Icons.person_outline, size: 20),
                        validator: (val) {
                          if (val == null || val.trim().length < 2) {
                            return 'Please enter your full name';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: AppSpacing.md),

                      AppTextField(
                        controller: _spocPhoneController,
                        label: 'Official Mobile Number *',
                        hintText: '10-digit primary mobile number',
                        prefixIcon: const Icon(Icons.phone_outlined, size: 20),
                        keyboardType: TextInputType.phone,
                        validator: (val) {
                          final p = val?.trim() ?? '';
                          final d = p.replaceAll(RegExp(r'\D'), '');
                          if (d.length < 10) {
                            return 'Enter valid 10-digit mobile number';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: AppSpacing.md),

                      AppTextField(
                        controller: _billingEmailController,
                        label: 'Official Email Address *',
                        hintText: 'e.g. yourname@company.com',
                        prefixIcon:
                            const Icon(Icons.email_outlined, size: 20),
                        keyboardType: TextInputType.emailAddress,
                        validator: (val) {
                          final e = val?.trim().toLowerCase() ?? '';
                          if (e.isEmpty || !e.contains('@') || !e.contains('.')) {
                            return 'Enter a valid official email address';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: AppSpacing.md),

                      AppTextField(
                        controller: _altPhoneController,
                        label: 'Alternative Contact Number (Optional)',
                        hintText: 'e.g. +91 91234 56789',
                        prefixIcon:
                            const Icon(Icons.phone_iphone_outlined, size: 20),
                        keyboardType: TextInputType.phone,
                      ),
                      const SizedBox(height: AppSpacing.md),

                      AppTextField(
                        controller: _emergencyPhoneController,
                        label: 'Emergency Helpline Number (Optional)',
                        hintText: 'e.g. +91 1800 123 456 or alternate contact',
                        prefixIcon:
                            const Icon(Icons.support_agent_outlined, size: 20),
                        keyboardType: TextInputType.phone,
                      ),
                      const SizedBox(height: AppSpacing.xl),

                      // SECTION 2: Organization & Company Details
                      _buildSectionHeader(
                        context,
                        icon: Icons.business_rounded,
                        title: 'Company & Organization Details',
                        subtitle: 'Official registered entity and branch details',
                      ),
                      const SizedBox(height: AppSpacing.md),

                      AppTextField(
                        controller: _companyNameController,
                        label: 'Company Name / Branch Name *',
                        hintText: 'e.g. Acme Mobility / Gurugram Branch',
                        prefixIcon:
                            const Icon(Icons.apartment_rounded, size: 20),
                        validator: (val) {
                          if (val == null || val.trim().length < 2) {
                            return 'Please enter company name or branch name';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: AppSpacing.md),

                      AppTextField(
                        controller: _addressController,
                        readOnly: !_isManualAddress,
                        onTap: _isManualAddress ? null : _pickLocation,
                        label: 'Company Location / Office Address *',
                        hintText: _isManualAddress
                            ? 'Building, Floor, Area, City'
                            : 'Tap to select location on map or search',
                        prefixIcon:
                            const Icon(Icons.location_on_outlined, size: 20),
                        suffixIcon: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (_addressController.text.isNotEmpty)
                              IconButton(
                                icon: const Icon(Icons.clear_rounded, size: 18),
                                tooltip: 'Clear',
                                onPressed: () =>
                                    setState(() => _addressController.clear()),
                              ),
                            IconButton(
                              icon: const Icon(Icons.my_location_rounded,
                                  color: AppColors.primary, size: 20),
                              tooltip: 'Select on Map',
                              onPressed: _pickLocation,
                            ),
                          ],
                        ),
                        validator: (val) {
                          if (val == null || val.trim().length < 3) {
                            return 'Enter company location or office address';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 4),
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton.icon(
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 4, vertical: 0),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          onPressed: () {
                            setState(() {
                              _isManualAddress = !_isManualAddress;
                            });
                          },
                          icon: Icon(
                            _isManualAddress
                                ? Icons.map_outlined
                                : Icons.edit_note_rounded,
                            size: 15,
                            color: AppColors.primary,
                          ),
                          label: Text(
                            _isManualAddress
                                ? 'Pick from Map / Search instead'
                                : 'Or type address manually',
                            style: AppTypography.micro(
                              color: AppColors.primary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),

                      // Business Industry / Sector Dropdown
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Business Industry / Sector *',
                            style: AppTypography.caption(
                              color: isDark
                                  ? AppColors.textMutedDark
                                  : AppColors.textMutedLight,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: AppSpacing.md),
                            decoration: BoxDecoration(
                              color: isDark
                                  ? AppColors.surfaceDark
                                  : AppColors.surfaceLight,
                              borderRadius:
                                  BorderRadius.circular(AppRadius.md),
                              border: Border.all(
                                  color: isDark
                                      ? AppColors.borderDark
                                      : AppColors.borderLight),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                isExpanded: true,
                                value: _selectedBusinessType,
                                dropdownColor: isDark
                                    ? AppColors.surfaceDark
                                    : AppColors.surfaceLight,
                                icon: const Icon(Icons.arrow_drop_down),
                                items: _businessEntityTypes.map((type) {
                                  return DropdownMenuItem<String>(
                                    value: type,
                                    child: Text(
                                      type,
                                      style: AppTypography.body(
                                        color: isDark
                                            ? AppColors.textPrimaryDark
                                            : AppColors.textPrimaryLight,
                                      ),
                                    ),
                                  );
                                }).toList(),
                                onChanged: (val) {
                                  if (val != null) {
                                    setState(
                                        () => _selectedBusinessType = val);
                                  }
                                },
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.md),

                      // Monthly Volume Dropdown
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Estimated Monthly Ride Requirements *',
                            style: AppTypography.caption(
                              color: isDark
                                  ? AppColors.textMutedDark
                                  : AppColors.textMutedLight,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: AppSpacing.md),
                            decoration: BoxDecoration(
                              color: isDark
                                  ? AppColors.surfaceDark
                                  : AppColors.surfaceLight,
                              borderRadius:
                                  BorderRadius.circular(AppRadius.md),
                              border: Border.all(
                                  color: isDark
                                      ? AppColors.borderDark
                                      : AppColors.borderLight),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                isExpanded: true,
                                value: _selectedMonthlyTrips,
                                dropdownColor: isDark
                                    ? AppColors.surfaceDark
                                    : AppColors.surfaceLight,
                                icon: const Icon(Icons.arrow_drop_down),
                                items: _monthlyTripOptions.map((opt) {
                                  return DropdownMenuItem<String>(
                                    value: opt,
                                    child: Text(
                                      opt,
                                      style: AppTypography.body(
                                        color: isDark
                                            ? AppColors.textPrimaryDark
                                            : AppColors.textPrimaryLight,
                                      ),
                                    ),
                                  );
                                }).toList(),
                                onChanged: (val) {
                                  if (val != null) {
                                    setState(
                                        () => _selectedMonthlyTrips = val);
                                  }
                                },
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.xl),
                    ],

                    // ── Primary Action Button ─────────────────────────────────
                    AppPrimaryButton(
                      text: isDriver
                          ? 'CONTINUE TO IDENTITY VERIFICATION'
                          : 'SUBMIT ORGANIZATION DETAILS FOR REVIEW',
                      isLoading: _isSaving,
                      onPressed: _isSaving ? null : _handleContinue,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: isDark
            ? AppColors.surfaceDark
            : AppColors.primary.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(
          color: isDark
              ? AppColors.borderDark
              : AppColors.primary.withValues(alpha: 0.15),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: isDark
                  ? AppColors.primaryLight.withValues(alpha: 0.2)
                  : AppColors.primary.withValues(alpha: 0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              size: 18,
              color: isDark ? AppColors.primaryLight : AppColors.primary,
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: AppTypography.body(
                    color: isDark
                        ? AppColors.textPrimaryDark
                        : AppColors.textPrimaryLight,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  subtitle,
                  style: AppTypography.caption(
                    color: isDark
                        ? AppColors.textMutedDark
                        : AppColors.textMutedLight,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
