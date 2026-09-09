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

/// Screen 12: Step 2 of 4: Vehicle Information.
class OnboardingVehicleScreen extends StatefulWidget {
  const OnboardingVehicleScreen({super.key});

  @override
  State<OnboardingVehicleScreen> createState() =>
      _OnboardingVehicleScreenState();
}

class _OnboardingVehicleScreenState extends State<OnboardingVehicleScreen> {
  final _formKey = GlobalKey<FormState>();
  final _modelController = TextEditingController();
  final _colorController = TextEditingController();
  final _regNumberController = TextEditingController();

  String _selectedVehicleType = 'Sedan';
  final List<String> _vehicleTypes = [
    'Sedan',
    'SUV',
    'Hatchback',
    'Auto / 3-Wheeler',
    'Commercial Van / Truck',
  ];

  @override
  void initState() {
    super.initState();
    final onboarding = context.read<OnboardingProvider>();
    _selectedVehicleType = onboarding.vehicleType;
    _modelController.text = onboarding.carModel;
    _colorController.text = onboarding.color;
    _regNumberController.text = onboarding.registrationNumber;
  }

  @override
  void dispose() {
    _modelController.dispose();
    _colorController.dispose();
    _regNumberController.dispose();
    super.dispose();
  }

  void _handleContinue() {
    if (!_formKey.currentState!.validate()) return;

    final onboarding = context.read<OnboardingProvider>();
    onboarding.setVehicleDetails(
      vehicleType: _selectedVehicleType,
      carModel: _modelController.text.trim().isNotEmpty
          ? _modelController.text.trim()
          : 'Honda City',
      color: _colorController.text.trim().isNotEmpty
          ? _colorController.text.trim()
          : 'White',
      registrationNumber: _regNumberController.text.trim().isNotEmpty
          ? _regNumberController.text.trim().toUpperCase()
          : 'HR26 AB 1234',
    );

    context.push(AppRoutes.onboardingDocumentsScreen);
  }

  @override
  Widget build(BuildContext context) {
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
                      currentStep: 2,
                      onBack: () => context.pop(),
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    // ── Title & Subtitle ─────────────────────────────────────
                    Text(
                      'Vehicle Information',
                      style: AppTypography.h1(
                        color: AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      'Add your vehicle details',
                      style: AppTypography.body(
                        color: AppColors.textSecondaryLight,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xxl),

                    // ── Vehicle Type Dropdown ────────────────────────────────
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Vehicle Type',
                          style: AppTypography.caption(
                            color: AppColors.textSecondaryLight,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceLight,
                            borderRadius: BorderRadius.circular(AppRadius.md),
                            border: Border.all(color: AppColors.borderLight),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: _selectedVehicleType,
                              isExpanded: true,
                              icon: Icon(
                                Icons.keyboard_arrow_down_rounded,
                                color: AppColors.textSecondaryLight,
                              ),
                              items: _vehicleTypes.map((type) {
                                return DropdownMenuItem<String>(
                                  value: type,
                                  child: Text(
                                    type,
                                    style: AppTypography.body(
                                      color: AppColors.textPrimaryLight,
                                    ),
                                  ),
                                );
                              }).toList(),
                              onChanged: (val) {
                                if (val != null) {
                                  setState(() => _selectedVehicleType = val);
                                }
                              },
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    // ── Car Model Input ──────────────────────────────────────
                    AppTextField(
                      controller: _modelController,
                      label: 'Car Model (Optional)',
                      hintText: 'Honda City',
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    // ── Color Input ──────────────────────────────────────────
                    AppTextField(
                      controller: _colorController,
                      label: 'Color (Optional)',
                      hintText: 'White',
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    // ── Registration Number Input ────────────────────────────
                    AppTextField(
                      controller: _regNumberController,
                      label: 'Registration Number (Optional)',
                      hintText: 'HR26 AB 1234',
                      textCapitalization: TextCapitalization.characters,
                    ),
                    const SizedBox(height: AppSpacing.xxxl),

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
