import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../routes/app_routes.dart';
import '../../services/onboarding_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_primary_button.dart';
import '../../widgets/common/app_stepper_header.dart';
import '../../widgets/common/app_text_field.dart';

/// Screen 11: Personal Details & Fast 1-Step User Profile Setup.
class OnboardingPersonalScreen extends StatefulWidget {
  const OnboardingPersonalScreen({super.key});

  @override
  State<OnboardingPersonalScreen> createState() =>
      _OnboardingPersonalScreenState();
}

class _OnboardingPersonalScreenState extends State<OnboardingPersonalScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _companyController = TextEditingController();

  DateTime? _selectedDate;
  String _selectedGender = 'Male';
  bool _isCorporateBooking = false;

  @override
  void initState() {
    super.initState();
    final onboarding = context.read<OnboardingProvider>();
    _nameController.text = onboarding.fullName;
    _selectedDate = onboarding.dateOfBirth ?? DateTime(1995, 8, 15);
    _selectedGender = onboarding.gender;
    _companyController.text = onboarding.companyName;
    _isCorporateBooking = onboarding.isCorporate || onboarding.companyName.isNotEmpty;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _companyController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? DateTime(1995, 1, 1),
      firstDate: DateTime(1950),
      lastDate: DateTime.now().subtract(const Duration(days: 365 * 18)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
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

  void _handleContinue() {
    if (!_formKey.currentState!.validate()) return;

    final onboarding = context.read<OnboardingProvider>();
    onboarding.setPersonalDetails(
      fullName: _nameController.text.trim().isNotEmpty
          ? _nameController.text.trim()
          : 'Partner Name',
      dateOfBirth: _selectedDate,
      gender: _selectedGender,
      companyName: _isCorporateBooking ? _companyController.text.trim() : '',
      isCorporate: _isCorporateBooking,
    );

    // If User/Booker -> Direct 1-Step Onboarding Complete!
    if (onboarding.isUser) {
      context.push(AppRoutes.welcomeSuccessScreen);
    } else {
      // Driver Partner -> Continues to vehicle registration
      context.push(AppRoutes.onboardingVehicleScreen);
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
    final onboarding = context.watch<OnboardingProvider>();
    final isDriver = onboarding.isDriver;

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
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // ── Header: Stepper for Driver, Simple Back for User ───────
                    if (isDriver)
                      AppStepperHeader(
                        currentStep: 1,
                        onBack: () => context.pop(),
                      )
                    else
                      Row(
                        children: [
                          IconButton(
                            onPressed: () => context.pop(),
                            icon: Icon(
                              Icons.arrow_back,
                              color: AppColors.textPrimaryLight,
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
                              color: AppColors.primarySubtle,
                              borderRadius: BorderRadius.circular(AppRadius.full),
                            ),
                            child: Text(
                              'Quick Profile Setup',
                              style: AppTypography.micro(
                                color: AppColors.primary,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                    const SizedBox(height: AppSpacing.xl),

                    // ── Title & Subtitle ─────────────────────────────────────
                    Text(
                      isDriver ? "Driver Personal Details" : "Complete your profile",
                      style: AppTypography.h1(
                        color: AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      isDriver
                          ? 'Please provide your legal personal details'
                          : 'Just a few quick details to personalize your ride bookings',
                      style: AppTypography.body(
                        color: AppColors.textSecondaryLight,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xxl),

                    // ── Full Name Input ──────────────────────────────────────
                    AppTextField(
                      controller: _nameController,
                      label: 'Full Name',
                      hintText: 'Enter full name',
                      validator: (val) {
                        if (val == null || val.trim().length < 2) {
                          return 'Please enter your full name';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    // ── Date of Birth Picker ─────────────────────────────────
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Date of Birth (Optional)',
                          style: AppTypography.caption(
                            color: AppColors.textSecondaryLight,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        InkWell(
                          onTap: _pickDate,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.lg,
                              vertical: 14,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.surfaceLight,
                              borderRadius: BorderRadius.circular(AppRadius.md),
                              border: Border.all(color: AppColors.borderLight),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  _selectedDate != null
                                      ? _formatDate(_selectedDate!)
                                      : 'Select Date',
                                  style: AppTypography.body(
                                    color: AppColors.textPrimaryLight,
                                  ),
                                ),
                                Icon(
                                  Icons.calendar_today_outlined,
                                  size: 18,
                                  color: AppColors.textSecondaryLight,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    // ── Gender Segmented Pill Selector ───────────────────────
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Gender (Optional)',
                          style: AppTypography.caption(
                            color: AppColors.textSecondaryLight,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xs),
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
                                          ? AppColors.primary
                                          : AppColors.surfaceLight,
                                      borderRadius:
                                          BorderRadius.circular(AppRadius.md),
                                      border: Border.all(
                                        color: isSelected
                                            ? AppColors.primary
                                            : AppColors.borderLight,
                                      ),
                                    ),
                                    child: Text(
                                      gender,
                                      style: AppTypography.body(
                                        color: isSelected
                                            ? Colors.white
                                            : AppColors.textPrimaryLight,
                                        fontWeight: isSelected
                                            ? FontWeight.w600
                                            : FontWeight.normal,
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

                    // ── Optional Corporate / Event Booking Toggle (For Users) ───
                    if (!isDriver) ...[
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(color: AppColors.borderLight),
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
                                        color: AppColors.primary,
                                      ),
                                      const SizedBox(width: AppSpacing.sm),
                                      Expanded(
                                        child: Text(
                                          'Booking for Company / Event?',
                                          style: AppTypography.bodyMedium(
                                            color: AppColors.textPrimaryLight,
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
                                  activeColor: AppColors.primary,
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

                    // ── Primary Action ───────────────────────────────────────
                    AppPrimaryButton(
                      text: isDriver ? 'Continue to Vehicle' : 'Start Booking & Posting Trips',
                      onPressed: _handleContinue,
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
