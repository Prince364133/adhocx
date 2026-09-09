import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_service.dart';
import '../../services/onboarding_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_phone_field.dart';
import '../../widgets/common/app_primary_button.dart';
import '../../widgets/common/app_social_auth_button.dart';
import '../../widgets/common/app_text_field.dart';

enum SignUpInputMode { phone, email }

/// Screen 5: Create your account (Sign Up) supporting Phone, Email & Social Auth.
class SignUpScreen extends StatefulWidget {
  const SignUpScreen({super.key});

  @override
  State<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends State<SignUpScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _referralController = TextEditingController();

  SignUpInputMode _inputMode = SignUpInputMode.phone;
  bool _obscurePassword = true;
  bool _agreeToTerms = true;
  bool _isLoading = false;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _referralController.dispose();
    super.dispose();
  }

  Future<void> _handleSignUp() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_agreeToTerms) {
      Fluttertoast.showToast(
        msg: 'Please agree to Terms & Conditions and Privacy Policy',
        backgroundColor: AppColors.warning,
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final onboarding = context.read<OnboardingProvider>();
      final authService = context.read<AuthService>();

      String? phoneTarget;
      String? emailTarget;

      if (_inputMode == SignUpInputMode.phone) {
        final rawPhone = _phoneController.text.trim().replaceAll(RegExp(r'\D'), '');
        phoneTarget = '+91$rawPhone';
      } else {
        emailTarget = _emailController.text.trim();
      }

      onboarding.setPersonalDetails(
        fullName: _nameController.text.trim(),
        dateOfBirth: onboarding.dateOfBirth,
        gender: onboarding.gender,
        email: emailTarget,
        phone: phoneTarget,
      );

      final res = await authService.requestOtp(
        phone: phoneTarget,
        email: emailTarget,
        channel: _inputMode == SignUpInputMode.phone ? 'SMS' : 'EMAIL',
        role: onboarding.role,
        isRegister: true,
        fullName: _nameController.text.trim(),
      );

      if (mounted) {
        final targetDisplay = phoneTarget ?? emailTarget ?? 'your address';
        Fluttertoast.showToast(
          msg: res['message'] ?? 'OTP sent to $targetDisplay',
          backgroundColor: AppColors.primaryDark,
          textColor: Colors.white,
        );

        context.push(
          AppRoutes.loginOtpScreen,
          extra: {
            'phone': phoneTarget,
            'email': emailTarget,
            'role': onboarding.role,
            'isRegister': true,
          },
        );
      }
    } catch (e) {
      if (mounted) {
        Fluttertoast.showToast(
          msg: e.toString().replaceFirst('Exception: ', ''),
          backgroundColor: AppColors.error,
          textColor: Colors.white,
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleSocialAuth(SocialAuthType type) async {
    setState(() => _isLoading = true);

    try {
      final authService = context.read<AuthService>();
      final onboarding = context.read<OnboardingProvider>();

      final isGoogle = type == SocialAuthType.google;
      final socialEmail = isGoogle ? 'google.user@gmail.com' : 'apple.user@privaterelay.appleid.com';
      final socialName = isGoogle ? 'Google User' : 'Apple User';

      final result = isGoogle
          ? await authService.signInWithGoogle(role: onboarding.role)
          : await authService.signInWithApple(role: onboarding.role, email: socialEmail, fullName: socialName);

      onboarding.setPersonalDetails(
        fullName: result.user.fullName ?? socialName,
        dateOfBirth: onboarding.dateOfBirth,
        gender: onboarding.gender,
        email: result.user.email ?? socialEmail,
        phone: result.user.phone,
      );

      if (mounted) {
        Fluttertoast.showToast(
          msg: '${isGoogle ? "Google" : "Apple"} verified! Create your password to continue.',
          backgroundColor: AppColors.accentGreenDark,
          textColor: Colors.white,
        );

        context.push(AppRoutes.setPasswordScreen);
      }
    } catch (e) {
      if (mounted) {
        Fluttertoast.showToast(
          msg: e.toString().replaceFirst('Exception: ', ''),
          backgroundColor: AppColors.error,
          textColor: Colors.white,
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
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
                            color: AppColors.textPrimaryLight,
                          ),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.md),

                    const SizedBox(height: AppSpacing.md),

                    // ── Title & Subtitle ─────────────────────────────────────
                    Text(
                      isDriver ? 'Create Driver Account' : 'Create Business Account',
                      style: AppTypography.h1(
                        color: AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      isDriver
                          ? 'Drive, earn & fulfill corporate fleet trips with AdhocX'
                          : 'Book outstation rides & bulk corporate travel with ease',
                      style: AppTypography.body(
                        color: AppColors.textSecondaryLight,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    // ── Phone vs Email Switcher ──────────────────────────────
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: AppColors.borderLight.withValues(alpha: 0.4),
                        borderRadius: BorderRadius.circular(AppRadius.md),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: GestureDetector(
                              onTap: () => setState(() => _inputMode = SignUpInputMode.phone),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                decoration: BoxDecoration(
                                  color: _inputMode == SignUpInputMode.phone ? Colors.white : Colors.transparent,
                                  borderRadius: BorderRadius.circular(AppRadius.sm),
                                  boxShadow: _inputMode == SignUpInputMode.phone
                                      ? [
                                          BoxShadow(
                                            color: Colors.black.withValues(alpha: 0.08),
                                            blurRadius: 4,
                                            offset: const Offset(0, 2),
                                          ),
                                        ]
                                      : null,
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.phone_iphone_rounded,
                                      size: 16,
                                      color: _inputMode == SignUpInputMode.phone
                                          ? AppColors.primary
                                          : AppColors.textSecondaryLight,
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      'Mobile Number',
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: _inputMode == SignUpInputMode.phone ? FontWeight.w700 : FontWeight.w500,
                                        color: _inputMode == SignUpInputMode.phone
                                            ? AppColors.textPrimaryLight
                                            : AppColors.textSecondaryLight,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          Expanded(
                            child: GestureDetector(
                              onTap: () => setState(() => _inputMode = SignUpInputMode.email),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                decoration: BoxDecoration(
                                  color: _inputMode == SignUpInputMode.email ? Colors.white : Colors.transparent,
                                  borderRadius: BorderRadius.circular(AppRadius.sm),
                                  boxShadow: _inputMode == SignUpInputMode.email
                                      ? [
                                          BoxShadow(
                                            color: Colors.black.withValues(alpha: 0.08),
                                            blurRadius: 4,
                                            offset: const Offset(0, 2),
                                          ),
                                        ]
                                      : null,
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.email_outlined,
                                      size: 16,
                                      color: _inputMode == SignUpInputMode.email
                                          ? AppColors.primary
                                          : AppColors.textSecondaryLight,
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      'Email Address',
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: _inputMode == SignUpInputMode.email ? FontWeight.w700 : FontWeight.w500,
                                        color: _inputMode == SignUpInputMode.email
                                            ? AppColors.textPrimaryLight
                                            : AppColors.textSecondaryLight,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    // ── Form Inputs ──────────────────────────────────────────
                    AppTextField(
                      controller: _nameController,
                      label: 'Full Name',
                      hintText: 'Enter full name',
                      validator: (val) {
                        if (val == null || val.trim().length < 2) {
                          return 'Enter your legal full name';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: AppSpacing.md),

                    if (_inputMode == SignUpInputMode.phone)
                      AppPhoneField(
                        controller: _phoneController,
                        label: 'Mobile Number',
                        hintText: '98765 43210',
                        validator: (val) {
                          final digits = (val ?? '').replaceAll(RegExp(r'\D'), '');
                          if (digits.length != 10) {
                            return 'Enter a valid 10-digit mobile number';
                          }
                          return null;
                        },
                      )
                    else
                      AppTextField(
                        controller: _emailController,
                        label: 'Email Address',
                        hintText: 'name@example.com',
                        keyboardType: TextInputType.emailAddress,
                        prefixIcon: Icon(Icons.email_outlined, size: 20, color: AppColors.textSecondaryLight),
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return 'Email address is required';
                          }
                          final emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
                          if (!emailRegex.hasMatch(val.trim())) {
                            return 'Enter a valid email address';
                          }
                          return null;
                        },
                      ),
                    const SizedBox(height: AppSpacing.md),

                    AppTextField(
                      controller: _referralController,
                      label: 'Referral Code (Optional)',
                      hintText: 'Enter referral code',
                    ),
                    const SizedBox(height: AppSpacing.md),

                    // ── Terms & Privacy Checkbox ─────────────────────────────
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Checkbox(
                          value: _agreeToTerms,
                          onChanged: (val) => setState(() => _agreeToTerms = val ?? false),
                          activeColor: AppColors.primary,
                        ),
                        Expanded(
                          child: Text.rich(
                            TextSpan(
                              text: 'I agree to the ',
                              style: AppTypography.caption(
                                color: AppColors.textSecondaryLight,
                              ),
                              children: const [
                                TextSpan(
                                  text: 'Terms & Conditions',
                                  style: TextStyle(
                                    color: AppColors.primary,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                TextSpan(text: ' and '),
                                TextSpan(
                                  text: 'Privacy Policy',
                                  style: TextStyle(
                                    color: AppColors.primary,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    // ── Primary Action ───────────────────────────────────────
                    AppPrimaryButton(
                      text: 'Sign Up',
                      isLoading: _isLoading,
                      onPressed: _handleSignUp,
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    // ── OR Divider ───────────────────────────────────────────
                    Row(
                      children: [
                        const Expanded(child: Divider(color: AppColors.borderLight)),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                          child: Text(
                            'OR',
                            style: AppTypography.caption(
                              color: AppColors.textMutedLight,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const Expanded(child: Divider(color: AppColors.borderLight)),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    // ── Social Sign-Up ───────────────────────────────────────
                    AppSocialAuthButton(
                      type: SocialAuthType.google,
                      onPressed: () => _handleSocialAuth(SocialAuthType.google),
                    ),
                    const SizedBox(height: AppSpacing.xxl),

                    // ── Footer: Already have an account? Sign in ─────────────
                    Center(
                      child: GestureDetector(
                        onTap: () => context.push(AppRoutes.signInScreen),
                        child: Text.rich(
                          TextSpan(
                            text: 'Already have an account? ',
                            style: AppTypography.body(
                              color: AppColors.textSecondaryLight,
                            ),
                            children: [
                              TextSpan(
                                text: 'Sign in',
                                style: AppTypography.body(
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    // ── Role Switcher Banner (Vendor / Driver) ─────────────
                    Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: () {
                          final nextRole = isDriver ? 'VENDOR' : 'DRIVER';
                          onboarding.setRole(nextRole);
                          Fluttertoast.showToast(
                            msg: isDriver
                                ? 'Switched to Business Account registration'
                                : 'Switched to Driver Partner registration',
                            backgroundColor: AppColors.primaryDark,
                            textColor: Colors.white,
                          );
                        },
                        borderRadius: BorderRadius.circular(AppRadius.md),
                        child: Ink(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.md,
                            vertical: AppSpacing.sm + 4,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.primarySubtle,
                            borderRadius: BorderRadius.circular(AppRadius.md),
                            border: Border.all(
                              color: AppColors.primaryLight.withValues(alpha: 0.4),
                              width: 1.2,
                            ),
                          ),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: AppColors.primary,
                                  borderRadius: BorderRadius.circular(AppRadius.sm),
                                ),
                                child: Icon(
                                  isDriver ? Icons.business_center_rounded : Icons.local_taxi_rounded,
                                  color: Colors.white,
                                  size: 18,
                                ),
                              ),
                              const SizedBox(width: AppSpacing.md),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      isDriver
                                          ? 'Sign up as a Business'
                                          : 'Drive & Earn with AdhocX',
                                      style: AppTypography.small(
                                        color: AppColors.textPrimaryLight,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    Text(
                                      isDriver
                                          ? 'Book outstation rides & bulk corporate travel'
                                          : 'Join as a verified driver partner',
                                      style: AppTypography.caption(
                                        color: AppColors.textSecondaryLight,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.primary,
                                  borderRadius: BorderRadius.circular(AppRadius.sm),
                                ),
                                child: Text(
                                  isDriver ? 'Sign up as Business' : 'Sign up as Driver',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
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
        ),
      ),
    );
  }
}
