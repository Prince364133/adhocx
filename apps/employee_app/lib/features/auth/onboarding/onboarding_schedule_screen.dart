import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/widgets/illustration_widgets.dart';
import 'package:adhocx_employee/routes/app_routes.dart';

class OnboardingScheduleScreen extends StatelessWidget {
  const OnboardingScheduleScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Top Step Counter "1 of 3"
              Text(
                '1 of 3',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textMuted,
                  letterSpacing: 0.5,
                ),
              ),

              const Spacer(),

              // Calendar Schedule Illustration
              const CalendarScheduleIllustration(),

              const SizedBox(height: 44),

              Text(
                'View Your Schedule',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                  letterSpacing: -0.4,
                ),
              ),

              const SizedBox(height: 12),

              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Text(
                  'Check your approved pickup drop schedules for all shifts.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w400,
                    color: AppColors.textSecondary,
                    height: 1.5,
                  ),
                ),
              ),

              const Spacer(),

              // Bottom navigation row: pagination dots + circular next button
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Empty placeholder to center dots
                    const SizedBox(width: 56),

                    // 3 Pagination Dots [● ○ ○]
                    Row(
                      children: [
                        _buildDot(isActive: true),
                        const SizedBox(width: 8),
                        _buildDot(isActive: false),
                        const SizedBox(width: 8),
                        _buildDot(isActive: false),
                      ],
                    ),

                    // Circular Blue Next Arrow Button
                    Container(
                      width: 54,
                      height: 54,
                      decoration: const BoxDecoration(
                        color: AppColors.primaryBlue,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Color(0x335728B2),
                            blurRadius: 14,
                            offset: Offset(0, 6),
                          ),
                        ],
                      ),
                      child: IconButton(
                        onPressed: () => context.push(AppRoutes.onboardingTracking),
                        icon: const Icon(
                          Icons.arrow_forward_rounded,
                          color: Colors.white,
                          size: 24,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDot({required bool isActive}) {
    return Container(
      width: isActive ? 22 : 8,
      height: 8,
      decoration: BoxDecoration(
        color: isActive ? AppColors.primaryBlue : AppColors.border,
        borderRadius: BorderRadius.circular(4),
      ),
    );
  }
}



