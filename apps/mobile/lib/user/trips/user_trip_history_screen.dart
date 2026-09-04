import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';

class UserTripHistoryScreen extends StatefulWidget {
  const UserTripHistoryScreen({super.key});

  @override
  State<UserTripHistoryScreen> createState() => _UserTripHistoryScreenState();
}

class _UserTripHistoryScreenState extends State<UserTripHistoryScreen> {
  String _selectedFilter = 'All';

  final List<String> _filters = ['All', 'Upcoming', 'Completed', 'Cancelled'];

  final List<Map<String, String>> _mayTrips = [
    {'title': 'Airport Transfer', 'date': '10 May 2025, 06:30 PM', 'status': 'In-Progress'},
    {'title': 'Corporate Event', 'date': '8 May 2025, 09:00 AM', 'status': 'Completed'},
    {'title': 'Wedding Event', 'date': '5 May 2025, 07:00 PM', 'status': 'Completed'},
    {'title': 'City Tour', 'date': '4 May 2025, 10:00 AM', 'status': 'Cancelled'},
  ];

  final List<Map<String, String>> _aprTrips = [
    {'title': 'Outstation Trip', 'date': '28 Apr 2025, 09:00 AM', 'status': 'Completed'},
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        elevation: 0,
        leading: IconButton(
          onPressed: () => context.pop(),
          icon: Icon(Icons.arrow_back, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
        ),
        title: Text('Trip History', style: AppTypography.h3(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            onPressed: () {},
            icon: Icon(Icons.tune, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
            child: Row(
              children: _filters.map((filter) {
                final isSelected = _selectedFilter == filter;
                return Padding(
                  padding: const EdgeInsets.only(right: 8.0),
                  child: ChoiceChip(
                    label: Text(filter),
                    selected: isSelected,
                    onSelected: (selected) {
                      if (selected) setState(() => _selectedFilter = filter);
                    },
                    selectedColor: const Color(0xFF6C5CE7),
                    backgroundColor: isDark ? AppColors.surfaceDark : Colors.grey[200],
                    labelStyle: TextStyle(
                      color: isSelected ? Colors.white : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    ),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.full)),
                  ),
                );
              }).toList(),
            ),
          ),

          const SizedBox(height: AppSpacing.xs),

          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(AppSpacing.md),
              children: [
                Text('May 2025', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                ..._mayTrips.map((t) => _buildTripCard(context, t, isDark)),
                const SizedBox(height: 16),
                Text('Apr 2025', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                ..._aprTrips.map((t) => _buildTripCard(context, t, isDark)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTripCard(BuildContext context, Map<String, String> t, bool isDark) {
    final status = t['status']!;
    Color badgeColor = AppColors.success;
    if (status == 'In-Progress') badgeColor = const Color(0xFF6C5CE7);
    if (status == 'Cancelled') badgeColor = AppColors.error;

    return Padding(
      padding: const EdgeInsets.only(bottom: 10.0),
      child: InkWell(
        onTap: () => context.push(AppRoutes.userHistoricalTripDetailsScreen),
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
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                child: const Icon(Icons.directions_car_outlined, color: Color(0xFF6C5CE7)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(t['title']!, style: AppTypography.caption(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                    Text(t['date']!, style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontSize: 10)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: badgeColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                ),
                child: Text(status, style: TextStyle(color: badgeColor, fontSize: 11, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
