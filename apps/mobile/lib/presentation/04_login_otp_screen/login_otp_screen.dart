import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/utils/app_toast.dart';
import '../../core/utils/name_utils.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_provider.dart';
import '../../services/auth_service.dart';
import '../../services/onboarding_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_otp_field.dart';

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
  int _otpInputKey = 0;
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
        role: widget.isRegister ? widget.role : null,
        isRegister: widget.isRegister,
        fullName: !isPlaceholderName(onboarding.fullName)
            ? onboarding.fullName.trim()
            : null,
      );

      if (mounted) {
        AppToast.showSuccess(
          'OTP verified successfully!',
          context: context,
        );

        final user = res.user;
        context.read<AuthProvider>().setUser(user);
        onboarding.setRole(user.role);

        // 1. Mandatory Password Setup: If user hasn't set a password, navigate to setPasswordScreen
        if (!user.hasPassword) {
          context.go(AppRoutes.setPasswordScreen);
        }
        // 2. Mandatory Onboarding: Only if user has never completed onboarding/profile setup
        else if (!user.isOnboarded &&
            !user.isUnderReview &&
            !user.isVerified &&
            !user.isRejected) {
          context.go(AppRoutes.onboardingPersonalScreen);
        }
        // 3. Verification Gate: Unverified users (Drivers and Vendors) go to waitlist
        else if (!user.isVerified) {
          context.go(AppRoutes.waitlistGateScreen);
        }
        // 4. Verified Users & Drivers: Respective home screen
        else {
          context.go(
              user.isDriver ? AppRoutes.homeScreen : AppRoutes.userHomeScreen);
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _otp = '';
          _otpInputKey++;
        });
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
                          color: isDark
                              ? AppColors.textPrimaryDark
                              : AppColors.textPrimaryLight,
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
                      color: isDark
                          ? AppColors.textPrimaryDark
                          : AppColors.textPrimaryLight,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    "We've sent a 6-digit code to $destination",
                    style: AppTypography.body(
                      color: isDark
                          ? AppColors.textSecondaryDark
                          : AppColors.textSecondaryLight,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xxl),

                  AppOtpField(
                    key: ValueKey(_otpInputKey),
                    onChanged: (otp) => setState(() => _otp = otp),
                    onCompleted: (otp) {
                      _otp = otp;
                      _verifyOtp();
                    },
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
                                color: isDark
                                    ? AppColors.textMutedDark
                                    : AppColors.textMutedLight,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'Resend OTP in 00:${_secondsRemaining.toString().padLeft(2, '0')}',
                                style: AppTypography.caption(
                                  color: isDark
                                      ? AppColors.textMutedDark
                                      : AppColors.textMutedLight,
                                ),
                              ),
                            ],
                          )
                        : GestureDetector(
                            onTap: _handleResend,
                            child: Text(
                              'Resend OTP Now',
                              style: AppTypography.caption(
                                color: isDark
                                    ? AppColors.primaryLight
                                    : AppColors.primary,
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
                          color: isDark
                              ? AppColors.primaryLight
                              : AppColors.primary,
                        ),
                      ),
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
