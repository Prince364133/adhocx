import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../services/mock_data_service.dart';
import '../../widgets/employee_app_bar.dart';
import '../../widgets/schedule_tab_bar.dart';
import '../../routes/app_routes.dart';

class ScheduleWeeklyScreen extends StatefulWidget {
  const ScheduleWeeklyScreen({super.key});

  @override
  State<ScheduleWeeklyScreen> createState() => _ScheduleWeeklyScreenState();
}

class _ScheduleWeeklyScreenState extends State<ScheduleWeeklyScreen> {
  List<dynamic> _weeklyItems = [];
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
        _weeklyItems = (schedules['weekly'] as List<dynamic>?) ?? [];
        _isLoading = false;
      });
    }
  }

  void _onTabChanged(ScheduleTab tab) {
    if (tab == ScheduleTab.day) {
      context.pushReplacement(AppRoutes.scheduleDaily);
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

              // Segmented Tab Bar (Week active)
              ScheduleTabBar(
                activeTab: ScheduleTab.week,
                onTabChanged: _onTabChanged,
              ),

              const SizedBox(height: 24),

              // Week Selector
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
                      '08 - 14 Dec 2026',
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

              // 7-day List
              ..._weeklyItems.map((item) {
                final day = item['day'] ?? '';
                final status = item['status'] ?? '';
                final count = item['tripsCount'] ?? 0;

                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.border),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.03),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        day,
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      _buildStatusPill(status, count),
                    ],
                  ),
                );
              }),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusPill(String status, int count) {
    if (status == 'Completed') {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        decoration: BoxDecoration(
          color: AppColors.successLight,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          'Completed',
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: AppColors.success,
          ),
        ),
      );
    }
    if (count > 0) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        decoration: BoxDecoration(
          color: const Color(0xFFEFF6FF),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          '$count Trips',
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: AppColors.primaryBlue,
          ),
        ),
      );
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        'No Trip',
        style: GoogleFonts.inter(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: AppColors.textMuted,
        ),
      ),
    );
  }
}

