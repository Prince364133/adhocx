import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';

enum PaymentResultState {
  pending,
  processing,
  successful,
  failed,
}

class UserPaymentStatusScreen extends StatefulWidget {
  final PaymentResultState initialState;

  const UserPaymentStatusScreen({
    super.key,
    this.initialState = PaymentResultState.pending,
  });

  @override
  State<UserPaymentStatusScreen> createState() => _UserPaymentStatusScreenState();
}

class _UserPaymentStatusScreenState extends State<UserPaymentStatusScreen> {
  late PaymentResultState _currentState;

  @override
  void initState() {
    super.initState();
    _currentState = widget.initialState;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        elevation: 0,
        leading: IconButton(
          onPressed: () => context.pop(),
          icon: Icon(Icons.arrow_back, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
        ),
        title: Text('Payment Status', style: AppTypography.h3(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // State Switcher Carousel
            Container(
              height: 42,
              margin: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 4),
              child: Row(
                children: PaymentResultState.values.map((st) {
                  final isSelected = _currentState == st;
                  return Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 2.0),
                      child: ChoiceChip(
                        label: Text(_getLabel(st)),
                        selected: isSelected,
                        onSelected: (selected) {
                          if (selected) setState(() => _currentState = st);
                        },
                        selectedColor: _getColor(st),
                        backgroundColor: isDark ? AppColors.surfaceDark : AppColors.slate200,
                        labelStyle: TextStyle(
                          color: isSelected ? Colors.white : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                          fontSize: 11,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        ),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.full)),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),

            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  children: [
                    const SizedBox(height: AppSpacing.md),

                    // Icon Graphic
                    _buildGraphic(context, isDark),

                    const SizedBox(height: AppSpacing.md),

                    // Title & Subtitle
                    Text(_getTitle(_currentState), style: AppTypography.h1(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Text(_getSubtitle(_currentState), textAlign: TextAlign.center, style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),

                    if (_currentState == PaymentResultState.processing) ...[
                      const SizedBox(height: AppSpacing.md),
                      const LinearProgressIndicator(
                        value: 0.6,
                        backgroundColor: AppColors.slate400,
                        valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
                      ),
                    ],

                    const SizedBox(height: AppSpacing.xl),

                    // Particulars Box
                    Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(AppRadius.lg),
                        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                      ),
                      child: Column(
                        children: [
                          _buildRow('Amount', '₹ 24,750.00', isDark, isBold: true),
                          const Divider(),
                          _buildRow('Trip', 'Airport Transfer\nREQ-250510-0001', isDark),
                          const Divider(),
                          if (_currentState == PaymentResultState.failed) ...[
                            _buildRow('Failed On', '10 May 2025, 07:18 PM', isDark),
                            const Divider(),
                            _buildRow('Reason', 'Insufficient balance in account.', isDark, isErrorText: true),
                          ] else ...[
                            _buildRow('Payment Method', 'Net Banking', isDark),
                            const Divider(),
                            _buildRow('Transaction ID', 'TXN-250510-7854', isDark),
                          ],
                        ],
                      ),
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    // Banner Notice
                    _buildNoticeBanner(context, isDark),

                    const SizedBox(height: AppSpacing.xl),

                    // Actions
                    _buildActions(context),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getLabel(PaymentResultState state) {
    switch (state) {
      case PaymentResultState.pending:
        return 'Pending';
      case PaymentResultState.processing:
        return 'Processing';
      case PaymentResultState.successful:
        return 'Successful';
      case PaymentResultState.failed:
        return 'Failed';
    }
  }

  Color _getColor(PaymentResultState state) {
    switch (state) {
      case PaymentResultState.pending:
        return AppColors.warning;
      case PaymentResultState.processing:
        return AppColors.primary;
      case PaymentResultState.successful:
        return AppColors.success;
      case PaymentResultState.failed:
        return AppColors.error;
    }
  }

  String _getTitle(PaymentResultState state) {
    switch (state) {
      case PaymentResultState.pending:
        return 'Payment Pending';
      case PaymentResultState.processing:
        return 'Processing Payment';
      case PaymentResultState.successful:
        return 'Payment Successful';
      case PaymentResultState.failed:
        return 'Payment Failed';
    }
  }

  String _getSubtitle(PaymentResultState state) {
    switch (state) {
      case PaymentResultState.pending:
        return 'Your payment is being processed.';
      case PaymentResultState.processing:
        return 'Please wait while we process your payment.';
      case PaymentResultState.successful:
        return 'Your payment has been completed.';
      case PaymentResultState.failed:
        return "We couldn't process your payment.";
    }
  }

  Widget _buildGraphic(BuildContext context, bool isDark) {
    switch (_currentState) {
      case PaymentResultState.processing:
        return const SizedBox(
          width: 64,
          height: 64,
          child: CircularProgressIndicator(
            strokeWidth: 6,
            valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
          ),
        );
      case PaymentResultState.successful:
        return CircleAvatar(radius: 36, backgroundColor: AppColors.success, child: const Icon(Icons.check, size: 40, color: Colors.white));
      case PaymentResultState.failed:
        return CircleAvatar(radius: 36, backgroundColor: AppColors.error, child: const Icon(Icons.close, size: 40, color: Colors.white));
      case PaymentResultState.pending:
        return CircleAvatar(radius: 36, backgroundColor: AppColors.warning, child: const Icon(Icons.access_time, size: 40, color: Colors.white));
    }
  }

  Widget _buildNoticeBanner(BuildContext context, bool isDark) {
    if (_currentState == PaymentResultState.pending) {
      return Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(color: AppColors.warning.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(AppRadius.md), border: Border.all(color: AppColors.warning.withValues(alpha: 0.2))),
        child: Row(
          children: const [
            Icon(Icons.info_outline, color: AppColors.warning, size: 20),
            SizedBox(width: 10),
            Expanded(child: Text('This usually takes a few minutes. You will be notified once the payment is completed.', style: TextStyle(fontSize: 12))),
          ],
        ),
      );
    }

    if (_currentState == PaymentResultState.processing) {
      return Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(AppRadius.md), border: Border.all(color: AppColors.primary.withValues(alpha: 0.2))),
        child: Row(
          children: const [
            Icon(Icons.cancel_outlined, color: AppColors.primary, size: 20),
            SizedBox(width: 10),
            Expanded(child: Text('Do not close this screen or press back.', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold))),
          ],
        ),
      );
    }

    return const SizedBox.shrink();
  }

  Widget _buildRow(String label, String value, bool isDark, {bool isBold = false, bool isErrorText = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
          Text(
            value,
            textAlign: TextAlign.end,
            style: TextStyle(
              fontWeight: isBold ? FontWeight.bold : FontWeight.w500,
              fontSize: isBold ? 14 : 12,
              color: isErrorText ? AppColors.error : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActions(BuildContext context) {
    if (_currentState == PaymentResultState.failed) {
      return Column(
        children: [
          OutlinedButton(
            onPressed: () {},
            style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48), foregroundColor: AppColors.primary, side: BorderSide(color: AppColors.primary)),
            child: const Text('Try Again', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
          const SizedBox(height: AppSpacing.sm),
          AppPrimaryButton(text: 'Change Payment Method', onPressed: () {}),
        ],
      );
    }

    if (_currentState == PaymentResultState.successful) {
      return Column(
        children: [
          OutlinedButton(
            onPressed: () {},
            style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48), foregroundColor: AppColors.primary, side: BorderSide(color: AppColors.primary)),
            child: const Text('View Receipt', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
          const SizedBox(height: AppSpacing.sm),
          AppPrimaryButton(text: 'Back to Payments', onPressed: () => context.go(AppRoutes.userPaymentsScreen)),
        ],
      );
    }

    return AppPrimaryButton(
      text: 'View Payment Details',
      onPressed: () => context.push(AppRoutes.userPaymentDetailsScreen),
    );
  }
}
