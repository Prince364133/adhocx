import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../widgets/batch_07_illustrations.dart';
import '../../widgets/employee_bottom_nav_bar.dart';
import '../../services/mock_data_service.dart';
import '../../routes/app_routes.dart';

/// Screen 1: Trip History (Overview)
class TripHistoryOverviewScreen extends StatefulWidget {
  const TripHistoryOverviewScreen({super.key});

  @override
  State<TripHistoryOverviewScreen> createState() => _TripHistoryOverviewScreenState();
}

class _TripHistoryOverviewScreenState extends State<TripHistoryOverviewScreen> {
  Map<String, dynamic>? _historyData;
  bool _isLoading = true;
  int _selectedTab = 0; // 0: All, 1: Pickup, 2: Drop

  final List<String> _tabs = ['All', 'Pickup', 'Drop'];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final hp = await MockDataService.getHistoryProfileData();
    if (mounted) {
      setState(() {
        _historyData = hp['trip_history'] as Map<String, dynamic>?;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final thisMonth = (_historyData?['this_month'] as List<dynamic>? ?? []).where((item) {
      if (_selectedTab == 0) return true;
      final type = (item['type'] ?? '').toString().toLowerCase();
      if (_selectedTab == 1) return type.contains('pickup') || type.contains('login');
      if (_selectedTab == 2) return type.contains('drop') || type.contains('logout');
      return true;
    }).toList();

    final lastMonth = (_historyData?['last_month'] as List<dynamic>? ?? []).where((item) {
      if (_selectedTab == 0) return true;
      final type = (item['type'] ?? '').toString().toLowerCase();
      if (_selectedTab == 1) return type.contains('pickup') || type.contains('login');
      if (_selectedTab == 2) return type.contains('drop') || type.contains('logout');
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: AppColors.textPrimary),
          onPressed: () => context.go(AppRoutes.homeUpcomingPickup),
        ),
        title: Text(
          'Trip History',
          style: GoogleFonts.inter(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.bar_chart_rounded, color: AppColors.primaryBlue),
            onPressed: () => context.push(AppRoutes.tripSummaryAnalytics),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              child: Column(
                children: [
                  // Filter Tab Bar
                  Container(
                    color: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: List.generate(_tabs.length, (index) {
                        final isSelected = _selectedTab == index;
                        return InkWell(
                          onTap: () => setState(() => _selectedTab = index),
                          borderRadius: BorderRadius.circular(20),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
                            decoration: BoxDecoration(
                              color: isSelected ? AppColors.primaryBlue : Colors.transparent,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(
                              _tabs[index],
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                color: isSelected ? Colors.white : AppColors.textSecondary,
                              ),
                            ),
                          ),
                        );
                      }),
                    ),
                  ),

                  // Trip History Scroll
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.all(20),
                      children: [
                        if (thisMonth.isNotEmpty) ...[
                          Text(
                            'This Month',
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textSecondary,
                            ),
                          ),
                          const SizedBox(height: 12),
                          ...thisMonth.map((t) => _buildTripCard(t)),
                          const SizedBox(height: 16),
                        ],
                        if (lastMonth.isNotEmpty) ...[
                          Text(
                            'Last Month',
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textSecondary,
                            ),
                          ),
                          const SizedBox(height: 12),
                          ...lastMonth.map((t) => _buildTripCard(t)),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
      bottomNavigationBar: EmployeeBottomNavBar(
        currentIndex: 2, // Trips Tab Active
        onTap: (index) {
          if (index == 0) context.push(AppRoutes.homeUpcomingPickup);
          if (index == 1) context.push(AppRoutes.scheduleToday);
          if (index == 3) context.push(AppRoutes.safetyCenterOverview);
          if (index == 4) context.push(AppRoutes.profileDetails);
        },
      ),
    );
  }

  Widget _buildTripCard(dynamic trip) {
    final type = trip['type'] ?? '';
    final date = trip['date'] ?? '';
    final status = trip['status'] ?? '';
    final isDrop = type.toString().toLowerCase().contains('drop') || type.toString().toLowerCase().contains('logout');

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: ListTile(
        onTap: () => context.push(AppRoutes.tripHistoryDetails),
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: isDrop ? const Color(0xFFFFEDD5) : const Color(0xFFEFF6FF),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(
            isDrop ? Icons.business_rounded : Icons.directions_car_filled_rounded,
            color: isDrop ? AppColors.secondaryOrange : AppColors.primaryBlue,
            size: 20,
          ),
        ),
        title: Text(
          type,
          style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
        ),
        subtitle: Text(
          date,
          style: GoogleFonts.inter(fontSize: 12, color: AppColors.textMuted),
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            TicketStatusPill(status: status),
            const SizedBox(width: 6),
            const Icon(Icons.chevron_right_rounded, size: 16, color: AppColors.textMuted),
          ],
        ),
      ),
    );
  }
}

