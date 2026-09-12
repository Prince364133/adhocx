import '../../../shared/theme/app_colors.dart';
import 'package:flutter/material.dart';

class WalletKpiGridWidget extends StatelessWidget {
  final double todayEarnings;
  final double availableBalance;

  const WalletKpiGridWidget({
    super.key,
    required this.todayEarnings,
    required this.availableBalance,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _KpiCard(
            label: "Today's Earnings",
            value: '₹${todayEarnings.toStringAsFixed(0)}',
            icon: Icons.trending_up_rounded,
            valueColor: AppColors.success,
            iconBg: AppColors.success,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _KpiCard(
            label: 'Available Balance',
            value: '₹${availableBalance.toStringAsFixed(0)}',
            icon: Icons.account_balance_wallet_rounded,
            valueColor: Colors.white,
            iconBg: AppColors.warning,
          ),
        ),
      ],
    );
  }
}

class _KpiCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color valueColor;
  final Color iconBg;

  const _KpiCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.valueColor,
    required this.iconBg,
  });

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
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: iconBg.withAlpha(38),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: iconBg, size: 18),
          ),
          const SizedBox(height: 12),
          Text(
            label,
            style: TextStyle(color: AppColors.textMutedDark, fontSize: 11),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              color: valueColor,
              fontSize: 22,
              fontWeight: FontWeight.w700,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
        ],
      ),
    );
  }
}
