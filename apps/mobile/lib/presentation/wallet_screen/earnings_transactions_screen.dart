import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Screen 2: Transactions detailed list matching exact design mockup.
class EarningsTransactionsScreen extends StatefulWidget {
  const EarningsTransactionsScreen({super.key});

  @override
  State<EarningsTransactionsScreen> createState() => _EarningsTransactionsScreenState();
}

class _EarningsTransactionsScreenState extends State<EarningsTransactionsScreen> {
  String _selectedFilter = 'All';

  final List<Map<String, dynamic>> _allTransactions = [
    {
      'title': 'Trip Earnings',
      'subtitle': 'Corporate Transfer',
      'date': 'Today, 6:42 PM',
      'amount': '₹850',
      'isCredit': true,
      'status': 'Completed',
      'category': 'Earnings',
      'icon': Icons.account_balance_outlined,
    },
    {
      'title': 'Incentive',
      'subtitle': 'Weekend Bonus',
      'date': 'Today, 12:00 PM',
      'amount': '₹150',
      'isCredit': true,
      'category': 'Incentives',
      'icon': Icons.stars_outlined,
    },
    {
      'title': 'Trip Earnings',
      'subtitle': 'Airport Transfer',
      'date': 'Yesterday, 8:30 PM',
      'amount': '₹720',
      'isCredit': true,
      'status': 'Completed',
      'category': 'Earnings',
      'icon': Icons.account_balance_outlined,
    },
    {
      'title': 'Toll Reimbursement',
      'subtitle': 'Trip ID: AY1021',
      'date': 'Yesterday, 7:15 PM',
      'amount': '₹60',
      'isCredit': true,
      'category': 'Earnings',
      'icon': Icons.check_circle_outline,
    },
    {
      'title': 'Trip Earnings',
      'subtitle': 'Hotel Transfer',
      'date': 'Yesterday, 6:45 AM',
      'amount': '₹650',
      'isCredit': true,
      'status': 'Completed',
      'category': 'Earnings',
      'icon': Icons.account_balance_outlined,
    },
    {
      'title': 'Adjustment',
      'subtitle': 'Cancellation Charge',
      'date': 'May 18, 10:20 PM',
      'amount': '-₹120',
      'isCredit': false,
      'category': 'Adjustments',
      'icon': Icons.remove_circle_outline,
    },
    {
      'title': 'Withdrawn',
      'subtitle': 'To Bank •••• 4321',
      'date': 'May 17, 09:15 AM',
      'amount': '-₹2,000',
      'isCredit': false,
      'category': 'Adjustments',
      'icon': Icons.unarchive_outlined,
      'isWithdrawal': true,
    },
  ];

  @override
  Widget build(BuildContext context) {
    final filteredList = _selectedFilter == 'All'
        ? _allTransactions
        : _allTransactions.where((t) => t['category'] == _selectedFilter).toList();

    return Scaffold(
      backgroundColor: AppColors.bgLight,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Column(
              children: [
                // ── App Header ───────────────────────────────────────────────
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.lg,
                    vertical: AppSpacing.md,
                  ),
                  decoration: const BoxDecoration(
                    color: AppColors.surfaceLight,
                    border: Border(
                      bottom: BorderSide(color: AppColors.borderLight),
                    ),
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () {
                          if (context.canPop()) {
                            context.pop();
                          } else {
                            context.go(AppRoutes.walletScreen);
                          }
                        },
                        icon: const Icon(
                          Icons.arrow_back,
                          color: AppColors.textPrimaryLight,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Transactions',
                          style: AppTypography.h3(
                            color: AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      IconButton(
                        onPressed: () {
                          // Filter funnel
                        },
                        icon: const Icon(
                          Icons.filter_list_rounded,
                          color: AppColors.textPrimaryLight,
                        ),
                      ),
                    ],
                  ),
                ),

                // ── Filter Pills Bar ─────────────────────────────────────────
                Padding(
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: ['All', 'Earnings', 'Incentives', 'Adjustments'].map((filter) {
                        final isSelected = _selectedFilter == filter;
                        return GestureDetector(
                          onTap: () => setState(() => _selectedFilter = filter),
                          child: Container(
                            margin: const EdgeInsets.only(right: 8),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 8,
                            ),
                            decoration: BoxDecoration(
                              color: isSelected ? AppColors.primary : AppColors.surfaceLight,
                              borderRadius: BorderRadius.circular(AppRadius.full),
                              border: Border.all(
                                color: isSelected ? AppColors.primary : AppColors.borderLight,
                              ),
                            ),
                            child: Text(
                              filter,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                color: isSelected ? Colors.white : AppColors.textPrimaryLight,
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ),

                // ── Scrollable Transactions List ──────────────────────────────
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                    children: [
                      Text(
                        'May 2025',
                        style: AppTypography.caption(
                          color: AppColors.textMutedLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),

                      Container(
                        decoration: BoxDecoration(
                          color: AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(color: AppColors.borderLight),
                        ),
                        child: Column(
                          children: List.generate(filteredList.length, (index) {
                            final tx = filteredList[index];
                            final isLast = index == filteredList.length - 1;

                            return Column(
                              children: [
                                ListTile(
                                  onTap: () {
                                    if (tx['isWithdrawal'] == true) {
                                      context.push(AppRoutes.earningsWithdrawalDetailsScreen);
                                    }
                                  },
                                  leading: Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: AppColors.bgLight,
                                      borderRadius: BorderRadius.circular(AppRadius.md),
                                    ),
                                    child: Icon(
                                      tx['icon'] as IconData,
                                      size: 20,
                                      color: tx['isCredit'] ? AppColors.accentGreenDark : AppColors.error,
                                    ),
                                  ),
                                  title: Row(
                                    children: [
                                      Text(
                                        tx['title'] as String,
                                        style: AppTypography.body(
                                          color: AppColors.textPrimaryLight,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                  subtitle: Text(
                                    '${tx['subtitle']}\n${tx['date']}',
                                    style: AppTypography.caption(
                                      color: AppColors.textMutedLight,
                                    ),
                                  ),
                                  isThreeLine: true,
                                  trailing: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text(
                                        tx['amount'] as String,
                                        style: AppTypography.body(
                                          color: tx['isCredit'] ? AppColors.accentGreenDark : AppColors.error,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      if (tx['status'] != null) ...[
                                        const SizedBox(height: 2),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: AppColors.accentGreenDark.withValues(alpha: 0.12),
                                            borderRadius: BorderRadius.circular(AppRadius.xs),
                                          ),
                                          child: Text(
                                            tx['status'] as String,
                                            style: AppTypography.caption(
                                              color: AppColors.accentGreenDark,
                                              fontWeight: FontWeight.bold,
                                            ).copyWith(fontSize: 10),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                                if (!isLast)
                                  const Divider(height: 1, color: AppColors.borderLight),
                              ],
                            );
                          }),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xxl),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
