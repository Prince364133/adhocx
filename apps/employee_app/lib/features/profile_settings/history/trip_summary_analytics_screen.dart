import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/widgets/batch_08_illustrations.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';

/// Screen 3: Trip Summary (Analytics)
class TripSummaryAnalyticsScreen extends StatefulWidget {
  const TripSummaryAnalyticsScreen({super.key});

  @override
  State<TripSummaryAnalyticsScreen> createState() =>
      _TripSummaryAnalyticsScreenState();
}

class _TripSummaryAnalyticsScreenState
    extends State<TripSummaryAnalyticsScreen> {
  Map<String, dynamic>? _analytics;
  bool _isLoading = true;
  int _selectedPeriod = 0; // 0: Week, 1: Month, 2: Year

  final List<String> _periods = ['Week', 'Month', 'Year'];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final hp = await MockDataService.getHistoryProfileData();
    if (mounted) {
      setState(() {
        _analytics = hp['analytics'] as Map<String, dynamic>?;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateRange = _analytics?['dateRange'] ?? '08 - 14 Dec 2026';
    final total = (_analytics?['totalTrips'] ?? 10).toString();
    final completed = (_analytics?['completed'] ?? 8).toString();
    final cancelled = (_analytics?['cancelled'] ?? 1).toString();
    final unserved = (_analytics?['unserved'] ?? 1).toString();
    final distance = _analytics?['totalDistance'] ?? '124.6 km';
    final time = _analytics?['totalTime'] ?? '5 hr 42 min';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded,
              size: 18, color: AppColors.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Trip Summary',
          style: GoogleFonts.inter(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        centerTitle: true,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              child: SingleChildScrollView(
                padding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                child: Column(
                  children: [
                    // Period Selector
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Row(
                        children: List.generate(_periods.length, (index) {
                          final isSelected = _selectedPeriod == index;
                          return Expanded(
                            child: InkWell(
                              onTap: () =>
                                  setState(() => _selectedPeriod = index),
                              borderRadius: BorderRadius.circular(10),
                              child: Container(
                                padding:
                                    const EdgeInsets.symmetric(vertical: 8),
                                decoration: BoxDecoration(
                                  color: isSelected
                                      ? Colors.white
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(10),
                                  boxShadow: isSelected
                                      ? [
                                          BoxShadow(
                                            color: Colors.black
                                                .withValues(alpha: 0.06),
                                            blurRadius: 4,
                                            offset: const Offset(0, 2),
                                          ),
                                        ]
                                      : null,
                                ),
                                child: Center(
                                  child: Text(
                                    _periods[index],
                                    style: GoogleFonts.inter(
                                      fontSize: 13,
                                      fontWeight: isSelected
                                          ? FontWeight.w700
                                          : FontWeight.w500,
                                      color: isSelected
                                          ? AppColors.primaryBlue
                                          : AppColors.textSecondary,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          );
                        }),
                      ),
                    ),

                    const SizedBox(height: 16),
                    Text(
                      dateRange,
                      style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textMuted),
                    ),
                    const SizedBox(height: 20),

                    // 2x2 Stats Grid
                    Row(
                      children: [
                        Expanded(
                          child: AnalyticsStatTile(
                            label: 'Total Trips',
                            value: total,
                            color: AppColors.primaryBlue,
                            icon: Icons.directions_car_filled_rounded,
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: AnalyticsStatTile(
                            label: 'Completed',
                            value: completed,
                            color: AppColors.success,
                            icon: Icons.check_circle_rounded,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        Expanded(
                          child: AnalyticsStatTile(
                            label: 'Cancelled',
                            value: cancelled,
                            color: const Color(0xFFDC2626),
                            icon: Icons.cancel_rounded,
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: AnalyticsStatTile(
                            label: 'Unserved',
                            value: unserved,
                            color: AppColors.primaryPurple,
                            icon: Icons.error_outline_rounded,
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 24),

                    // Distance & Time Totals
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.alt_route_rounded,
                                  size: 20, color: AppColors.textSecondary),
                              const SizedBox(width: 12),
                              Text('Total Distance',
                                  style: GoogleFonts.inter(
                                      fontSize: 14,
                                      color: AppColors.textSecondary)),
                              const Spacer(),
                              Text(distance,
                                  style: GoogleFonts.inter(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w800,
                                      color: AppColors.textPrimary)),
                            ],
                          ),
                          const Divider(height: 24),
                          Row(
                            children: [
                              const Icon(Icons.access_time_rounded,
                                  size: 20, color: AppColors.textSecondary),
                              const SizedBox(width: 12),
                              Text('Total Time',
                                  style: GoogleFonts.inter(
                                      fontSize: 14,
                                      color: AppColors.textSecondary)),
                              const Spacer(),
                              Text(time,
                                  style: GoogleFonts.inter(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w800,
                                      color: AppColors.textPrimary)),
                            ],
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
}
