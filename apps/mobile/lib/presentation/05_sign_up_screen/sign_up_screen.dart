import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
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

/// Screen 5: Create your account (Sign Up) with single Email field and Google Auth.
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
  final _emailController = TextEditingController();

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
    _emailController.dispose();
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

  String? _validateEmail(String? val) {
    if (val == null || val.trim().isEmpty) {
      return 'Please enter your email address';
    }
    final email = val.trim().toLowerCase();
    final emailRegex = RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$');
    if (!emailRegex.hasMatch(email)) {
      return 'Please enter a valid email address';
    }
    return null;
  }

  Future<void> _handleSignUp() async {
    final emailRaw = _emailController.text.trim().toLowerCase();
    final emailError = _validateEmail(emailRaw);
    if (emailError != null) {
      _formKey.currentState?.validate();
      AppToast.showError(emailError, context: context);
      return;
    }

    if (!_agreeToTerms) {
      AppToast.showWarning('Please accept the Terms & Conditions and Privacy Policy to proceed', context: context);
      return;
    }

    if (!_formKey.currentState!.validate()) {
      AppToast.showError('Please enter a valid email address', context: context);
      return;
    }

    setState(() => _isLoading = true);

    try {
      final authService = context.read<AuthService>();
      final onboarding = context.read<OnboardingProvider>();

      final isDriver = onboarding.role == 'DRIVER';
      onboarding.setPersonalDetails(
        fullName: onboarding.fullName.isNotEmpty ? onboarding.fullName : (isDriver ? 'Driver' : 'User'),
        dateOfBirth: onboarding.dateOfBirth,
        gender: onboarding.gender,
        email: emailRaw,
      );

      final res = await authService.requestOtp(
        email: emailRaw,
        channel: 'EMAIL',
        role: onboarding.role,
        isRegister: true,
      );

      if (mounted) {
        final message = res is Map && res['message'] != null ? res['message'] : 'OTP sent to $emailRaw';
        AppToast.showSuccess(message, context: context);

        context.push(
          AppRoutes.loginOtpScreen,
          extra: {
            'email': emailRaw,
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
    if (!_agreeToTerms) {
      AppToast.showWarning('Please accept the Terms & Conditions and Privacy Policy to proceed', context: context);
      return;
    }

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
          '${isGoogle ? "Google" : "Apple"} verified! Welcome ${result.user.fullName ?? ""}',
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

                    // ── Single Input: Email Address ──────────────────────────
                    AppTextField(
                      controller: _emailController,
                      label: isDriver ? 'Email Address *' : 'Corporate Email Address *',
                      hintText: isDriver ? 'name@example.com' : 'traveldesk@company.com',
                      prefixIcon: Icon(
                        Icons.email_outlined,
                        size: 20,
                        color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                      ),
                      keyboardType: TextInputType.emailAddress,
                      validator: _validateEmail,
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

                    // ── Primary Action: Continue with Email ──────────────────
                    AppPrimaryButton(
                      text: 'Continue with Email',
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

                    // ── Social Sign-Up (Google) ──────────────────────────────
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
                                  : 'Switched to Driver registration',
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
                                    color: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.12),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(
                                    isDriver ? Icons.business_center_outlined : Icons.directions_car_outlined,
                                    size: 20,
                                    color: isDark ? AppColors.primaryLight : AppColors.primary,
                                  ),
                                ),
                                const SizedBox(width: AppSpacing.md),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        isDriver ? 'Registering as a Corporate Business?' : 'Registering as a Commercial Driver?',
                                        style: AppTypography.caption(
                                          color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        isDriver ? 'Switch to Business Account' : 'Switch to Driver',
                                        style: AppTypography.body(
                                          color: isDark ? AppColors.primaryLight : AppColors.primary,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Icon(
                                  Icons.arrow_forward_ios_rounded,
                                  size: 14,
                                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
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
