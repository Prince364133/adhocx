import '../../../shared/theme/app_colors.dart';
import 'package:flutter/material.dart';

class WalletBankCardWidget extends StatelessWidget {
  final Map<String, dynamic> bankDetails;

  const WalletBankCardWidget({super.key, required this.bankDetails});

  String _maskAccount(String account) {
    if (account.length <= 4) return account;
    return '•••• ${account.substring(account.length - 4)}';
  }

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
          Row(
            children: [
              Icon(
                Icons.account_balance_rounded,
                color: AppColors.textMutedDark,
                size: 16,
              ),
              const SizedBox(width: 8),
              Text(
                'Linked Settlement Account',
                style: TextStyle(
                  color: AppColors.textMutedDark,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.success.withAlpha(26),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: AppColors.success.withAlpha(77),
                  ),
                ),
                child: Text(
                  'Active',
                  style: TextStyle(
                    color: AppColors.success,
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          _row(
            'Account No.',
            _maskAccount(bankDetails['account_number'] as String),
            isMonospace: true,
          ),
          const SizedBox(height: 8),
          _row('Bank Name', bankDetails['bank_name'] as String),
          const SizedBox(height: 8),
          _row(
            'IFSC Code',
            bankDetails['ifsc'] as String,
            valueColor: AppColors.warning,
          ),
          const SizedBox(height: 8),
          _row(
            'UPI ID',
            bankDetails['upi_id'] as String,
            valueColor: AppColors.warning,
          ),
        ],
      ),
    );
  }

  Widget _row(
    String label,
    String value, {
    Color? valueColor,
    bool isMonospace = false,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(color: AppColors.textMutedDark, fontSize: 13),
        ),
        Text(
          value,
          style: TextStyle(
            color: valueColor ?? Colors.white,
            fontSize: 13,
            fontWeight: FontWeight.w500,
            fontFamily: isMonospace ? 'monospace' : null,
            fontFeatures: isMonospace
                ? const [FontFeature.tabularFigures()]
                : null,
          ),
        ),
      ],
    );
  }
}
