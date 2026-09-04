import 'dart:async';
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
    if (_otp.length != 6 || _isVerifying) return;

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
        Fluttertoast.showToast(
          msg: 'OTP verified successfully!',
          backgroundColor: AppColors.accentGreenDark,
          textColor: Colors.white,
        );

        final user = res.user;

        // If user is registering or has not set a password / selected role, navigate to Set Password
        if (widget.isRegister || user.isPending) {
          context.push(AppRoutes.setPasswordScreen);
        } else if (user.role == 'DRIVER') {
          if (user.isUnderReview || user.isRejected) {
            context.go(AppRoutes.waitlistGateScreen);
          } else {
            context.go(AppRoutes.homeScreen);
          }
        } else {
          // Normal User / Booker
          context.go(AppRoutes.userHomeScreen);
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _otp = '');
        Fluttertoast.showToast(
          msg: e.toString().replaceFirst('Exception: ', ''),
          backgroundColor: AppColors.error,
          textColor: Colors.white,
        );
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
        Fluttertoast.showToast(
          msg: 'New OTP sent to $target',
          backgroundColor: AppColors.primaryDark,
          textColor: Colors.white,
        );
        _startCountdown();
      }
    } catch (e) {
      if (mounted) {
        Fluttertoast.showToast(
          msg: e.toString().replaceFirst('Exception: ', ''),
          backgroundColor: AppColors.error,
          textColor: Colors.white,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final destination = widget.email ?? widget.phone ?? 'your device';

    return Scaffold(
      backgroundColor: AppColors.bgLight,
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
                        icon: const Icon(
                          Icons.arrow_back,
                          color: AppColors.textPrimaryLight,
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
                      color: AppColors.textPrimaryLight,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    "We've sent a 6-digit code to $destination",
                    style: AppTypography.body(
                      color: AppColors.textSecondaryLight,
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
                          color: AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(
                            color: isCurrent
                                ? AppColors.primary
                                : (hasChar
                                    ? AppColors.primaryLight
                                    : AppColors.borderLight),
                            width: isCurrent || hasChar ? 1.8 : 1,
                          ),
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x06000000),
                              blurRadius: 2,
                              offset: Offset(0, 1),
                            ),
                          ],
                        ),
                        child: Text(
                          char,
                          style: AppTypography.h2(
                            color: AppColors.textPrimaryLight,
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
                              const Icon(
                                Icons.refresh,
                                size: 16,
                                color: AppColors.textMutedLight,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                'Resend OTP in 00:${_secondsRemaining.toString().padLeft(2, '0')}',
                                style: AppTypography.caption(
                                  color: AppColors.textMutedLight,
                                ),
                              ),
                            ],
                          )
                        : GestureDetector(
                            onTap: _handleResend,
                            child: Text(
                              'Resend OTP Now',
                              style: AppTypography.caption(
                                color: AppColors.primary,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                  ),
                  const Spacer(),

                  // Loading indicator if verifying
                  if (_isVerifying)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(AppSpacing.md),
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          color: AppColors.primary,
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
