import 'dart:async';
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
import '../../widgets/common/app_numeric_keypad.dart';

/// Screen 4: Enter OTP (Login OTP Verification) for Phone or Email.
class LoginOtpScreen extends StatefulWidget {
  final String? phone;
  final String? email;
  final String role;
  final bool isRegister;

  const LoginOtpScreen({
    super.key,
    this.phone,
    this.email,
    required this.role,
    this.isRegister = false,
  });

  @override
  State<LoginOtpScreen> createState() => _LoginOtpScreenState();
}

class _LoginOtpScreenState extends State<LoginOtpScreen> {
  String _otp = '';
  bool _isVerifying = false;
  int _secondsRemaining = 25;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startCountdown();
  }

  void _startCountdown() {
    _secondsRemaining = 25;
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsRemaining > 0) {
        setState(() => _secondsRemaining--);
      } else {
        timer.cancel();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _handleKeypadPress(String key) {
    if (_otp.length < 6) {
      setState(() => _otp += key);
      if (_otp.length == 6) {
        _verifyOtp();
      }
    }
  }

  void _handleKeypadDelete() {
    if (_otp.isNotEmpty) {
      setState(() => _otp = _otp.substring(0, _otp.length - 1));
    }
  }

  Future<void> _verifyOtp() async {
    if (_otp.length != 6) {
      AppToast.showError('Please enter the 6-digit OTP code', context: context);
      return;
    }
    if (_isVerifying) return;

    setState(() => _isVerifying = true);

    try {
      final authService = context.read<AuthService>();
      final onboarding = context.read<OnboardingProvider>();

      final res = await authService.verifyOtp(
        phone: widget.phone,
        email: widget.email,
        otp: _otp,
        role: widget.role,
        isRegister: widget.isRegister,
        fullName: onboarding.fullName.isNotEmpty ? onboarding.fullName : null,
      );

      if (mounted) {
        AppToast.showSuccess(
          'OTP verified successfully!',
          context: context,
        );

        final user = res.user;
        context.read<AuthProvider>().setUser(user);

        // 1. Mandatory Password Setup: If user hasn't set a password, navigate to setPasswordScreen
        if (!user.hasPassword) {
          context.go(AppRoutes.setPasswordScreen);
        }
        // 2. Mandatory Onboarding: Only if user has never completed onboarding/profile setup
        else if (!user.isOnboarded && !user.isUnderReview && !user.isVerified) {
          context.go(AppRoutes.onboardingPersonalScreen);
        }
        // 3. Verification Gate: If user has submitted profile but is not yet verified by Admin, lock to waitlistGateScreen
        else if (!user.isVerified) {
          context.go(AppRoutes.waitlistGateScreen);
        }
        // 4. Fully Verified Users
        else if (user.isDriver) {
          context.go(AppRoutes.homeScreen);
        } else {
          context.go(AppRoutes.userHomeScreen);
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _otp = '');
        AppToast.showError(e, context: context);
      }
    } finally {
      if (mounted) setState(() => _isVerifying = false);
    }
  }

  Future<void> _handleResend() async {
    if (_secondsRemaining > 0) return;

    try {
      final authService = context.read<AuthService>();
      final target = widget.email ?? widget.phone ?? '';

      await authService.requestOtp(
        phone: widget.phone,
        email: widget.email,
        channel: widget.email != null ? 'EMAIL' : 'SMS',
        role: widget.role,
        isRegister: widget.isRegister,
      );

      if (mounted) {
        AppToast.showSuccess(
          'New OTP sent to $target',
          context: context,
        );
        _startCountdown();
      }
    } catch (e) {
      if (mounted) {
        AppToast.showError(e, context: context);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final destination = widget.email ?? widget.phone ?? 'your device';

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.xxl,
                vertical: AppSpacing.lg,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // ── Top Navigation Bar ─────────────────────────────────────
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
                  const SizedBox(height: AppSpacing.lg),

                  // ── Title & Subtitle ───────────────────────────────────────
                  Text(
                    'Enter OTP',
                    style: AppTypography.h1(
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    "We've sent a 6-digit code to $destination",
                    style: AppTypography.body(
                      color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xxl),

                  // ── 6-Box OTP PIN Display ──────────────────────────────────
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: List.generate(6, (index) {
                      final hasChar = index < _otp.length;
                      final char = hasChar ? _otp[index] : '';
                      final isCurrent = index == _otp.length;

                      return Container(
                        width: 48,
                        height: 52,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(
                            color: isCurrent
                                ? (isDark ? AppColors.primaryLight : AppColors.primary)
                                : (hasChar
                                    ? (isDark ? AppColors.primaryLight : AppColors.primaryLight)
                                    : (isDark ? AppColors.borderDark : AppColors.borderLight)),
                            width: isCurrent || hasChar ? 1.8 : 1,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
                              blurRadius: 2,
                              offset: const Offset(0, 1),
                            ),
                          ],
                        ),
                        child: Text(
                          char,
                          style: AppTypography.h2(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      );
                    }),
                  ),
                  const SizedBox(height: AppSpacing.lg),

                  // ── Resend Countdown ───────────────────────────────────────
                  Center(
                    child: _secondsRemaining > 0
                        ? Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.refresh,
                                size: 16,
                                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'Resend OTP in 00:${_secondsRemaining.toString().padLeft(2, '0')}',
                                style: AppTypography.caption(
                                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                ),
                              ),
                            ],
                          )
                        : GestureDetector(
                            onTap: _handleResend,
                            child: Text(
                              'Resend OTP Now',
                              style: AppTypography.caption(
                                color: isDark ? AppColors.primaryLight : AppColors.primary,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                  ),
                  const Spacer(),

                  // Loading indicator if verifying
                  if (_isVerifying)
                    Center(
                      child: Padding(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          color: isDark ? AppColors.primaryLight : AppColors.primary,
                        ),
                      ),
                    ),

                  // ── Custom Numeric Keypad ──────────────────────────────────
                  AppNumericKeypad(
                    onKeyPressed: _handleKeypadPress,
                    onDeletePressed: _handleKeypadDelete,
                  ),
                  const SizedBox(height: AppSpacing.md),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
