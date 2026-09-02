import 'dart:async';
import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:provider/provider.dart';
import '../../../services/auth_provider.dart';
import '../../../services/auth_service.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_radius.dart';
import '../../../theme/app_spacing.dart';
import '../../../theme/app_typography.dart';
import '../../../widgets/common/app_card.dart';
import '../../../widgets/common/app_otp_field.dart';
import '../../../widgets/common/app_primary_button.dart';
import '../../../widgets/common/app_secondary_button.dart';

/// Step 2: 6-Digit OTP Verification with Countdown Timer and Auto-Submit.
class AuthOtpStepWidget extends StatefulWidget {
  final String phone;
  final String role;
  final bool isRegister;
  final VoidCallback onBackToPhone;
  final ValueChanged<UserModel> onVerificationSuccess;

  const AuthOtpStepWidget({
    super.key,
    required this.phone,
    required this.role,
    required this.isRegister,
    required this.onBackToPhone,
    required this.onVerificationSuccess,
  });

  @override
  State<AuthOtpStepWidget> createState() => _AuthOtpStepWidgetState();
}

class _AuthOtpStepWidgetState extends State<AuthOtpStepWidget> {
  String _enteredOtp = '';
  bool _isLoading = false;
  String? _errorMessage;

  // Countdown timer
  int _secondsRemaining = 30;
  Timer? _countdownTimer;

  @override
  void initState() {
    super.initState();
    _startCountdown();
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
  }

  void _startCountdown() {
    setState(() => _secondsRemaining = 30);
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsRemaining > 0) {
        setState(() => _secondsRemaining--);
      } else {
        timer.cancel();
      }
    });
  }

  Future<void> _handleResendOtp() async {
    if (_secondsRemaining > 0 || _isLoading) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await AuthService.instance.requestOtp(phone: widget.phone);
      if (!mounted) return;
      setState(() => _isLoading = false);
      Fluttertoast.showToast(msg: 'New OTP code sent!');
      _startCountdown();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _errorMessage = e.toString().replaceAll('ApiException: ', '').replaceAll('Exception: ', '');
      });
    }
  }

  Future<void> _handleVerify(String otp) async {
    if (otp.length != 6 || _isLoading) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final authResult = await AuthService.instance.verifyOtp(
        phone: widget.phone,
        otp: otp,
        role: widget.role,
      );

      if (!mounted) return;

      // Sync with global AuthProvider
      final authProvider = context.read<AuthProvider>();
      await authProvider.checkSession();

      setState(() => _isLoading = false);

      Fluttertoast.showToast(
        msg: widget.isRegister
            ? 'Account registered successfully!'
            : 'Welcome back!',
      );

      widget.onVerificationSuccess(authResult.user);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _errorMessage = e.toString().replaceAll('ApiException: ', '').replaceAll('Exception: ', '');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDriver = widget.role == 'DRIVER';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // ── Target Phone Summary Card ───────────────────────────────────
        AppCard(
          padding: AppSpacing.paddingMd,
          backgroundColor: AppColors.surfaceDark,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(
                    Icons.verified_user_outlined,
                    color: AppColors.accentGreen,
                    size: 20,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Sent to',
                        style: AppTypography.caption(
                          color: AppColors.textSecondaryDark,
                        ),
                      ),
                      Text(
                        widget.phone,
                        style: AppTypography.bodyMedium(
                          color: AppColors.textPrimaryDark,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              TextButton(
                onPressed: _isLoading ? null : widget.onBackToPhone,
                style: TextButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.sm,
                    vertical: AppSpacing.xs,
                  ),
                ),
                child: Text(
                  'Change',
                  style: AppTypography.small(color: AppColors.primaryLight),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.xl),

        // ── OTP Header ──────────────────────────────────────────────────
        Text(
          'Enter 6-Digit OTP',
          style: AppTypography.h3(color: AppColors.textPrimaryDark),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: AppSpacing.xs),
        Text(
          'For security, please enter the one-time password code',
          style: AppTypography.small(color: AppColors.textSecondaryDark),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: AppSpacing.xl),

        // ── 6-Box OTP Input ─────────────────────────────────────────────
        AppOtpField(
          length: 6,
          onCompleted: (otp) {
            _enteredOtp = otp;
            _handleVerify(otp);
          },
          onChanged: (val) {
            _enteredOtp = val;
          },
        ),
        const SizedBox(height: AppSpacing.xl),

        // ── Error Banner ────────────────────────────────────────────────
        if (_errorMessage != null) ...[
          Container(
            padding: AppSpacing.paddingMd,
            decoration: BoxDecoration(
              color: AppColors.errorContainer,
              borderRadius: AppRadius.borderMd,
              border: Border.all(
                color: AppColors.error.withAlpha(90),
                width: 1,
              ),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.error_outline_rounded,
                  color: AppColors.errorText,
                  size: 18,
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Text(
                    _errorMessage!,
                    style: AppTypography.small(color: AppColors.errorText),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
        ],

        // ── Verify & Continue Button ────────────────────────────────────
        AppPrimaryButton(
          text: widget.isRegister ? 'Complete Registration' : 'Verify & Sign In',
          onPressed: _enteredOtp.length == 6
              ? () => _handleVerify(_enteredOtp)
              : null,
          isLoading: _isLoading,
          variant: isDriver
              ? AppButtonVariant.accentGreen
              : AppButtonVariant.primary,
        ),
        const SizedBox(height: AppSpacing.lg),

        // ── Resend OTP Countdown ────────────────────────────────────────
        Center(
          child: _secondsRemaining > 0
              ? Text(
                  'Resend code in ${_secondsRemaining}s',
                  style: AppTypography.small(color: AppColors.textSecondaryDark),
                )
              : TextButton(
                  onPressed: _isLoading ? null : _handleResendOtp,
                  child: Text(
                    'Resend Verification Code',
                    style: AppTypography.bodyMedium(
                      color: isDriver
                          ? AppColors.accentGreen
                          : AppColors.primaryLight,
                    ),
                  ),
                ),
        ),
        const SizedBox(height: AppSpacing.md),

        // ── Back to Phone Button ────────────────────────────────────────
        AppSecondaryButton(
          text: '← Back to Mobile Number',
          onPressed: widget.onBackToPhone,
          variant: AppSecondaryVariant.ghost,
          height: 40,
        ),
      ],
    );
  }
}
