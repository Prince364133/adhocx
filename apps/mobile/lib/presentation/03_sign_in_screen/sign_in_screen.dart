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
import '../../widgets/common/app_social_auth_button.dart';
import '../../widgets/common/app_text_field.dart';

/// Screen 3: Sign In with Mobile (+91) / Email, Google Auth, and Password/OTP login.
class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _formKey = GlobalKey<FormState>();
  final _identifierController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isPhoneMode = false;
  bool _showPasswordField = true;
  bool _obscurePassword = true;
  bool _isLoading = false;
  String? _inlineErrorMessage;

  @override
  void initState() {
    super.initState();
    _identifierController.addListener(_onIdentifierChanged);
    _passwordController.addListener(_clearInlineError);
  }

  void _onIdentifierChanged() {
    _clearInlineError();
    final text = _identifierController.text.trim();
    if (text.isEmpty) return;

    // Smart auto-detection: numbers turn to phone (+91), letters turn to email
    final startsWithDigitsOrPlus = RegExp(r'^(\+|[0-9])').hasMatch(text);
    final hasAlphaOrAt = RegExp(r'[a-zA-Z@]').hasMatch(text);

    if (startsWithDigitsOrPlus && !hasAlphaOrAt && !_isPhoneMode) {
      setState(() => _isPhoneMode = true);
    } else if (hasAlphaOrAt && _isPhoneMode) {
      setState(() => _isPhoneMode = false);
    }
  }

  void _clearInlineError() {
    if (_inlineErrorMessage != null && mounted) {
      setState(() => _inlineErrorMessage = null);
    }
  }

  @override
  void dispose() {
    _identifierController.removeListener(_onIdentifierChanged);
    _passwordController.removeListener(_clearInlineError);
    _identifierController.dispose();
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

  String? _validateIdentifier(String? val) {
    if (val == null || val.trim().isEmpty) {
      return _isPhoneMode
          ? 'Please enter your 10-digit mobile number'
          : 'Please enter your email or mobile number';
    }
    final text = val.trim();
    if (_isPhoneMode) {
      final digits = _cleanIndianDigits(text);
      if (digits.length != 10 || !RegExp(r'^[6-9]\d{9}$').hasMatch(digits)) {
        return 'Please enter a valid 10-digit Indian mobile number';
      }
      return null;
    } else {
      final email = text.toLowerCase();
      final emailRegex = RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$');
      if (!emailRegex.hasMatch(email)) {
        return 'Please enter a valid email address';
      }
      return null;
    }
  }

  Future<void> _handleOtpSignIn() async {
    final validationError = _validateIdentifier(_identifierController.text);
    if (validationError != null) {
      _formKey.currentState?.validate();
      setState(() => _inlineErrorMessage = validationError);
      AppToast.showError(validationError, context: context);
      return;
    }

    setState(() {
      _isLoading = true;
      _inlineErrorMessage = null;
    });

    try {
      final authService = context.read<AuthService>();

      if (_isPhoneMode) {
        final digits = _cleanIndianDigits(_identifierController.text);
        final phoneE164 = '+91$digits';

        final res = await authService.requestOtp(
          phone: phoneE164,
          channel: 'SMS',
          isRegister: false,
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
              'role': 'DRIVER',
              'isRegister': false,
            },
          );
        }
      } else {
        final email = _identifierController.text.trim().toLowerCase();
        final res = await authService.requestOtp(
          email: email,
          channel: 'EMAIL',
          isRegister: false,
        );

        if (mounted) {
          final message = res is Map && res['message'] != null
              ? res['message']
              : 'OTP sent to $email';
          AppToast.showSuccess(message, context: context);

          context.push(
            AppRoutes.loginOtpScreen,
            extra: {
              'email': email,
              'role': 'DRIVER',
              'isRegister': false,
            },
          );
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

  Future<void> _handlePasswordSignIn() async {
    final validationError = _validateIdentifier(_identifierController.text);
    if (validationError != null) {
      _formKey.currentState?.validate();
      setState(() => _inlineErrorMessage = validationError);
      AppToast.showError(validationError, context: context);
      return;
    }

    final identifier = _isPhoneMode
        ? '+91${_cleanIndianDigits(_identifierController.text)}'
        : _identifierController.text.trim().toLowerCase();

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
        if (user.fullName != null && !isPlaceholderName(user.fullName)) {
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
                    const SizedBox(height: AppSpacing.lg),

                    // ── Mode Switcher Pills: Mobile (+91) vs Email ───────────
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceElevatedDark : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: GestureDetector(
                              onTap: () {
                                setState(() {
                                  _isPhoneMode = true;
                                  _inlineErrorMessage = null;
                                });
                              },
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 200),
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                decoration: BoxDecoration(
                                  color: _isPhoneMode
                                      ? (isDark ? AppColors.surfaceDark : Colors.white)
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(8),
                                  boxShadow: _isPhoneMode
                                      ? [
                                          BoxShadow(
                                            color: Colors.black.withValues(alpha: 0.06),
                                            blurRadius: 4,
                                            offset: const Offset(0, 1),
                                          )
                                        ]
                                      : null,
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Text('🇮🇳', style: TextStyle(fontSize: 14)),
                                    const SizedBox(width: 6),
                                    Text(
                                      'Mobile (+91)',
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: _isPhoneMode ? FontWeight.w700 : FontWeight.w500,
                                        color: _isPhoneMode
                                            ? (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight)
                                            : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          Expanded(
                            child: GestureDetector(
                              onTap: () {
                                setState(() {
                                  _isPhoneMode = false;
                                  _inlineErrorMessage = null;
                                });
                              },
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 200),
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                decoration: BoxDecoration(
                                  color: !_isPhoneMode
                                      ? (isDark ? AppColors.surfaceDark : Colors.white)
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(8),
                                  boxShadow: !_isPhoneMode
                                      ? [
                                          BoxShadow(
                                            color: Colors.black.withValues(alpha: 0.06),
                                            blurRadius: 4,
                                            offset: const Offset(0, 1),
                                          )
                                        ]
                                      : null,
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.email_outlined,
                                      size: 15,
                                      color: !_isPhoneMode
                                          ? (isDark ? AppColors.primaryLight : AppColors.primary)
                                          : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      'Email Address',
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: !_isPhoneMode ? FontWeight.w700 : FontWeight.w500,
                                        color: !_isPhoneMode
                                            ? (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight)
                                            : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
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

                    // ── Input Field: Smart Identifier (Phone +91 or Email) ───
                    AppTextField(
                      controller: _identifierController,
                      label: _isPhoneMode ? 'Mobile Number (India)' : 'Email Address',
                      hintText: _isPhoneMode ? '98765 43210' : 'name@example.com',
                      keyboardType: _isPhoneMode ? TextInputType.phone : TextInputType.emailAddress,
                      inputFormatters: _isPhoneMode
                          ? [
                              FilteringTextInputFormatter.allow(RegExp(r'[0-9\+\s\-]')),
                              LengthLimitingTextInputFormatter(14),
                            ]
                          : null,
                      prefixIcon: _isPhoneMode
                          ? Padding(
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
                            )
                          : Icon(
                              Icons.email_outlined,
                              size: 20,
                              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                            ),
                      validator: _validateIdentifier,
                    ),

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
                                    ? (_isPhoneMode
                                        ? 'Sign in with SMS OTP instead'
                                        : 'Sign in with Email OTP instead')
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
                          : (_isPhoneMode ? 'Continue with SMS OTP' : 'Continue with Email OTP'),
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
