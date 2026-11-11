import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/widgets/employee_secondary_button.dart';
import 'package:adhocx_employee/widgets/employee_bottom_nav_bar.dart';
import 'package:adhocx_employee/widgets/batch_02_illustrations.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/navigation/employee_app_bar.dart';

class HomeNoUpcomingTripScreen extends StatefulWidget {
  const HomeNoUpcomingTripScreen({super.key});

  @override
  State<HomeNoUpcomingTripScreen> createState() =>
      _HomeNoUpcomingTripScreenState();
}

class _HomeNoUpcomingTripScreenState extends State<HomeNoUpcomingTripScreen> {
  Map<String, dynamic>? _profile;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadJsonData();
  }

  Future<void> _loadJsonData() async {
    final profile = await MockDataService.getEmployeeProfile();
    if (mounted) {
      setState(() {
        _profile = profile;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(
            child: CircularProgressIndicator(color: AppColors.primaryBlue)),
      );
    }

    final name = _profile?['name'] ?? 'Ravi Kumar';

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            children: [
              EmployeeGreetingHeader(
                name: name,
                unreadNotificationsCount: 1,
                onNotificationTap: () =>
                    context.push(AppRoutes.notificationsCenter),
                onSosTap: () => context.push(AppRoutes.safetySos),
                onProfileTap: () => context.push(AppRoutes.profileDetails),
              ),

              const SizedBox(height: 24),

              const Spacer(),

              // Empty Calendar Graphic
              const EmptyScheduleIllustration(),

              const SizedBox(height: 28),

              Text(
                'No Upcoming Trips',
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
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  "You don't have any scheduled transport for today.",
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    color: AppColors.textSecondary,
                    height: 1.45,
                  ),
                ),
              ),

              const SizedBox(height: 28),

              // View Schedule Button
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: EmployeeSecondaryButton(
                  label: 'View Schedule',
                  icon: Icons.calendar_month_outlined,
                  textColor: AppColors.primaryBlue,
                  borderColor: AppColors.primaryBlue,
                  onPressed: () => context.push(AppRoutes.homeUpcomingPickup),
                ),
              ),

              const Spacer(),
            ],
          ),
        ),
      ),
      bottomNavigationBar: const EmployeeBottomNavBar(currentIndex: 0),
    );
  }
}
