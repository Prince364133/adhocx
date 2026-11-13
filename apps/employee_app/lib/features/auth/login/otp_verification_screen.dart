import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import 'package:adhocx_employee/state/employee_auth_provider.dart';
import 'package:adhocx_employee/models/auth_state.dart';
import 'package:adhocx_employee/routes/app_routes.dart';

class OtpVerificationScreen extends StatefulWidget {
  final bool initialError;

  const OtpVerificationScreen({
    super.key,
    this.initialError = false,
  });

  @override
  State<OtpVerificationScreen> createState() => _OtpVerificationScreenState();
}

class _OtpVerificationScreenState extends State<OtpVerificationScreen> {
  String _otpCode = '';
  bool _hasError = false;
  bool _isVerifying = false;
  bool _isResending = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _hasError = widget.initialError;
    if (_hasError) {
      _errorMessage = 'Invalid OTP. Please check and try again.';
      _otpCode = '';
    }
  }

  Future<void> _handleVerify() async {
    if (_isVerifying || context.read<EmployeeAuthProvider>().isLoading) return;

    if (_otpCode.length < 6) {
      setState(() {
        _hasError = true;
        _errorMessage = 'Please enter all 6 digits of the OTP code.';
      });
      return;
    }

    final authProvider = context.read<EmployeeAuthProvider>();
    setState(() => _isVerifying = true);
    final result = await authProvider.verifyOtp(_otpCode);

    if (!mounted) return;

    if (result == AuthStatus.authenticated) {
      context.go(AppRoutes.employeeVerified);
    } else if (result == AuthStatus.notEligible) {
      context.go(AppRoutes.transportUnavailable);
    } else {
      // Invalid OTP or expired OTP (Screen 14 state)
      setState(() {
        _isVerifying = false;
        _hasError = true;
        _errorMessage = authProvider.errorMessage ??
            'Invalid OTP. Please check and try again.';
      });
    }
  }

  Future<void> _handleResend() async {
    final authProvider = context.read<EmployeeAuthProvider>();
    if (_isResending ||
        authProvider.resendCountdown > 0 ||
        authProvider.isLoading) {
      return;
    }

    final phone = authProvider.currentPhone;
    if (phone == null || phone.isEmpty) return;

    setState(() => _isResending = true);
    final sent = await authProvider.sendOtp(phone);
    if (!mounted) return;
    setState(() => _isResending = false);

    if (sent) {
      setState(() {
        _hasError = false;
        _errorMessage = null;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('A new 6-digit OTP code has been sent.'),
          backgroundColor: AppColors.primary,
          duration: Duration(seconds: 2),
        ),
      );
    } else {
      setState(() {
        _hasError = true;
        _errorMessage =
            authProvider.errorMessage ?? 'Unable to send a new OTP. Try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<EmployeeAuthProvider>();
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    final phone = (authProvider.currentPhone != null &&
            authProvider.currentPhone!.isNotEmpty)
        ? authProvider.currentPhone!
        : 'your registered number';
    final countdown = authProvider.resendCountdown;
    final countdownFormatted = '00:${countdown.toString().padLeft(2, '0')}';
    final p = EmployeePalette.of(context);

    return Scaffold(
      backgroundColor: p.background,
      appBar: const EmployeeAppBar(),
      // Body shrinks when the native keyboard opens; the CTA stays above it.
      resizeToAvoidBottomInset: true,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                keyboardDismissBehavior:
                    ScrollViewKeyboardDismissBehavior.onDrag,
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.xxl,
                  vertical: AppSpacing.sm,
                ),
                child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Verify OTP',
                style: AppTypography.h2(color: p.textPrimary),
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'Enter the 6-digit code sent to\n$phone',
                style: AppTypography.body(color: p.textSecondary),
              ),
              const SizedBox(height: AppSpacing.xxxl + 4),

              // 6-digit OTP boxes
              EmployeeOtpInput(
                length: 6,
                hasError: _hasError,
                onChanged: (val) {
                  setState(() {
                    _otpCode = val;
                    if (_hasError) {
                      _hasError = false;
                      _errorMessage = null;
                    }
                  });
                },
                onCompleted: (val) {
                  _otpCode = val;
                  _handleVerify();
                },
              ),

              const SizedBox(height: AppSpacing.lg),

              // Error banner if invalid (Screen 14)
              AnimatedSize(
                duration: reduceMotion
                    ? Duration.zero
                    : const Duration(milliseconds: 200),
                curve: Curves.easeOutCubic,
                child: AnimatedSwitcher(
                  duration: reduceMotion
                      ? Duration.zero
                      : const Duration(milliseconds: 180),
                  switchInCurve: Curves.easeOutCubic,
                  switchOutCurve: Curves.easeInCubic,
                  transitionBuilder: (child, animation) => FadeTransition(
                    opacity: animation,
                    child: SlideTransition(
                      position: Tween<Offset>(
                        begin: const Offset(0, -0.08),
                        end: Offset.zero,
                      ).animate(animation),
                      child: child,
                    ),
                  ),
                  child: _hasError && _errorMessage != null
                      ? Padding(
                          key: ValueKey(_errorMessage),
                          padding: const EdgeInsets.only(bottom: AppSpacing.lg),
                          child: Row(
                            children: [
                              const Icon(
                                Icons.error_outline_rounded,
                                color: AppColors.errorText,
                                size: 16,
                              ),
                              const SizedBox(width: AppSpacing.xs + 2),
                              Expanded(
                                child: Text(
                                  _errorMessage!,
                                  style: AppTypography.small(
                                    color: AppColors.errorText,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        )
                      : const SizedBox.shrink(
                          key: ValueKey('otp-error-hidden'),
                        ),
                ),
              ),

              // Resend countdown or action link
              Center(
                child: AnimatedSwitcher(
                  duration: reduceMotion
                      ? Duration.zero
                      : const Duration(milliseconds: 180),
                  switchInCurve: Curves.easeOutCubic,
                  switchOutCurve: Curves.easeInCubic,
                  child: countdown > 0
                      ? Text(
                          'Resend OTP in $countdownFormatted',
                          key: const ValueKey('otp-countdown'),
                          style: AppTypography.small(
                            color: p.textSecondary,
                            fontWeight: FontWeight.w500,
                          ),
                        )
                      : TextButton(
                          key: const ValueKey('otp-resend'),
                          onPressed: authProvider.isLoading || _isResending
                              ? null
                              : _handleResend,
                          child: Text(
                            'Resend OTP',
                            style: AppTypography.label(
                              color: p.accent,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                ),
              ),

            ],
                ),
              ),
            ),
            // "Verify & Continue" — pinned directly above the native keyboard.
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.xxl,
                AppSpacing.sm,
                AppSpacing.xxl,
                AppSpacing.lg,
              ),
              child: EmployeePrimaryButton(
                label: 'Verify & Continue',
                isLoading: authProvider.isLoading || _isVerifying,
                onPressed: _otpCode.length == 6 ? _handleVerify : null,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
