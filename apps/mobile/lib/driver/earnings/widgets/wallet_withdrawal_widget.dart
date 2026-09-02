import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class WalletWithdrawalWidget extends StatefulWidget {
  final double availableBalance;
  final bool hasPendingWithdrawal;
  final Map<String, dynamic> bankDetails;
  final ValueChanged<double> onWithdraw;

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
    _amountController.text = widget.availableBalance.toStringAsFixed(0);
    setState(() => _error = null);
  }

  void _withdraw() {
    final raw = _amountController.text.trim();
    if (raw.isEmpty) {
      setState(() => _error = 'Enter withdrawal amount');
      return;
    }
    final amount = double.tryParse(raw);
    if (amount == null || amount <= 0) {
      setState(() => _error = 'Enter a valid amount');
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
          const Text(
            'Request Settlement',
            style: TextStyle(
              color: Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 14),
          // Amount input
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFF0f172a),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: Row(
              children: [
                const Padding(
                  padding: EdgeInsets.only(left: 14),
                  child: Text(
                    '₹',
                    style: TextStyle(
                      color: Colors.white,
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
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      fontFeatures: [FontFeature.tabularFigures()],
                    ),
                    decoration: const InputDecoration(
                      hintText: '0',
                      hintStyle: TextStyle(
                        color: Color(0xFF475569),
                        fontSize: 18,
                      ),
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.symmetric(
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
                color: Color(0xFFf59e0b),
                fontSize: 12,
                decoration: TextDecoration.underline,
                decorationColor: Color(0xFFf59e0b),
              ),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(
              _error!,
              style: const TextStyle(color: Color(0xFFef4444), fontSize: 12),
            ),
          ],
          if (widget.hasPendingWithdrawal) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFf59e0b).withAlpha(20),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: const Color(0xFFf59e0b).withAlpha(77),
                ),
              ),
              child: const Row(
                children: [
                  Icon(
                    Icons.access_time_rounded,
                    color: Color(0xFFf59e0b),
                    size: 14,
                  ),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Withdrawal in progress. Expected bank credit: 30 to 60 mins.',
                      style: TextStyle(color: Color(0xFFf59e0b), fontSize: 12),
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
                    ? const Color(0xFF064e3b)
                    : const Color(0xFF10b981),
                foregroundColor: widget.hasPendingWithdrawal
                    ? const Color(0xFF6ee7b7)
                    : Colors.white,
                disabledBackgroundColor: const Color(0xFF334155),
                disabledForegroundColor: const Color(0xFF475569),
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
