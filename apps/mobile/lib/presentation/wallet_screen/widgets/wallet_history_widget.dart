import '../../../shared/theme/app_colors.dart';
import 'package:flutter/material.dart';
import '../../../widgets/status_badge_widget.dart';

class WalletHistoryWidget extends StatelessWidget {
  final List<Map<String, dynamic>> history;

  const WalletHistoryWidget({super.key, required this.history});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceElevatedDark,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderDark),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Recent Requests',
            style: TextStyle(
              color: Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 14),
          ...history.asMap().entries.map((entry) {
            final i = entry.key;
            final item = entry.value;
            return Column(
              children: [
                _HistoryRow(item: item),
                if (i < history.length - 1)
                  Divider(color: AppColors.borderDark, height: 16),
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
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                item['date'] as String,
                style: TextStyle(color: AppColors.textMutedDark, fontSize: 11),
              ),
            ],
          ),
        ),
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              '₹${(item['amount'] as double).toStringAsFixed(0)}',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.w700,
                fontFeatures: [FontFeature.tabularFigures()],
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
