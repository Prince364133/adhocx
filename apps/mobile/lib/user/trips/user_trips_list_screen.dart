import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';

class UserTripsListScreen extends StatefulWidget {
  const UserTripsListScreen({super.key});

  @override
  State<UserTripsListScreen> createState() => _UserTripsListScreenState();
}

class _UserTripsListScreenState extends State<UserTripsListScreen> {
  String _selectedTab = 'Upcoming';

  final List<String> _tabs = ['Upcoming', 'Active', 'Completed', 'Cancelled'];

  final List<Map<String, dynamic>> _trips = [
    {
      'title': 'Airport Transfer',
      'id': 'REQ-250510-0001',
      'driver': 'Rahul Sharma',
      'time': '06:30 PM',
      'status': 'En Route',
      'statusColor': AppColors.info,
      'category': 'Active',
    },
    {
      'title': 'Corporate Event',
      'id': 'REQ-250509-0003',
      'driver': 'Amit Verma',
      'time': '09:00 AM',
      'status': 'Arrived',
      'statusColor': Colors.purple,
      'category': 'Upcoming',
    },
    {
      'title': 'Business Meeting',
      'id': 'REQ-250512-0002',
      'driver': 'Not Assigned',
      'time': '08:00 AM',
      'status': 'Scheduled',
      'statusColor': Colors.orange,
      'category': 'Upcoming',
    },
    {
      'title': 'City Tour',
      'id': 'REQ-250510-0004',
      'driver': 'Not Assigned',
      'time': '10:00 AM',
      'status': 'Scheduled',
      'statusColor': Colors.orange,
      'category': 'Upcoming',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final filteredList = _trips.where((t) => t['category'] == _selectedTab || _selectedTab == 'Upcoming').toList();

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        elevation: 0,
        title: Text(
          'Trips',
          style: AppTypography.h2(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            onPressed: () {},
            icon: Icon(Icons.search, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
          ),
        ],
      ),
      body: Column(
        children: [
          // Segmented Tabs Header
          Container(
            margin: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceDark : Colors.grey[200],
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: Row(
              children: _tabs.map((tab) {
                final isSelected = _selectedTab == tab;
                return Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _selectedTab = tab),
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        color: isSelected ? const Color(0xFF6C5CE7) : Colors.transparent,
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                      ),
                      child: Text(
                        tab,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: isSelected ? Colors.white : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),

          const SizedBox(height: AppSpacing.xs),

          // Trips List
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.all(AppSpacing.md),
              itemCount: filteredList.length,
              separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
              itemBuilder: (context, index) {
                final trip = filteredList[index];
                final Color statusColor = trip['statusColor'];

                return InkWell(
                  onTap: () => context.push(AppRoutes.userActiveTripScreen),
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  child: Container(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                      borderRadius: BorderRadius.circular(AppRadius.lg),
                      border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: const Color(0xFF6C5CE7).withValues(alpha: 0.1),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.directions_car, color: Color(0xFF6C5CE7)),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                trip['title'],
                                style: AppTypography.h4(
                                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                trip['id'],
                                style: AppTypography.caption(
                                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Driver: ${trip['driver']}',
                                style: AppTypography.caption(
                                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: statusColor.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(AppRadius.sm),
                              ),
                              child: Text(
                                trip['status'],
                                style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              trip['time'],
                              style: AppTypography.caption(
                                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
