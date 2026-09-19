import '../../../shared/theme/app_colors.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class WalletWithdrawalWidget extends StatefulWidget {
  final double availableBalance;
  final bool hasPendingWithdrawal;
  final Map<String, dynamic> bankDetails;
  final Future<void> Function(double amount) onWithdraw;

  const WalletWithdrawalWidget({
    super.key,
    required this.availableBalance,
    required this.hasPendingWithdrawal,
    required this.bankDetails,
    required this.onWithdraw,
  });

  @override
  State<WalletWithdrawalWidget> createState() => _WalletWithdrawalWidgetState();
}

class _WalletWithdrawalWidgetState extends State<WalletWithdrawalWidget> {
  final _amountController = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  void _fillFull() {
    setState(() {
      _amountController.text = widget.availableBalance.toStringAsFixed(0);
      _error = null;
    });
  }

  void _withdraw() {
    final text = _amountController.text.trim();
    if (text.isEmpty) {
      setState(() => _error = 'Enter an amount');
      return;
    }
    final amount = double.tryParse(text);
    if (amount == null || amount <= 0) {
      setState(() => _error = 'Enter a valid amount');
      return;
    }
    if (amount < 100) {
      setState(() => _error = 'Minimum withdrawal is ₹100');
      return;
    }
    if (amount > widget.availableBalance) {
      setState(() => _error = 'Amount exceeds available balance');
      return;
    }
    setState(() => _error = null);
    widget.onWithdraw(amount);
  }

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
            'Request Settlement',
            style: TextStyle(
              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 14),
          // Amount input
          Container(
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceElevatedLight,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isDark ? AppColors.borderDark : AppColors.borderLight,
              ),
            ),
            child: Row(
              children: [
                Padding(
                  padding: const EdgeInsets.only(left: 14),
                  child: Text(
                    '₹',
                    style: TextStyle(
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                Expanded(
                  child: TextField(
                    controller: _amountController,
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    style: TextStyle(
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                    decoration: InputDecoration(
                      hintText: '0',
                      hintStyle: TextStyle(
                        color: isDark ? AppColors.textMutedDark : AppColors.textSecondaryLight,
                        fontSize: 18,
                      ),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 14,
                      ),
                    ),
                    onChanged: (_) => setState(() => _error = null),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          GestureDetector(
            onTap: _fillFull,
            child: Text(
              'Withdraw full balance (₹${widget.availableBalance.toStringAsFixed(0)})',
              style: const TextStyle(
                color: AppColors.warning,
                fontSize: 12,
                fontWeight: FontWeight.w600,
                decoration: TextDecoration.underline,
                decorationColor: AppColors.warning,
              ),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(
              _error!,
              style: const TextStyle(color: AppColors.error, fontSize: 12),
            ),
          ],
          if (widget.hasPendingWithdrawal) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.warning.withValues(alpha: isDark ? 0.15 : 0.08),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: AppColors.warning.withValues(alpha: isDark ? 0.35 : 0.25),
                ),
              ),
              child: const Row(
                children: [
                  Icon(
                    Icons.access_time_rounded,
                    color: AppColors.warning,
                    size: 14,
                  ),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Withdrawal in progress. Expected bank credit: 30 to 60 mins.',
                      style: TextStyle(color: AppColors.warning, fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton.icon(
              onPressed:
                  (widget.hasPendingWithdrawal || widget.availableBalance <= 0)
                  ? null
                  : _withdraw,
              icon: Icon(
                widget.hasPendingWithdrawal
                    ? Icons.access_time_rounded
                    : Icons.arrow_upward_rounded,
                size: 18,
              ),
              label: Text(
                widget.hasPendingWithdrawal
                    ? 'Settlement Processing (30–60 min)'
                    : 'Request Instant Settlement',
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: widget.hasPendingWithdrawal
                    ? (isDark ? AppColors.successDarkContainer : AppColors.successContainer)
                    : AppColors.success,
                foregroundColor: widget.hasPendingWithdrawal
                    ? (isDark ? AppColors.accentGreen : AppColors.successText)
                    : Colors.white,
                disabledBackgroundColor: isDark ? AppColors.surfaceElevatedDark : AppColors.borderLight,
                disabledForegroundColor: isDark ? AppColors.textMutedDark : AppColors.textSecondaryLight,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
