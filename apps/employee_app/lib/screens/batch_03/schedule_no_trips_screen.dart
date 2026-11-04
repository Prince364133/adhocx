import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../widgets/employee_app_bar.dart';
import '../../widgets/employee_secondary_button.dart';
import '../../widgets/batch_03_illustrations.dart';
import '../../routes/app_routes.dart';

class ScheduleNoTripsScreen extends StatelessWidget {
  const ScheduleNoTripsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: const EmployeeAppBar(),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const Spacer(),

              // Empty Calendar Graphic with Red Cross
              const CalendarNoTripsBadge(),

              const SizedBox(height: 32),

              Text(
                'No Scheduled Trips',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                  letterSpacing: -0.4,
                ),
              ),

              const SizedBox(height: 8),

              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Text(
                  "You don't have any transport scheduled for this date.",
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    color: AppColors.textSecondary,
                    height: 1.45,
                  ),
                ),
              ),

              const SizedBox(height: 36),

              // "Go to Calendar" Button
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: EmployeeSecondaryButton(
                  label: 'Go to Calendar',
                  icon: Icons.calendar_month_outlined,
                  textColor: AppColors.primaryBlue,
                  borderColor: AppColors.primaryBlue,
                  onPressed: () => context.go(AppRoutes.scheduleMonthly),
                ),
              ),

              const Spacer(),
            ],
          ),
        ),
      ),
    );
  }
}
