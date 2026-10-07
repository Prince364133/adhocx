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
import '../../widgets/common/app_smart_identifier_field.dart';
import '../../widgets/common/app_social_auth_button.dart';
import '../../widgets/common/app_text_field.dart';

/// Screen 3: Login / Sign In with Phone, Email & Password.
class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _formKey = GlobalKey<FormState>();
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _isLoading = false;
  String? _inlineErrorMessage;

  @override
  void initState() {
    super.initState();
    _identifierController.addListener(_clearInlineError);
    _passwordController.addListener(_clearInlineError);
  }

  void _clearInlineError() {
    if (_inlineErrorMessage != null && mounted) {
      setState(() => _inlineErrorMessage = null);
    }
  }

  @override
  void dispose() {
    _identifierController.removeListener(_clearInlineError);
    _passwordController.removeListener(_clearInlineError);
    _identifierController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handlePasswordSignIn() async {
    final text = _identifierController.text.trim();
    if (text.isEmpty) {
      _formKey.currentState?.validate();
      const msg = 'Please enter your mobile number or email address';
      setState(() => _inlineErrorMessage = msg);
      AppToast.showError(msg, context: context);
      return;
    }

    final identifierError = AppSmartIdentifierField.validate(text);
    if (identifierError != null) {
      _formKey.currentState?.validate();
      setState(() => _inlineErrorMessage = identifierError);
      AppToast.showError(identifierError, context: context);
      return;
    }

    final password = _passwordController.text.trim();
    if (password.isEmpty) {
      _formKey.currentState?.validate();
      const msg = 'Please enter your password';
      setState(() => _inlineErrorMessage = msg);
      AppToast.showError(msg, context: context);
      return;
    }

    if (password.length < 4) {
      _formKey.currentState?.validate();
      const msg = 'Password must be at least 4 characters';
      setState(() => _inlineErrorMessage = msg);
      AppToast.showError(msg, context: context);
      return;
    }

    if (!_formKey.currentState!.validate()) {
      const msg = 'Please correct the highlighted fields';
      setState(() => _inlineErrorMessage = msg);
      AppToast.showError(msg, context: context);
      return;
    }

    setState(() {
      _isLoading = true;
      _inlineErrorMessage = null;
    });

    try {
      final onboarding = context.read<OnboardingProvider>();
      final authService = context.read<AuthService>();

      final parsed = AppSmartIdentifierField.parseIdentifier(text);
      final identifier = parsed['value'] as String;

      final result = await authService.loginWithPassword(
        identifier: identifier,
        password: password,
        role: onboarding.role,
      );

      final user = result.user;
      if (mounted) {
        context.read<AuthProvider>().setUser(user);
        onboarding.setRole(user.role);
        if (user.fullName != null) {
          onboarding.setPersonalDetails(
            fullName: user.fullName!,
            phone: user.phone,
            email: user.email,
          );
        }

        AppToast.showSuccess(
          'Welcome back, ${user.fullName ?? "Partner"}!',
          context: context,
        );

        if (!user.hasPassword) {
          context.go(AppRoutes.setPasswordScreen);
        } else if (!user.isOnboarded && !user.isUnderReview && !user.isVerified) {
          context.go(AppRoutes.onboardingPersonalScreen);
        } else if (!user.isVerified) {
          context.go(AppRoutes.waitlistGateScreen);
        } else if (user.isDriver) {
          context.go(AppRoutes.homeScreen);
        } else {
          context.go(AppRoutes.userHomeScreen);
        }
      }
    } catch (e) {
      if (mounted) {
        final msg = AppToast.cleanErrorMessage(e);
        setState(() => _inlineErrorMessage = msg);
        AppToast.showError(msg, context: context);
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleOtpSignIn() async {
    final text = _identifierController.text.trim();
    if (text.isEmpty) {
      const msg = 'Please enter your mobile number or email for OTP';
      setState(() => _inlineErrorMessage = msg);
      AppToast.showError(msg, context: context);
      return;
    }

    final identifierError = AppSmartIdentifierField.validate(text);
    if (identifierError != null) {
      setState(() => _inlineErrorMessage = identifierError);
      AppToast.showError(identifierError, context: context);
      return;
    }

    setState(() {
      _isLoading = true;
      _inlineErrorMessage = null;
    });

    try {
      final authService = context.read<AuthService>();
      final onboarding = context.read<OnboardingProvider>();

      final parsed = AppSmartIdentifierField.parseIdentifier(text);
      final String? phoneTarget = parsed['phone'];
      final String? emailTarget = parsed['email'];

      final res = await authService.requestOtp(
        phone: phoneTarget,
        email: emailTarget,
        channel: parsed['channel'],
        role: onboarding.role,
        isRegister: false,
      );

      if (mounted) {
        final targetDisplay = phoneTarget ?? emailTarget ?? 'your address';
        final message = res is Map && res['message'] != null ? res['message'] : 'OTP sent to $targetDisplay';
        AppToast.showSuccess(message, context: context);

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
        final msg = AppToast.cleanErrorMessage(e);
        setState(() => _inlineErrorMessage = msg);
        AppToast.showError(msg, context: context);
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

      final result = await authService.signInWithGoogle(role: onboarding.role);
      final user = result.user;

      if (mounted) {
        context.read<AuthProvider>().setUser(user);
        onboarding.setRole(user.role);
        if (user.fullName != null) {
          onboarding.setPersonalDetails(
            fullName: user.fullName!,
            phone: user.phone,
            email: user.email,
          );
        }

        AppToast.showSuccess(
          'Google Sign In successful! Welcome ${user.fullName ?? ""}',
          context: context,
        );

        if (!user.hasPassword) {
          context.go(AppRoutes.setPasswordScreen);
        } else if (!user.isOnboarded) {
          context.go(AppRoutes.onboardingPersonalScreen);
        } else if (user.isDriver) {
          if (!user.isVerified) {
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
        final msg = AppToast.cleanErrorMessage(e);
        setState(() => _inlineErrorMessage = msg);
        AppToast.showError(msg, context: context);
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

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
                    // ── Top Back Button ──────────────────────────────────────
                    Row(
                      children: [
                        IconButton(
                          onPressed: () {
                            if (context.canPop()) {
                              context.pop();
                            } else {
                              context.go(AppRoutes.splashScreen);
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
                    const SizedBox(height: AppSpacing.xl),

                    // ── Title & Subtitle ─────────────────────────────────────
                    Text(
                      'Welcome back!',
                      style: AppTypography.h1(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      'Sign in with your phone or email and password',
                      style: AppTypography.body(
                        color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    // ── Inline Red Alert Banner ──────────────────────────────
                    if (_inlineErrorMessage != null) ...[
                      Container(
                        margin: const EdgeInsets.only(bottom: AppSpacing.lg),
                        padding: const EdgeInsets.symmetric(
                          horizontal: AppSpacing.md,
                          vertical: AppSpacing.sm + 4,
                        ),
                        decoration: BoxDecoration(
                          color: isDark
                              ? AppColors.error.withValues(alpha: 0.16)
                              : AppColors.errorContainer,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(
                            color: AppColors.error.withValues(alpha: 0.4),
                          ),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            const Icon(
                              Icons.error_outline_rounded,
                              color: AppColors.errorText,
                              size: 20,
                            ),
                            const SizedBox(width: AppSpacing.sm),
                            Expanded(
                              child: Text(
                                _inlineErrorMessage!,
                                style: const TextStyle(
                                  color: AppColors.errorText,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                            GestureDetector(
                              onTap: () => setState(() => _inlineErrorMessage = null),
                              child: const Icon(
                                Icons.close_rounded,
                                color: AppColors.errorText,
                                size: 18,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],

                    // ── Unified Smart Identifier Input (Mobile Number or Email) ─────
                    AppSmartIdentifierField(
                      controller: _identifierController,
                    ),
                    const SizedBox(height: AppSpacing.md),

                    // ── Password Input Field ─────────────────────────────────
                    AppTextField(
                      controller: _passwordController,
                      label: 'Password',
                      hintText: 'Enter your password',
                      obscureText: _obscurePassword,
                      prefixIcon: Icon(
                        Icons.lock_outline_rounded,
                        size: 20,
                        color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                      ),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscurePassword
                              ? Icons.visibility_off_outlined
                              : Icons.visibility_outlined,
                          size: 20,
                          color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                        ),
                        onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                      ),
                      validator: (val) {
                        if (val == null || val.trim().isEmpty) {
                          return 'Please enter your password';
                        }
                        if (val.trim().length < 4) {
                          return 'Password must be at least 4 characters';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: AppSpacing.xs),

                    // ── Options Row: OTP Sign In & Forgot Password ───────────
                    Wrap(
                      alignment: WrapAlignment.spaceBetween,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      runSpacing: 4,
                      children: [
                        TextButton.icon(
                          onPressed: _handleOtpSignIn,
                          icon: Icon(
                            Icons.sms_outlined,
                            size: 14,
                            color: isDark ? AppColors.primaryLight : AppColors.primary,
                          ),
                          label: Text(
                            'Sign In with OTP',
                            style: AppTypography.caption(
                              color: isDark ? AppColors.primaryLight : AppColors.primary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 4),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                        ),
                        TextButton(
                          onPressed: () => context.push(AppRoutes.forgotPasswordScreen),
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 4),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          child: Text(
                            'Forgot Password?',
                            style: AppTypography.caption(
                              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    // ── Primary Action Button (Sign In) ──────────────────────
                    AppPrimaryButton(
                      text: 'Sign In',
                      isLoading: _isLoading,
                      onPressed: _handlePasswordSignIn,
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    // ── OR Divider ───────────────────────────────────────────
                    Row(
                      children: [
                        Expanded(
                          child: Divider(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                        ),
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
                        Expanded(
                          child: Divider(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    // ── Social Logins (Google) ───────────────────────────────
                    AppSocialAuthButton(
                      type: SocialAuthType.google,
                      onPressed: () => _handleSocialAuth(SocialAuthType.google),
                    ),
                    const SizedBox(height: AppSpacing.xxl),

                    // ── Footer: Don't have an account? Sign up ───────────────
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          "Don't have an account? ",
                          style: AppTypography.body(
                            color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                          ),
                        ),
                        GestureDetector(
                          onTap: () {
                            final onboarding = context.read<OnboardingProvider>();
                            onboarding.setRole('DRIVER');
                            context.push(AppRoutes.signUpScreen);
                          },
                          child: Text(
                            'Sign up',
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
