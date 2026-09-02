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

/// Screen 11: Step 1 of 4: Let's get started (Personal Details).
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
  final _gstController = TextEditingController();

  DateTime? _selectedDate;
  String _selectedGender = 'Male';

  @override
  void initState() {
    super.initState();
    final onboarding = context.read<OnboardingProvider>();
    _nameController.text = onboarding.fullName;
    _selectedDate = onboarding.dateOfBirth ?? DateTime(1990, 8, 15);
    _selectedGender = onboarding.gender;
    _companyController.text = onboarding.companyName;
    _gstController.text = onboarding.gstNumber;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _companyController.dispose();
    _gstController.dispose();
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
      fullName: _nameController.text.trim(),
      dateOfBirth: _selectedDate,
      gender: _selectedGender,
    );

    if (onboarding.isVendor) {
      onboarding.setVendorCompanyDetails(
        companyName: _companyController.text.trim(),
        gstNumber: _gstController.text.trim(),
      );
    }

    context.push(AppRoutes.onboardingVehicleScreen);
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
                    // ── 4-Step Progress Header ───────────────────────────────
                    AppStepperHeader(
                      currentStep: 1,
                      onBack: () => context.pop(),
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    // ── Title & Subtitle ─────────────────────────────────────
                    Text(
                      "Let's get started",
                      style: AppTypography.h1(
                        color: AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      'Please provide your basic details',
                      style: AppTypography.body(
                        color: AppColors.textSecondaryLight,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xxl),

                    // ── Full Name Input ──────────────────────────────────────
                    AppTextField(
                      controller: _nameController,
                      label: 'Full Name',
                      hintText: 'Rahul Sharma',
                      validator: (val) {
                        if (val == null || val.trim().length < 2) {
                          return 'Enter your full name';
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
                          'Date of Birth',
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
                                const Icon(
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
                          'Gender',
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

                    // ── Optional Vendor Company Details ──────────────────────
                    if (onboarding.isVendor) ...[
                      AppTextField(
                        controller: _companyController,
                        label: 'Company / Organization Name',
                        hintText: 'City Logistics Corp',
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return 'Enter company name';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: AppSpacing.md),
                      AppTextField(
                        controller: _gstController,
                        label: 'GST Number (Optional)',
                        hintText: '36AAAAA0000A1Z5',
                      ),
                      const SizedBox(height: AppSpacing.lg),
                    ],

                    const SizedBox(height: AppSpacing.xl),

                    // ── Primary Action ───────────────────────────────────────
                    AppPrimaryButton(
                      text: 'Continue',
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
