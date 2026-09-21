import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_provider.dart';
import '../../services/auth_service.dart';
import '../../services/onboarding_provider.dart';
import '../../theme/app_colors.dart';
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

  @override
  void dispose() {
    _identifierController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handlePasswordSignIn() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final onboarding = context.read<OnboardingProvider>();
      final authService = context.read<AuthService>();

      final text = _identifierController.text.trim();
      final parsed = AppSmartIdentifierField.parseIdentifier(text);
      final identifier = parsed['value'] as String;

      final result = await authService.loginWithPassword(
        identifier: identifier,
        password: _passwordController.text.trim(),
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

        Fluttertoast.showToast(
          msg: 'Welcome back, ${user.fullName ?? "Partner"}!',
          backgroundColor: AppColors.accentGreenDark,
          textColor: Colors.white,
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
        final msg = e.toString().replaceFirst('Exception: ', '').replaceFirst('ApiException: ', '');
        Fluttertoast.showToast(
          msg: msg,
          backgroundColor: AppColors.error,
          textColor: Colors.white,
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleOtpSignIn() async {
    final text = _identifierController.text.trim();
    if (text.isEmpty) {
      Fluttertoast.showToast(msg: 'Enter your mobile number or email for OTP');
      return;
    }

    final parsed = AppSmartIdentifierField.parseIdentifier(text);
    if (parsed['isEmail'] == true) {
      final emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
      if (!emailRegex.hasMatch(text)) {
        Fluttertoast.showToast(msg: 'Enter a valid email address for OTP');
        return;
      }
    } else {
      final rawDigits = parsed['rawDigits'] as String;
      if (rawDigits.length != 10) {
        Fluttertoast.showToast(msg: 'Enter a valid 10-digit mobile number for OTP');
        return;
      }
    }

    setState(() => _isLoading = true);

    try {
      final authService = context.read<AuthService>();
      final onboarding = context.read<OnboardingProvider>();

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
        Fluttertoast.showToast(
          msg: message,
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
        final msg = e.toString().replaceFirst('Exception: ', '').replaceFirst('ApiException: ', '');
        Fluttertoast.showToast(
          msg: msg,
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

        Fluttertoast.showToast(
          msg: 'Google Sign In successful! Welcome ${user.fullName ?? ""}',
          backgroundColor: AppColors.accentGreenDark,
          textColor: Colors.white,
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
        Fluttertoast.showToast(
          msg: e.toString().replaceFirst('Exception: ', '').replaceFirst('ApiException: ', ''),
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
