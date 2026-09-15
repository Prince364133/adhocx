import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../shared/animations/app_animations.dart';
import '../../shared/animations/app_shake_feedback.dart';
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
  final Map<String, dynamic>? paymentData;

  const UserPaymentStatusScreen({
    super.key,
    this.initialState = PaymentResultState.pending,
    this.paymentData,
  });

  @override
  State<UserPaymentStatusScreen> createState() => _UserPaymentStatusScreenState();
}

class _UserPaymentStatusScreenState extends State<UserPaymentStatusScreen>
    with SingleTickerProviderStateMixin {
  late PaymentResultState _currentState;
  late AnimationController _animController;
  late Animation<double> _scaleAnimation;
  bool _shouldShake = false;

  @override
  void initState() {
    super.initState();
    _currentState = widget.initialState;
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );
    _scaleAnimation = CurvedAnimation(
      parent: _animController,
      curve: AppCurves.spring,
    );
    _triggerStateAnimation(_currentState);
  }

  void _triggerStateAnimation(PaymentResultState state) {
    _animController.forward(from: 0.0);
    if (state == PaymentResultState.successful) {
      HapticFeedback.mediumImpact();
    } else if (state == PaymentResultState.failed) {
      setState(() => _shouldShake = true);
    }
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final data = widget.paymentData ?? {};
    final amount = data['amount'] != null ? '₹ ${(data['amount']).toString()}' : '₹ 850.00';
    final txnId = data['transactionId'] ?? data['id'] ?? 'TXN-${DateTime.now().millisecondsSinceEpoch.toString().substring(5)}';
    final tripTitle = data['title'] ?? data['tripName'] ?? 'Ride Payment';
    final method = data['method'] ?? 'Online / Wallet';

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
                          if (selected) {
                            setState(() {
                              _currentState = st;
                              _shouldShake = false;
                            });
                            _triggerStateAnimation(st);
                          }
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
                child: AppShakeFeedback(
                  shake: _shouldShake,
                  onComplete: () => setState(() => _shouldShake = false),
                  child: Column(
                    children: [
                      const SizedBox(height: AppSpacing.md),

                      // Animated Icon Graphic
                      ScaleTransition(
                        scale: _scaleAnimation,
                        child: _buildGraphic(context, isDark),
                      ),

                      const SizedBox(height: AppSpacing.md),

                      // Title & Subtitle
                      Text(_getTitle(_currentState), style: AppTypography.h1(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      Text(_getSubtitle(_currentState), textAlign: TextAlign.center, style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),

                      if (_currentState == PaymentResultState.processing) ...[
                        const SizedBox(height: AppSpacing.md),
                        const LinearProgressIndicator(
                          value: 0.65,
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
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withAlpha(20),
                              blurRadius: 10,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: Column(
                          children: [
                            _buildRow('Amount', amount, isDark, isBold: true),
                            const Divider(),
                            _buildRow('Details', tripTitle, isDark),
                            const Divider(),
                            if (_currentState == PaymentResultState.failed) ...[
                              _buildRow('Failed On', 'Just Now', isDark),
                              const Divider(),
                              _buildRow('Reason', data['error'] ?? 'Transaction declined by issuer.', isDark, isErrorText: true),
                            ] else ...[
                              _buildRow('Payment Method', method, isDark),
                              const Divider(),
                              _buildRow('Transaction ID', txnId, isDark),
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
        return 'Your payment is being confirmed with the bank.';
      case PaymentResultState.processing:
        return 'Please wait while escrow verification completes.';
      case PaymentResultState.successful:
        return 'Your payment is confirmed and locked in escrow.';
      case PaymentResultState.failed:
        return "We couldn't process your payment. Please try again.";
    }
  }

  Widget _buildGraphic(BuildContext context, bool isDark) {
    switch (_currentState) {
      case PaymentResultState.processing:
        return Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppColors.primary.withAlpha(30),
          ),
          child: const Center(
            child: SizedBox(
              width: 48,
              height: 48,
              child: CircularProgressIndicator(
                strokeWidth: 4,
                valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
              ),
            ),
          ),
        );
      case PaymentResultState.successful:
        return Container(
          width: 88,
          height: 88,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppColors.success.withAlpha(40),
            boxShadow: [
              BoxShadow(
                color: AppColors.success.withAlpha(70),
                blurRadius: 20,
                spreadRadius: 4,
              ),
            ],
          ),
          child: Center(
            child: Container(
              width: 64,
              height: 64,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.success,
              ),
              child: const Icon(Icons.check, size: 40, color: Colors.white),
            ),
          ),
        );
      case PaymentResultState.failed:
        return Container(
          width: 88,
          height: 88,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppColors.error.withAlpha(40),
            boxShadow: [
              BoxShadow(
                color: AppColors.error.withAlpha(70),
                blurRadius: 20,
                spreadRadius: 4,
              ),
            ],
          ),
          child: Center(
            child: Container(
              width: 64,
              height: 64,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.error,
              ),
              child: const Icon(Icons.close, size: 40, color: Colors.white),
            ),
          ),
        );
      case PaymentResultState.pending:
        return Container(
          width: 88,
          height: 88,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: AppColors.warning.withAlpha(40),
          ),
          child: Center(
            child: Container(
              width: 64,
              height: 64,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.warning,
              ),
              child: const Icon(Icons.access_time, size: 36, color: Colors.white),
            ),
          ),
        );
    }
  }

  Widget _buildNoticeBanner(BuildContext context, bool isDark) {
    if (_currentState == PaymentResultState.pending) {
      return Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: AppColors.warning.withAlpha(20),
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: AppColors.warning.withAlpha(50)),
        ),
        child: const Row(
          children: [
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
        decoration: BoxDecoration(
          color: AppColors.primary.withAlpha(20),
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: AppColors.primary.withAlpha(50)),
        ),
        child: const Row(
          children: [
            Icon(Icons.lock_outline, color: AppColors.primary, size: 20),
            SizedBox(width: 10),
            Expanded(child: Text('Do not close this screen or press back while escrow locks.', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold))),
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
            onPressed: () {
              setState(() => _shouldShake = true);
            },
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(48),
              foregroundColor: AppColors.primary,
              side: const BorderSide(color: AppColors.primary),
            ),
            child: const Text('Try Again', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
          const SizedBox(height: AppSpacing.sm),
          AppPrimaryButton(
            text: 'Change Payment Method',
            onPressed: () => context.push(AppRoutes.userPaymentsScreen),
          ),
        ],
      );
    }

    if (_currentState == PaymentResultState.successful) {
      return Column(
        children: [
          OutlinedButton(
            onPressed: () {},
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(48),
              foregroundColor: AppColors.primary,
              side: const BorderSide(color: AppColors.primary),
            ),
            child: const Text('View Receipt', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
          const SizedBox(height: AppSpacing.sm),
          AppPrimaryButton(
            text: 'Back to Payments',
            onPressed: () => context.go(AppRoutes.userPaymentsScreen),
          ),
        ],
      );
    }

    return AppPrimaryButton(
      text: 'View Payment Details',
      onPressed: () => context.push(AppRoutes.userPaymentDetailsScreen),
    );
  }
}
