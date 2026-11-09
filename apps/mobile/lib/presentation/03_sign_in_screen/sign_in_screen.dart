import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/utils/app_toast.dart';
import '../../core/utils/name_utils.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_provider.dart';
import '../../services/auth_service.dart';
import '../../services/onboarding_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_primary_button.dart';
import '../../widgets/common/app_text_field.dart';

/// Screen 3: Sign In with Mobile (+91) and SMS OTP / Password.
/// Email and Google auth completely removed as per SMS phone authentication mandate.
class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _isLoading = false;
  String? _inlineErrorMessage;

  @override
  void initState() {
    super.initState();
    _phoneController.addListener(_clearInlineError);
    _passwordController.addListener(_clearInlineError);
  }

  void _clearInlineError() {
    if (_inlineErrorMessage != null && mounted) {
      setState(() => _inlineErrorMessage = null);
    }
  }

  @override
  void dispose() {
    _phoneController.removeListener(_clearInlineError);
    _passwordController.removeListener(_clearInlineError);
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
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

  Future<void> _handlePasswordSignIn() async {
    final validationError = _validatePhone(_phoneController.text);
    if (validationError != null) {
      _formKey.currentState?.validate();
      setState(() => _inlineErrorMessage = validationError);
      AppToast.showError(validationError, context: context);
      return;
    }

    final digits = _cleanIndianDigits(_phoneController.text);
    final phoneE164 = '+91$digits';

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

      final result = await authService.loginWithPassword(
        identifier: phoneE164,
        password: password,
      );

      final user = result.user;
      if (mounted) {
        context.read<AuthProvider>().setUser(user);
        onboarding.setRole(user.role);
        if (user.fullName != null && !isPlaceholderName(user.fullName)) {
          onboarding.setPersonalDetails(
            fullName: user.fullName!,
            phone: user.phone,
            email: user.email,
          );
        }

        AppToast.showSuccess(
          'Welcome back, ${user.fullName ?? (user.isDriver ? "Driver" : "User")}!',
          context: context,
        );

        if (!user.hasPassword) {
          context.go(AppRoutes.setPasswordScreen);
        } else if (!user.isOnboarded && !user.isUnderReview && !user.isVerified) {
          context.go(AppRoutes.onboardingPersonalScreen);
        } else if (!user.isVerified) {
          context.go(AppRoutes.waitlistGateScreen);
        } else {
          context.go(user.isDriver ? AppRoutes.homeScreen : AppRoutes.userHomeScreen);
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
                      'Sign in with your mobile number and password',
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

                    // ── Password Field ───────────────────────────────────────
                    AppTextField(
                      controller: _passwordController,
                      label: 'Password *',
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
                    const SizedBox(height: AppSpacing.sm),

                    // ── Forgot Password Link ─────────────────────────────────
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: () => context.push(AppRoutes.forgotPasswordScreen),
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: Text(
                          'Forgot Password?',
                          style: AppTypography.caption(
                            color: isDark ? AppColors.primaryLight : AppColors.primary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    // ── Primary Action Button ────────────────────────────────
                    AppPrimaryButton(
                      text: 'Sign In',
                      isLoading: _isLoading,
                      onPressed: _handlePasswordSignIn,
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
