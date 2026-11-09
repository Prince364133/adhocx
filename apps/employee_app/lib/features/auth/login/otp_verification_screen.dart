import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/widgets/employee_app_bar.dart';
import 'package:adhocx_employee/widgets/employee_primary_button.dart';
import 'package:adhocx_employee/widgets/employee_otp_input.dart';
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
    final phone = (authProvider.currentPhone != null && authProvider.currentPhone!.isNotEmpty)
        ? authProvider.currentPhone!
        : 'your registered number';
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

              // Dev hint card for testers (clickable for instant fill)
              const Spacer(),
              InkWell(
                onTap: () {
                  setState(() {
                    _otpCode = '528471';
                    _hasError = false;
                    _errorMessage = null;
                  });
                  _handleVerify();
                },
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFBFDBFE)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.bolt, size: 16, color: AppColors.primaryBlue),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '⚡ 1-Click Dev Fill: Tap to fill & verify OTP (528471 or 123456)',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primaryBlue,
                          ),
                        ),
                      ),
                    ],
                  ),
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




