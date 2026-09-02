import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_primary_button.dart';

/// Screen 3: Request Withdrawal screen matching exact design mockup.
class EarningsWithdrawScreen extends StatefulWidget {
  const EarningsWithdrawScreen({super.key});

  @override
  State<EarningsWithdrawScreen> createState() => _EarningsWithdrawScreenState();
}

class _EarningsWithdrawScreenState extends State<EarningsWithdrawScreen> {
  final _amountController = TextEditingController(text: '2,000');
  int _selectedPreset = 2000;
  bool _isLoading = false;

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

  Future<void> _handleWithdraw() async {
    final rawText = _amountController.text.replaceAll(',', '').trim();
    final amount = double.tryParse(rawText) ?? 0;

    if (amount < 500) {
      Fluttertoast.showToast(
        msg: 'Minimum withdrawal amount is ₹500',
        backgroundColor: AppColors.warning,
      );
      return;
    }

    if (amount > 4850) {
      Fluttertoast.showToast(
        msg: 'Amount exceeds available balance',
        backgroundColor: AppColors.error,
      );
      return;
    }

    setState(() => _isLoading = true);

    await Future.delayed(const Duration(seconds: 1));

    if (mounted) {
      setState(() => _isLoading = false);
      Fluttertoast.showToast(
        msg: 'Withdrawal request submitted!',
        backgroundColor: AppColors.accentGreenDark,
      );

      // Navigate to Withdrawal Details screen
      context.push(AppRoutes.earningsWithdrawalDetailsScreen);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
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
                  decoration: const BoxDecoration(
                    color: AppColors.surfaceLight,
                    border: Border(
                      bottom: BorderSide(color: AppColors.borderLight),
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
                        icon: const Icon(
                          Icons.arrow_back,
                          color: AppColors.textPrimaryLight,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Withdraw',
                          style: AppTypography.h3(
                            color: AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      TextButton(
                        onPressed: () => context.push(AppRoutes.earningsTransactionsScreen),
                        child: Text(
                          'History',
                          style: AppTypography.body(
                            color: AppColors.primary,
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
                          color: AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(color: AppColors.borderLight),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Available Balance',
                              style: AppTypography.caption(
                                color: AppColors.textMutedLight,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Text(
                                  '₹4,850',
                                  style: AppTypography.h1(
                                    color: AppColors.textPrimaryLight,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                const Icon(
                                  Icons.visibility_outlined,
                                  size: 18,
                                  color: AppColors.textMutedLight,
                                ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Ready to withdraw',
                              style: AppTypography.caption(
                                color: AppColors.textSecondaryLight,
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
                          color: AppColors.textMutedLight,
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
                              color: AppColors.textPrimaryLight,
                              fontWeight: FontWeight.bold,
                            ).copyWith(fontSize: 32),
                          ),
                          Expanded(
                            child: TextField(
                              controller: _amountController,
                              keyboardType: TextInputType.number,
                              style: AppTypography.h1(
                                color: AppColors.textPrimaryLight,
                                fontWeight: FontWeight.bold,
                              ).copyWith(fontSize: 32),
                              decoration: const InputDecoration(
                                border: InputBorder.none,
                                hintText: '0',
                              ),
                            ),
                          ),
                        ],
                      ),
                      Text(
                        'Minimum ₹500',
                        style: AppTypography.caption(
                          color: AppColors.textMutedLight,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.lg),

                      // ── Quick Preset Chips ─────────────────────────────────
                      Row(
                        children: [500, 1000, 2000, 4000].map((preset) {
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
                                      ? AppColors.primaryLight.withValues(alpha: 0.15)
                                      : AppColors.surfaceLight,
                                  borderRadius: BorderRadius.circular(AppRadius.md),
                                  border: Border.all(
                                    color: isSelected ? AppColors.primary : AppColors.borderLight,
                                    width: isSelected ? 1.5 : 1,
                                  ),
                                ),
                                child: Text(
                                  '₹${preset.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                                    color: isSelected ? AppColors.primary : AppColors.textPrimaryLight,
                                  ),
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: AppSpacing.xl),

                      // ── "Withdraw to" Bank Account Card ────────────────────
                      Text(
                        'Withdraw to',
                        style: AppTypography.caption(
                          color: AppColors.textMutedLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),

                      Container(
                        padding: const EdgeInsets.all(AppSpacing.lg),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(color: AppColors.borderLight),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: AppColors.bgLight,
                                borderRadius: BorderRadius.circular(AppRadius.md),
                              ),
                              child: const Icon(
                                Icons.account_balance_outlined,
                                color: AppColors.primary,
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'HDFC Bank',
                                    style: AppTypography.body(
                                      color: AppColors.textPrimaryLight,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '•••• 4321 • Rahul Sharma',
                                    style: AppTypography.caption(
                                      color: AppColors.textSecondaryLight,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const Icon(
                              Icons.chevron_right,
                              color: AppColors.textMutedLight,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),

                      // ── Important Information Box ──────────────────────────
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.lg),
                        decoration: BoxDecoration(
                          color: AppColors.primaryLight.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Important Information',
                              style: AppTypography.body(
                                color: AppColors.textPrimaryLight,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 8),
                            _buildInfoBullet('Withdrawals are processed within 24 hours'),
                            const SizedBox(height: 4),
                            _buildInfoBullet('There is no fee for withdrawals'),
                            const SizedBox(height: 4),
                            _buildInfoBullet('Minimum withdrawal amount is ₹500'),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xxl),

                      // ── Large Request Withdrawal Action Button ─────────────
                      AppPrimaryButton(
                        text: 'REQUEST WITHDRAWAL',
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

  Widget _buildInfoBullet(String text) {
    return Row(
      children: [
        const Icon(Icons.check_circle_rounded, size: 16, color: AppColors.accentGreenDark),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: AppTypography.caption(color: AppColors.textSecondaryLight),
          ),
        ),
      ],
    );
  }
}
