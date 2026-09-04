import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';

class UserDraftRequirementsScreen extends StatefulWidget {
  const UserDraftRequirementsScreen({super.key});

  @override
  State<UserDraftRequirementsScreen> createState() => _UserDraftRequirementsScreenState();
}

class _UserDraftRequirementsScreenState extends State<UserDraftRequirementsScreen> {
  String _selectedTab = 'All Drafts';

  final List<String> _tabs = ['All Drafts', 'Today', 'This Week', 'This Month'];

  final List<Map<String, String>> _drafts = [
    {
      'title': 'Airport Transfer',
      'subtitle': 'Sedan • 10 Vehicles',
      'route': 'DLF Cyber City, Gurugram -> IGI Airport, Delhi',
      'time': '10 May 2025 • 06:30 PM',
    },
    {
      'title': 'Corporate Event',
      'subtitle': 'SUV • 5 Vehicles',
      'route': 'Cyber Hub, Gurugram -> Jaipur',
      'time': '12 May 2025 • 09:00 AM',
    },
    {
      'title': 'Wedding Event',
      'subtitle': 'Tempo Traveller • 3 Vehicles',
      'route': 'Gurugram -> Manesar',
      'time': '15 May 2025 • 05:00 PM',
    },
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
        title: Text(
          'Drafts',
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
          // Filter Chips Row
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
            child: Row(
              children: _tabs.map((tab) {
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
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.full)),
                  ),
                );
              }).toList(),
            ),
          ),

          const SizedBox(height: AppSpacing.xs),

          // Drafts List
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.all(AppSpacing.md),
              itemCount: _drafts.length,
              separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
              itemBuilder: (context, index) {
                final draft = _drafts[index];
                return Container(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                    borderRadius: BorderRadius.circular(AppRadius.lg),
                    border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            draft['title']!,
                            style: AppTypography.h4(
                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const Icon(Icons.more_horiz, color: Colors.grey),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        draft['subtitle']!,
                        style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        draft['route']!,
                        style: AppTypography.body(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            draft['time']!,
                            style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                          ),
                          OutlinedButton(
                            onPressed: () => context.push(AppRoutes.userCreateRequirementScreen),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: const Color(0xFF6C5CE7),
                              side: const BorderSide(color: Color(0xFF6C5CE7)),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                            ),
                            child: const Text('Continue', style: TextStyle(fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    ],
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
