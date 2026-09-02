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

enum AuthInputMode { phone, email }

/// Screen 3: Login / Sign In with Phone, Email, Google & Apple.
class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  AuthInputMode _inputMode = AuthInputMode.phone;
  bool _isLoading = false;

  @override
  void dispose() {
    _phoneController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _handleContinue() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final authService = context.read<AuthService>();
      final onboarding = context.read<OnboardingProvider>();

      String? phoneTarget;
      String? emailTarget;

      if (_inputMode == AuthInputMode.phone) {
        final rawPhone = _phoneController.text.trim().replaceAll(RegExp(r'\D'), '');
        phoneTarget = '+91$rawPhone';
        onboarding.setPersonalDetails(
          fullName: onboarding.fullName,
          dateOfBirth: onboarding.dateOfBirth,
          gender: onboarding.gender,
          phone: phoneTarget,
        );
      } else {
        emailTarget = _emailController.text.trim();
        onboarding.setPersonalDetails(
          fullName: onboarding.fullName,
          dateOfBirth: onboarding.dateOfBirth,
          gender: onboarding.gender,
          email: emailTarget,
        );
      }

      final res = await authService.requestOtp(
        phone: phoneTarget,
        email: emailTarget,
        channel: _inputMode == AuthInputMode.phone ? 'SMS' : 'EMAIL',
        role: onboarding.role,
        isRegister: false,
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
            'isRegister': false,
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
      final socialEmail = isGoogle ? 'rahul.google@gmail.com' : 'rahul.apple@privaterelay.appleid.com';
      final socialName = isGoogle ? 'Rahul Sharma (Google)' : 'Rahul Sharma (Apple)';

      final result = isGoogle
          ? await authService.signInWithGoogle(role: onboarding.role, email: socialEmail, fullName: socialName)
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

        // Pre-verified social auth skips OTP and proceeds directly to Set Password
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
                    // ── Top Back Button ──────────────────────────────────────
                    Row(
                      children: [
                        IconButton(
                          onPressed: () {
                            if (context.canPop()) {
                              context.pop();
                            } else {
                              context.go(AppRoutes.languageSelectionScreen);
                            }
                          },
                          icon: const Icon(
                            Icons.arrow_back,
                            color: AppColors.textPrimaryLight,
                          ),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    // ── Title & Subtitle ─────────────────────────────────────
                    Text(
                      'Welcome back!',
                      style: AppTypography.h1(
                        color: AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      'Sign in with Phone, Email, or Social account',
                      style: AppTypography.body(
                        color: AppColors.textSecondaryLight,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    // ── Phone / Email Segmented Switcher ─────────────────────
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
                              onTap: () => setState(() => _inputMode = AuthInputMode.phone),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                decoration: BoxDecoration(
                                  color: _inputMode == AuthInputMode.phone ? Colors.white : Colors.transparent,
                                  borderRadius: BorderRadius.circular(AppRadius.sm),
                                  boxShadow: _inputMode == AuthInputMode.phone
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
                                      color: _inputMode == AuthInputMode.phone
                                          ? AppColors.primary
                                          : AppColors.textSecondaryLight,
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      'Mobile Number',
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: _inputMode == AuthInputMode.phone ? FontWeight.w700 : FontWeight.w500,
                                        color: _inputMode == AuthInputMode.phone
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
                              onTap: () => setState(() => _inputMode = AuthInputMode.email),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                decoration: BoxDecoration(
                                  color: _inputMode == AuthInputMode.email ? Colors.white : Colors.transparent,
                                  borderRadius: BorderRadius.circular(AppRadius.sm),
                                  boxShadow: _inputMode == AuthInputMode.email
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
                                      color: _inputMode == AuthInputMode.email
                                          ? AppColors.primary
                                          : AppColors.textSecondaryLight,
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      'Email Address',
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: _inputMode == AuthInputMode.email ? FontWeight.w700 : FontWeight.w500,
                                        color: _inputMode == AuthInputMode.email
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
                    const SizedBox(height: AppSpacing.xl),

                    // ── Active Form Input: Phone vs Email ───────────────────
                    if (_inputMode == AuthInputMode.phone)
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
                        hintText: 'rahul.sharma@example.com',
                        keyboardType: TextInputType.emailAddress,
                        prefixIcon: const Icon(Icons.email_outlined, size: 20, color: AppColors.textSecondaryLight),
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
                    const SizedBox(height: AppSpacing.xl),

                    // ── Continue Action Button ───────────────────────────────
                    AppPrimaryButton(
                      text: 'Continue',
                      isLoading: _isLoading,
                      onPressed: _handleContinue,
                    ),
                    const SizedBox(height: AppSpacing.sm),

                    // Forgot Password option
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: () => context.push(AppRoutes.forgotPasswordScreen),
                        child: Text(
                          'Forgot Password?',
                          style: AppTypography.caption(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.md),

                    // ── OR Divider ───────────────────────────────────────────
                    Row(
                      children: [
                        const Expanded(
                          child: Divider(color: AppColors.borderLight),
                        ),
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
                        const Expanded(
                          child: Divider(color: AppColors.borderLight),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    // ── Social Logins (Google & Apple) ───────────────────────
                    AppSocialAuthButton(
                      type: SocialAuthType.google,
                      onPressed: () => _handleSocialAuth(SocialAuthType.google),
                    ),
                    const SizedBox(height: AppSpacing.md),
                    AppSocialAuthButton(
                      type: SocialAuthType.apple,
                      onPressed: () => _handleSocialAuth(SocialAuthType.apple),
                    ),
                    const SizedBox(height: AppSpacing.xxxl),

                    // ── Footer: Don't have an account? Sign up ───────────────
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          "Don't have an account? ",
                          style: AppTypography.body(
                            color: AppColors.textSecondaryLight,
                          ),
                        ),
                        GestureDetector(
                          onTap: () => context.push(AppRoutes.signUpScreen),
                          child: Text(
                            'Sign up',
                            style: AppTypography.body(
                              color: AppColors.primary,
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
