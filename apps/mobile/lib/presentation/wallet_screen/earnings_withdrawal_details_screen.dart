import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_primary_button.dart';

enum WithdrawalStatusState { requested, processing, successful, failed, cancelled }

/// Consolidated Withdrawal Details & Tracking Screen supporting all 5 Withdrawal States.
class EarningsWithdrawalDetailsScreen extends StatefulWidget {
  const EarningsWithdrawalDetailsScreen({super.key});

  @override
  State<EarningsWithdrawalDetailsScreen> createState() => _EarningsWithdrawalDetailsScreenState();
}

class _EarningsWithdrawalDetailsScreenState extends State<EarningsWithdrawalDetailsScreen> {
  WithdrawalStatusState _currentState = WithdrawalStatusState.successful;

  @override
  Widget build(BuildContext context) {
    const withdrawalId = 'WD2505190001';
    final isDark = Theme.of(context).brightness == Brightness.dark;

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
                          'Withdrawal Details',
                          style: AppTypography.h3(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      IconButton(
                        onPressed: () => context.push(AppRoutes.helpSupportScreen),
                        icon: Icon(
                          Icons.help_outline_rounded,
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        ),
                      ),
                    ],
                  ),
                ),

                // ── Live Withdrawal State Switcher Bar ────────────────────────
                Container(
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: WithdrawalStatusState.values.map((state) {
                        final isSelected = _currentState == state;
                        final label = switch (state) {
                          WithdrawalStatusState.requested => 'Requested',
                          WithdrawalStatusState.processing => 'Processing',
                          WithdrawalStatusState.successful => 'Successful',
                          WithdrawalStatusState.failed => 'Failed',
                          WithdrawalStatusState.cancelled => 'Cancelled',
                        };

                        return GestureDetector(
                          onTap: () => setState(() => _currentState = state),
                          child: Container(
                            margin: const EdgeInsets.only(right: 6),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? (isDark ? AppColors.primaryLight : AppColors.primary)
                                  : (isDark ? AppColors.surfaceElevatedDark : AppColors.bgLight),
                              borderRadius: BorderRadius.circular(AppRadius.full),
                              border: Border.all(
                                color: isSelected
                                    ? (isDark ? AppColors.primaryLight : AppColors.primary)
                                    : (isDark ? AppColors.borderDark : AppColors.borderLight),
                              ),
                            ),
                            child: Text(
                              label,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                color: isSelected
                                    ? (isDark ? AppColors.bgDark : Colors.white)
                                    : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ),
                Divider(
                  height: 1,
                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                ),

                // ── Scrollable Body ──────────────────────────────────────────
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    children: [
                      // ── Dynamic Status Banner Header Card ───────────────────
                      _buildStatusCard(withdrawalId, isDark),
                      const SizedBox(height: AppSpacing.xl),

                      // ── Dynamic Status Progress Stepper ────────────────────
                      Text(
                        'Status Progress',
                        style: AppTypography.caption(
                          color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      _buildStepperCard(isDark),
                      const SizedBox(height: AppSpacing.xl),

                      // ── Details Breakdown Card ─────────────────────────────
                      Text(
                        'Details',
                        style: AppTypography.caption(
                          color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),

                      Container(
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(
                            color: isDark ? AppColors.borderDark : AppColors.borderLight,
                          ),
                        ),
                        child: Column(
                          children: [
                            _buildDetailRow('Amount', '₹2,000', isDark, isBold: true),
                            Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
                            _buildDetailRow('Bank', 'HDFC Bank', isDark),
                            Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
                            _buildDetailRow('Account Number', '•••• 4321', isDark),
                            Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
                            _buildDetailRow('Account Holder', AuthService.instance.currentUser?.fullName ?? 'Driver Account Holder', isDark),
                            Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
                            _buildDetailRow('Requested On', 'May 19, 2025 • 09:15 AM', isDark),
                            Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
                            _buildDetailRow(
                              'Processed On',
                              switch (_currentState) {
                                WithdrawalStatusState.requested => 'Pending...',
                                WithdrawalStatusState.processing => 'In Progress (Est. 02:45 PM)',
                                WithdrawalStatusState.successful => 'May 19, 2025 • 02:45 PM',
                                WithdrawalStatusState.failed => 'May 19, 2025 • 09:30 AM (Failed)',
                                WithdrawalStatusState.cancelled => 'May 19, 2025 • 09:30 AM (Cancelled)',
                              },
                              isDark,
                            ),
                            Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
                            _buildDetailRow(
                              'Reference ID',
                              _currentState == WithdrawalStatusState.successful
                                  ? 'UTR512398475612'
                                  : 'N/A',
                              isDark,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),

                      // ── State Action Button (Retry or New Withdrawal) ──────
                      if (_currentState == WithdrawalStatusState.failed) ...[
                        AppPrimaryButton(
                          text: 'RETRY WITHDRAWAL',
                          onPressed: () => context.push(AppRoutes.earningsWithdrawScreen),
                        ),
                        const SizedBox(height: AppSpacing.lg),
                      ] else if (_currentState == WithdrawalStatusState.cancelled) ...[
                        AppPrimaryButton(
                          text: 'NEW WITHDRAWAL',
                          onPressed: () => context.push(AppRoutes.earningsWithdrawScreen),
                        ),
                        const SizedBox(height: AppSpacing.lg),
                      ],

                      // ── Support / Need Help Footer ─────────────────────────
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.lg),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(
                            color: isDark ? AppColors.borderDark : AppColors.borderLight,
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.headset_mic_outlined,
                              color: isDark ? AppColors.primaryLight : AppColors.primary,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Need Help?',
                                    style: AppTypography.body(
                                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'Contact our support team for any queries',
                                    style: AppTypography.caption(
                                      color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            ElevatedButton(
                              onPressed: () => context.push(AppRoutes.helpSupportScreen),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: isDark
                                    ? AppColors.primary.withValues(alpha: 0.25)
                                    : AppColors.primaryLight.withValues(alpha: 0.15),
                                foregroundColor: isDark ? AppColors.primaryLight : AppColors.primary,
                                elevation: 0,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(AppRadius.md),
                                ),
                              ),
                              child: Text(
                                'SUPPORT',
                                style: AppTypography.caption(
                                  color: isDark ? AppColors.primaryLight : AppColors.primary,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 60),
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

  Widget _buildStatusCard(String withdrawalId, bool isDark) {
    final title = switch (_currentState) {
      WithdrawalStatusState.requested => 'Withdrawal Requested',
      WithdrawalStatusState.processing => 'Processing Transfer',
      WithdrawalStatusState.successful => 'Withdrawal Successful',
      WithdrawalStatusState.failed => 'Withdrawal Failed',
      WithdrawalStatusState.cancelled => 'Withdrawal Cancelled',
    };

    final subtitle = switch (_currentState) {
      WithdrawalStatusState.requested => 'Your withdrawal request has been queued for bank transfer.',
      WithdrawalStatusState.processing => 'Bank transfer in progress. Estimated completion by 02:45 PM.',
      WithdrawalStatusState.successful => 'Funds credited to your HDFC Bank account successfully.',
      WithdrawalStatusState.failed => 'Beneficiary bank declined transfer. ₹2,000 returned to wallet balance.',
      WithdrawalStatusState.cancelled => 'Withdrawal request was cancelled by driver.',
    };

    final Color statusColor = switch (_currentState) {
      WithdrawalStatusState.requested => AppColors.warning,
      WithdrawalStatusState.processing => AppColors.info,
      WithdrawalStatusState.successful => isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark,
      WithdrawalStatusState.failed => AppColors.error,
      WithdrawalStatusState.cancelled => isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
    };

    final IconData icon = switch (_currentState) {
      WithdrawalStatusState.requested => Icons.schedule_rounded,
      WithdrawalStatusState.processing => Icons.sync_rounded,
      WithdrawalStatusState.successful => Icons.check_rounded,
      WithdrawalStatusState.failed => Icons.close_rounded,
      WithdrawalStatusState.cancelled => Icons.block_rounded,
    };

    return Container(
      padding: const EdgeInsets.all(AppSpacing.xl),
      decoration: BoxDecoration(
        color: statusColor.withValues(alpha: isDark ? 0.15 : 0.08),
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(
          color: statusColor.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: AppTypography.caption(
                    color: statusColor,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '₹2,000',
                  style: AppTypography.h1(
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    fontWeight: FontWeight.bold,
                  ).copyWith(fontSize: 30),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: AppTypography.caption(
                    color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Text(
                      'Withdrawal ID: ',
                      style: AppTypography.caption(
                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                      ),
                    ),
                    Text(
                      withdrawalId,
                      style: AppTypography.caption(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(width: 4),
                    GestureDetector(
                      onTap: () {
                        Clipboard.setData(ClipboardData(text: withdrawalId));
                        Fluttertoast.showToast(msg: 'Withdrawal ID copied!');
                      },
                      child: Icon(
                        Icons.copy_rounded,
                        size: 14,
                        color: isDark ? AppColors.primaryLight : AppColors.primary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.15),
              shape: BoxShape.circle,
              border: Border.all(color: statusColor, width: 2),
            ),
            child: Icon(
              icon,
              color: statusColor,
              size: 28,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepperCard(bool isDark) {
    final bool step1Done = true;
    final bool step2Done = _currentState == WithdrawalStatusState.processing ||
        _currentState == WithdrawalStatusState.successful;
    final bool step3Done = _currentState == WithdrawalStatusState.successful;
    final bool isFailed = _currentState == WithdrawalStatusState.failed;
    final bool isCancelled = _currentState == WithdrawalStatusState.cancelled;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _buildStepNode(title: 'Requested', isDone: step1Done, isDark: isDark),
          Expanded(child: _buildStepLine(isDone: step2Done, isDark: isDark)),
          _buildStepNode(
            title: 'Processing',
            isDone: step2Done,
            isActive: _currentState == WithdrawalStatusState.processing,
            isDark: isDark,
          ),
          Expanded(child: _buildStepLine(isDone: step3Done, isDark: isDark)),
          _buildStepNode(
            title: isFailed
                ? 'Failed'
                : (isCancelled ? 'Cancelled' : 'Completed'),
            isDone: step3Done,
            isFailed: isFailed,
            isCancelled: isCancelled,
            isDark: isDark,
          ),
        ],
      ),
    );
  }

  Widget _buildStepNode({
    required String title,
    required bool isDone,
    required bool isDark,
    bool isActive = false,
    bool isFailed = false,
    bool isCancelled = false,
  }) {
    final Color bg = isFailed
        ? AppColors.error
        : (isCancelled
            ? (isDark ? AppColors.textMutedDark : AppColors.textMutedLight)
            : (isActive
                ? AppColors.info
                : (isDone
                    ? (isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark)
                    : (isDark ? AppColors.borderDark : AppColors.borderLight))));

    final IconData icon = isFailed
        ? Icons.close
        : (isCancelled ? Icons.block : Icons.check);

    return Column(
      children: [
        Container(
          width: 22,
          height: 22,
          decoration: BoxDecoration(
            color: bg,
            shape: BoxShape.circle,
          ),
          child: Icon(
            icon,
            size: 14,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          title,
          style: AppTypography.caption(
            color: isDone || isActive || isFailed
                ? (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight)
                : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
            fontWeight: isDone || isActive ? FontWeight.bold : FontWeight.w500,
          ).copyWith(fontSize: 11),
        ),
      ],
    );
  }

  Widget _buildStepLine({required bool isDone, required bool isDark}) {
    return Container(
      height: 2,
      color: isDone
          ? (isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark)
          : (isDark ? AppColors.borderDark : AppColors.borderLight),
    );
  }

  Widget _buildDetailRow(String label, String value, bool isDark, {bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.md,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: AppTypography.body(
              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
            ),
          ),
          Text(
            value,
            style: AppTypography.body(
              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
              fontWeight: isBold ? FontWeight.bold : FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
