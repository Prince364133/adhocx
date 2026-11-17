import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_radius.dart';
import '../theme/app_spacing.dart';
import '../theme/app_typography.dart';

/// Compact, high-visibility balance strip displayed above primary dashboard cards.
/// Used for:
/// - Vendor Home: "Current Wallet Balance" + "+ Add Money" + arrow (tap anywhere -> Wallet)
/// - Driver Home: "Current Payout Balance" + "View Wallet" + arrow (tap anywhere -> Wallet)
class BalanceSummaryCard extends StatelessWidget {
  final String label;
  final double balance;
  final String actionLabel;
  final IconData actionIcon;
  final VoidCallback onCardTap;
  final VoidCallback? onActionTap;
  final bool isLoading;

  const BalanceSummaryCard({
    super.key,
    required this.label,
    required this.balance,
    required this.actionLabel,
    this.actionIcon = Icons.add_rounded,
    required this.onCardTap,
    this.onActionTap,
    this.isLoading = false,
  });

  String _formatCurrency(double value) {
    final isWhole = value == value.truncateToDouble();
    final formatted = isWhole ? value.toStringAsFixed(0) : value.toStringAsFixed(2);
    // Add Indian-style / standard comma grouping for readability
    final parts = formatted.split('.');
    final intPart = parts[0];
    final decPart = parts.length > 1 ? '.${parts[1]}' : '';
    final isNegative = intPart.startsWith('-');
    final digits = isNegative ? intPart.substring(1) : intPart;

    String grouped;
    if (digits.length <= 3) {
      grouped = digits;
    } else {
      final last3 = digits.substring(digits.length - 3);
      final rest = digits.substring(0, digits.length - 3);
      final buf = StringBuffer();
      for (int i = 0; i < rest.length; i++) {
        if (i > 0 && (rest.length - i) % 2 == 0) {
          buf.write(',');
        }
        buf.write(rest[i]);
      }
      grouped = '${buf.toString()},$last3';
    }
    return '${isNegative ? '-' : ''}₹$grouped$decPart';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onCardTap,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        child: Ink(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: 14,
          ),
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(
              color: isDark
                  ? AppColors.primary.withValues(alpha: 0.35)
                  : AppColors.primary.withValues(alpha: 0.22),
              width: 1.2,
            ),
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withValues(alpha: isDark ? 0.10 : 0.06),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              // Wallet Icon Badge
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF5B42F3), Color(0xFF7C3AED)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                child: const Icon(
                  Icons.account_balance_wallet_rounded,
                  color: Colors.white,
                  size: 21,
                ),
              ),
              const SizedBox(width: 12),

              // 1. Balance Amount & Label
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: AppTypography.caption(
                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    isLoading
                        ? Container(
                            width: 82,
                            height: 20,
                            margin: const EdgeInsets.only(top: 2),
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.surfaceElevatedDark : AppColors.borderLight,
                              borderRadius: BorderRadius.circular(6),
                            ),
                          )
                        : Text(
                            _formatCurrency(balance),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.h3(
                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                  ],
                ),
              ),

              const SizedBox(width: 8),

              // 2. Action Pill Button ("+ Add Money" / "View Wallet")
              Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: onActionTap ?? onCardTap,
                  borderRadius: BorderRadius.circular(AppRadius.full),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: isDark ? 0.22 : 0.10),
                      borderRadius: BorderRadius.circular(AppRadius.full),
                      border: Border.all(
                        color: AppColors.primary.withValues(alpha: 0.35),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          actionIcon,
                          size: 14,
                          color: isDark ? const Color(0xFFA78BFA) : AppColors.primary,
                        ),
                        const SizedBox(width: 3),
                        Text(
                          actionLabel,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: isDark ? const Color(0xFFC4B5FD) : AppColors.primary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              const SizedBox(width: 6),

              // 3. Forward Arrow to Full Wallet Page
              Icon(
                Icons.arrow_forward_ios_rounded,
                size: 15,
                color: isDark ? AppColors.textMutedDark : AppColors.textSecondaryLight,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
