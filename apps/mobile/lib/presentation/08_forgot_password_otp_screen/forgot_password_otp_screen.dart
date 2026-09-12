import 'dart:async';
import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_numeric_keypad.dart';

/// Screen 8: Enter OTP (Forgot Password Step 2) matching exact design mockup.
class ForgotPasswordOtpScreen extends StatefulWidget {
  final String phone;

  const ForgotPasswordOtpScreen({
    super.key,
    required this.phone,
  });

  @override
  State<ForgotPasswordOtpScreen> createState() =>
      _ForgotPasswordOtpScreenState();
}

class _ForgotPasswordOtpScreenState extends State<ForgotPasswordOtpScreen> {
  String _otp = '';
  bool _isVerifying = false;
  int _secondsRemaining = 28;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startCountdown();
  }

  void _startCountdown() {
    _secondsRemaining = 28;
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
        _verifyResetOtp();
      }
    }
  }

  void _handleKeypadDelete() {
    if (_otp.isNotEmpty) {
      setState(() => _otp = _otp.substring(0, _otp.length - 1));
    }
  }

  Future<void> _verifyResetOtp() async {
    if (_otp.length != 6 || _isVerifying) return;

    setState(() => _isVerifying = true);

    try {
      final authService = context.read<AuthService>();
      await authService.verifyOtp(
        phone: widget.phone,
        otp: _otp,
        role: 'DRIVER',
        isRegister: false,
      );

      if (mounted) {
        Fluttertoast.showToast(
          msg: 'OTP verified successfully',
          backgroundColor: AppColors.accentGreenDark,
        );

        context.push(
          AppRoutes.resetPasswordScreen,
          extra: {'phone': widget.phone, 'otp': _otp},
        );
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

  @override
  Widget build(BuildContext context) {
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
                        onPressed: () => context.pop(),
                        icon: Icon(
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
                    "We've sent a 6-digit code to ${widget.phone}",
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
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.03),
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

                  // ── Countdown Timer ────────────────────────────────────────
                  Center(
                    child: Text(
                      'Resend OTP in 00:${_secondsRemaining.toString().padLeft(2, '0')}',
                      style: AppTypography.caption(
                        color: AppColors.textMutedLight,
                      ),
                    ),
                  ),
                  const Spacer(),

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

                  // ── Numeric Keypad ─────────────────────────────────────────
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
