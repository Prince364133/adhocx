import 'package:flutter/material.dart';
import './user_payment_details_screen.dart';
import '../../services/razorpay_checkout_service.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';

class UserPaymentsScreen extends StatefulWidget {
  const UserPaymentsScreen({super.key});

  @override
  State<UserPaymentsScreen> createState() => _UserPaymentsScreenState();
}

class _UserPaymentsScreenState extends State<UserPaymentsScreen> {
  bool _isLoading = true;
  Map<String, dynamic>? _walletData;
  List<dynamic> _transactions = [];
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadWallet();
  }

  Future<void> _loadWallet() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final results = await Future.wait([
        UserService.instance.getWalletSummary(),
        UserService.instance.getWalletTransactions(),
      ]);

      if (mounted) {
        setState(() {
          _walletData = results[0] as Map<String, dynamic>?;
          _transactions = results[1] is List ? results[1] as List<dynamic> : [];
        });
      }
    } catch (e) {
      if (mounted) setState(() => _errorMessage = e.toString().replaceAll("Exception: ", ""));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showTopUpDialog() {
    final amountController = TextEditingController(text: '5000');
    final couponController = TextEditingController();
    bool isProcessing = false;
    bool isValidatingCoupon = false;
    Map<String, dynamic>? appliedCoupon;
    String? couponError;

    showModalBottomSheet(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final theme = Theme.of(ctx);
        final isDark = theme.brightness == Brightness.dark;

        return StatefulBuilder(
          builder: (context, setModalState) {
            final rawAmount = double.tryParse(amountController.text.trim()) ?? 0;
            final discountAmount = (appliedCoupon?['discountAmount'] as num?)?.toDouble() ?? 0.0;
            final netPayable = (rawAmount - discountAmount).clamp(0.0, double.infinity);

            return SafeArea(
              top: false,
              child: Container(
                padding: EdgeInsets.only(
                  top: AppSpacing.lg,
                  left: AppSpacing.lg,
                  right: AppSpacing.lg,
                  bottom: MediaQuery.of(ctx).viewInsets.bottom + AppSpacing.lg,
                ),
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Top Up AdhocX Wallet',
                        style: AppTypography.h3(
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(ctx),
                        icon: const Icon(Icons.close),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Add funds to your AdhocX business wallet via UPI / Cards / Net Banking.',
                    style: TextStyle(fontSize: 12, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                  ),
                  const SizedBox(height: AppSpacing.lg),

                  TextField(
                    controller: amountController,
                    keyboardType: TextInputType.number,
                    onChanged: (_) {
                      if (appliedCoupon != null) {
                        setModalState(() {
                          appliedCoupon = null;
                          couponError = null;
                        });
                      }
                    },
                    decoration: InputDecoration(
                      prefixIcon: const Icon(Icons.currency_rupee, color: AppColors.primary),
                      labelText: 'Amount (₹)',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),

                  // Preset chips
                  Row(
                    children: [2000, 5000, 10000, 25000].map((preset) {
                      return Expanded(
                        child: GestureDetector(
                          onTap: () {
                            setModalState(() {
                              amountController.text = preset.toString();
                              appliedCoupon = null;
                              couponError = null;
                            });
                          },
                          child: Container(
                            margin: const EdgeInsets.symmetric(horizontal: 4),
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(AppRadius.sm),
                              border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                            ),
                            child: Text('₹$preset', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary)),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: AppSpacing.md),

                  // Promo Coupon Code Input
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: couponController,
                          textCapitalization: TextCapitalization.characters,
                          decoration: InputDecoration(
                            prefixIcon: const Icon(Icons.local_offer_outlined, size: 20, color: AppColors.primary),
                            hintText: 'Enter Promo / Coupon Code',
                            hintStyle: const TextStyle(fontSize: 12),
                            isDense: true,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      SizedBox(
                        height: 44,
                        child: OutlinedButton(
                          onPressed: isValidatingCoupon || couponController.text.trim().isEmpty
                              ? null
                              : () async {
                                  final code = couponController.text.trim().toUpperCase();
                                  final amount = double.tryParse(amountController.text.trim()) ?? 0;
                                  if (amount < 100) {
                                    setModalState(() => couponError = 'Enter at least ₹100 before applying coupon');
                                    return;
                                  }

                                  setModalState(() {
                                    isValidatingCoupon = true;
                                    couponError = null;
                                  });

                                  try {
                                    final res = await UserService.instance.validateCoupon(
                                      code: code,
                                      amount: amount,
                                      context: 'WALLET_TOPUP',
                                    );

                                    if (res['valid'] == true) {
                                      setModalState(() {
                                        appliedCoupon = res;
                                        couponError = null;
                                        isValidatingCoupon = false;
                                      });
                                    } else {
                                      setModalState(() {
                                        appliedCoupon = null;
                                        couponError = res['message'] ?? 'Invalid coupon code';
                                        isValidatingCoupon = false;
                                      });
                                    }
                                  } catch (err) {
                                    setModalState(() {
                                      appliedCoupon = null;
                                      couponError = err.toString().replaceAll('Exception: ', '').replaceAll('ApiException(400): ', '');
                                      isValidatingCoupon = false;
                                    });
                                  }
                                },
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.primary,
                            side: const BorderSide(color: AppColors.primary),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                          ),
                          child: isValidatingCoupon
                              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                              : const Text('APPLY', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                        ),
                      ),
                    ],
                  ),

                  if (couponError != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 6, left: 4),
                      child: Text(
                        couponError!,
                        style: const TextStyle(fontSize: 11, color: AppColors.error, fontWeight: FontWeight.w500),
                      ),
                    ),

                  if (appliedCoupon != null)
                    Container(
                      margin: const EdgeInsets.only(top: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppColors.success.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                        border: Border.all(color: AppColors.success.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.check_circle_outline, size: 16, color: AppColors.success),
                              const SizedBox(width: 6),
                              Text(
                                '${appliedCoupon!['code']}: ₹${discountAmount.toStringAsFixed(0)} discount applied!',
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.success),
                              ),
                            ],
                          ),
                          GestureDetector(
                            onTap: () {
                              setModalState(() {
                                appliedCoupon = null;
                                couponController.clear();
                              });
                            },
                            child: const Icon(Icons.close, size: 16, color: AppColors.error),
                          ),
                        ],
                      ),
                    ),

                  // Summary breakdown
                  if (appliedCoupon != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 10),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Net Payable:', style: TextStyle(fontSize: 12, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                          Text('₹ ${netPayable.toStringAsFixed(2)}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.primary)),
                        ],
                      ),
                    ),

                  const SizedBox(height: AppSpacing.lg),

                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: isProcessing
                          ? null
                          : () async {
                              final amount = double.tryParse(amountController.text.trim()) ?? 0;
                              if (amount < 100) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Minimum top-up amount is ₹100')),
                                );
                                return;
                              }

                              final messenger = ScaffoldMessenger.of(context);
                              final navigator = Navigator.of(ctx);
                              setModalState(() => isProcessing = true);
                              try {
                                final couponCode = appliedCoupon?['code'] as String?;
                                final orderRes = await UserService.instance.createTopUpOrder(amount, couponCode: couponCode);
                                final razorpayOrderId = orderRes['orderId'] as String?;
                                final keyId = orderRes['keyId'] as String?;
                                final payableAmount = (orderRes['finalPayableAmount'] as num?)?.toDouble() ?? (appliedCoupon != null ? netPayable : rawAmount);

                                if (razorpayOrderId == null || keyId == null) {
                                  throw Exception('Unable to generate payment order. Please try again.');
                                }

                                final result = await RazorpayCheckoutService.instance.openCheckout(
                                  keyId: keyId,
                                  orderId: razorpayOrderId,
                                  amount: payableAmount,
                                  name: 'AdhocX Wallet Top-Up',
                                  description: 'Add funds to AdhocX wallet',
                                  notes: {
                                    'couponCode': couponCode ?? '',
                                  },
                                );

                                if (!result.success) {
                                  setModalState(() => isProcessing = false);
                                  final isCancelled = result.isCancelled ||
                                      (result.errorMessage ?? '').toLowerCase().contains('cancel') ||
                                      (result.errorMessage ?? '').toLowerCase() == 'undefined' ||
                                      (result.errorMessage ?? '').toLowerCase() == 'null';
                                  final displayMessage = isCancelled
                                      ? 'Payment cancelled by user'
                                      : ((result.errorMessage == null ||
                                              result.errorMessage!.trim().isEmpty ||
                                              result.errorMessage!.trim().toLowerCase() == 'undefined' ||
                                              result.errorMessage!.trim().toLowerCase() == 'null')
                                          ? 'Payment was cancelled or failed'
                                          : result.errorMessage!);

                                  await UserService.instance.recordTopUpStatus(
                                    orderId: razorpayOrderId,
                                    amount: payableAmount,
                                    status: isCancelled ? 'CANCELLED' : 'FAILED',
                                    reason: displayMessage,
                                  ).catchError((_) => null);

                                  if (mounted) {
                                    _loadWallet();
                                    messenger.showSnackBar(
                                      SnackBar(
                                        content: Text(displayMessage),
                                        backgroundColor: isCancelled ? AppColors.slate700 : AppColors.error,
                                      ),
                                    );
                                  }
                                  return;
                                }

                                if (result.paymentId == null || result.signature == null) {
                                  throw Exception('Invalid payment confirmation received from payment gateway');
                                }

                                // Live verify topup with genuine Razorpay credentials
                                await UserService.instance.verifyTopUp(
                                  razorpayOrderId: result.orderId ?? razorpayOrderId,
                                  razorpayPaymentId: result.paymentId!,
                                  razorpaySignature: result.signature!,
                                  amount: amount,
                                  couponCode: couponCode,
                                );

                                if (ctx.mounted) {
                                  navigator.pop();
                                }
                                if (mounted) {
                                  messenger.showSnackBar(
                                    SnackBar(
                                      content: Text('₹${amount.toStringAsFixed(0)} added to wallet successfully!${couponCode != null ? " ($couponCode applied)" : ""}'),
                                      backgroundColor: AppColors.success,
                                    ),
                                  );
                                  _loadWallet();
                                }
                              } catch (err) {
                                setModalState(() => isProcessing = false);
                                if (mounted) {
                                  final msg = err.toString().replaceAll('ClientException: ', '').replaceAll('Exception: ', '').replaceAll('ApiException(400): ', '');
                                  messenger.showSnackBar(
                                    SnackBar(content: Text('Top-up failed: $msg'), backgroundColor: AppColors.error),
                                  );
                                }
                              }
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                      ),
                      child: isProcessing
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : Text('PROCEED TO PAY ₹${(appliedCoupon != null ? netPayable : rawAmount).toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      );
    },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final balance = (_walletData?['walletBalance'] as num?)?.toDouble() ?? (_walletData?['balance'] as num?)?.toDouble() ?? 0.0;
    final escrowHeld = (_walletData?['escrowBalance'] as num?)?.toDouble() ?? (_walletData?['escrowHeld'] as num?)?.toDouble() ?? 0.0;
    final totalSpent = (_walletData?['totalSpent'] as num?)?.toDouble() ?? 0.0;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        elevation: 0,
        title: Text(
          'AdhocX Wallet',
          style: AppTypography.h2(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            onPressed: _loadWallet,
            icon: Icon(Icons.refresh, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
          ),
        ],
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _errorMessage != null
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.error_outline, size: 48, color: AppColors.error),
                          const SizedBox(height: 12),
                          Text(_errorMessage!, textAlign: TextAlign.center, style: TextStyle(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight)),
                          const SizedBox(height: 16),
                          ElevatedButton(onPressed: _loadWallet, child: const Text('Retry')),
                        ],
                      ),
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: _loadWallet,
                    child: SingleChildScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Balance Hero Card
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(AppSpacing.xl),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFF4F46E5), Color(0xFF7C3AED)],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              borderRadius: BorderRadius.circular(AppRadius.xl),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF4F46E5).withValues(alpha: 0.3),
                                  blurRadius: 16,
                                  offset: const Offset(0, 8),
                                ),
                              ],
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Available AdhocX Balance',
                                  style: AppTypography.caption(
                                    color: Colors.white.withValues(alpha: 0.8),
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        '₹ ${balance.toStringAsFixed(2)}',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: AppTypography.h1(
                                          color: Colors.white,
                                          fontWeight: FontWeight.w900,
                                        ),
                                      ),
                                    ),
                                    ElevatedButton.icon(
                                      onPressed: _showTopUpDialog,
                                      icon: const Icon(Icons.add, size: 18),
                                      label: const Text('Top Up', style: TextStyle(fontWeight: FontWeight.bold)),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: Colors.white,
                                        foregroundColor: AppColors.primary,
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.full)),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: AppSpacing.lg),

                          // Wallet Metrics Row
                          Row(
                            children: [
                              Expanded(
                                child: _buildPaymentKPI(context, 'Escrow Held', '₹ ${escrowHeld.toStringAsFixed(0)}', AppColors.warning, isDark),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: _buildPaymentKPI(context, 'Total Spent', '₹ ${totalSpent.toStringAsFixed(0)}', AppColors.success, isDark),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: _buildPaymentKPI(context, 'Status', 'Active', AppColors.primary, isDark),
                              ),
                            ],
                          ),

                          const SizedBox(height: AppSpacing.xl),

                          // Ledger History Header
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Wallet Transactions',
                                style: AppTypography.h3(
                                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Text(
                                '${_transactions.length} entries',
                                style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                              ),
                            ],
                          ),

                          const SizedBox(height: AppSpacing.xs),

                          // Ledger Transactions List
                          if (_transactions.isEmpty)
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(AppSpacing.xl),
                              margin: const EdgeInsets.only(top: 8),
                              decoration: BoxDecoration(
                                color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                                borderRadius: BorderRadius.circular(AppRadius.lg),
                                border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                              ),
                              child: Column(
                                children: [
                                  Icon(Icons.receipt_long_outlined, size: 40, color: AppColors.slate400),
                                  const SizedBox(height: 8),
                                  Text('No wallet transactions yet', style: TextStyle(fontWeight: FontWeight.bold, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight)),
                                  const SizedBox(height: 4),
                                  Text('Top up funds or book trips to see wallet ledger logs', style: TextStyle(fontSize: 12, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                                ],
                              ),
                            )
                          else
                            ListView.separated(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: _transactions.length,
                              separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
                              itemBuilder: (context, index) {
                                final item = _transactions[index] as Map<String, dynamic>;
                                final type = item['entryType'] as String? ?? item['type'] as String? ?? 'CREDIT';
                                final status = (item['status'] as String? ?? 'COMPLETED').toUpperCase();
                                final desc = item['description'] as String? ?? 'Wallet transaction';
                                final refType = item['referenceType'] as String? ?? '';
                                final isCancelled = status == 'CANCELLED' || refType.contains('CANCEL') || desc.toLowerCase().contains('cancel');
                                final isFailed = status == 'FAILED' || refType.contains('FAIL') || desc.toLowerCase().contains('fail');
                                final isCredit = type == 'CREDIT' && !isCancelled && !isFailed;
                                final amount = (item['amount'] as num?)?.toDouble() ?? 0.0;
                                final dateStr = item['createdAt'] as String? ?? '';

                                IconData iconData = isCredit ? Icons.arrow_downward : Icons.arrow_upward;
                                Color iconColor = isCredit ? AppColors.success : AppColors.error;
                                if (isCancelled) {
                                  iconData = Icons.block;
                                  iconColor = isDark ? AppColors.slate400 : AppColors.slate600;
                                } else if (isFailed) {
                                  iconData = Icons.error_outline;
                                  iconColor = AppColors.error;
                                }

                                return InkWell(
                                  borderRadius: BorderRadius.circular(AppRadius.lg),
                                  onTap: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => UserPaymentDetailsScreen(transaction: item),
                                      ),
                                    );
                                  },
                                  child: Container(
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
                                          decoration: BoxDecoration(
                                            color: iconColor.withValues(alpha: 0.12),
                                            shape: BoxShape.circle,
                                          ),
                                          child: Icon(
                                            iconData,
                                            color: iconColor,
                                            size: 20,
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                desc,
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                                style: AppTypography.h4(
                                                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                              const SizedBox(height: 2),
                                              Row(
                                                children: [
                                                  Text(
                                                    dateStr.length > 10 ? dateStr.substring(0, 10) : dateStr,
                                                    style: AppTypography.caption(
                                                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                                    ),
                                                  ),
                                                  if (isCancelled || isFailed) ...[
                                                    const SizedBox(width: 8),
                                                    Container(
                                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                                      decoration: BoxDecoration(
                                                        color: (isCancelled ? AppColors.slate700 : AppColors.error).withValues(alpha: 0.15),
                                                        borderRadius: BorderRadius.circular(AppRadius.sm),
                                                      ),
                                                      child: Text(
                                                        isCancelled ? 'CANCELLED' : 'FAILED',
                                                        style: TextStyle(
                                                          fontSize: 9,
                                                          fontWeight: FontWeight.bold,
                                                          color: isCancelled ? (isDark ? AppColors.slate300 : AppColors.slate700) : AppColors.error,
                                                        ),
                                                      ),
                                                    ),
                                                  ],
                                                ],
                                              ),
                                            ],
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Text(
                                          isCancelled
                                              ? '₹ ${amount.toStringAsFixed(2)}'
                                              : '${isCredit ? "+" : "-"} ₹ ${amount.toStringAsFixed(2)}',
                                          style: AppTypography.h4(
                                            color: isCancelled
                                                ? (isDark ? AppColors.textMutedDark : AppColors.textMutedLight)
                                                : (isCredit ? AppColors.success : AppColors.error),
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                        ],
                      ),
                    ),
                  ),
      ),
    );
  }

  Widget _buildPaymentKPI(BuildContext context, String label, String value, Color color, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(width: 6, height: 6, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
              const SizedBox(width: 4),
              Text(
                label,
                style: AppTypography.caption(
                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                  fontSize: 11,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: AppTypography.h4(
              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}
