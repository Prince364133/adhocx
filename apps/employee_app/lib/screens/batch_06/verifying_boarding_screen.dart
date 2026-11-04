import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../widgets/batch_06_illustrations.dart';
import '../../routes/app_routes.dart';

/// Screen 4: Verifying Boarding...
class VerifyingBoardingScreen extends StatefulWidget {
  const VerifyingBoardingScreen({super.key});

  @override
  State<VerifyingBoardingScreen> createState() => _VerifyingBoardingScreenState();
}

class _VerifyingBoardingScreenState extends State<VerifyingBoardingScreen> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer(const Duration(milliseconds: 1400), () {
      if (mounted) {
        context.pushReplacement(AppRoutes.boardingSuccessful);
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const VerifyingBoardingSpinner(),
                const SizedBox(height: 32),
                Text(
                  'Verifying Boarding...',
                  style: GoogleFonts.inter(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  'Please wait while we confirm your boarding.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
