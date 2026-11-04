import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../theme/app_colors.dart';
import '../widgets/employee_brand_logo.dart';
import '../widgets/employee_secondary_button.dart';
import '../state/employee_auth_provider.dart';
import '../routes/app_routes.dart';

class HomeScreenPlaceholder extends StatelessWidget {
  const HomeScreenPlaceholder({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<EmployeeAuthProvider>();
    final user = authProvider.currentUser;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const EmployeeBrandLogo(
          fontSize: 22,
          logoTheme: LogoTheme.light,
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none_rounded, color: AppColors.textPrimary),
            onPressed: () {},
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // User Greeting Banner
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(18),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primaryBlue.withOpacity(0.24),
                      blurRadius: 18,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Welcome back,',
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            color: Colors.white.withOpacity(0.85),
                            fontWeight: FontWeight.w400,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            user?.employeeId ?? 'EMP10294',
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      user?.fullName ?? 'Corporate Employee',
                      style: GoogleFonts.inter(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '${user?.organization ?? "Estemporaneo Tech Pvt. Ltd."} • ${user?.office ?? "HITEC City"}',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: AppColors.primaryBlueLight,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Batch 01 Completion Banner
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.04),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppColors.successLight,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(
                            Icons.check_circle_rounded,
                            color: AppColors.success,
                            size: 20,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Batch 01 Implemented',
                                style: GoogleFonts.inter(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              Text(
                                'Authentication & Onboarding Complete',
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Text(
                      'All 15 screens for Batch 01 have been built strictly according to the UI mockup and PRD specifications.',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                        height: 1.45,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _pill('Flow A (Mobile OTP)'),
                        _pill('Flow B (Company SSO)'),
                        _pill('15 Screens Ready'),
                        _pill('Edge Cases Covered'),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Quick Screen Switcher (for QA and Review)
              Text(
                'Review Batch 01 Screens',
                style: GoogleFonts.inter(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 12),

              _buildScreenTile(context, '1. Splash Screen', AppRoutes.splash),
              _buildScreenTile(context, '2. Welcome Screen', AppRoutes.welcome),
              _buildScreenTile(context, '3. Login Options', AppRoutes.loginOptions),
              _buildScreenTile(context, '4. Mobile Number Entry', AppRoutes.mobileNumber),
              _buildScreenTile(context, '5. OTP Verification', AppRoutes.otpVerify),
              _buildScreenTile(context, '6. Company SSO (Alt)', AppRoutes.companySso),
              _buildScreenTile(context, '7. Employee Verified', AppRoutes.employeeVerified),
              _buildScreenTile(context, '8. Location Permission', AppRoutes.permissionLocation),
              _buildScreenTile(context, '9. Notification Permission', AppRoutes.permissionNotification),
              _buildScreenTile(context, '10. Onboarding (1/3 Schedule)', AppRoutes.onboardingSchedule),
              _buildScreenTile(context, '11. Onboarding (2/3 Tracking)', AppRoutes.onboardingTracking),
              _buildScreenTile(context, '12. Onboarding (3/3 Safety SOS)', AppRoutes.onboardingSafety),
              _buildScreenTile(context, '13. Onboarding Complete', AppRoutes.onboardingComplete),
              _buildScreenTile(context, '14. Error - Invalid OTP State', AppRoutes.invalidOtp),
              _buildScreenTile(context, '15. Transport Unavailable (Not Eligible)', AppRoutes.transportUnavailable),

              const SizedBox(height: 24),

              // Sign Out / Restart Button
              EmployeeSecondaryButton(
                label: 'Sign Out & Restart Flow',
                icon: Icons.logout_rounded,
                textColor: AppColors.error,
                borderColor: AppColors.errorBorder,
                onPressed: () async {
                  await authProvider.signOut();
                  if (context.mounted) {
                    context.go(AppRoutes.welcome);
                  }
                },
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _pill(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.primaryBlueLight.withOpacity(0.4),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        text,
        style: GoogleFonts.inter(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: AppColors.primaryBlueDark,
        ),
      ),
    );
  }

  Widget _buildScreenTile(BuildContext context, String title, String route) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.border),
      ),
      child: ListTile(
        dense: true,
        title: Text(
          title,
          style: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: AppColors.textMuted),
        onTap: () => context.push(route),
      ),
    );
  }
}

