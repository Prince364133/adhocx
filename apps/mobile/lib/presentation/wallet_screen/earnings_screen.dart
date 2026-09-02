import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Screen 1: Main Earnings dashboard matching exact design mockup.
class EarningsScreen extends StatefulWidget {
  const EarningsScreen({super.key});

  @override
  State<EarningsScreen> createState() => _EarningsScreenState();
}

class _EarningsScreenState extends State<EarningsScreen> {
  bool _showBalance = true;

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
                          // Drawer menu or profile
                        },
                        icon: const Icon(
                          Icons.menu,
                          color: AppColors.textPrimaryLight,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Earnings',
                          style: AppTypography.h2(
                            color: AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      IconButton(
                        onPressed: () => context.push(AppRoutes.notificationsSettingsScreen),
                        icon: const Icon(
                          Icons.notifications_none_rounded,
                          color: AppColors.textPrimaryLight,
                        ),
                      ),
                    ],
                  ),
                ),

                // ── Scrollable Content ───────────────────────────────────────
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    children: [
                      // ── Available Balance Purple Hero Card ─────────────────
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.xl),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF6366f1), Color(0xFF4f46e5)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(AppRadius.xl),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF6366f1).withValues(alpha: 0.35),
                              blurRadius: 12,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Available Balance',
                              style: AppTypography.caption(
                                color: Colors.white.withValues(alpha: 0.8),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                Text(
                                  _showBalance ? '₹4,850' : '••••••',
                                  style: AppTypography.h1(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                  ).copyWith(fontSize: 32),
                                ),
                                const SizedBox(width: 10),
                                GestureDetector(
                                  onTap: () => setState(() => _showBalance = !_showBalance),
                                  child: Icon(
                                    _showBalance
                                        ? Icons.visibility_outlined
                                        : Icons.visibility_off_outlined,
                                    color: Colors.white.withValues(alpha: 0.9),
                                    size: 20,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: AppSpacing.lg),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'Ready to withdraw',
                                  style: AppTypography.caption(
                                    color: Colors.white.withValues(alpha: 0.9),
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                ElevatedButton(
                                  onPressed: () => context.push(AppRoutes.earningsWithdrawScreen),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.white,
                                    foregroundColor: const Color(0xFF4f46e5),
                                    elevation: 0,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(AppRadius.md),
                                    ),
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 16,
                                      vertical: 10,
                                    ),
                                  ),
                                  child: Text(
                                    'WITHDRAW NOW',
                                    style: AppTypography.caption(
                                      color: const Color(0xFF4f46e5),
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),

                      // ── "This Week" Chart Card ─────────────────────────────
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.lg),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(color: AppColors.borderLight),
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x06000000),
                              blurRadius: 4,
                              offset: Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'This Week',
                                  style: AppTypography.caption(
                                    color: AppColors.textMutedLight,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppColors.accentGreenDark.withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(AppRadius.full),
                                  ),
                                  child: Text(
                                    '↑ 19% vs last week',
                                    style: AppTypography.caption(
                                      color: AppColors.accentGreenDark,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '₹12,450',
                              style: AppTypography.h1(
                                color: AppColors.textPrimaryLight,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: AppSpacing.xl),

                            // Weekly Bar Chart Visualization
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceAround,
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                _buildBarColumn('Mon', 35),
                                _buildBarColumn('Tue', 55),
                                _buildBarColumn('Wed', 40),
                                _buildBarColumn('Thu', 70),
                                _buildBarColumn('Fri', 60),
                                _buildBarColumn('Sat', 95, isHigh: true),
                                _buildBarColumn('Sun', 50),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.lg),

                      // ── Trips Summary Count Grid ───────────────────────────
                      Row(
                        children: [
                          Expanded(
                            child: _buildCountCard(
                              title: 'Trips',
                              count: '18',
                              icon: Icons.directions_car_outlined,
                              color: AppColors.primary,
                            ),
                          ),
                          const SizedBox(width: AppSpacing.md),
                          Expanded(
                            child: _buildCountCard(
                              title: 'Completed',
                              count: '16',
                              icon: Icons.check_circle_outline,
                              color: AppColors.accentGreenDark,
                            ),
                          ),
                          const SizedBox(width: AppSpacing.md),
                          Expanded(
                            child: _buildCountCard(
                              title: 'Cancelled',
                              count: '2',
                              icon: Icons.cancel_outlined,
                              color: AppColors.error,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.xl),

                      // ── Financial Summary Breakdown Card ───────────────────
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Summary',
                            style: AppTypography.h3(
                              color: AppColors.textPrimaryLight,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          GestureDetector(
                            onTap: () => context.push(AppRoutes.earningsTransactionsScreen),
                            child: Text(
                              'View Transactions',
                              style: AppTypography.caption(
                                color: AppColors.primary,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.md),

                      Container(
                        decoration: BoxDecoration(
                          color: AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(color: AppColors.borderLight),
                        ),
                        child: Column(
                          children: [
                            _buildSummaryRow(
                              icon: Icons.account_balance_wallet_outlined,
                              label: 'Total Earnings',
                              value: '₹22,680',
                              valueColor: AppColors.textPrimaryLight,
                            ),
                            const Divider(height: 1, color: AppColors.borderLight),
                            _buildSummaryRow(
                              icon: Icons.emoji_events_outlined,
                              label: 'Incentives',
                              value: '₹2,350',
                              valueColor: AppColors.textPrimaryLight,
                            ),
                            const Divider(height: 1, color: AppColors.borderLight),
                            _buildSummaryRow(
                              icon: Icons.remove_circle_outline,
                              label: 'Adjustments',
                              value: '-₹1,580',
                              valueColor: AppColors.error,
                            ),
                            const Divider(height: 1, color: AppColors.borderLight),
                            _buildSummaryRow(
                              icon: Icons.unarchive_outlined,
                              label: 'Withdrawn',
                              value: '-₹18,600',
                              valueColor: AppColors.error,
                              onTap: () => context.push(AppRoutes.earningsWithdrawalDetailsScreen),
                            ),
                          ],
                        ),
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

  Widget _buildBarColumn(String label, double heightRatio, {bool isHigh = false}) {
    return Column(
      children: [
        Container(
          width: 14,
          height: heightRatio,
          decoration: BoxDecoration(
            color: isHigh ? AppColors.primary : AppColors.primaryLight.withValues(alpha: 0.35),
            borderRadius: BorderRadius.circular(AppRadius.xs),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          label,
          style: AppTypography.caption(
            color: isHigh ? AppColors.primary : AppColors.textMutedLight,
            fontWeight: isHigh ? FontWeight.bold : FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildCountCard({
    required String title,
    required String count,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: AppTypography.caption(color: AppColors.textMutedLight),
              ),
              Icon(icon, size: 16, color: color),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            count,
            style: AppTypography.h2(
              color: AppColors.textPrimaryLight,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow({
    required IconData icon,
    required String label,
    required String value,
    required Color valueColor,
    VoidCallback? onTap,
  }) {
    return ListTile(
      onTap: onTap,
      leading: Icon(icon, size: 20, color: AppColors.textSecondaryLight),
      title: Text(
        label,
        style: AppTypography.body(
          color: AppColors.textPrimaryLight,
          fontWeight: FontWeight.w500,
        ),
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            value,
            style: AppTypography.body(
              color: valueColor,
              fontWeight: FontWeight.bold,
            ),
          ),
          if (onTap != null) ...[
            const SizedBox(width: 4),
            const Icon(Icons.chevron_right, size: 16, color: AppColors.textMutedLight),
          ],
        ],
      ),
    );
  }
}
