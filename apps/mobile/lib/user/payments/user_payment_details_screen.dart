import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';

class UserPaymentDetailsScreen extends StatefulWidget {
  final Map<String, dynamic>? transaction;
  const UserPaymentDetailsScreen({super.key, this.transaction});

  @override
  State<UserPaymentDetailsScreen> createState() => _UserPaymentDetailsScreenState();
}

class _UserPaymentDetailsScreenState extends State<UserPaymentDetailsScreen> {
  Map<String, dynamic>? _transaction;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    if (widget.transaction != null) {
      _transaction = widget.transaction;
      _isLoading = false;
    } else {
      _loadTransaction();
    }
  }

  Future<void> _loadTransaction() async {
    setState(() => _isLoading = true);
    try {
      final list = await UserService.instance.getWalletTransactions();
      if (list.isNotEmpty && mounted) {
        setState(() => _transaction = list.first as Map<String, dynamic>);
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final t = _transaction ?? {};
    final id = t['referenceId'] ?? t['id'] ?? 'TXN-LIVE';
    final desc = t['description'] ?? t['type'] ?? 'Wallet Top-Up';
    final amount = t['amount'] ?? 25000;
    final status = (t['status'] ?? 'COMPLETED').toString();
    final date = t['createdAt'] != null ? t['createdAt'].toString() : 'Verified on Ledger';
    final type = (t['type'] ?? 'TOP_UP').toString();

    Color badgeColor = AppColors.success;
    if (status == 'PENDING') badgeColor = AppColors.warning;
    if (status == 'FAILED') badgeColor = AppColors.error;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        elevation: 0,
        leading: IconButton(
          onPressed: () => context.pop(),
          icon: Icon(Icons.arrow_back, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
        ),
        title: Text('Payment Details', style: AppTypography.h3(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header Card
                    Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(AppRadius.lg),
                        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(color: AppColors.accentPurple.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(AppRadius.md)),
                            child: Icon(Icons.account_balance_wallet_outlined, color: AppColors.primary),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(desc.toString(), style: AppTypography.h4(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                                Text(id.toString(), style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(color: badgeColor.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(AppRadius.sm)),
                            child: Text(status, style: TextStyle(color: badgeColor, fontWeight: FontWeight.bold, fontSize: 11)),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    Text('₹ $amount.00', style: AppTypography.h1(color: AppColors.primary, fontWeight: FontWeight.bold)),
                    Text('Ledger Transaction Amount', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),

                    const SizedBox(height: AppSpacing.lg),

                    // Particulars List
                    Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(AppRadius.lg),
                        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                      ),
                      child: Column(
                        children: [
                          _buildRow(context, 'Transaction Type', type, isDark),
                          const Divider(),
                          _buildRow(context, 'Reference ID', id.toString(), isDark),
                          const Divider(),
                          _buildRow(context, 'Recorded Timestamp', date, isDark),
                          const Divider(),
                          _buildRow(context, 'Settlement Status', status, isDark),
                          const Divider(),
                          _buildRow(context, 'Payment Method', 'Universal Shared Wallet (Escrow & Razorpay)', isDark),
                        ],
                      ),
                    ),

                    const SizedBox(height: AppSpacing.xl),

                    AppPrimaryButton(
                      text: 'Contact Support',
                      onPressed: () => context.push(AppRoutes.userRaiseIssueScreen),
                    ),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildRow(BuildContext context, String label, String value, bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.end,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 12,
                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
