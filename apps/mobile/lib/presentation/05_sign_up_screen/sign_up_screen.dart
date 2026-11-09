import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/utils/app_toast.dart';
import '../../core/utils/name_utils.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_service.dart';
import '../../services/onboarding_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_primary_button.dart';
import '../../widgets/common/app_text_field.dart';

/// Screen 5: Create your account (Sign Up) with Mobile (+91) SMS OTP.
/// Email and Google auth completely removed as per SMS phone authentication mandate.
class SignUpScreen extends StatefulWidget {
  const SignUpScreen({super.key});

  @override
  State<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends State<SignUpScreen> {
  static const String _termsUrl = 'https://www.adhocx.com/terms/';
  static const String _privacyUrl = 'https://www.adhocx.com/privacy/';

  late final TapGestureRecognizer _termsRecognizer;
  late final TapGestureRecognizer _privacyRecognizer;

  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();

  bool _agreeToTerms = false;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _termsRecognizer = TapGestureRecognizer()..onTap = () => _launchWebUrl(_termsUrl);
    _privacyRecognizer = TapGestureRecognizer()..onTap = () => _launchWebUrl(_privacyUrl);
  }

  @override
  void dispose() {
    _termsRecognizer.dispose();
    _privacyRecognizer.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _launchWebUrl(String url) async {
    try {
      final uri = Uri.parse(url);
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched && mounted) {
        AppToast.showError('Could not open $url', context: context);
      }
    } catch (e) {
      if (mounted) {
        AppToast.showError('Error opening link: $e', context: context);
      }
    }
  }

  String _cleanIndianDigits(String raw) {
    String digits = raw.replaceAll(RegExp(r'[^0-9]'), '');
    if (digits.startsWith('91') && digits.length == 12) {
      digits = digits.substring(2);
    } else if (digits.startsWith('0') && digits.length == 11) {
      digits = digits.substring(1);
    }
    return digits;
  }

  String? _validatePhone(String? val) {
    if (val == null || val.trim().isEmpty) {
      return 'Please enter your 10-digit mobile number';
    }
    final digits = _cleanIndianDigits(val.trim());
    if (digits.length != 10 || !RegExp(r'^[6-9]\d{9}$').hasMatch(digits)) {
      return 'Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)';
    }
    return null;
  }

  Future<void> _handleSignUp() async {
    final validationError = _validatePhone(_phoneController.text);
    if (validationError != null) {
      _formKey.currentState?.validate();
      AppToast.showError(validationError, context: context);
      return;
    }

    if (!_agreeToTerms) {
      AppToast.showWarning('Please accept the Terms & Conditions and Privacy Policy to proceed', context: context);
      return;
    }

    if (!_formKey.currentState!.validate()) {
      AppToast.showError('Please check the highlighted field', context: context);
      return;
    }

    setState(() => _isLoading = true);

    try {
      final authService = context.read<AuthService>();
      final onboarding = context.read<OnboardingProvider>();

      final digits = _cleanIndianDigits(_phoneController.text);
      final phoneE164 = '+91$digits';

      onboarding.setPersonalDetails(
        fullName: !isPlaceholderName(onboarding.fullName) ? onboarding.fullName : '',
        dateOfBirth: onboarding.dateOfBirth,
        gender: onboarding.gender,
        phone: phoneE164,
      );

      final res = await authService.requestOtp(
        phone: phoneE164,
        channel: 'SMS',
        role: onboarding.role,
        isRegister: true,
      );

      if (mounted) {
        final message = res is Map && res['message'] != null
            ? res['message']
            : 'SMS OTP sent to $phoneE164';
        AppToast.showSuccess(message, context: context);

        context.push(
          AppRoutes.loginOtpScreen,
          extra: {
            'phone': phoneE164,
            'role': onboarding.role,
            'isRegister': true,
          },
        );
      }
    } catch (e) {
      if (mounted) {
        AppToast.showError(e, context: context);
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
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
                    // ── Top Navigation Bar ───────────────────────────────────
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
                      ],
                    ),
                    const SizedBox(height: AppSpacing.md),

                    // ── Title & Subtitle ─────────────────────────────────────
                    Text(
                      'Create your account',
                      style: AppTypography.h1(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      isDriver
                          ? 'Drive, earn & fulfill corporate fleet trips with AdhocX'
                          : 'Book outstation rides & bulk corporate travel with ease',
                      style: AppTypography.body(
                        color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    // ── Input Field: Mobile Number (India +91) ───────────────
                    AppTextField(
                      controller: _phoneController,
                      label: 'Mobile Number (India) *',
                      hintText: '98765 43210',
                      keyboardType: TextInputType.phone,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                        LengthLimitingTextInputFormatter(10),
                      ],
                      prefixIcon: Padding(
                        padding: const EdgeInsets.only(left: 12, right: 8),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Text('🇮🇳', style: TextStyle(fontSize: 16)),
                            const SizedBox(width: 5),
                            Text(
                              '+91',
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 14,
                                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Container(
                              height: 18,
                              width: 1,
                              color: isDark ? AppColors.borderDark : AppColors.borderLight,
                            ),
                          ],
                        ),
                      ),
                      validator: _validatePhone,
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    // ── Terms & Privacy Checkbox ─────────────────────────────
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SizedBox(
                          width: 24,
                          height: 24,
                          child: Checkbox(
                            value: _agreeToTerms,
                            onChanged: (val) => setState(() => _agreeToTerms = val ?? false),
                            activeColor: isDark ? AppColors.primaryLight : AppColors.primary,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(AppRadius.xs),
                            ),
                            side: BorderSide(
                              color: _agreeToTerms
                                  ? (isDark ? AppColors.primaryLight : AppColors.primary)
                                  : (isDark ? AppColors.borderDark : AppColors.borderLight),
                              width: 1.5,
                            ),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: GestureDetector(
                            onTap: () => setState(() => _agreeToTerms = !_agreeToTerms),
                            behavior: HitTestBehavior.opaque,
                            child: Text.rich(
                              TextSpan(
                                text: 'I accept the ',
                                style: AppTypography.caption(
                                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                ).copyWith(height: 1.4),
                                children: [
                                  TextSpan(
                                    text: 'Terms & Conditions',
                                    recognizer: _termsRecognizer,
                                    style: TextStyle(
                                      color: isDark ? AppColors.primaryLight : AppColors.primary,
                                      fontWeight: FontWeight.bold,
                                      decoration: TextDecoration.underline,
                                      decorationColor: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.6),
                                    ),
                                  ),
                                  const TextSpan(text: ' and '),
                                  TextSpan(
                                    text: 'Privacy Policy',
                                    recognizer: _privacyRecognizer,
                                    style: TextStyle(
                                      color: isDark ? AppColors.primaryLight : AppColors.primary,
                                      fontWeight: FontWeight.bold,
                                      decoration: TextDecoration.underline,
                                      decorationColor: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.6),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    // ── Primary Action: Continue with SMS OTP ────────────────
                    AppPrimaryButton(
                      text: 'Continue with SMS OTP',
                      isLoading: _isLoading,
                      onPressed: _handleSignUp,
                    ),
                    const SizedBox(height: AppSpacing.xxl),

                    // ── Footer: Already have an account? Sign in ─────────────
                    Wrap(
                      alignment: WrapAlignment.center,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text(
                          'Already have an account? ',
                          style: AppTypography.body(
                            color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                          ),
                        ),
                        GestureDetector(
                          onTap: () {
                            context.go(AppRoutes.signInScreen);
                          },
                          child: Text(
                            'Sign in',
                            style: AppTypography.body(
                              color: isDark ? AppColors.primaryLight : AppColors.primary,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
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
