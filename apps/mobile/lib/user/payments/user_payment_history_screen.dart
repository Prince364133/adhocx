import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';

class UserPaymentHistoryScreen extends StatefulWidget {
  const UserPaymentHistoryScreen({super.key});

  @override
  State<UserPaymentHistoryScreen> createState() => _UserPaymentHistoryScreenState();
}

class _UserPaymentHistoryScreenState extends State<UserPaymentHistoryScreen> {
  String _selectedFilter = 'All';

  final List<String> _filters = ['All', 'Pending', 'Paid', 'Failed', 'Refunded'];

  final List<Map<String, String>> _transactions = [
    {
      'title': 'Airport Transfer',
      'id': 'REQ-250510-0001',
      'date': '10 May 2025, 06:30 PM',
      'amount': '₹ 24,750.00',
      'status': 'Pending',
    },
    {
      'title': 'Corporate Event',
      'id': 'REQ-250808-0003',
      'date': '8 May 2025, 09:00 AM',
      'amount': '₹ 18,500.00',
      'status': 'Paid',
    },
    {
      'title': 'Wedding Event',
      'id': 'REQ-250505-0002',
      'date': '5 May 2025, 07:00 PM',
      'amount': '₹ 32,000.00',
      'status': 'Paid',
    },
    {
      'title': 'City Tour',
      'id': 'REQ-250804-0001',
      'date': '4 May 2025, 10:00 AM',
      'amount': '₹ 8,750.00',
      'status': 'Failed',
    },
    {
      'title': 'Airport Transfer',
      'id': 'REQ-250501-0004',
      'date': '1 May 2025, 06:00 PM',
      'amount': '₹ 21,300.00',
      'status': 'Paid',
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
        title: Text('Payment History', style: AppTypography.h3(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
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

          // Group Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text('May 2025', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontWeight: FontWeight.bold)),
            ),
          ),

          const SizedBox(height: AppSpacing.xs),

          // List of Transactions
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.all(AppSpacing.md),
              itemCount: _transactions.length,
              separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
              itemBuilder: (context, index) {
                final t = _transactions[index];
                final status = t['status']!;
                Color badgeColor = AppColors.success;
                if (status == 'Pending') badgeColor = Colors.orange;
                if (status == 'Failed') badgeColor = AppColors.error;

                return InkWell(
                  onTap: () => context.push(AppRoutes.userPaymentDetailsScreen),
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
                              Text(t['id']!, style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontSize: 10)),
                              Text(t['date']!, style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontSize: 10)),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(t['amount']!, style: TextStyle(fontWeight: FontWeight.bold, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontSize: 13)),
                            const SizedBox(height: 4),
                            Text(status, style: TextStyle(color: badgeColor, fontWeight: FontWeight.bold, fontSize: 11)),
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
