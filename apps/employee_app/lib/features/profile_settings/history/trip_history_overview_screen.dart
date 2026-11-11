import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';

/// Screen: Trip History (Overview)
/// Uses design system components: EmployeeAppBar, EmployeePillFilter, EmployeeTripCard, EmployeeBottomNavBar.
class TripHistoryOverviewScreen extends StatefulWidget {
  const TripHistoryOverviewScreen({super.key});

  @override
  State<TripHistoryOverviewScreen> createState() =>
      _TripHistoryOverviewScreenState();
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
    final thisMonth =
        (_historyData?['this_month'] as List<dynamic>? ?? []).where((item) {
      if (_selectedTab == 0) return true;
      final type = (item['type'] ?? '').toString().toLowerCase();
      if (_selectedTab == 1)
        return type.contains('pickup') || type.contains('login');
      if (_selectedTab == 2)
        return type.contains('drop') || type.contains('logout');
      return true;
    }).toList();

    final lastMonth =
        (_historyData?['last_month'] as List<dynamic>? ?? []).where((item) {
      if (_selectedTab == 0) return true;
      final type = (item['type'] ?? '').toString().toLowerCase();
      if (_selectedTab == 1)
        return type.contains('pickup') || type.contains('login');
      if (_selectedTab == 2)
        return type.contains('drop') || type.contains('logout');
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: EmployeeAppBar(
        title: 'Trip History',
        centerTitle: true,
        onBack: () => context.go(AppRoutes.homeUpcomingPickup),
        actions: [
          IconButton(
            icon: const Icon(Icons.bar_chart_rounded,
                color: AppColors.primaryBlue),
            onPressed: () => context.push(AppRoutes.tripSummaryAnalytics),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primaryBlue))
          : SafeArea(
              child: Column(
                children: [
                  // Reusable Segmented Pill Filter
                  EmployeePillFilter(
                    options: _tabs,
                    selectedIndex: _selectedTab,
                    onSelected: (index) => setState(() => _selectedTab = index),
                  ),

                  // Trip History List
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 20, vertical: 16),
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
                        if (thisMonth.isEmpty && lastMonth.isEmpty)
                          const EmployeeEmptyState(
                            icon: Icons.history_rounded,
                            title: 'No Trip History',
                            description:
                                'No completed commute trips recorded in this period.',
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
      bottomNavigationBar: EmployeeBottomNavBar(
        currentIndex: 2, // Trips Tab Active
        onTap: (index) {
          if (index == 0) context.go(AppRoutes.homeUpcomingPickup);
          if (index == 1) context.go(AppRoutes.scheduleToday);
          if (index == 3) context.go(AppRoutes.profileDetails);
        },
      ),
    );
  }

  Widget _buildTripCard(dynamic trip) {
    final type = trip['type'] ?? '';
    final date = trip['date'] ?? '';
    final status = trip['status'] ?? '';
    final isDrop = type.toString().toLowerCase().contains('drop') ||
        type.toString().toLowerCase().contains('logout');

    return EmployeeTripCard(
      title: type,
      date: date,
      status: status,
      isDrop: isDrop,
      onTap: () => context.push(AppRoutes.tripHistoryDetails),
    );
  }
}
