import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';

class UserHelpFaqScreen extends StatefulWidget {
  const UserHelpFaqScreen({super.key});

  @override
  State<UserHelpFaqScreen> createState() => _UserHelpFaqScreenState();
}

class _UserHelpFaqScreenState extends State<UserHelpFaqScreen> {
  String _selectedTab = 'FAQs';
  final List<String> _tabs = ['FAQs', 'Guides', 'Policies'];

  final List<String> _faqs = [
    'How do I post a requirement?',
    'How are drivers assigned?',
    'What if no driver is available?',
    'How does the payment work?',
    'When will I receive the invoice?',
    'How can I track my trip?',
    'How do I cancel a requirement?',
    'How do I contact support?',
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
        title: Text('Help & FAQ', style: AppTypography.h3(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
      ),
      body: Column(
        children: [
          // Segmented Tabs
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(color: isDark ? AppColors.surfaceDark : AppColors.slate200, borderRadius: BorderRadius.circular(AppRadius.md)),
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
                          color: isSelected ? AppColors.primary : Colors.transparent,
                          borderRadius: BorderRadius.circular(AppRadius.sm),
                        ),
                        child: Center(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 2),
                            child: FittedBox(
                              fit: BoxFit.scaleDown,
                              child: Text(
                                tab,
                                maxLines: 1,
                                style: TextStyle(
                                  color: isSelected ? Colors.white : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),

          // Search Bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search FAQs',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                contentPadding: const EdgeInsets.symmetric(vertical: 0),
              ),
            ),
          ),

          const SizedBox(height: AppSpacing.md),

          // FAQ List
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.all(AppSpacing.md),
              itemCount: _faqs.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                return Container(
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                  ),
                  child: ListTile(
                    title: Text(_faqs[index], style: TextStyle(fontSize: 13, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight)),
                    trailing: const Icon(Icons.chevron_right, size: 20),
                    onTap: () {},
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
