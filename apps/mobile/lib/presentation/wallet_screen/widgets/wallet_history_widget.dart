import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../routes/app_routes.dart';
import '../../../shared/theme/app_colors.dart';
import '../../../widgets/status_badge_widget.dart';

class WalletHistoryWidget extends StatelessWidget {
  final List<Map<String, dynamic>> history;

  const WalletHistoryWidget({super.key, required this.history});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.25 : 0.04),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Recent Requests',
            style: TextStyle(
              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 14),
          if (history.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Center(
                child: Text(
                  'No recent settlement requests',
                  style: TextStyle(
                    color: isDark ? AppColors.textMutedDark : AppColors.textSecondaryLight,
                    fontSize: 13,
                  ),
                ),
              ),
            )
          else
            ...history.asMap().entries.map((entry) {
              final i = entry.key;
              final item = entry.value;
              return Column(
                children: [
                  InkWell(
                    borderRadius: BorderRadius.circular(8),
                    onTap: () => context.push(
                      AppRoutes.earningsWithdrawalDetailsScreen,
                      extra: item,
                    ),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: _HistoryRow(item: item),
                    ),
                  ),
                  if (i < history.length - 1)
                    Divider(
                      color: isDark ? AppColors.borderDark : AppColors.borderLight,
                      height: 16,
                    ),
                ],
              );
            }),
        ],
      ),
    );
  }
}

class _HistoryRow extends StatelessWidget {
  final Map<String, dynamic> item;

  const _HistoryRow({required this.item});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final status = item['status'] as String;
    final badgeStyle = switch (status) {
      'processed' || 'approved' => BadgeStyle.success,
      'rejected' => BadgeStyle.error,
      _ => BadgeStyle.warning,
    };

    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                item['payout_method'] as String,
                style: TextStyle(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                item['date'] as String,
                style: TextStyle(
                  color: isDark ? AppColors.textMutedDark : AppColors.textSecondaryLight,
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ),
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              '₹${(item['amount'] as double).toStringAsFixed(0)}',
              style: TextStyle(
                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                fontSize: 14,
                fontWeight: FontWeight.w700,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
            const SizedBox(height: 4),
            StatusBadgeWidget(
              label: (status[0].toUpperCase() + status.substring(1)),
              style: badgeStyle,
              fontSize: 10,
            ),
          ],
        ),
      ],
    );
  }
}
