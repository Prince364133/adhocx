import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import '../../../services/driver_service.dart';
import '../../../services/razorpay_checkout_service.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_radius.dart';
import '../../../theme/app_spacing.dart';
import '../../../widgets/common/app_primary_button.dart';

/// Modern, high-converting Driver Subscription Paywall Modal Sheet.
/// Allows drivers to activate their monthly membership via Razorpay Checkout,
/// apply discount promo coupons, or auto-renew seamlessly from their earned wallet balance.
class SubscriptionPaywallModal extends StatefulWidget {
  final Map<String, dynamic>? initialStatus;
  final double walletBalance;
  final VoidCallback onSubscriptionUpdated;

  const SubscriptionPaywallModal({
    super.key,
    this.initialStatus,
    required this.walletBalance,
    required this.onSubscriptionUpdated,
  });

  static Future<void> show(
    BuildContext context, {
    Map<String, dynamic>? initialStatus,
    required double walletBalance,
    required VoidCallback onSubscriptionUpdated,
  }) {
    return showModalBottomSheet(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => SubscriptionPaywallModal(
        initialStatus: initialStatus,
        walletBalance: walletBalance,
        onSubscriptionUpdated: onSubscriptionUpdated,
      ),
    );
  }

  @override
  State<SubscriptionPaywallModal> createState() => _SubscriptionPaywallModalState();
}

class _SubscriptionPaywallModalState extends State<SubscriptionPaywallModal> {
  final _couponController = TextEditingController();
  bool _isLoading = false;
  bool _isVerifyingCoupon = false;
  double _baseFee = 499.0;
  double _discountAmount = 0.0;
  String? _appliedCoupon;
  String? _couponError;

  @override
  void initState() {
    super.initState();
    if (widget.initialStatus != null) {
      _baseFee = (widget.initialStatus?['monthlyFee'] is num)
          ? (widget.initialStatus!['monthlyFee'] as num).toDouble()
          : 499.0;
    }
  }

  @override
  void dispose() {
    _couponController.dispose();
    super.dispose();
  }

  double get _finalAmount => (_baseFee - _discountAmount).clamp(0.0, 99999.0);

  Future<void> _applyCoupon() async {
    final code = _couponController.text.trim().toUpperCase();
    if (code.isEmpty) return;

    setState(() {
      _isVerifyingCoupon = true;
      _couponError = null;
    });

    try {
      final res = await DriverService.instance.createSubscriptionOrder(couponCode: code);
      if (res is Map && mounted) {
        final orderAmount = (res['order']?['amount'] is num)
            ? (res['order']['amount'] as num).toDouble() / 100.0
            : (res['finalAmount'] is num ? (res['finalAmount'] as num).toDouble() : _baseFee);
        final discount = (res['discountAmount'] is num)
            ? (res['discountAmount'] as num).toDouble()
            : (_baseFee - orderAmount);

        setState(() {
          _appliedCoupon = code;
          _discountAmount = discount > 0 ? discount : 0.0;
        });

        Fluttertoast.showToast(
          msg: 'Coupon "$code" applied! ₹${discount.toInt()} saved.',
          backgroundColor: AppColors.accentGreenDark,
        );
      }
    } catch (e) {
      setState(() {
        _couponError = e.toString().replaceAll('Exception: ', '');
      });
    } finally {
      if (mounted) setState(() => _isVerifyingCoupon = false);
    }
  }

  Future<void> _handleWalletRenewal() async {
    if (widget.walletBalance < _finalAmount) {
      Fluttertoast.showToast(
        msg: 'Insufficient wallet balance (₹${widget.walletBalance.toStringAsFixed(0)}). Please top up or pay online.',
        backgroundColor: AppColors.error,
      );
      return;
    }

    setState(() => _isLoading = true);
    try {
      await DriverService.instance.renewSubscriptionWithWallet();
      if (mounted) {
        Fluttertoast.showToast(
          msg: 'Subscription renewed successfully from your wallet balance!',
          backgroundColor: AppColors.accentGreenDark,
        );
        widget.onSubscriptionUpdated();
        Navigator.of(context).pop();
      }
    } catch (e) {
      Fluttertoast.showToast(
        msg: 'Renewal failed: ${e.toString().replaceAll("Exception: ", "")}',
        backgroundColor: AppColors.error,
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleRazorpayCheckout() async {
    setState(() => _isLoading = true);
    try {
      final orderRes = await DriverService.instance.createSubscriptionOrder(
        couponCode: _appliedCoupon,
      );

      if (orderRes is Map) {
        final orderId = (orderRes['orderId'] ?? orderRes['order']?['id'])?.toString();
        final keyId = (orderRes['keyId'] ?? orderRes['key'])?.toString();
        final double payableAmount = (orderRes['finalPayableAmount'] as num?)?.toDouble() ?? _finalAmount;
        final isFullyDiscounted = orderRes['isFullyDiscounted'] == true || payableAmount <= 0;

        if (isFullyDiscounted) {
          setState(() => _isLoading = false);
          if (mounted) {
            Navigator.of(context).pop(true);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Subscription activated successfully!${_appliedCoupon != null ? " ($_appliedCoupon applied)" : ""}'),
                backgroundColor: AppColors.success,
              ),
            );
          }
          return;
        }

        if (orderId == null || keyId == null) {
          throw Exception('Unable to generate payment order. Please try again.');
        }

        final result = await RazorpayCheckoutService.instance.openCheckout(
          keyId: keyId,
          orderId: orderId,
          amount: payableAmount,
          name: 'AdhocX Driver Subscription',
          description: '30-day driver platform access',
          notes: {
            'couponCode': _appliedCoupon ?? '',
          },
        );

        if (!result.success) {
          if (mounted) {
            final isCancelled = result.isCancelled ||
                (result.errorMessage ?? '').toLowerCase().contains('cancel') ||
                (result.errorMessage ?? '').toLowerCase() == 'undefined' ||
                (result.errorMessage ?? '').toLowerCase() == 'null';
            final displayMsg = isCancelled
                ? 'Payment cancelled by user'
                : ((result.errorMessage == null ||
                        result.errorMessage!.trim().isEmpty ||
                        result.errorMessage!.trim().toLowerCase() == 'undefined' ||
                        result.errorMessage!.trim().toLowerCase() == 'null')
                    ? 'Payment was cancelled or failed'
                    : result.errorMessage!);
            Fluttertoast.showToast(
              msg: displayMsg,
              backgroundColor: isCancelled ? AppColors.slate700 : AppColors.error,
            );
          }
          return;
        }

        if (result.paymentId == null || result.signature == null) {
          throw Exception('Invalid payment confirmation received from payment gateway');
        }

        await DriverService.instance.verifySubscriptionPayment(
          razorpayOrderId: result.orderId ?? orderId,
          razorpayPaymentId: result.paymentId!,
          razorpaySignature: result.signature!,
          couponCode: _appliedCoupon,
        );

        if (mounted) {
          Fluttertoast.showToast(
            msg: 'Payment verified! Your AdhocX Driver Subscription is now active for 30 days.',
            backgroundColor: AppColors.accentGreenDark,
          );
          widget.onSubscriptionUpdated();
          Navigator.of(context).pop();
        }
      }
    } catch (e) {
      Fluttertoast.showToast(
        msg: 'Payment error: ${e.toString().replaceAll("Exception: ", "")}',
        backgroundColor: AppColors.error,
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final canUseWallet = widget.walletBalance >= _finalAmount;

    return Container(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom + AppSpacing.lg,
      ),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xxl)),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
        ),
      ),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 480),
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl, vertical: AppSpacing.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ── Handle Drag Bar ──────────────────────────────────────────
              Center(
                child: Container(
                  width: 44,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: AppSpacing.md),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.borderDark : AppColors.borderLight,
                    borderRadius: BorderRadius.circular(AppRadius.full),
                  ),
                ),
              ),

              // ── Gradient Header Badge ─────────────────────────────────────
              Container(
                padding: const EdgeInsets.all(AppSpacing.lg),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF6366F1), Color(0xFF4F46E5), Color(0xFF3730A3)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(AppRadius.xl),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF4F46E5).withValues(alpha: 0.35),
                      blurRadius: 14,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(AppRadius.full),
                      ),
                      child: const Text(
                        '⭐ ADHOCX PRO DRIVER MEMBERSHIP',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      children: [
                        Text(
                          '₹${_finalAmount.toStringAsFixed(0)}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 34,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '/ month',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.8),
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        if (_discountAmount > 0) ...[
                          const SizedBox(width: 8),
                          Text(
                            '₹${_baseFee.toStringAsFixed(0)}',
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.6),
                              fontSize: 16,
                              decoration: TextDecoration.lineThrough,
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'All new drivers get 15 days free trial. Renew monthly to keep accepting unlimited high-paying corporate trips.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.9),
                        fontSize: 12,
                        height: 1.35,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),

              // ── Key Benefits List ─────────────────────────────────────────
              _buildBenefitItem(
                icon: Icons.check_circle_rounded,
                title: 'Unlimited Requirements & Offers',
                subtitle: 'Accept unlimited local, airport, and intercity fleet orders',
                isDark: isDark,
              ),
              const SizedBox(height: 8),
              _buildBenefitItem(
                icon: Icons.flash_on_rounded,
                title: 'Instant ₹1,000+ Bank Withdrawals',
                subtitle: 'Withdraw earnings to your verified bank account with zero platform fees',
                isDark: isDark,
              ),
              const SizedBox(height: 8),
              _buildBenefitItem(
                icon: Icons.verified_user_rounded,
                title: 'Authoritative Per-Km Tariffs',
                subtitle: 'Guaranteed minimum base rates and transparent extra km payouts',
                isDark: isDark,
              ),
              const SizedBox(height: AppSpacing.lg),

              // ── Coupon Code Box ───────────────────────────────────────────
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceElevatedLight,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(
                    color: _appliedCoupon != null
                        ? AppColors.accentGreenDark
                        : (isDark ? AppColors.borderDark : AppColors.borderLight),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.local_offer_outlined,
                          size: 16,
                          color: _appliedCoupon != null ? AppColors.accentGreenDark : (isDark ? AppColors.primaryLight : AppColors.primary),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _appliedCoupon != null ? 'Promo Applied: $_appliedCoupon' : 'Have a Promo or Coupon Code?',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _couponController,
                            textCapitalization: TextCapitalization.characters,
                            enabled: _appliedCoupon == null,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              fontFamily: 'monospace',
                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            ),
                            decoration: InputDecoration(
                              hintText: 'Enter code (e.g. WELCOME100)',
                              hintStyle: TextStyle(
                                fontSize: 12,
                                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                              ),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              filled: true,
                              fillColor: isDark ? AppColors.surfaceDark : Colors.white,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(AppRadius.md),
                                borderSide: BorderSide(
                                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        if (_appliedCoupon != null)
                          IconButton(
                            icon: const Icon(Icons.close, color: AppColors.error, size: 20),
                            onPressed: () {
                              setState(() {
                                _appliedCoupon = null;
                                _discountAmount = 0.0;
                                _couponController.clear();
                              });
                            },
                          )
                        else
                          ElevatedButton(
                            onPressed: _isVerifyingCoupon ? null : _applyCoupon,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(AppRadius.md),
                              ),
                            ),
                            child: _isVerifyingCoupon
                                ? const SizedBox(
                                    width: 14,
                                    height: 14,
                                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                  )
                                : const Text('Apply', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                          ),
                      ],
                    ),
                    if (_couponError != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        _couponError!,
                        style: const TextStyle(color: AppColors.error, fontSize: 11),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),

              // ── Payment Action 1: Deduct from Wallet (if sufficient balance)
              if (canUseWallet) ...[
                Container(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: AppColors.accentGreenDark.withValues(alpha: isDark ? 0.15 : 0.08),
                    borderRadius: BorderRadius.circular(AppRadius.lg),
                    border: Border.all(
                      color: AppColors.accentGreenDark.withValues(alpha: 0.35),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Wallet Balance Available',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: isDark ? AppColors.accentGreen : AppColors.accentGreenDark,
                            ),
                          ),
                          Text(
                            '₹${widget.walletBalance.toStringAsFixed(0)}',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: isDark ? AppColors.accentGreen : AppColors.accentGreenDark,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: _isLoading ? null : _handleWalletRenewal,
                          icon: const Icon(Icons.account_balance_wallet_outlined, size: 18),
                          label: Text('Pay ₹${_finalAmount.toStringAsFixed(0)} with Wallet Balance'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.accentGreenDark,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(AppRadius.md),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                Center(
                  child: Text(
                    '— OR PAY SECURELY VIA GATEWAY —',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.5,
                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
              ],

              // ── Payment Action 2: Online Checkout ────────────────
              AppPrimaryButton(
                text: 'PAY ₹${_finalAmount.toStringAsFixed(0)} ONLINE',
                isLoading: _isLoading,
                onPressed: _handleRazorpayCheckout,
              ),
              const SizedBox(height: AppSpacing.sm),
              Center(
                child: Text(
                  '256-Bit SSL Encrypted • Instant Account Activation',
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBenefitItem({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool isDark,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: AppColors.accentGreenDark.withValues(alpha: isDark ? 0.2 : 0.12),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, size: 16, color: isDark ? AppColors.accentGreen : AppColors.accentGreenDark),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                ),
              ),
              Text(
                subtitle,
                style: TextStyle(
                  fontSize: 11,
                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
