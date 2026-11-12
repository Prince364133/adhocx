import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/widgets/employee_primary_button.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/feedback/employee_entrance.dart';
import 'package:adhocx_employee/shared/illustrations/auth_illustrations.dart';

class EmployeeVerificationScreen extends StatelessWidget {
  const EmployeeVerificationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const Spacer(),
              const EmployeeEntrance(
                child: VerifiedAccountBadge(),
              ),
              const SizedBox(height: 28),
              Text(
                "You're All Set!",
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                  letterSpacing: -0.4,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                'Your AdhocX employee account is ready to use.',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  fontSize: 14,
                  color: AppColors.textSecondary,
                  height: 1.5,
                ),
              ),
              const Spacer(),
              EmployeeEntrance(
                delay: const Duration(milliseconds: 120),
                child: EmployeePrimaryButton(
                  label: 'Go to Home',
                  onPressed: () => context.go(AppRoutes.homeUpcomingPickup),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}
