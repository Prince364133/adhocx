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
import '../../widgets/common/app_phone_field.dart';
import '../../widgets/common/app_primary_button.dart';
import '../../widgets/common/app_segmented_control.dart';
import '../../widgets/common/app_social_auth_button.dart';
import '../../widgets/common/app_text_field.dart';

/// Screen 3: Sign In with Phone Number (default +91) or Email, Google Auth, and Password login.
class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isPhoneMode = true; // Default to Mobile Number (+91, max 10 digits)
  bool _showPasswordField = true;
  bool _obscurePassword = true;
  bool _isLoading = false;
  String? _inlineErrorMessage;

  @override
  void initState() {
    super.initState();
    _phoneController.addListener(_clearInlineError);
    _emailController.addListener(_clearInlineError);
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
    _emailController.removeListener(_clearInlineError);
    _passwordController.removeListener(_clearInlineError);
    _phoneController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  String? _validatePhone(String? val) {
    if (val == null || val.trim().isEmpty) {
      return 'Please enter your mobile number';
    }
    final digits = val.replaceAll(RegExp(r'\D'), '');
    if (digits.length != 10) {
      return 'Please enter a valid 10-digit mobile number';
    }
    return null;
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

  Future<void> _handleOtpSignIn() async {
    String? targetPhone;
    String? targetEmail;

    if (_isPhoneMode) {
      final phoneError = _validatePhone(_phoneController.text);
      if (phoneError != null) {
        _formKey.currentState?.validate();
        setState(() => _inlineErrorMessage = phoneError);
        AppToast.showError(phoneError, context: context);
        return;
      }
      final digits = _phoneController.text.replaceAll(RegExp(r'\D'), '');
      targetPhone = '+91$digits';
    } else {
      final email = _emailController.text.trim().toLowerCase();
      final emailError = _validateEmail(email);
      if (emailError != null) {
        _formKey.currentState?.validate();
        setState(() => _inlineErrorMessage = emailError);
        AppToast.showError(emailError, context: context);
        return;
      }
      targetEmail = email;
    }

    setState(() {
      _isLoading = true;
      _inlineErrorMessage = null;
    });

    try {
      final authService = context.read<AuthService>();

      final res = await authService.requestOtp(
        phone: targetPhone,
        email: targetEmail,
        channel: _isPhoneMode ? 'SMS' : 'EMAIL',
        isRegister: false,
      );

      if (mounted) {
        final dest = targetPhone ?? targetEmail ?? '';
        final message = res is Map && res['message'] != null ? res['message'] : 'OTP sent to $dest';
        AppToast.showSuccess(message, context: context);

        context.push(
          AppRoutes.loginOtpScreen,
          extra: {
            if (targetPhone != null) 'phone': targetPhone,
            if (targetEmail != null) 'email': targetEmail,
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

  Future<void> _handlePasswordSignIn() async {
    String identifier;

    if (_isPhoneMode) {
      final phoneError = _validatePhone(_phoneController.text);
      if (phoneError != null) {
        _formKey.currentState?.validate();
        setState(() => _inlineErrorMessage = phoneError);
        AppToast.showError(phoneError, context: context);
        return;
      }
      final digits = _phoneController.text.replaceAll(RegExp(r'\D'), '');
      identifier = '+91$digits';
    } else {
      final email = _emailController.text.trim().toLowerCase();
      final emailError = _validateEmail(email);
      if (emailError != null) {
        _formKey.currentState?.validate();
        setState(() => _inlineErrorMessage = emailError);
        AppToast.showError(emailError, context: context);
        return;
      }
      identifier = email;
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

      // Automatically detects user's registered role from backend
      final result = await authService.loginWithPassword(
        identifier: identifier,
        password: password,
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
          // Automatically route to Driver dashboard or Vendor/User dashboard based on detected role
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

  Future<void> _handleSocialAuth(SocialAuthType type) async {
    setState(() => _isLoading = true);

    try {
      final authService = context.read<AuthService>();
      final onboarding = context.read<OnboardingProvider>();

      // Automatically detects user's registered role from backend
      final result = await authService.signInWithGoogle();
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
                      'Sign in with your mobile number, email, or Google',
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

                    // ── Mode Switcher: Mobile Number (default) vs Email Address ─
                    AppSegmentedControl<bool>(
                      selectedValue: _isPhoneMode,
                      items: const [
                        SegmentItem<bool>(
                          value: true,
                          label: 'Mobile Number',
                          icon: Icons.phone_android_rounded,
                        ),
                        SegmentItem<bool>(
                          value: false,
                          label: 'Email Address',
                          icon: Icons.email_outlined,
                        ),
                      ],
                      onValueChanged: (val) {
                        setState(() {
                          _isPhoneMode = val;
                          _inlineErrorMessage = null;
                        });
                      },
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    // ── Input Field: Phone or Email ──────────────────────────
                    if (_isPhoneMode) ...[
                      AppPhoneField(
                        controller: _phoneController,
                        label: 'Mobile Number',
                        hintText: '98765 43210',
                        validator: _validatePhone,
                      ),
                    ] else ...[
                      AppTextField(
                        controller: _emailController,
                        label: 'Email Address',
                        hintText: 'name@example.com',
                        keyboardType: TextInputType.emailAddress,
                        prefixIcon: Icon(
                          Icons.email_outlined,
                          size: 20,
                          color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                        ),
                        validator: _validateEmail,
                      ),
                    ],

                    // ── Optional Password Field (Toggled by user) ────────────
                    if (_showPasswordField) ...[
                      const SizedBox(height: AppSpacing.md),
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
                    ],
                    const SizedBox(height: AppSpacing.sm),

                    // ── Switch between OTP & Password / Forgot Password ──────
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Expanded(
                          child: Align(
                            alignment: Alignment.centerLeft,
                            child: TextButton(
                              onPressed: () {
                                setState(() {
                                  _showPasswordField = !_showPasswordField;
                                  _inlineErrorMessage = null;
                                });
                              },
                              style: TextButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 4),
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                              child: Text(
                                _showPasswordField
                                    ? (_isPhoneMode ? 'Sign in with Mobile OTP instead' : 'Sign in with Email OTP instead')
                                    : 'Sign in with password instead',
                                style: AppTypography.caption(
                                  color: isDark ? AppColors.primaryLight : AppColors.primary,
                                  fontWeight: FontWeight.w600,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ),
                        ),
                        if (_showPasswordField) ...[
                          const SizedBox(width: 8),
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
                      ],
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    // ── Primary Action Button ────────────────────────────────
                    AppPrimaryButton(
                      text: _showPasswordField
                          ? 'Sign In'
                          : (_isPhoneMode ? 'Continue with Mobile OTP' : 'Continue with Email OTP'),
                      isLoading: _isLoading,
                      onPressed: _showPasswordField ? _handlePasswordSignIn : _handleOtpSignIn,
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
