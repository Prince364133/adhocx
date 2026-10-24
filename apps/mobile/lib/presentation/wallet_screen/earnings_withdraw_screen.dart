import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_service.dart';
import '../../services/driver_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_primary_button.dart';
import '../../core/utils/app_toast.dart';
import './widgets/bank_details_modal.dart';

/// Screen 3: Request Withdrawal screen with live wallet integration and ₹1,000 minimum threshold.
class EarningsWithdrawScreen extends StatefulWidget {
  const EarningsWithdrawScreen({super.key});

  @override
  State<EarningsWithdrawScreen> createState() => _EarningsWithdrawScreenState();
}

class _EarningsWithdrawScreenState extends State<EarningsWithdrawScreen> {
  final _amountController = TextEditingController(text: '1000');
  int _selectedPreset = 1000;
  bool _isLoading = false;
  double _availableBalance = 0.0;
  Map<String, dynamic> _bankDetails = {};

  @override
  void initState() {
    super.initState();
    _loadBalance();
  }

  Future<void> _loadBalance() async {
    try {
      final results = await Future.wait([
        DriverService.instance.getWalletSummary(forceRefresh: true).catchError((_) => null),
        DriverService.instance.getProfile(forceRefresh: true).catchError((_) => null),
      ]);

      final summary = results[0];
      if (summary is Map && mounted) {
        final bal = double.tryParse((summary['walletBalance'] ?? 0).toString()) ?? 0.0;
        setState(() {
          _availableBalance = bal;
          if (bal >= 1000) {
            _amountController.text = (bal > 5000 ? 5000 : bal).toInt().toString();
          }
        });
      }

      final profileRaw = results[1];
      if (profileRaw is Map && mounted) {
        final p = profileRaw['data'] is Map ? profileRaw['data'] as Map<String, dynamic> : profileRaw as Map<String, dynamic>;
        setState(() {
          _bankDetails = {
            'account_holder': p['bankAccountName'] ?? p['bank_account_name'] ?? p['fullName'] ?? p['full_name'] ?? AuthService.instance.currentUser?.fullName ?? 'Driver',
            'bank_name': p['bankName'] ?? p['bank_name'] ?? '',
            'account_number': p['bankAccountNumber'] ?? p['bank_account_number'] ?? '',
            'ifsc': p['bankIfsc'] ?? p['bank_ifsc'] ?? '',
            'upi_id': p['upiId'] ?? p['upi_id'] ?? '',
          };
        });
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  void _selectPreset(int amount) {
    setState(() {
      _selectedPreset = amount;
      _amountController.text = amount.toString();
    });
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
    }
  }

  Future<void> _handleWithdraw() async {
    final rawText = _amountController.text.replaceAll(',', '').trim();
    final amount = double.tryParse(rawText) ?? 0;

    if (amount < 1000) {
      Fluttertoast.showToast(
        msg: 'Minimum withdrawal amount is ₹1,000',
        backgroundColor: AppColors.warning,
      );
      return;
    }

    if (amount > _availableBalance) {
      AppToast.showError(
        'Amount exceeds available balance (₹${_availableBalance.toStringAsFixed(2)})',
        context: context,
      );
      return;
    }

    final accNumber = (_bankDetails['account_number'] ?? _bankDetails['bankAccountNumber'] ?? '').toString().trim();
    final ifsc = (_bankDetails['ifsc'] ?? _bankDetails['bankIfsc'] ?? '').toString().trim().toUpperCase();
    final holder = (_bankDetails['account_holder'] ?? _bankDetails['bankAccountName'] ?? AuthService.instance.currentUser?.fullName ?? 'Driver').toString().trim();

    if (accNumber.isEmpty || ifsc.isEmpty) {
      Fluttertoast.showToast(
        msg: 'Please add your bank account details before requesting a withdrawal',
        backgroundColor: AppColors.warning,
      );
      _openBankDetailsModal();
      return;
    }

    setState(() => _isLoading = true);

    try {
      final bankNameStr = (_bankDetails['bank_name'] ?? _bankDetails['bankName'] ?? '').toString().trim();
      final res = await DriverService.instance.requestWithdrawal(
        amount: amount,
        bankAccountName: holder,
        bankAccountNumber: accNumber,
        bankIfsc: ifsc,
        bankName: bankNameStr.isNotEmpty ? bankNameStr : null,
      );

      if (mounted) {
        Fluttertoast.showToast(
          msg: '₹${amount.toStringAsFixed(0)} withdrawal request submitted for bank transfer!',
          backgroundColor: AppColors.accentGreenDark,
        );

        context.pushReplacement(
          AppRoutes.earningsWithdrawalDetailsScreen,
          extra: res is Map<String, dynamic>
              ? res
              : {
                  'amount': amount,
                  'bankAccountName': holder,
                  'bankAccountNumber': accNumber,
                  'bankIfsc': ifsc,
                  'bankName': bankNameStr,
                  'status': 'PENDING',
                  'createdAt': DateTime.now().toIso8601String(),
                },
        );
      }
    } catch (e) {
      if (mounted) {
        AppToast.showError(e, context: context);
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final accNumber = (_bankDetails['account_number'] ?? _bankDetails['bankAccountNumber'] ?? '').toString().trim();
    final hasBank = accNumber.isNotEmpty;
    final bankNameDisplay = (_bankDetails['bank_name'] ?? _bankDetails['bankName'] ?? '').toString().trim().isNotEmpty
        ? (_bankDetails['bank_name'] ?? _bankDetails['bankName']).toString().trim()
        : (hasBank ? 'Bank Account' : 'No Bank Account');
    final holderDisplay = (_bankDetails['account_holder'] ?? _bankDetails['bankAccountName'] ?? AuthService.instance.currentUser?.fullName ?? 'Driver').toString().trim();
    final ifscDisplay = (_bankDetails['ifsc'] ?? _bankDetails['bankIfsc'] ?? '').toString().trim().toUpperCase();

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Column(
              children: [
                // ── App Header ───────────────────────────────────────────────
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.lg,
                    vertical: AppSpacing.md,
                  ),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                    border: Border(
                      bottom: BorderSide(
                        color: isDark ? AppColors.borderDark : AppColors.borderLight,
                      ),
                    ),
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () {
                          if (context.canPop()) {
                            context.pop();
                          } else {
                            context.go(AppRoutes.walletScreen);
                          }
                        },
                        icon: Icon(
                          Icons.arrow_back,
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Withdraw Earnings',
                          style: AppTypography.h3(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      TextButton(
                        onPressed: () => context.push(AppRoutes.earningsTransactionsScreen),
                        child: Text(
                          'History',
                          style: AppTypography.body(
                            color: isDark ? AppColors.primaryLight : AppColors.primary,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // ── Scrollable Body ──────────────────────────────────────────
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    children: [
                      // ── Available Balance Card ─────────────────────────────
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.lg),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(
                            color: isDark ? AppColors.borderDark : AppColors.borderLight,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Available Balance',
                              style: AppTypography.caption(
                                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Text(
                                  '₹$_availableBalance',
                                  style: AppTypography.h1(
                                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Icon(
                                  Icons.account_balance_wallet_outlined,
                                  size: 18,
                                  color: isDark ? AppColors.primaryLight : AppColors.primary,
                                ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Ready to withdraw to bank account (Min ₹1,000)',
                              style: AppTypography.caption(
                                color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),

                      // ── Withdrawal Amount Input Box ────────────────────────
                      Text(
                        'Withdrawal Amount',
                        style: AppTypography.caption(
                          color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),

                      Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Text(
                            '₹ ',
                            style: AppTypography.h1(
                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                              fontWeight: FontWeight.bold,
                            ).copyWith(fontSize: 32),
                          ),
                          Expanded(
                            child: TextField(
                              controller: _amountController,
                              keyboardType: TextInputType.number,
                              style: AppTypography.h1(
                                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                fontWeight: FontWeight.bold,
                              ).copyWith(fontSize: 32),
                              decoration: InputDecoration(
                                border: InputBorder.none,
                                hintText: '1000',
                                hintStyle: TextStyle(
                                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      Text(
                        'Minimum ₹1,000 required per withdrawal request',
                        style: AppTypography.caption(
                          color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.lg),

                      // ── Quick Preset Chips ─────────────────────────────────
                      Row(
                        children: [1000, 2000, 5000, 10000].map((preset) {
                          final isSelected = _selectedPreset == preset;
                          return Expanded(
                            child: GestureDetector(
                              onTap: () => _selectPreset(preset),
                              child: Container(
                                margin: const EdgeInsets.symmetric(horizontal: 4),
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  color: isSelected
                                      ? (isDark ? AppColors.primary.withValues(alpha: 0.25) : AppColors.primaryLight.withValues(alpha: 0.15))
                                      : (isDark ? AppColors.surfaceDark : AppColors.surfaceLight),
                                  borderRadius: BorderRadius.circular(AppRadius.md),
                                  border: Border.all(
                                    color: isSelected ? (isDark ? AppColors.primaryLight : AppColors.primary) : (isDark ? AppColors.borderDark : AppColors.borderLight),
                                    width: isSelected ? 1.5 : 1,
                                  ),
                                ),
                                child: Text(
                                  '₹${preset.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                                    color: isSelected
                                        ? (isDark ? AppColors.primaryLight : AppColors.primary)
                                        : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                                  ),
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: AppSpacing.xl),

                      // ── "Withdraw to" Bank Account Card ────────────────────
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Withdraw to',
                            style: AppTypography.caption(
                              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          InkWell(
                            onTap: _openBankDetailsModal,
                            borderRadius: BorderRadius.circular(4),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                              child: Text(
                                hasBank ? 'Change' : '+ Add Bank',
                                style: TextStyle(
                                  color: isDark ? AppColors.primaryLight : AppColors.primary,
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.sm),

                      Material(
                        color: Colors.transparent,
                        child: InkWell(
                          onTap: _openBankDetailsModal,
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          child: Container(
                            padding: const EdgeInsets.all(AppSpacing.lg),
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                              borderRadius: BorderRadius.circular(AppRadius.lg),
                              border: Border.all(
                                color: hasBank
                                    ? (isDark ? AppColors.borderDark : AppColors.borderLight)
                                    : (isDark ? AppColors.primaryLight.withValues(alpha: 0.5) : AppColors.primary.withValues(alpha: 0.4)),
                              ),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: isDark ? AppColors.surfaceElevatedDark : AppColors.bgLight,
                                    borderRadius: BorderRadius.circular(AppRadius.md),
                                  ),
                                  child: Icon(
                                    hasBank ? Icons.account_balance_outlined : Icons.add_card_rounded,
                                    color: isDark ? AppColors.primaryLight : AppColors.primary,
                                  ),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: hasBank
                                      ? Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              children: [
                                                Flexible(
                                                  child: Text(
                                                    bankNameDisplay,
                                                    style: AppTypography.body(
                                                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                                      fontWeight: FontWeight.bold,
                                                    ),
                                                    maxLines: 1,
                                                    overflow: TextOverflow.ellipsis,
                                                  ),
                                                ),
                                                const SizedBox(width: 8),
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                  decoration: BoxDecoration(
                                                    color: AppColors.accentGreenDark.withValues(alpha: 0.15),
                                                    borderRadius: BorderRadius.circular(4),
                                                  ),
                                                  child: Text(
                                                    'Active',
                                                    style: TextStyle(
                                                      color: AppColors.accentGreenDark,
                                                      fontSize: 10,
                                                      fontWeight: FontWeight.bold,
                                                    ),
                                                  ),
                                                ),
                                              ],
                                            ),
                                            const SizedBox(height: 3),
                                            Text(
                                              '•••• ${accNumber.length >= 4 ? accNumber.substring(accNumber.length - 4) : accNumber} • $holderDisplay',
                                              style: AppTypography.caption(
                                                color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                              ),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                            if (ifscDisplay.isNotEmpty) ...[
                                              const SizedBox(height: 2),
                                              Text(
                                                'IFSC: $ifscDisplay',
                                                style: TextStyle(
                                                  fontSize: 11,
                                                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                                  fontWeight: FontWeight.w500,
                                                ),
                                              ),
                                            ],
                                          ],
                                        )
                                      : Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              'No Bank Account Linked',
                                              style: AppTypography.body(
                                                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              'Tap here to add bank account for payouts',
                                              style: AppTypography.caption(
                                                color: isDark ? AppColors.primaryLight : AppColors.primary,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                          ],
                                        ),
                                ),
                                const SizedBox(width: 8),
                                Icon(
                                  Icons.chevron_right,
                                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),

                      // ── Important Information Box ──────────────────────────
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.lg),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.primary.withValues(alpha: 0.15) : AppColors.primaryLight.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(
                            color: isDark ? AppColors.primary.withValues(alpha: 0.3) : Colors.transparent,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Important Information',
                              style: AppTypography.body(
                                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 8),
                            _buildInfoBullet('Withdrawals are audited & processed within 24 hours', isDark),
                            const SizedBox(height: 4),
                            _buildInfoBullet('Zero platform withdrawal fee', isDark),
                            const SizedBox(height: 4),
                            _buildInfoBullet('Minimum withdrawal amount is strictly ₹1,000', isDark),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xxl),

                      // ── Large Request Withdrawal Action Button ─────────────
                      AppPrimaryButton(
                        text: 'REQUEST WITHDRAWAL (MIN ₹1,000)',
                        isLoading: _isLoading,
                        onPressed: _handleWithdraw,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInfoBullet(String text, bool isDark) {
    return Row(
      children: [
        Icon(Icons.check_circle_rounded, size: 16, color: AppColors.accentGreenDark),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: AppTypography.caption(
              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
            ),
          ),
        ),
      ],
    );
  }
}
