import 'package:flutter/material.dart';
import 'otp_verification_screen.dart';

/// Screen 14: Direct route entry for Error - Invalid OTP state
/// Wrapper around OtpVerificationScreen configured with initialError = true
class InvalidOtpScreen extends StatelessWidget {
  const InvalidOtpScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const OtpVerificationScreen(initialError: true);
  }
}

