import 'package:flutter/material.dart';
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

            return Container(
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
                    'Add funds to your AdhocX business wallet via Razorpay UPI / Cards / Net Banking.',
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
                          Text('Net Payable (Razorpay):', style: TextStyle(fontSize: 12, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
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

                              setModalState(() => isProcessing = true);
                              try {
                                final couponCode = appliedCoupon?['code'] as String?;
                                final orderRes = await UserService.instance.createTopUpOrder(amount, couponCode: couponCode);
                                final razorpayOrderId = orderRes['orderId'] as String? ?? 'order_simulated_${DateTime.now().millisecondsSinceEpoch}';

                                // Auto verify topup with correct amount and coupon
                                await UserService.instance.verifyTopUp(
                                  razorpayOrderId: razorpayOrderId,
                                  razorpayPaymentId: 'pay_sim_${DateTime.now().millisecondsSinceEpoch}',
                                  razorpaySignature: 'sig_sim_${DateTime.now().millisecondsSinceEpoch}',
                                  amount: amount,
                                  couponCode: couponCode,
                                );

                                if (mounted) {
                                  Navigator.pop(ctx);
                                  ScaffoldMessenger.of(context).showSnackBar(
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
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text('Top-up failed: $err'), backgroundColor: AppColors.error),
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

    final balance = (_walletData?['balance'] as num?)?.toDouble() ?? 0.0;
    final escrowHeld = (_walletData?['escrowHeld'] as num?)?.toDouble() ?? 0.0;
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
                : SingleChildScrollView(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Wallet Balance Hero Card
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(AppSpacing.lg),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [AppColors.primary, AppColors.primaryHover],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(AppRadius.lg),
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.primary.withValues(alpha: 0.3),
                                blurRadius: 12,
                                offset: const Offset(0, 6),
                              ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Available AdhocX Balance',
                                style: TextStyle(color: Colors.white70, fontSize: 13),
                              ),
                              const SizedBox(height: 6),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    '₹ ${balance.toStringAsFixed(2)}',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 28,
                                      fontWeight: FontWeight.bold,
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
                              final type = item['type'] as String? ?? 'CREDIT';
                              final isCredit = type == 'CREDIT';
                              final amount = (item['amount'] as num?)?.toDouble() ?? 0.0;
                              final desc = item['description'] as String? ?? 'Wallet transaction';
                              final dateStr = item['createdAt'] as String? ?? '';

                              return Container(
                                padding: const EdgeInsets.all(AppSpacing.md),
                                decoration: BoxDecoration(
                                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                                  borderRadius: BorderRadius.circular(AppRadius.lg),
                                  border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.all(10),
                                          decoration: BoxDecoration(
                                            color: (isCredit ? AppColors.success : AppColors.error).withValues(alpha: 0.12),
                                            shape: BoxShape.circle,
                                          ),
                                          child: Icon(
                                            isCredit ? Icons.arrow_downward : Icons.arrow_upward,
                                            color: isCredit ? AppColors.success : AppColors.error,
                                            size: 20,
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              desc,
                                              style: AppTypography.h4(
                                                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              dateStr.length > 10 ? dateStr.substring(0, 10) : dateStr,
                                              style: AppTypography.caption(
                                                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                    Text(
                                      '${isCredit ? "+" : "-"} ₹ ${amount.toStringAsFixed(2)}',
                                      style: AppTypography.h4(
                                        color: isCredit ? AppColors.success : AppColors.error,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                      ],
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
