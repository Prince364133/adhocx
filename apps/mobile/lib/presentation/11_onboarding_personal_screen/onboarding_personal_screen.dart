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
  late final TextEditingController _cityController;
  late final TextEditingController _stateController;
  late final TextEditingController _pincodeController;

  String _selectedBusinessType = 'Private Limited';
  String _selectedMonthlyTrips = '26 - 100 trips / month';
  DateTime? _selectedDate;
  String _selectedGender = 'Male';
  bool _isSaving = false;
  bool _isManualAddress = false;
  String? _inlineErrorMessage;

  static const List<String> _businessEntityTypes = [
    'Private Limited',
    'Public Limited',
    'LLP (Limited Liability Partnership)',
    'Partnership Firm',
    'Sole Proprietorship',
    'Corporate Enterprise',
    'Travel Agency / Event Organizer',
  ];

  static const List<String> _monthlyTripOptions = [
    '1 - 25 trips / month',
    '26 - 100 trips / month',
    '101 - 500 trips / month',
    '500+ trips / month',
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
    _selectedBusinessType = onboarding.businessType.isNotEmpty
        ? onboarding.businessType
        : 'Private Limited';
    _panController = TextEditingController(text: onboarding.panNumber);
    _gstController = TextEditingController(
      text: onboarding.gstNumber.isNotEmpty
          ? onboarding.gstNumber
          : (authUser?.vendorProfile?['gstNumber'] ?? ''),
    );
    _selectedMonthlyTrips = onboarding.monthlyTrips.isNotEmpty
        ? onboarding.monthlyTrips
        : '26 - 100 trips / month';
    _spocNameController = TextEditingController(text: initialName);
    _spocDesignationController = TextEditingController(
      text: onboarding.spocDesignation.isNotEmpty
          ? onboarding.spocDesignation
          : 'Travel Desk Lead',
    );
    _spocPhoneController = TextEditingController(text: initialPhone);
    _billingEmailController = TextEditingController(
      text: onboarding.billingEmail.isNotEmpty
          ? onboarding.billingEmail
          : initialEmail,
    );
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
        const msg = 'Please fill in all mandatory company details.';
        setState(() => _inlineErrorMessage = msg);
        AppToast.showError(msg, context: context);
        return;
      }

      final companyName = _companyNameController.text.trim();
      final brandName = _brandNameController.text.trim();
      final gstNumber = _gstController.text.trim().toUpperCase();
      final panNumber = _panController.text.trim().toUpperCase();
      final spocName = _spocNameController.text.trim();
      final spocPhone = _spocPhoneController.text.trim();
      final spocDesignation = _spocDesignationController.text.trim();
      final registeredAddress = _addressController.text.trim();
      final city = _cityController.text.trim();
      final state = _stateController.text.trim();
      final pincode = _pincodeController.text.trim();
      final billingEmail = _billingEmailController.text.trim();

      setState(() {
        _isSaving = true;
        _inlineErrorMessage = null;
      });

      try {
        final fullAddress = [registeredAddress, city, state, pincode]
            .where((s) => s.isNotEmpty)
            .join(', ');

        onboarding.setVendorDetails(
          companyName: companyName,
          brandName: brandName,
          businessType: _selectedBusinessType,
          gstNumber: gstNumber,
          panNumber: panNumber,
          address: fullAddress,
          city: city,
          state: state,
          pincode: pincode,
          billingAddress: fullAddress,
          billingEmail: billingEmail,
          spocName: spocName,
          spocDesignation: spocDesignation,
          phone: spocPhone,
          monthlyTrips: _selectedMonthlyTrips,
        );

        await ApiClient.instance.post(
          '/vendors/profile',
          body: {
            'organizationName': companyName,
            'fullName': spocName,
            if (spocPhone.isNotEmpty) 'phone': spocPhone,
            if (gstNumber.isNotEmpty) 'gstNumber': gstNumber,
            'address': fullAddress.isNotEmpty ? fullAddress : 'India',
            if (panNumber.isNotEmpty) 'panNumber': panNumber,
            'businessType': _selectedBusinessType,
            if (city.isNotEmpty) 'city': city,
            if (state.isNotEmpty) 'state': state,
            if (pincode.isNotEmpty) 'pincode': pincode,
            'billingAddress': fullAddress,
            if (billingEmail.isNotEmpty) 'billingEmail': billingEmail,
            if (billingEmail.isNotEmpty) 'alternateEmail': billingEmail,
            if (spocDesignation.isNotEmpty) 'spocDesignation': spocDesignation,
            'monthlyTrips': _selectedMonthlyTrips,
          },
        );

        final updatedUser =
            await AuthService.instance.fetchCurrentUser(forceRefresh: true);
        if (updatedUser != null && mounted) {
          context.read<AuthProvider>().setUser(updatedUser);
        }

        if (mounted) {
          AppToast.showSuccess(
            'Corporate Profile submitted for review!',
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
                          : 'Company & Billing Details',
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
                          : 'Enter your business and billing information to activate corporate cab booking',
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
                      // SECTION 1: Company Information
                      _buildSectionHeader(
                        context,
                        icon: Icons.business_rounded,
                        title: 'Company Information',
                        subtitle: 'Official registered corporate entity details',
                      ),
                      const SizedBox(height: AppSpacing.md),

                      AppTextField(
                        controller: _companyNameController,
                        label: 'Company Legal Name *',
                        hintText: 'e.g. Acme Technologies Private Limited',
                        prefixIcon:
                            const Icon(Icons.apartment_rounded, size: 20),
                        validator: (val) {
                          if (val == null || val.trim().length < 2) {
                            return 'Please enter legal company name';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: AppSpacing.md),

                      AppTextField(
                        controller: _brandNameController,
                        label: 'Brand / Trade Name (Optional)',
                        hintText: 'e.g. Acme Mobility',
                        prefixIcon:
                            const Icon(Icons.storefront_outlined, size: 20),
                      ),
                      const SizedBox(height: AppSpacing.md),

                      // Business Entity Type Dropdown
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Business Entity Type *',
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

                      // Company PAN & GSTIN Row
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: AppTextField(
                              controller: _panController,
                              label: 'Company PAN (Optional)',
                              hintText: 'ABCDE1234F',
                              textCapitalization: TextCapitalization.characters,
                              prefixIcon:
                                  const Icon(Icons.badge_outlined, size: 20),
                              validator: (val) {
                                final pan = val?.trim().toUpperCase() ?? '';
                                if (pan.isNotEmpty && pan.length != 10) {
                                  return '10-char PAN required';
                                }
                                return null;
                              },
                            ),
                          ),
                          const SizedBox(width: AppSpacing.md),
                          Expanded(
                            child: AppTextField(
                              controller: _gstController,
                              label: 'GSTIN Number (Optional)',
                              hintText: '22AAAAA0000A1Z5',
                              textCapitalization: TextCapitalization.characters,
                              prefixIcon: const Icon(
                                  Icons.receipt_long_outlined,
                                  size: 20),
                              validator: (val) {
                                final gst = val?.trim().toUpperCase() ?? '';
                                if (gst.isNotEmpty && gst.length != 15) {
                                  return '15-char GSTIN required';
                                }
                                return null;
                              },
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
                            'Estimated Monthly Fleet Trips *',
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

                      // SECTION 2: Authorized Signatory / SPOC
                      _buildSectionHeader(
                        context,
                        icon: Icons.person_pin_rounded,
                        title: 'Authorized Company Representative (SPOC)',
                        subtitle: 'Person registering and their role/belonging in the company',
                      ),
                      const SizedBox(height: AppSpacing.md),

                      AppTextField(
                        controller: _spocNameController,
                        label: 'Contact Person Name *',
                        hintText: 'Full name of manager or desk lead',
                        prefixIcon: const Icon(Icons.person_outline, size: 20),
                        validator: (val) {
                          if (val == null || val.trim().length < 2) {
                            return 'Enter contact person name';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: AppSpacing.md),

                      AppTextField(
                        controller: _spocDesignationController,
                        label: 'Designation / Role *',
                        hintText: 'e.g. Travel Desk Manager / Admin Lead',
                        prefixIcon: const Icon(Icons.work_outline, size: 20),
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return 'Enter contact person designation';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: AppSpacing.md),

                      AppTextField(
                        controller: _spocPhoneController,
                        label: 'Official Contact Mobile Number *',
                        hintText: '10-digit mobile number',
                        prefixIcon: const Icon(Icons.phone_outlined, size: 20),
                        keyboardType: TextInputType.phone,
                        validator: (val) {
                          final p = val?.trim() ?? '';
                          final d = p.replaceAll(RegExp(r'\D'), '');
                          if (d.length < 10) {
                            return 'Enter valid 10-digit phone number';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: AppSpacing.md),

                      AppTextField(
                        controller: _billingEmailController,
                        label: 'Corporate Billing / Invoicing Email *',
                        hintText: 'e.g. accounts@company.com',
                        prefixIcon:
                            const Icon(Icons.mark_email_read_outlined, size: 20),
                        keyboardType: TextInputType.emailAddress,
                        validator: (val) {
                          final e = val?.trim().toLowerCase() ?? '';
                          if (e.isEmpty || !e.contains('@') || !e.contains('.')) {
                            return 'Enter a valid corporate billing email';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: AppSpacing.xl),

                      // SECTION 3: Registered Corporate Address
                      _buildSectionHeader(
                        context,
                        icon: Icons.pin_drop_rounded,
                        title: 'Registered Corporate Office Address',
                        subtitle: 'Office premises for tax invoice & GST records',
                      ),
                      const SizedBox(height: AppSpacing.md),

                      AppTextField(
                        controller: _addressController,
                        readOnly: !_isManualAddress,
                        onTap: _isManualAddress ? null : _pickLocation,
                        label: 'Street Address / Building / Campus *',
                        hintText: _isManualAddress
                            ? 'Building, Floor, Street, Area'
                            : 'Tap to select location on map or search',
                        prefixIcon:
                            const Icon(Icons.location_city_outlined, size: 20),
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
                            return 'Enter registered office address';
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

                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: AppTextField(
                              controller: _cityController,
                              label: 'City *',
                              hintText: 'e.g. Hyderabad / Gurugram',
                              validator: (val) {
                                if (val == null || val.trim().isEmpty) {
                                  return 'Enter city';
                                }
                                return null;
                              },
                            ),
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          Expanded(
                            child: AppTextField(
                              controller: _stateController,
                              label: 'State *',
                              hintText: 'e.g. Telangana',
                              validator: (val) {
                                if (val == null || val.trim().isEmpty) {
                                  return 'Enter state';
                                }
                                return null;
                              },
                            ),
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          Expanded(
                            child: AppTextField(
                              controller: _pincodeController,
                              label: 'PIN Code *',
                              hintText: '500081',
                              keyboardType: TextInputType.number,
                              validator: (val) {
                                final p = val?.trim() ?? '';
                                if (p.length < 6) {
                                  return '6-digit PIN';
                                }
                                return null;
                              },
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
                          : 'SUBMIT CORPORATE PROFILE FOR REVIEW',
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
