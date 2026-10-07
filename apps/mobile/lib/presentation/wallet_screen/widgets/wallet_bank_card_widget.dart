import '../../../shared/theme/app_colors.dart';
import 'package:flutter/material.dart';

class WalletBankCardWidget extends StatelessWidget {
  final Map<String, dynamic> bankDetails;
  final VoidCallback? onEdit;

  const WalletBankCardWidget({
    super.key,
    required this.bankDetails,
    this.onEdit,
  });

  String _maskAccount(String account) {
    if (account.length <= 4) return account;
    return '•••• ${account.substring(account.length - 4)}';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onEdit,
        borderRadius: BorderRadius.circular(16),
        child: Container(
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
              Row(
                children: [
                  Icon(
                    Icons.account_balance_rounded,
                    color: isDark ? AppColors.textMutedDark : AppColors.textSecondaryLight,
                    size: 16,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Linked Settlement Account',
                    style: TextStyle(
                      color: isDark ? AppColors.textMutedDark : AppColors.textSecondaryLight,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.success.withValues(alpha: isDark ? 0.15 : 0.1),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(
                        color: AppColors.success.withValues(alpha: isDark ? 0.4 : 0.3),
                      ),
                    ),
                    child: const Text(
                      'Active',
                      style: TextStyle(
                        color: AppColors.success,
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  if (onEdit != null) ...[
                    const SizedBox(width: 8),
                    Icon(
                      Icons.edit_outlined,
                      size: 16,
                      color: isDark ? AppColors.primaryLight : AppColors.primary,
                    ),
                  ],
                ],
              ),
          const SizedBox(height: 14),
          _row(
            context,
            'Account No.',
            _maskAccount(bankDetails['account_number'] as String? ?? ''),
            isMonospace: true,
          ),
          const SizedBox(height: 8),
          _row(context, 'Bank Name', (bankDetails['bank_name'] as String?)?.isNotEmpty == true ? bankDetails['bank_name'] as String : 'Not Provided'),
          const SizedBox(height: 8),
          _row(
            context,
            'IFSC Code',
            (bankDetails['ifsc'] as String?)?.isNotEmpty == true ? bankDetails['ifsc'] as String : 'Not Provided',
            valueColor: AppColors.warning,
          ),
          const SizedBox(height: 8),
          _row(
            context,
            'UPI ID',
            (bankDetails['upi_id'] as String?)?.isNotEmpty == true ? bankDetails['upi_id'] as String : 'Not Linked',
            valueColor: AppColors.warning,
          ),
        ],
          ),
        ),
      ),
    );
  }

  Widget _row(
    BuildContext context,
    String label,
    String value, {
    Color? valueColor,
    bool isMonospace = false,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            color: isDark ? AppColors.textMutedDark : AppColors.textSecondaryLight,
            fontSize: 13,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            color: valueColor ?? (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
            fontSize: 13,
            fontWeight: FontWeight.w600,
            fontFamily: isMonospace ? 'monospace' : null,
            fontFeatures: isMonospace ? const [FontFeature.tabularFigures()] : null,
          ),
        ),
      ],
    );
  }
}
