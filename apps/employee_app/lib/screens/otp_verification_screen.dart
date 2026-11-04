import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../theme/app_colors.dart';
import '../widgets/employee_app_bar.dart';
import '../widgets/employee_primary_button.dart';
import '../widgets/employee_otp_input.dart';
import '../state/employee_auth_provider.dart';
import '../models/auth_state.dart';
import '../routes/app_routes.dart';

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
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _hasError = widget.initialError;
    if (_hasError) {
      _errorMessage = 'Invalid OTP. Please check and try again.';
      _otpCode = '5284'; // matches Screen 14 mockup visual where 4 digits were entered
    }
  }

  Future<void> _handleVerify() async {
    if (_otpCode.length < 6) {
      setState(() {
        _hasError = true;
        _errorMessage = 'Please enter all 6 digits of the OTP code.';
      });
      return;
    }

    final authProvider = context.read<EmployeeAuthProvider>();
    final result = await authProvider.verifyOtp(_otpCode);

    if (!mounted) return;

    if (result == AuthStatus.authenticated) {
      context.go(AppRoutes.employeeVerified);
    } else if (result == AuthStatus.notEligible) {
      context.go(AppRoutes.transportUnavailable);
    } else {
      // Invalid OTP or expired OTP (Screen 14 state)
      setState(() {
        _hasError = true;
        _errorMessage = authProvider.errorMessage ?? 'Invalid OTP. Please check and try again.';
      });
    }
  }

  void _handleResend() {
    final authProvider = context.read<EmployeeAuthProvider>();
    if (authProvider.resendCountdown <= 0) {
      authProvider.resendOtp();
      setState(() {
        _hasError = false;
        _errorMessage = null;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('A new 6-digit OTP code has been sent.'),
          backgroundColor: AppColors.primaryBlue,
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<EmployeeAuthProvider>();
    final phone = authProvider.currentPhone ?? '+91 98765 43210';
    final countdown = authProvider.resendCountdown;
    final countdownFormatted = '00:${countdown.toString().padLeft(2, '0')}';

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: const EmployeeAppBar(),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Verify OTP',
                style: GoogleFonts.inter(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                  letterSpacing: -0.4,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Enter the 6-digit code sent to\n$phone',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w400,
                  color: AppColors.textSecondary,
                  height: 1.45,
                ),
              ),
              const SizedBox(height: 36),

              // 6-digit OTP boxes
              EmployeeOtpInput(
                length: 6,
                hasError: _hasError,
                initialValue: _otpCode.isNotEmpty ? _otpCode : null,
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

              const SizedBox(height: 16),

              // Error banner if invalid (Screen 14)
              if (_hasError && _errorMessage != null) ...[
                Row(
                  children: [
                    const Icon(
                      Icons.error_outline_rounded,
                      color: AppColors.error,
                      size: 16,
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        _errorMessage!,
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: AppColors.error,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
              ],

              // Resend countdown or action link
              Center(
                child: countdown > 0 && !_hasError
                    ? Text(
                        'Resend OTP in $countdownFormatted',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: AppColors.primaryBlue,
                        ),
                      )
                    : TextButton(
                        onPressed: _handleResend,
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        ),
                        child: Text(
                          'Resend OTP',
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primaryBlue,
                          ),
                        ),
                      ),
              ),

              // Dev hint card for testers
              const Spacer(),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.surfaceMuted,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline, size: 16, color: AppColors.textMuted),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Dev Mock: Use code 528471 to verify, 888888 for not eligible, or any code for invalid state.',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // "Verify & Continue" Pill Button
              EmployeePrimaryButton(
                label: 'Verify & Continue',
                isLoading: authProvider.isLoading,
                onPressed: _otpCode.length == 6 ? _handleVerify : null,
              ),

              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

