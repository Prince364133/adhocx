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
        color: const Color(0xFF1e293b),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.account_balance_rounded,
                color: Color(0xFF94a3b8),
                size: 16,
              ),
              const SizedBox(width: 8),
              const Text(
                'Linked Settlement Account',
                style: TextStyle(
                  color: Color(0xFF94a3b8),
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFF10b981).withAlpha(26),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: const Color(0xFF10b981).withAlpha(77),
                  ),
                ),
                child: const Text(
                  'Active',
                  style: TextStyle(
                    color: Color(0xFF10b981),
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
            valueColor: const Color(0xFFf59e0b),
          ),
          const SizedBox(height: 8),
          _row(
            'UPI ID',
            bankDetails['upi_id'] as String,
            valueColor: const Color(0xFFf59e0b),
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
          style: const TextStyle(color: Color(0xFF94a3b8), fontSize: 13),
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
