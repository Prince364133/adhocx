import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/utils/app_toast.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_otp_field.dart';

/// Screen 8: Enter OTP (Forgot Password Step 2) matching exact design mockup.
class ForgotPasswordOtpScreen extends StatefulWidget {
  final String? phone;
  final String? email;

  const ForgotPasswordOtpScreen({
    super.key,
    this.phone,
    this.email,
  });

  @override
  State<ForgotPasswordOtpScreen> createState() =>
      _ForgotPasswordOtpScreenState();
}

class _ForgotPasswordOtpScreenState extends State<ForgotPasswordOtpScreen> {
  String _otp = '';
  bool _isVerifying = false;
  int _otpInputKey = 0;
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

  Future<void> _verifyResetOtp() async {
    if (_otp.length != 6) {
      AppToast.showError('Please enter the 6-digit OTP code', context: context);
      return;
    }
    if (_isVerifying) return;

    setState(() => _isVerifying = true);

    try {
      final authService = context.read<AuthService>();
      await authService.verifyOtp(
        phone: widget.phone,
        email: widget.email,
        otp: _otp,
        role: 'DRIVER',
        isRegister: false,
      );

      if (mounted) {
        AppToast.showSuccess(
          'OTP verified successfully',
          context: context,
        );

        context.push(
          AppRoutes.resetPasswordScreen,
          extra: {
            if (widget.phone != null) 'phone': widget.phone,
            if (widget.email != null) 'email': widget.email,
            'otp': _otp,
          },
        );
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

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

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
                        onPressed: () => context.pop(),
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
                    "We've sent a 6-digit SMS OTP to ${widget.phone ?? 'your registered mobile number'}",
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
                      _verifyResetOtp();
                    },
                  ),
                  const SizedBox(height: AppSpacing.lg),

                  // ── Countdown Timer ────────────────────────────────────────
                  Center(
                    child: Text(
                      'Resend OTP in 00:${_secondsRemaining.toString().padLeft(2, '0')}',
                      style: AppTypography.caption(
                        color: isDark
                            ? AppColors.textMutedDark
                            : AppColors.textMutedLight,
                      ),
                    ),
                  ),
                  const Spacer(),

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
