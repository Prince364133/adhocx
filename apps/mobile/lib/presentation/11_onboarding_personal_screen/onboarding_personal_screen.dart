import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/networking/api_client.dart';
import '../../core/utils/app_logger.dart';
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

/// Screen 11: Step 1 of 3: Driver Personal Details & Basic Info.
class OnboardingPersonalScreen extends StatefulWidget {
  const OnboardingPersonalScreen({super.key});

  @override
  State<OnboardingPersonalScreen> createState() =>
      _OnboardingPersonalScreenState();
}

class _OnboardingPersonalScreenState extends State<OnboardingPersonalScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _phoneController;
  final _addressController = TextEditingController();
  final _emergencyNameController = TextEditingController();
  final _emergencyPhoneController = TextEditingController();
  final _companyController = TextEditingController();

  DateTime? _selectedDate;
  String _selectedGender = 'Male';
  bool _isCorporateBooking = false;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final authUser = AuthService.instance.currentUser;
    final onboarding = context.read<OnboardingProvider>();

    // Avoid dummy placeholder names
    final initialName = onboarding.fullName.isNotEmpty
        ? onboarding.fullName
        : ((authUser?.fullName != null &&
                authUser!.fullName!.isNotEmpty &&
                authUser.fullName != 'Driver Partner' &&
                authUser.fullName != 'Google User' &&
                authUser.fullName != 'Google Partner' &&
                authUser.fullName != 'User')
            ? authUser.fullName!
            : '');

    final initialPhone = onboarding.phoneNumber.isNotEmpty
        ? onboarding.phoneNumber
        : (authUser?.phone ?? '');

    _nameController = TextEditingController(text: initialName);
    _phoneController = TextEditingController(text: initialPhone);
    _addressController.text = onboarding.address;
    _emergencyNameController.text = onboarding.emergencyContactName;
    _emergencyPhoneController.text = onboarding.emergencyContactPhone;
    _selectedGender = onboarding.gender.isNotEmpty ? onboarding.gender : 'Male';
    _selectedDate = onboarding.dateOfBirth;
    _companyController.text = onboarding.companyName;
    _isCorporateBooking = onboarding.isCorporate || onboarding.companyName.isNotEmpty;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    _emergencyNameController.dispose();
    _emergencyPhoneController.dispose();
    _companyController.dispose();
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

  Future<void> _handleContinue() async {
    if (!_formKey.currentState!.validate()) return;

    final onboarding = context.read<OnboardingProvider>();
    final enteredName = _nameController.text.trim();
    final enteredPhone = _phoneController.text.trim();
    final enteredAddress = _addressController.text.trim();
    final enteredEmergencyName = _emergencyNameController.text.trim();
    final enteredEmergencyPhone = _emergencyPhoneController.text.trim();

    onboarding.setPersonalDetails(
      fullName: enteredName,
      phone: enteredPhone,
      address: enteredAddress,
      emergencyContactName: enteredEmergencyName,
      emergencyContactPhone: enteredEmergencyPhone,
      dateOfBirth: _selectedDate,
      gender: _selectedGender,
      companyName: _isCorporateBooking ? _companyController.text.trim() : '',
      isCorporate: _isCorporateBooking,
    );

    // If User/Booker -> Fast profile setup to /welcome-success
    if (onboarding.isUser) {
      setState(() => _isSaving = true);
      try {
        final orgName = _isCorporateBooking && _companyController.text.trim().isNotEmpty
            ? _companyController.text.trim()
            : (enteredName.isNotEmpty ? '$enteredName Mobility' : 'My Organization');

        await ApiClient.instance.post(
          '/vendors/profile',
          body: {
            'organizationName': orgName,
            'fullName': enteredName,
            if (enteredPhone.isNotEmpty) 'phone': enteredPhone,
            'gstNumber': onboarding.gstNumber.isNotEmpty ? onboarding.gstNumber : null,
            'address': enteredAddress.isNotEmpty ? enteredAddress : 'India',
          },
        );

        final updatedUser = await AuthService.instance.fetchCurrentUser(forceRefresh: true);
        if (updatedUser != null && mounted) {
          context.read<AuthProvider>().setUser(updatedUser);
        }

        if (mounted) {
          Fluttertoast.showToast(
            msg: 'Business Profile submitted for verification!',
            backgroundColor: AppColors.accentGreenDark,
            textColor: Colors.white,
          );
          context.go(AppRoutes.welcomeSuccessScreen);
        }
      } catch (e) {
        AppLogger.error('Failed to create vendor profile: $e');
        if (mounted) {
          Fluttertoast.showToast(
            msg: 'Submission failed: ${e.toString().replaceAll('Exception: ', '')}',
            backgroundColor: Colors.redAccent,
            textColor: Colors.white,
          );
        }
      } finally {
        if (mounted) setState(() => _isSaving = false);
      }
    } else {
      // Driver Partner -> Persist personal details & phone number to backend immediately
      try {
        await DriverService.instance.updateProfile({
          if (enteredName.isNotEmpty) 'fullName': enteredName,
          if (enteredPhone.isNotEmpty) 'phone': enteredPhone,
          if (enteredAddress.isNotEmpty) 'address': enteredAddress,
          if (enteredEmergencyName.isNotEmpty) 'emergencyContactName': enteredEmergencyName,
          if (enteredEmergencyPhone.isNotEmpty) 'emergencyContactPhone': enteredEmergencyPhone,
          if (_selectedDate != null)
            'dateOfBirth': '${_selectedDate!.day}/${_selectedDate!.month}/${_selectedDate!.year}',
          if (_selectedGender.isNotEmpty) 'gender': _selectedGender,
        });
      } catch (e) {
        AppLogger.warn('Immediate driver profile update on personal step notice: $e');
      }

      // Step 2 of 3: Identity Verification (Documents)
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
                    // ── Progress Header: 3 Steps for Driver, Simple Back for User ───────
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
                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
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
                              color: isDark ? AppColors.primary.withValues(alpha: 0.25) : AppColors.primarySubtle,
                              borderRadius: BorderRadius.circular(AppRadius.full),
                            ),
                            child: Text(
                              'Quick Profile Setup',
                              style: AppTypography.micro(
                                color: isDark ? AppColors.primaryLight : AppColors.primary,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                    const SizedBox(height: AppSpacing.xl),

                    // ── Title & Subtitle ─────────────────────────────────────
                    Text(
                      isDriver ? "Basic Details" : "Complete your profile",
                      style: AppTypography.h1(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      isDriver
                          ? 'Step 1 of 3: Provide your personal and contact details'
                          : 'Just a few quick details to personalize your account',
                      style: AppTypography.body(
                        color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    // ── 1. Full Name ─────────────────────────────────────────
                    AppTextField(
                      controller: _nameController,
                      label: 'Full Name',
                      hintText: 'Enter your full legal name',
                      prefixIcon: const Icon(Icons.person_outline, size: 20),
                      validator: (val) {
                        if (val == null || val.trim().length < 2) {
                          return 'Please enter your full legal name';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    // ── 2. Phone Number ──────────────────────────────────────
                    AppTextField(
                      controller: _phoneController,
                      label: 'Phone Number',
                      hintText: 'e.g. +91 98765 43210',
                      prefixIcon: const Icon(Icons.phone_outlined, size: 20),
                      keyboardType: TextInputType.phone,
                      validator: (val) {
                        if (val == null || val.trim().length < 8) {
                          return 'Please enter a valid phone number';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    // ── 3. Gender Segmented Selector ─────────────────────────
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Gender',
                          style: AppTypography.caption(
                            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Row(
                          children: ['Male', 'Female', 'Other'].map((gender) {
                            final isSelected = _selectedGender == gender;
                            return Expanded(
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 4),
                                child: InkWell(
                                  onTap: () => setState(() => _selectedGender = gender),
                                  borderRadius: BorderRadius.circular(AppRadius.md),
                                  child: Container(
                                    height: 44,
                                    alignment: Alignment.center,
                                    decoration: BoxDecoration(
                                      color: isSelected
                                          ? (isDark
                                              ? AppColors.primaryLight.withValues(alpha: 0.2)
                                              : AppColors.primary.withValues(alpha: 0.12))
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
                                      gender,
                                      style: TextStyle(
                                        color: isSelected
                                            ? (isDark ? AppColors.primaryLight : AppColors.primary)
                                            : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                                        fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
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

                    // ── 4. Date of Birth Picker ──────────────────────────────
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Date of Birth',
                          style: AppTypography.caption(
                            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
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
                              color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                              borderRadius: BorderRadius.circular(AppRadius.md),
                              border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    Icon(
                                      Icons.calendar_today_outlined,
                                      size: 18,
                                      color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                    ),
                                    const SizedBox(width: AppSpacing.md),
                                    Text(
                                      _selectedDate != null
                                          ? _formatDate(_selectedDate!)
                                          : 'Select Date of Birth (DD MMM YYYY)',
                                      style: AppTypography.body(
                                        color: _selectedDate != null
                                            ? (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight)
                                            : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                                      ),
                                    ),
                                  ],
                                ),
                                Icon(
                                  Icons.arrow_drop_down,
                                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    // ── 5. Location / Permanent Address ──────────────────────
                    AppTextField(
                      controller: _addressController,
                      label: 'Location / Residential Address',
                      hintText: 'Enter your city / residential address with PIN code',
                      prefixIcon: const Icon(Icons.location_on_outlined, size: 20),
                      validator: (val) {
                        if (isDriver && (val == null || val.trim().length < 3)) {
                          return 'Please enter your residential address / location';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    // ── 6. Emergency Contact Details ─────────────────────────
                    if (isDriver) ...[
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: BoxDecoration(
                                    color: AppColors.error.withValues(alpha: 0.12),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(Icons.contact_phone_outlined, size: 16, color: AppColors.error),
                                ),
                                const SizedBox(width: AppSpacing.sm),
                                Text(
                                  'Emergency Contact',
                                  style: AppTypography.body(
                                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
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
                              prefixIcon: const Icon(Icons.person_outline, size: 18),
                            ),
                            const SizedBox(height: AppSpacing.md),
                            AppTextField(
                              controller: _emergencyPhoneController,
                              label: 'Emergency Phone Number',
                              hintText: 'e.g. +91 98765 43210',
                              prefixIcon: const Icon(Icons.phone_outlined, size: 18),
                              keyboardType: TextInputType.phone,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),
                    ],

                    // ── Corporate Toggle (User only) ─────────────────────────
                    if (!isDriver) ...[
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                        ),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Row(
                                    children: [
                                      Icon(
                                        Icons.business_outlined,
                                        size: 20,
                                        color: isDark ? AppColors.primaryLight : AppColors.primary,
                                      ),
                                      const SizedBox(width: AppSpacing.sm),
                                      Expanded(
                                        child: Text(
                                          'Booking for Company / Event?',
                                          style: AppTypography.bodyMedium(
                                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                            fontWeight: FontWeight.w600,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Switch.adaptive(
                                  value: _isCorporateBooking,
                                  onChanged: (val) {
                                    setState(() => _isCorporateBooking = val);
                                  },
                                  activeTrackColor: isDark ? AppColors.primaryLight : AppColors.primary,
                                ),
                              ],
                            ),
                            if (_isCorporateBooking) ...[
                              const SizedBox(height: AppSpacing.md),
                              AppTextField(
                                controller: _companyController,
                                label: 'Company / Organization Name (Optional)',
                                hintText: 'Acme Corp / Wedding Fleet',
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),
                    ],

                    // ── Continue Action Button ───────────────────────────────
                    AppPrimaryButton(
                      text: isDriver ? 'CONTINUE TO IDENTITY VERIFICATION' : 'Start Booking & Posting Trips',
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
}
