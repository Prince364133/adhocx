import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../services/mock_data_service.dart';
import '../../widgets/employee_app_bar.dart';
import '../../widgets/employee_secondary_button.dart';
import '../../widgets/schedule_tab_bar.dart';
import '../../routes/app_routes.dart';

class ScheduleDailyScreen extends StatefulWidget {
  const ScheduleDailyScreen({super.key});

  @override
  State<ScheduleDailyScreen> createState() => _ScheduleDailyScreenState();
}

class _ScheduleDailyScreenState extends State<ScheduleDailyScreen> {
  Map<String, dynamic>? _todaySchedule;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadJsonData();
  }

  Future<void> _loadJsonData() async {
    final schedules = await MockDataService.getSchedules();
    if (mounted) {
      setState(() {
        _todaySchedule = schedules['today'] as Map<String, dynamic>?;
        _isLoading = false;
      });
    }
  }

  void _onTabChanged(ScheduleTab tab) {
    if (tab == ScheduleTab.week) {
      context.pushReplacement(AppRoutes.scheduleWeekly);
    } else if (tab == ScheduleTab.month) {
      context.pushReplacement(AppRoutes.scheduleMonthly);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: AppColors.primaryBlue)),
      );
    }

    final date = _todaySchedule?['date'] ?? 'Tue, 09 Dec 2026';
    final pickup = _todaySchedule?['pickup'] as Map<String, dynamic>?;
    final drop = _todaySchedule?['drop'] as Map<String, dynamic>?;

    final pickupTime = pickup?['time'] ?? '8:15 AM';
    final pickupRoute = pickup?['route'] ?? 'Home -> Office';
    final dropTime = drop?['time'] ?? '6:30 PM';
    final dropRoute = drop?['route'] ?? 'Office -> Home';

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: const EmployeeAppBar(),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Text(
                  'My Schedule',
                  style: GoogleFonts.inter(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),

              const SizedBox(height: 18),

              // Segmented Tab Bar (Day active)
              ScheduleTabBar(
                activeTab: ScheduleTab.day,
                onTabChanged: _onTabChanged,
              ),

              const SizedBox(height: 24),

              // Date Navigation Selector
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: AppColors.surfaceMuted,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Icon(Icons.chevron_left_rounded, color: AppColors.textSecondary),
                    Text(
                      date,
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const Icon(Icons.chevron_right_rounded, color: AppColors.textSecondary),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Shift 1 Card: Login (Pickup)
              _buildShiftCard(
                icon: Icons.directions_car_filled_rounded,
                iconBg: AppColors.successLight,
                iconColor: AppColors.success,
                title: 'Login (Pickup)',
                time: pickupTime,
                route: pickupRoute,
                onTap: () => context.push(AppRoutes.shiftDetailsLogin),
              ),

              const SizedBox(height: 14),

              // Shift 2 Card: Logout (Drop)
              _buildShiftCard(
                icon: Icons.apartment_rounded,
                iconBg: const Color(0xFFFEF3C7),
                iconColor: const Color(0xFFD97706),
                title: 'Logout - Drop',
                time: dropTime,
                route: dropRoute,
                onTap: () => context.push(AppRoutes.shiftDetailsOvernight),
              ),

              const SizedBox(height: 32),

              // Request Change Outlined Button
              EmployeeSecondaryButton(
                label: 'Request Change',
                icon: Icons.edit_calendar_outlined,
                textColor: AppColors.primaryBlue,
                borderColor: AppColors.primaryBlue,
                onPressed: () => context.push(AppRoutes.requestChangeOptions),
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildShiftCard({
    required IconData icon,
    required Color iconBg,
    required Color iconColor,
    required String title,
    required String time,
    required String route,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.04),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: iconBg,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: iconColor, size: 24),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          title,
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: iconColor,
                          ),
                        ),
                        Text(
                          time,
                          style: GoogleFonts.inter(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      route,
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted, size: 20),
            ],
          ),
        ),
      ),
    );
  }
}
