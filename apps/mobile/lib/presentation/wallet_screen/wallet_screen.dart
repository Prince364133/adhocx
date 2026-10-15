import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import '../../services/driver_service.dart';
import '../../shared/theme/app_colors.dart';

import './widgets/bank_details_modal.dart';
import './widgets/wallet_bank_card_widget.dart';
import './widgets/wallet_history_widget.dart';
import './widgets/wallet_kpi_grid_widget.dart';
import './widgets/wallet_withdrawal_widget.dart';

class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  bool _isLoading = true;
  double _todayEarnings = 0.0;
  double _availableBalance = 0.0;
  bool _hasPendingWithdrawal = false;

  Map<String, dynamic> _bankDetails = {
    'account_holder': 'Driver Partner',
    'bank_name': 'Not Provided',
    'account_number': '',
    'ifsc': '',
    'upi_id': '',
  };

  List<Map<String, dynamic>> _withdrawalHistory = [];

  @override
  void initState() {
    super.initState();
    _fetchWalletData();
  }

  Future<void> _fetchWalletData() async {
    try {
      final results = await Future.wait([
        DriverService.instance.getProfile(forceRefresh: true).catchError((_) => null),
        DriverService.instance.getWalletSummary(forceRefresh: true).catchError((_) => null),
      ]);

      final pRaw = results[0];
      final profile = pRaw is Map<String, dynamic>
          ? (pRaw['data'] is Map<String, dynamic> ? pRaw['data'] as Map<String, dynamic> : pRaw)
          : null;

      final wRaw = results[1];
      final wallet = wRaw is Map<String, dynamic>
          ? (wRaw['data'] is Map<String, dynamic> ? wRaw['data'] as Map<String, dynamic> : wRaw)
          : null;

      if (mounted) {
        setState(() {
          if (profile != null) {
            _bankDetails = {
              'account_holder': profile['bankAccountName'] ?? profile['bank_account_name'] ?? profile['fullName'] ?? profile['full_name'] ?? 'Driver Partner',
              'bank_name': profile['bankName'] ?? profile['bank_name'] ?? 'Not Provided',
              'account_number': profile['bankAccountNumber'] ?? profile['bank_account_number'] ?? '',
              'ifsc': profile['bankIfsc'] ?? profile['bank_ifsc'] ?? '',
              'upi_id': profile['upiId'] ?? profile['upi_id'] ?? '',
            };
          }

          if (wallet != null) {
            final num earn = wallet['todayEarnings'] as num? ?? 0.0;
            final num avail = wallet['availableBalance'] as num? ?? wallet['walletBalance'] as num? ?? 0.0;
            _todayEarnings = earn.toDouble();
            _availableBalance = avail.toDouble();
            _hasPendingWithdrawal = wallet['hasPendingWithdrawal'] == true;

            if (wallet['withdrawals'] is List) {
              _withdrawalHistory = (wallet['withdrawals'] as List).map((item) {
                final m = item as Map<String, dynamic>;
                final status = m['status'] ?? 'pending';
                final amount = (m['amount'] as num?)?.toDouble() ?? 0.0;
                final createdAt = DateTime.tryParse(m['createdAt'] ?? m['created_at'] ?? '') ?? DateTime.now();
                final formattedDate = '${_monthName(createdAt.month)} ${createdAt.day}, ${createdAt.year}';
                return {
                  'id': m['id'],
                  'payout_method': m['payoutMethod'] ?? m['payout_method'] ?? (m['bankName'] != null ? '${m['bankName']} Transfer' : 'Bank Transfer'),
                  'bank_name': m['bankName'] ?? _bankDetails['bank_name'],
                  'date': formattedDate,
                  'amount': amount,
                  'status': status,
                  'raw': m,
                };
              }).toList();
            }
          }
        });
      }
    } catch (e) {
      debugPrint('Error fetching wallet data: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  String _monthName(int month) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1];
  }

  Future<void> _openBankDetailsModal() async {
    final updated = await BankDetailsModal.show(
      context,
      initialDetails: _bankDetails,
      onSaved: (newDetails) {
        if (mounted) {
          setState(() {
            _bankDetails = Map<String, dynamic>.from(newDetails);
          });
        }
      },
    );

    if (updated != null && mounted) {
      setState(() {
        _bankDetails = Map<String, dynamic>.from(updated);
      });
      _fetchWalletData();
    }
  }

  Future<void> _onWithdraw(double amount) async {
    final accNumber = (_bankDetails['account_number'] ?? '').toString().trim();
    final ifsc = (_bankDetails['ifsc'] ?? '').toString().trim().toUpperCase();
    final holder = (_bankDetails['account_holder'] ?? 'Driver Partner').toString().trim();

    if (accNumber.isEmpty || ifsc.isEmpty) {
      Fluttertoast.showToast(
        msg: 'Please add your bank account details before requesting a withdrawal',
        backgroundColor: AppColors.warning,
      );
      _openBankDetailsModal();
      return;
    }

    try {
      final bankNameStr = (_bankDetails['bank_name'] ?? '').toString().trim();
      await DriverService.instance.requestWithdrawal(
        amount: amount,
        bankAccountName: holder,
        bankAccountNumber: accNumber,
        bankIfsc: ifsc,
        bankName: bankNameStr.isNotEmpty && bankNameStr != 'Not Provided' ? bankNameStr : null,
      );

      setState(() => _hasPendingWithdrawal = true);
      Fluttertoast.showToast(
        msg: 'Withdrawal of ₹${amount.toStringAsFixed(0)} requested successfully!',
        backgroundColor: AppColors.accentGreenDark,
      );

      _fetchWalletData();
    } catch (e) {
      debugPrint('Withdrawal error: $e');
      Fluttertoast.showToast(
        msg: 'Failed to request withdrawal: $e',
        backgroundColor: AppColors.error,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(isDark),
            Expanded(
              child: _isLoading
                  ? const Center(
                      child: CircularProgressIndicator(color: AppColors.warning),
                    )
                  : ListView(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                      children: [
                        WalletKpiGridWidget(
                          todayEarnings: _todayEarnings,
                          availableBalance: _availableBalance,
                        ),
                        const SizedBox(height: 16),
                        WalletBankCardWidget(
                          bankDetails: _bankDetails,
                          onEdit: _openBankDetailsModal,
                        ),
                        const SizedBox(height: 16),
                        WalletWithdrawalWidget(
                          availableBalance: _availableBalance,
                          hasPendingWithdrawal: _hasPendingWithdrawal,
                          bankDetails: _bankDetails,
                          onWithdraw: _onWithdraw,
                        ),
                        const SizedBox(height: 16),
                        WalletHistoryWidget(history: _withdrawalHistory),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        border: Border(
          bottom: BorderSide(
            color: isDark ? AppColors.borderDark : AppColors.borderLight,
            width: 1,
          ),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AppColors.warning,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Center(
              child: Text(
                'A',
                style: TextStyle(
                  color: Colors.black,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Text(
            'Wallet & Settlements',
            style: TextStyle(
              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
              fontSize: 17,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}