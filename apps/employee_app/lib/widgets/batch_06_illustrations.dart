import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Vector illustrations and badges for Batch 06 (Boarding & Trip Completion)

/// 1. Boarding QR Frame & Reticle
class BoardingQrFrame extends StatelessWidget {
  const BoardingQrFrame({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 220,
      height: 220,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.12),
            blurRadius: 18,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          // QR Code Graphic Icon Simulation
          const Icon(
            Icons.qr_code_2_rounded,
            size: 180,
            color: AppColors.textPrimary,
          ),

          // Scan line overlay (Primary blue horizontal indicator)
          Positioned(
            child: Container(
              width: 190,
              height: 3,
              decoration: BoxDecoration(
                color: AppColors.primaryBlue,
                borderRadius: BorderRadius.circular(2),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primaryBlue.withOpacity(0.6),
                    blurRadius: 6,
                    spreadRadius: 1,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 2. Verifying Boarding Spinner (Screen 4)
class VerifyingBoardingSpinner extends StatelessWidget {
  const VerifyingBoardingSpinner({super.key});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 120,
      height: 120,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Outer circular progress spinner
          const SizedBox(
            width: 110,
            height: 110,
            child: CircularProgressIndicator(
              strokeWidth: 4,
              valueColor: AlwaysStoppedAnimation<Color>(AppColors.primaryBlue),
              backgroundColor: Color(0xFFE2E8F0),
            ),
          ),
          // Center car icon
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              color: Color(0xFFEFF6FF),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.directions_car_filled_rounded,
              size: 38,
              color: AppColors.primaryBlue,
            ),
          ),
        ],
      ),
    );
  }
}

/// 3. Boarding Success Confetti Badge (Screen 5)
class BoardingSuccessBadge extends StatelessWidget {
  const BoardingSuccessBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 90,
      height: 90,
      decoration: BoxDecoration(
        color: AppColors.successLight,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.successBorder, width: 2),
      ),
      child: const Center(
        child: Icon(Icons.check_rounded, size: 52, color: AppColors.success),
      ),
    );
  }
}

/// 4. Invalid OTP Badge (Screen 6)
class InvalidOtpBadge extends StatelessWidget {
  const InvalidOtpBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 84,
      height: 84,
      decoration: BoxDecoration(
        color: AppColors.errorLight,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.errorBorder, width: 2),
      ),
      child: const Center(
        child: Icon(Icons.close_rounded, size: 48, color: AppColors.error),
      ),
    );
  }
}

/// 5. Boarding Issue Warning Badge (Screen 7)
class BoardingIssueBadge extends StatelessWidget {
  const BoardingIssueBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 84,
      height: 84,
      decoration: BoxDecoration(
        color: AppColors.warningLight,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.warningBorder, width: 2),
      ),
      child: const Center(
        child: Icon(Icons.warning_amber_rounded, size: 46, color: AppColors.warning),
      ),
    );
  }
}

/// 6. Safe Reach Security Shield Badge (Screen 11)
class SafeReachShieldBadge extends StatelessWidget {
  const SafeReachShieldBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 88,
      height: 88,
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        shape: BoxShape.circle,
        border: Border.all(color: const Color(0xFFBFDBFE), width: 2),
      ),
      child: const Center(
        child: Icon(Icons.shield_outlined, size: 48, color: AppColors.primaryBlue),
      ),
    );
  }
}

/// 7. Post Trip Finish Graphic (Screen 12)
class PostTripFinishGraphic extends StatelessWidget {
  const PostTripFinishGraphic({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 140,
      height: 90,
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Stack(
        alignment: Alignment.center,
        children: const [
          Icon(
            Icons.directions_car_filled_rounded,
            size: 58,
            color: AppColors.primaryBlue,
          ),
          Positioned(
            right: 20,
            top: 8,
            child: Icon(
              Icons.sports_score_rounded,
              size: 28,
              color: AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

