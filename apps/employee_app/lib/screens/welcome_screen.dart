import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_colors.dart';
import '../widgets/employee_brand_logo.dart';
import '../widgets/employee_primary_button.dart';
import '../widgets/illustration_widgets.dart';
import '../routes/app_routes.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Column(
            children: [
              const SizedBox(height: 12),
              // Brand Logo at top
              const EmployeeBrandLogo(
                fontSize: 32,
                logoTheme: LogoTheme.light,
              ),

              const Spacer(),

              // Modern City & Sedan Car Illustration
              const WelcomeIllustration(height: 220),

              const SizedBox(height: 36),

              // Headline & Description
              Text(
                'Your Daily Office\nCommute, Simplified',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                  height: 1.25,
                  letterSpacing: -0.5,
                ),
              ),

              const SizedBox(height: 14),

              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  'Safe, reliable and organized transportation for your work journey.',
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

              // Primary CTA Pill Button
              EmployeePrimaryButton(
                label: 'Get Started  →',
                onPressed: () => context.push(AppRoutes.loginOptions),
              ),

              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

