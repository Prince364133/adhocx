import '../../shared/theme/app_colors.dart';
import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

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
    'account_holder': '',
    'bank_name': '',
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
      final supabase = Supabase.instance.client;
      final user = supabase.auth.currentUser;

      if (user != null) {
        // 1. Fetch profile details (for bank info and account holder name)
        final profileRes = await supabase
            .from('driver_profiles')
            .select()
            .eq('user_id', user.id)
            .maybeSingle();

        if (profileRes != null) {
          setState(() {
            _bankDetails = {
              'account_holder': profileRes['full_name'] ?? 'Driver Partner',
              'bank_name': profileRes['bank_name'] ?? 'Not Provided',
              'account_number': profileRes['bank_account_number'] ?? '',
              'ifsc': profileRes['bank_ifsc'] ?? '',
              'upi_id': profileRes['upi_id'] ?? '',
            };
          });
        }

        // 2. Fetch withdrawal history for this driver
        final withdrawalsRes = await supabase
            .from('driver_withdrawals')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', ascending: false);

        final List<Map<String, dynamic>> fetchedHistory = [];
        bool hasPending = false;
        double totalWithdrawnOrPending = 0.0;

          for (final item in withdrawalsRes) {
            final status = item['status'] ?? 'pending';
            final amount = (item['amount'] as num?)?.toDouble() ?? 0.0;
            
            if (status == 'pending') {
              hasPending = true;
            }
            if (status == 'processed' || status == 'approved' || status == 'pending') {
              totalWithdrawnOrPending += amount;
            }

            final createdAt = DateTime.tryParse(item['created_at'] ?? '') ?? DateTime.now();
            final formattedDate = '${_monthName(createdAt.month)} ${createdAt.day}, ${createdAt.year}';
            
            final payoutMethod = item['payout_method'] == 'UPI'
                ? 'UPI: ${item['upi_id'] ?? 'N/A'}'
                : 'A/C •••• ${_getLast4(item['bank_account_number'])}';

            fetchedHistory.add({
              'payout_method': payoutMethod,
              'date': formattedDate,
              'amount': amount,
              'status': status,
            });
          }

          // 3. Fetch completed trips to calculate earnings
          final tripsRes = await supabase
              .from('trips')
              .select('driver_payout, created_at, status')
              .eq('driver_id', user.id)
              .eq('status', 'completed');

          double totalEarnings = 0.0;
          double todayEarningsCalc = 0.0;
          final todayString = DateTime.now().toIso8601String().substring(0, 10);

          for (final trip in tripsRes) {
            final payout = (trip['driver_payout'] as num?)?.toDouble() ?? 0.0;
            totalEarnings += payout;

            final tripDate = trip['created_at']?.toString() ?? '';
            if (tripDate.startsWith(todayString)) {
              todayEarningsCalc += payout;
            }
          }

          setState(() {
            _todayEarnings = todayEarningsCalc;
            // Available balance = Total earned minus what's already paid out or pending withdrawal
            _availableBalance = (totalEarnings - totalWithdrawnOrPending).clamp(0.0, double.infinity);
            _hasPendingWithdrawal = hasPending;
            _withdrawalHistory = fetchedHistory;
        });
      }
    } catch (e) {
      debugPrint('Error fetching wallet data: $e');
      Fluttertoast.showToast(msg: 'Failed to sync wallet data.');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  String _getLast4(String? accNum) {
    if (accNum == null || accNum.length < 4) return '3210';
    return accNum.substring(accNum.length - 4);
  }

  String _monthName(int month) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1];
  }

  Future<void> _onWithdraw(double amount) async {
    try {
      final supabase = Supabase.instance.client;
      final user = supabase.auth.currentUser;

      if (user == null) return;

      // Insert real withdrawal request into Supabase
      await supabase.from('driver_withdrawals').insert({
        'user_id': user.id,
        'driver_name': _bankDetails['account_holder'],
        'amount': amount,
        'payout_method': _bankDetails['upi_id'] != null && _bankDetails['upi_id'].toString().isNotEmpty ? 'UPI' : 'BANK_TRANSFER',
        'upi_id': _bankDetails['upi_id'],
        'bank_name': _bankDetails['bank_name'],
        'bank_account_number': _bankDetails['account_number'],
        'bank_ifsc': _bankDetails['ifsc'],
        'status': 'pending',
      });

      setState(() => _hasPendingWithdrawal = true);
      Fluttertoast.showToast(
        msg: 'Withdrawal of ₹${amount.toStringAsFixed(0)} requested successfully!',
      );
      
      // Refresh list to show the new pending item
      _fetchWalletData();
    } catch (e) {
      debugPrint('Withdrawal error: $e');
      Fluttertoast.showToast(msg: 'Failed to request withdrawal.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgDark,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
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
                        WalletBankCardWidget(bankDetails: _bankDetails),
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

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.surfaceElevatedDark,
        border: Border(bottom: BorderSide(color: AppColors.borderDark, width: 1)),
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
                  color: AppColors.bgDark,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          const Text(
            'Wallet & Settlements',
            style: TextStyle(
              color: Colors.white,
              fontSize: 17,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}