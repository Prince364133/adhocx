import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';

class UserRequirementsListScreen extends StatefulWidget {
  const UserRequirementsListScreen({super.key});

  @override
  State<UserRequirementsListScreen> createState() => _UserRequirementsListScreenState();
}

class _UserRequirementsListScreenState extends State<UserRequirementsListScreen> {
  String _selectedTab = 'All';

  final List<String> _filterTabs = ['All', 'Active', 'Completed', 'Cancelled', 'Draft'];

  final List<Map<String, dynamic>> _allRequirements = [
    {
      'id': 'REQ-250510-0001',
      'title': 'Airport Transfer',
      'subtitle': '10 Vehicles • Today, 06:30 PM',
      'status': 'Partially Fulfilled',
      'progress': '8/10',
      'statusColor': Colors.orange,
      'category': 'Active',
    },
    {
      'id': 'REQ-250509-0003',
      'title': 'Corporate Event',
      'subtitle': '5 Vehicles • Tomorrow, 09:00 AM',
      'status': 'Completed',
      'progress': '5/5',
      'statusColor': AppColors.success,
      'category': 'Completed',
    },
    {
      'id': 'REQ-250512-0002',
      'title': 'Business Meeting',
      'subtitle': '8 Vehicles • 12 May, 08:00 AM',
      'status': 'Dispatching',
      'progress': '3/8',
      'statusColor': AppColors.info,
      'category': 'Active',
    },
    {
      'id': 'REQ-250514-0005',
      'title': 'Wedding Event',
      'subtitle': '6 Vehicles • 14 May, 09:00 PM',
      'status': 'Draft',
      'progress': 'Draft',
      'statusColor': Colors.grey,
      'category': 'Draft',
    },
    {
      'id': 'REQ-250510-0004',
      'title': 'City Tour',
      'subtitle': '4 Vehicles • 10 May, 10:00 AM',
      'status': 'Cancelled',
      'progress': 'Cancelled',
      'statusColor': AppColors.error,
      'category': 'Cancelled',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final filteredList = _selectedTab == 'All'
        ? _allRequirements
        : _allRequirements.where((r) => r['category'] == _selectedTab).toList();

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        elevation: 0,
        title: Text(
          'Requirements',
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
          IconButton(
            onPressed: () {},
            icon: Icon(Icons.tune, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Tabs Scrollable Row
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
            child: Row(
              children: _filterTabs.map((tab) {
                final isSelected = _selectedTab == tab;
                return Padding(
                  padding: const EdgeInsets.only(right: 8.0),
                  child: ChoiceChip(
                    label: Text(tab),
                    selected: isSelected,
                    onSelected: (selected) {
                      if (selected) setState(() => _selectedTab = tab);
                    },
                    selectedColor: const Color(0xFF6C5CE7),
                    backgroundColor: isDark ? AppColors.surfaceDark : Colors.grey[200],
                    labelStyle: TextStyle(
                      color: isSelected ? Colors.white : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.full),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),

          const SizedBox(height: AppSpacing.xs),

          // Requirements List
          Expanded(
            child: filteredList.isEmpty
                ? Center(
                    child: Text(
                      'No requirements found in $_selectedTab',
                      style: AppTypography.body(
                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                      ),
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    itemCount: filteredList.length,
                    separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
                    itemBuilder: (context, index) {
                      final item = filteredList[index];
                      final Color statusColor = item['statusColor'];

                      return InkWell(
                        onTap: () => context.push(AppRoutes.userRequirementDetailsScreen),
                        borderRadius: BorderRadius.circular(AppRadius.lg),
                        child: Container(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                            borderRadius: BorderRadius.circular(AppRadius.lg),
                            border: Border.all(
                              color: isDark ? AppColors.borderDark : AppColors.borderLight,
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      item['title'],
                                      style: AppTypography.h4(
                                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      item['subtitle'],
                                      style: AppTypography.caption(
                                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Row(
                                      children: [
                                        Container(
                                          width: 6,
                                          height: 6,
                                          decoration: BoxDecoration(
                                            color: statusColor,
                                            shape: BoxShape.circle,
                                          ),
                                        ),
                                        const SizedBox(width: 6),
                                        Text(
                                          item['status'],
                                          style: TextStyle(
                                            color: statusColor,
                                            fontSize: 12,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                decoration: BoxDecoration(
                                  color: statusColor.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(AppRadius.md),
                                ),
                                child: Text(
                                  item['progress'],
                                  style: TextStyle(
                                    color: statusColor,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                  ),
                                ),
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
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push(AppRoutes.userCreateRequirementScreen),
        backgroundColor: const Color(0xFF6C5CE7),
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('New Request', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
    );
  }
}
