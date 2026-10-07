import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/utils/app_toast.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_provider.dart';
import '../../services/auth_service.dart';
import '../../services/onboarding_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_primary_button.dart';
import '../../widgets/common/app_social_auth_button.dart';
import '../../widgets/common/app_text_field.dart';

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
  final _referralController = TextEditingController();

  bool _agreeToTerms = true;
  bool _isLoading = false;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _referralController.dispose();
    super.dispose();
  }

  Future<void> _handleSignUp() async {
    final name = _nameController.text.trim();
    if (name.isEmpty || name.length < 2) {
      _formKey.currentState?.validate();
      AppToast.showError('Please enter your full legal name', context: context);
      return;
    }

    final phoneRaw = _phoneController.text.trim();
    final digits = phoneRaw.replaceAll(RegExp(r'\D'), '');
    if (digits.length < 10) {
      _formKey.currentState?.validate();
      AppToast.showError('Please enter a valid 10-digit mobile number', context: context);
      return;
    }
    final formattedPhone = digits.length == 10 ? '+91$digits' : (phoneRaw.startsWith('+') ? phoneRaw : '+$digits');

    final emailRaw = _emailController.text.trim().toLowerCase();
    final onboarding = context.read<OnboardingProvider>();
    final isDriver = onboarding.isDriver;

    if (!isDriver && emailRaw.isEmpty) {
      _formKey.currentState?.validate();
      AppToast.showError('Corporate email address is required for business accounts', context: context);
      return;
    }

    if (emailRaw.isNotEmpty && (!emailRaw.contains('@') || !emailRaw.contains('.'))) {
      _formKey.currentState?.validate();
      AppToast.showError('Please enter a valid email address', context: context);
      return;
    }

    if (!_agreeToTerms) {
      AppToast.showWarning('Please agree to Terms & Conditions and Privacy Policy', context: context);
      return;
    }

    if (!_formKey.currentState!.validate()) {
      AppToast.showError('Please correct the highlighted fields', context: context);
      return;
    }

    setState(() => _isLoading = true);

    try {
      final authService = context.read<AuthService>();

      onboarding.setPersonalDetails(
        fullName: name,
        dateOfBirth: onboarding.dateOfBirth,
        gender: onboarding.gender,
        email: emailRaw.isNotEmpty ? emailRaw : null,
        phone: formattedPhone,
      );

      final res = await authService.requestOtp(
        phone: formattedPhone,
        email: emailRaw.isNotEmpty ? emailRaw : null,
        channel: 'SMS',
        role: onboarding.role,
        isRegister: true,
        fullName: name,
      );

      if (mounted) {
        AppToast.showSuccess(
          res['message'] ?? 'OTP sent to $formattedPhone',
          context: context,
        );

        context.push(
          AppRoutes.loginOtpScreen,
          extra: {
            'phone': formattedPhone,
            'email': emailRaw.isNotEmpty ? emailRaw : null,
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

  Future<void> _handleSocialAuth(SocialAuthType type) async {
    setState(() => _isLoading = true);

    try {
      final authService = context.read<AuthService>();
      final onboarding = context.read<OnboardingProvider>();

      final isGoogle = type == SocialAuthType.google;
      final result = isGoogle
          ? await authService.signInWithGoogle(role: onboarding.role)
          : await authService.signInWithApple(role: onboarding.role);

      onboarding.setPersonalDetails(
        fullName: result.user.fullName ?? '',
        dateOfBirth: onboarding.dateOfBirth,
        gender: onboarding.gender,
        email: result.user.email,
        phone: result.user.phone,
      );

      if (mounted) {
        context.read<AuthProvider>().setUser(result.user);
        AppToast.showSuccess(
          '${isGoogle ? "Google" : "Apple"} verified! Create your password to continue.',
          context: context,
        );

        if (!result.user.hasPassword) {
          context.push(AppRoutes.setPasswordScreen);
        } else if (!result.user.isOnboarded) {
          context.push(AppRoutes.onboardingPersonalScreen);
        } else if (result.user.isDriver) {
          if (!result.user.isVerified) {
            context.go(AppRoutes.waitlistGateScreen);
          } else {
            context.go(AppRoutes.homeScreen);
          }
        } else {
          context.go(AppRoutes.userHomeScreen);
        }
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

                    // ── Form Inputs ──────────────────────────────────────────
                    AppTextField(
                      controller: _nameController,
                      label: isDriver ? 'Full Legal Name *' : 'Contact Person Full Name *',
                      hintText: 'Enter full legal name',
                      prefixIcon: const Icon(Icons.person_outline, size: 20),
                      validator: (val) {
                        if (val == null || val.trim().length < 2) {
                          return 'Enter legal full name (min 2 characters)';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: AppSpacing.md),

                    AppTextField(
                      controller: _phoneController,
                      label: 'Mobile Number *',
                      hintText: '10-digit mobile number',
                      prefixIcon: Padding(
                        padding: const EdgeInsets.only(left: 12, right: 8),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Text('🇮🇳', style: TextStyle(fontSize: 16)),
                            const SizedBox(width: 4),
                            Text(
                              '+91',
                              style: TextStyle(
                                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                              ),
                            ),
                          ],
                        ),
                      ),
                      keyboardType: TextInputType.phone,
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) {
                          return 'Enter your mobile number';
                        }
                        final d = val.replaceAll(RegExp(r'\D'), '');
                        if (d.length < 10) {
                          return 'Enter a valid 10-digit mobile number';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: AppSpacing.md),

                    AppTextField(
                      controller: _emailController,
                      label: isDriver ? 'Email Address (Optional)' : 'Corporate Email Address *',
                      hintText: isDriver ? 'e.g. driver@example.com' : 'e.g. traveldesk@company.com',
                      prefixIcon: const Icon(Icons.email_outlined, size: 20),
                      keyboardType: TextInputType.emailAddress,
                      validator: (val) {
                        final email = val?.trim() ?? '';
                        if (!isDriver && email.isEmpty) {
                          return 'Corporate email is required for business accounts';
                        }
                        if (email.isNotEmpty && (!email.contains('@') || !email.contains('.'))) {
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
                          activeColor: isDark ? AppColors.primaryLight : AppColors.primary,
                        ),
                        Expanded(
                          child: Text.rich(
                            TextSpan(
                              text: 'I agree to the ',
                              style: AppTypography.caption(
                                color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                              ),
                              children: [
                                TextSpan(
                                  text: 'Terms & Conditions',
                                  style: TextStyle(
                                    color: isDark ? AppColors.primaryLight : AppColors.primary,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const TextSpan(text: ' and '),
                                TextSpan(
                                  text: 'Privacy Policy',
                                  style: TextStyle(
                                    color: isDark ? AppColors.primaryLight : AppColors.primary,
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
                        Expanded(child: Divider(color: isDark ? AppColors.borderDark : AppColors.borderLight)),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                          child: Text(
                            'OR',
                            style: AppTypography.caption(
                              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        Expanded(child: Divider(color: isDark ? AppColors.borderDark : AppColors.borderLight)),
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
                              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                            ),
                            children: [
                              TextSpan(
                                text: 'Sign in',
                                style: AppTypography.body(
                                  color: isDark ? AppColors.primaryLight : AppColors.primary,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    // ── Role Switcher: Sign up as Business / Driver ─────────
                    Container(
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.primarySubtle.withValues(alpha: 0.6),
                        borderRadius: BorderRadius.circular(AppRadius.md),
                        border: Border.all(
                          color: isDark ? AppColors.borderDark : AppColors.primaryLight.withValues(alpha: 0.35),
                          width: 1,
                        ),
                      ),
                      child: Material(
                        color: Colors.transparent,
                        child: InkWell(
                          onTap: () {
                            final nextRole = isDriver ? 'VENDOR' : 'DRIVER';
                            onboarding.setRole(nextRole);
                            AppToast.showInfo(
                              isDriver
                                  ? 'Switched to Business Account registration'
                                  : 'Switched to Driver Partner registration',
                              context: context,
                            );
                          },
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.md,
                              vertical: 14,
                            ),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: isDark ? AppColors.primaryLight : AppColors.primary,
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
                                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                      Text(
                                        isDriver
                                            ? 'Book outstation rides & bulk corporate travel'
                                            : 'Join as a verified driver partner',
                                        style: AppTypography.caption(
                                          color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
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
                                    color: isDark ? AppColors.primaryLight : AppColors.primary,
                                    borderRadius: BorderRadius.circular(AppRadius.sm),
                                  ),
                                  child: Text(
                                    isDriver ? 'Join as Business' : 'Join as Driver',
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
