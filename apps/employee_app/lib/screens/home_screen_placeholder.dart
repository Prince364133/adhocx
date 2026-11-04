import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../theme/app_colors.dart';
import '../widgets/employee_brand_logo.dart';
import '../widgets/employee_secondary_button.dart';
import '../widgets/employee_bottom_nav_bar.dart';
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
                      user?.fullName ?? 'Ravi Kumar',
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

              // Batch 06: Boarding & Trip Completion Section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Batch 06 — Boarding & Completion',
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.successLight,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '12 Screens',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppColors.success,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              _buildScreenTile(context, '1. Boarding — Verify Options', AppRoutes.boardingVerifyOptions),
              _buildScreenTile(context, '2. Boarding OTP Input', AppRoutes.boardingOtpInput),
              _buildScreenTile(context, '3. Scan QR for Boarding', AppRoutes.scanBoardingQr),
              _buildScreenTile(context, '4. Verifying Boarding...', AppRoutes.verifyingBoarding),
              _buildScreenTile(context, '5. Boarding Confirmed!', AppRoutes.boardingSuccessful),
              _buildScreenTile(context, '6. Error — Invalid OTP State', AppRoutes.wrongOtp),
              _buildScreenTile(context, '7. Error — Boarding Issue', AppRoutes.boardingIssue),
              _buildScreenTile(context, '8. Trip In Progress (En Route)', AppRoutes.tripInProgressEnRoute),
              _buildScreenTile(context, '9. Reached Destination', AppRoutes.dropReached),
              _buildScreenTile(context, '10. Trip Completed!', AppRoutes.tripCompletedSummary),
              _buildScreenTile(context, '11. Safe Reach Confirmation', AppRoutes.safeReachConfirmation),
              _buildScreenTile(context, '12. Post-Trip Feedback', AppRoutes.postTripFeedback),

              const SizedBox(height: 28),

              // Batch 05: Live Tracking & Navigation Section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Batch 05 — Live Tracking & Navigation',
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.primaryBlueLight.withOpacity(0.4),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '12 Screens',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primaryBlueDark,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              _buildScreenTile(context, '1. Live Tracking (Overview)', AppRoutes.liveTrackingOverview),
              _buildScreenTile(context, '2. Trip Live Map (Full)', AppRoutes.tripLiveMapFull),
              _buildScreenTile(context, '3. Pickup Point Details', AppRoutes.pickupPointDetails),
              _buildScreenTile(context, '4. Walking Directions', AppRoutes.walkingDirections),
              _buildScreenTile(context, '5. Cab Approaching', AppRoutes.cabApproaching),
              _buildScreenTile(context, '6. Cab Arrived (OTP 583271)', AppRoutes.cabArrived),
              _buildScreenTile(context, '7. Trip Progress (On Trip)', AppRoutes.tripProgressOnTrip),
              _buildScreenTile(context, '8. Route & Stops Manifest', AppRoutes.routeAndStops),
              _buildScreenTile(context, '9. Exception — GPS Unavailable', AppRoutes.gpsUnavailable),
              _buildScreenTile(context, '10. Exception — Stale Location', AppRoutes.staleLocation),
              _buildScreenTile(context, '11. Exception — Poor Network', AppRoutes.poorNetwork),
              _buildScreenTile(context, '12. Exception — Reconnecting...', AppRoutes.reconnecting),

              const SizedBox(height: 28),

              // Batch 04: Driver & Cab Assignment Section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Batch 04 — Driver & Cab Assignment',
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.warningLight,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '13 Screens',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppColors.warning,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              _buildScreenTile(context, '1. Assignment Notification', AppRoutes.assignmentNotification),
              _buildScreenTile(context, '2. Cab Assigned (Overview)', AppRoutes.cabAssignedOverview),
              _buildScreenTile(context, '3. Driver Details', AppRoutes.driverDetails),
              _buildScreenTile(context, '4. Vehicle Details', AppRoutes.vehicleDetails),
              _buildScreenTile(context, '5. Pickup Sequence (4 Stops)', AppRoutes.pickupSequence),
              _buildScreenTile(context, '6. Cab Reassigned', AppRoutes.cabReassigned),
              _buildScreenTile(context, '7. Assignment Delayed', AppRoutes.assignmentDelayed),
              _buildScreenTile(context, '8. Driver Replaced', AppRoutes.driverReplaced),
              _buildScreenTile(context, '9. Driver Delay', AppRoutes.driverDelay),
              _buildScreenTile(context, '10. Vehicle Issue', AppRoutes.vehicleIssue),
              _buildScreenTile(context, '11. Contact Driver Sheet', AppRoutes.contactDriverSheet),
              _buildScreenTile(context, '12. Assignment History', AppRoutes.assignmentHistory),
              _buildScreenTile(context, '13. No Cab Available', AppRoutes.noCabAvailable),

              const SizedBox(height: 28),

              // Batch 03: Schedule & Calendar Section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Batch 03 — Schedule & Calendar',
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.primaryBlueLight.withOpacity(0.4),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '14 Screens',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primaryBlueDark,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              _buildScreenTile(context, '1. Schedule — Today (Overview)', AppRoutes.scheduleToday),
              _buildScreenTile(context, '2. Daily Schedule', AppRoutes.scheduleDaily),
              _buildScreenTile(context, '3. Weekly Schedule', AppRoutes.scheduleWeekly),
              _buildScreenTile(context, '4. Monthly Schedule', AppRoutes.scheduleMonthly),
              _buildScreenTile(context, '5. Shift / Trip Details (Login)', AppRoutes.shiftDetailsLogin),
              _buildScreenTile(context, '6. Overnight Shift Details', AppRoutes.shiftDetailsOvernight),
              _buildScreenTile(context, '7. No Scheduled Trips', AppRoutes.scheduleNoTrips),
              _buildScreenTile(context, '8. Request Change Options', AppRoutes.requestChangeOptions),
              _buildScreenTile(context, '9. Change Request — Details', AppRoutes.changeDetails),
              _buildScreenTile(context, '10. Change Request — Submitted', AppRoutes.changeSubmitted),
              _buildScreenTile(context, '11. Request Status — Pending', AppRoutes.requestPending),
              _buildScreenTile(context, '12. Request Status — Approved', AppRoutes.requestApproved),
              _buildScreenTile(context, '13. Request Status — Rejected', AppRoutes.requestRejected),
              _buildScreenTile(context, '14. Cancel Trip Request', AppRoutes.cancelTrip),

              const SizedBox(height: 28),

              // Batch 02: Home & Trip Overview Section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Batch 02 — Home & Trip Overview',
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.successLight,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '14 Screens',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppColors.success,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              _buildScreenTile(context, '1. Home — Upcoming Pickup', AppRoutes.homeUpcomingPickup),
              _buildScreenTile(context, '2. Home — Upcoming Drop', AppRoutes.homeUpcomingDrop),
              _buildScreenTile(context, '3. No Upcoming Trips', AppRoutes.homeNoTrips),
              _buildScreenTile(context, '4. Trip — Planning', AppRoutes.tripPlanning),
              _buildScreenTile(context, '5. Trip — Assigned', AppRoutes.tripAssigned),
              _buildScreenTile(context, '6. Trip — Approaching', AppRoutes.tripApproaching),
              _buildScreenTile(context, '7. Trip — Arrived', AppRoutes.tripArrived),
              _buildScreenTile(context, '8. Trip — Boarded', AppRoutes.tripBoarded),
              _buildScreenTile(context, '9. Trip — In Progress', AppRoutes.tripInProgress),
              _buildScreenTile(context, '10. Trip — Completed', AppRoutes.tripCompleted),
              _buildScreenTile(context, '11. Trip — Cancelled', AppRoutes.tripCancelled),
              _buildScreenTile(context, '12. Trip — Unserved', AppRoutes.tripUnserved),
              _buildScreenTile(context, '13. Trip Details (Timeline)', AppRoutes.tripDetails),
              _buildScreenTile(context, '14. Driver & Vehicle Details', AppRoutes.tripDriverVehicle),

              const SizedBox(height: 28),

              // Batch 01: Auth & Onboarding Section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Batch 01 — Auth & Onboarding',
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.primaryBlueLight.withOpacity(0.4),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '15 Screens',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primaryBlueDark,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              _buildScreenTile(context, '01. Splash Screen', AppRoutes.splash),
              _buildScreenTile(context, '02. Welcome Screen', AppRoutes.welcome),
              _buildScreenTile(context, '03. Login Options', AppRoutes.loginOptions),
              _buildScreenTile(context, '04. Enter Mobile Number', AppRoutes.mobileNumber),
              _buildScreenTile(context, '05. Verify OTP', AppRoutes.otpVerify),
              _buildScreenTile(context, '06. Company SSO (Alt)', AppRoutes.companySso),
              _buildScreenTile(context, '07. Account Verified', AppRoutes.employeeVerified),
              _buildScreenTile(context, '08. Allow Location Access', AppRoutes.permissionLocation),
              _buildScreenTile(context, '09. Enable Notifications', AppRoutes.permissionNotification),
              _buildScreenTile(context, '10. Onboarding (1/3 Schedule)', AppRoutes.onboardingSchedule),
              _buildScreenTile(context, '11. Onboarding (2/3 Tracking)', AppRoutes.onboardingTracking),
              _buildScreenTile(context, '12. Onboarding (3/3 Safety SOS)', AppRoutes.onboardingSafety),
              _buildScreenTile(context, '13. You\'re All Set!', AppRoutes.onboardingComplete),
              _buildScreenTile(context, '14. Error — Invalid OTP State', AppRoutes.invalidOtp),
              _buildScreenTile(context, '15. Transport Access Not Available', AppRoutes.transportUnavailable),

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
      bottomNavigationBar: EmployeeBottomNavBar(
        currentIndex: 0,
        onTap: (index) {
          if (index == 1) {
            context.push(AppRoutes.scheduleToday);
          }
        },
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
