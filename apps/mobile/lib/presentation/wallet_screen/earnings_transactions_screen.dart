import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../services/driver_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Screen 2: Transactions detailed list with live ledger entries.
class EarningsTransactionsScreen extends StatefulWidget {
  const EarningsTransactionsScreen({super.key});

  @override
  State<EarningsTransactionsScreen> createState() => _EarningsTransactionsScreenState();
}

class _EarningsTransactionsScreenState extends State<EarningsTransactionsScreen> {
  String _selectedFilter = 'All';
  bool _isLoading = true;
  List<Map<String, dynamic>> _transactions = [];

  @override
  void initState() {
    super.initState();
    _loadTransactions();
  }

  Future<void> _loadTransactions() async {
    setState(() => _isLoading = true);
    try {
      final summary = await DriverService.instance.getWalletSummary();
      final List<Map<String, dynamic>> parsed = [];

      if (summary is Map && summary['recentLedgerEntries'] is List) {
        final entries = summary['recentLedgerEntries'] as List;
        for (final e in entries) {
          final isCredit = (e['entryType'] ?? '').toString().toUpperCase() == 'CREDIT';
          final amountVal = double.tryParse((e['amount'] ?? 0).toString()) ?? 0.0;
          final desc = e['description']?.toString() ?? (isCredit ? 'Trip Earnings' : 'Withdrawal');
          final date = e['createdAt'] != null
              ? e['createdAt'].toString().split('T').first
              : 'Recent';

          parsed.add({
            'id': e['referenceId'] ?? e['id'],
            'referenceId': e['referenceId'],
            'title': isCredit ? 'Trip Earnings' : 'Withdrawal Payout',
            'subtitle': desc,
            'date': date,
            'amount': '${isCredit ? "+" : "-"}₹${amountVal.toStringAsFixed(0)}',
            'amountVal': amountVal,
            'isCredit': isCredit,
            'status': 'Settled',
            'category': isCredit ? 'Earnings' : 'Adjustments',
            'icon': isCredit ? Icons.account_balance_wallet_outlined : Icons.unarchive_outlined,
            'isWithdrawal': !isCredit,
            'rawEntry': e,
          });
        }
      }

      if (mounted) {
        setState(() {
          _transactions = parsed;
        });
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final filteredList = _selectedFilter == 'All'
        ? _transactions
        : _transactions.where((t) => t['category'] == _selectedFilter).toList();

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
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
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                    border: Border(
                      bottom: BorderSide(
                        color: isDark ? AppColors.borderDark : AppColors.borderLight,
                      ),
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
                        icon: Icon(
                          Icons.arrow_back,
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Transactions',
                          style: AppTypography.h3(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      IconButton(
                        onPressed: () {
                          // Filter funnel
                        },
                        icon: Icon(
                          Icons.filter_list_rounded,
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
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
                              color: isSelected
                                  ? AppColors.primary
                                  : (isDark ? AppColors.surfaceDark : AppColors.surfaceLight),
                              borderRadius: BorderRadius.circular(AppRadius.full),
                              border: Border.all(
                                color: isSelected
                                    ? AppColors.primary
                                    : (isDark ? AppColors.borderDark : AppColors.borderLight),
                              ),
                            ),
                            child: Text(
                              filter,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                color: isSelected
                                    ? Colors.white
                                    : (isDark ? AppColors.textSecondaryDark : AppColors.textPrimaryLight),
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
                  child: _isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : filteredList.isEmpty
                          ? Center(
                              child: Padding(
                                padding: const EdgeInsets.all(32),
                                child: Text(
                                  'No transactions recorded yet',
                                  style: AppTypography.body(
                                    color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                  ),
                                ),
                              ),
                            )
                          : ListView(
                              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                              children: [
                                Text(
                                  'Recent Activity',
                                  style: AppTypography.caption(
                                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: AppSpacing.md),

                                Container(
                                  decoration: BoxDecoration(
                                    color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                                    borderRadius: BorderRadius.circular(AppRadius.lg),
                                    border: Border.all(
                                      color: isDark ? AppColors.borderDark : AppColors.borderLight,
                                    ),
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
                                                context.push(
                                                  AppRoutes.earningsWithdrawalDetailsScreen,
                                                  extra: tx,
                                                );
                                              }
                                            },
                                            leading: Container(
                                              padding: const EdgeInsets.all(10),
                                              decoration: BoxDecoration(
                                                color: isDark ? AppColors.surfaceElevatedDark : AppColors.bgLight,
                                                borderRadius: BorderRadius.circular(AppRadius.md),
                                              ),
                                              child: Icon(
                                                tx['icon'] as IconData,
                                                size: 20,
                                                color: tx['isCredit']
                                                    ? (isDark ? AppColors.accentGreen : AppColors.accentGreenDark)
                                                    : AppColors.error,
                                              ),
                                            ),
                                            title: Text(
                                              tx['title'] as String,
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              style: AppTypography.body(
                                                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                            subtitle: Text(
                                              '${tx['subtitle']}\n${tx['date']}',
                                              maxLines: 2,
                                              overflow: TextOverflow.ellipsis,
                                              style: AppTypography.caption(
                                                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
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
                                                    color: tx['isCredit']
                                                        ? (isDark ? AppColors.accentGreen : AppColors.accentGreenDark)
                                                        : AppColors.error,
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                ),
                                                if (tx['status'] != null) ...[
                                                  const SizedBox(height: 2),
                                                  Container(
                                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                    decoration: BoxDecoration(
                                                      color: AppColors.accentGreenDark.withValues(alpha: isDark ? 0.2 : 0.12),
                                                      borderRadius: BorderRadius.circular(AppRadius.xs),
                                                    ),
                                                    child: Text(
                                                      tx['status'] as String,
                                                      style: AppTypography.caption(
                                                        color: isDark ? AppColors.accentGreen : AppColors.accentGreenDark,
                                                        fontWeight: FontWeight.bold,
                                                      ).copyWith(fontSize: 10),
                                                    ),
                                                  ),
                                                ],
                                              ],
                                            ),
                                          ),
                                          if (!isLast)
                                            Divider(
                                              height: 1,
                                              color: isDark ? AppColors.borderDark : AppColors.borderLight,
                                            ),
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
