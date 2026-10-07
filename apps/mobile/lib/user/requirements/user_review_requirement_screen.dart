import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../routes/app_routes.dart';
import '../../services/driver_service.dart';
import '../../services/razorpay_checkout_service.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';
import 'requirement_draft_provider.dart';
import 'utils/office_hub_detector.dart';

class UserReviewRequirementScreen extends StatefulWidget {
  const UserReviewRequirementScreen({super.key});

  @override
  State<UserReviewRequirementScreen> createState() => _UserReviewRequirementScreenState();
}

class _UserReviewRequirementScreenState extends State<UserReviewRequirementScreen> {
  bool _isSubmitting = false;
  final TextEditingController _couponController = TextEditingController();
  bool _isValidatingCoupon = false;
  Map<String, dynamic>? _appliedCoupon;
  String? _couponError;
  double? _walletBalance;
  bool _isLoadingWallet = true;
  List<Map<String, dynamic>> _vehicleTiers = [];

  @override
  void initState() {
    super.initState();
    _loadWallet();
    _loadVehicleTiers();
  }

  Future<void> _loadVehicleTiers() async {
    try {
      final tiers = await DriverService.instance.getVehicleCategories();
      if (mounted && tiers.isNotEmpty) {
        setState(() {
          _vehicleTiers = tiers;
        });
      }
    } catch (_) {}
  }

  double _getRatePerVehicle(RequirementDraftProvider draft) {
    if (draft.zonalEnabled && draft.zonalQuote != null) {
      final total = (draft.zonalQuote!['totalAmount'] as num?)?.toDouble();
      if (total != null && total > 0) {
        final isRoundTrip = draft.tripType.toLowerCase().contains('round') || draft.hasReturn;
        return isRoundTrip ? (total * 2) : total;
      }
    }
    final vType = draft.vehicleType.trim().toUpperCase();
    Map<String, dynamic>? tier;
    if (_vehicleTiers.isNotEmpty) {
      tier = _vehicleTiers.firstWhere(
        (t) => (t['vehicleType']?.toString().toUpperCase() == vType),
        orElse: () => _vehicleTiers.firstWhere(
          (t) => (t['categoryLabel']?.toString().toUpperCase().contains(vType) == true),
          orElse: () => _vehicleTiers.first,
        ),
      );
    }

    double baseFare = 400.0;
    double baseKm = 10.0;
    double perKmRate = 22.0;

    if (tier != null) {
      baseFare = double.tryParse(tier['baseFare']?.toString() ?? '') ?? 400.0;
      baseKm = double.tryParse(tier['baseKm']?.toString() ?? '') ?? 10.0;
      perKmRate = double.tryParse(tier['perKmRate']?.toString() ?? '') ?? 22.0;
    } else {
      if (vType == 'HATCHBACK') {
        baseFare = 500.0;
        baseKm = 20.0;
        perKmRate = 11.0;
      } else if (vType == 'SUV') {
        baseFare = 1400.0;
        baseKm = 40.0;
        perKmRate = 19.0;
      }
    }

    final isRoundTrip = draft.tripType.toLowerCase().contains('round') || draft.hasReturn;
    final distance = draft.roadDistanceKm > 0 ? draft.roadDistanceKm : 0.0;
    final effectiveKm = isRoundTrip ? (distance * 2) : distance;
    final extraKm = (effectiveKm - baseKm).clamp(0.0, double.infinity);
    return (baseFare + (extraKm * perKmRate)).roundToDouble();
  }

  String _getVehicleCategoryLabel(String type) {
    final vType = type.trim().toUpperCase();
    if (_vehicleTiers.isNotEmpty) {
      final match = _vehicleTiers.firstWhere(
        (t) => t['vehicleType']?.toString().toUpperCase() == vType,
        orElse: () => <String, dynamic>{},
      );
      if (match.isNotEmpty && match['categoryLabel'] != null) {
        return match['categoryLabel'].toString();
      }
    }
    if (vType == 'SUV') return 'Fleet SUV & MUV';
    if (vType == 'HATCHBACK') return 'Compact Hatchback';
    if (vType == 'SEDAN') return 'Prime Sedan';
    return type;
  }

  Future<void> _loadWallet() async {
    try {
      final summary = await UserService.instance.getWalletSummary();
      if (mounted) {
        setState(() {
          _walletBalance = (summary['walletBalance'] as num?)?.toDouble() ??
              (summary['escrowBalance'] as num?)?.toDouble() ??
              0.0;
          _isLoadingWallet = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoadingWallet = false);
      }
    }
  }

  @override
  void dispose() {
    _couponController.dispose();
    super.dispose();
  }

  void _showTopUpBottomSheet() {
    final amountController = TextEditingController(text: '5000');
    final topUpCouponController = TextEditingController();
    bool isProcessing = false;
    bool isValidatingTopUpCoupon = false;
    Map<String, dynamic>? appliedTopUpCoupon;
    String? topUpCouponError;

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
            final discountAmount = (appliedTopUpCoupon?['discountAmount'] as num?)?.toDouble() ?? 0.0;
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
                      if (appliedTopUpCoupon != null) {
                        setModalState(() {
                          appliedTopUpCoupon = null;
                          topUpCouponError = null;
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
                              appliedTopUpCoupon = null;
                              topUpCouponError = null;
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
                          controller: topUpCouponController,
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
                          onPressed: isValidatingTopUpCoupon || topUpCouponController.text.trim().isEmpty
                              ? null
                              : () async {
                                  final code = topUpCouponController.text.trim().toUpperCase();
                                  final amount = double.tryParse(amountController.text.trim()) ?? 0;
                                  if (amount < 100) {
                                    setModalState(() => topUpCouponError = 'Enter at least ₹100 before applying coupon');
                                    return;
                                  }
                                  setModalState(() {
                                    isValidatingTopUpCoupon = true;
                                    topUpCouponError = null;
                                  });
                                  try {
                                    final res = await UserService.instance.validateCoupon(
                                      code: code,
                                      amount: amount,
                                      context: 'WALLET_TOPUP',
                                    );
                                    if (res['valid'] == true) {
                                      setModalState(() {
                                        appliedTopUpCoupon = res;
                                        topUpCouponError = null;
                                        isValidatingTopUpCoupon = false;
                                      });
                                    } else {
                                      setModalState(() {
                                        appliedTopUpCoupon = null;
                                        topUpCouponError = res['message'] ?? 'Invalid coupon code';
                                        isValidatingTopUpCoupon = false;
                                      });
                                    }
                                  } catch (err) {
                                    setModalState(() {
                                      appliedTopUpCoupon = null;
                                      topUpCouponError = err.toString().replaceAll('Exception: ', '').replaceAll('ApiException(400): ', '');
                                      isValidatingTopUpCoupon = false;
                                    });
                                  }
                                },
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.primary,
                            side: const BorderSide(color: AppColors.primary),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                          ),
                          child: isValidatingTopUpCoupon
                              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                              : const Text('APPLY', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                        ),
                      ),
                    ],
                  ),

                  if (topUpCouponError != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 6, left: 4),
                      child: Text(
                        topUpCouponError!,
                        style: const TextStyle(fontSize: 11, color: AppColors.error, fontWeight: FontWeight.w500),
                      ),
                    ),

                  if (appliedTopUpCoupon != null)
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
                                '${appliedTopUpCoupon!['code']}: ₹${discountAmount.toStringAsFixed(0)} off!',
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.success),
                              ),
                            ],
                          ),
                          GestureDetector(
                            onTap: () {
                              setModalState(() {
                                appliedTopUpCoupon = null;
                                topUpCouponController.clear();
                              });
                            },
                            child: const Icon(Icons.close, size: 16, color: AppColors.error),
                          ),
                        ],
                      ),
                    ),

                  if (appliedTopUpCoupon != null)
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
                                final couponCode = appliedTopUpCoupon?['code'] as String?;
                                final orderRes = await UserService.instance.createTopUpOrder(amount, couponCode: couponCode);
                                final razorpayOrderId = orderRes['orderId'] as String?;
                                final keyId = orderRes['keyId'] as String?;
                                final payableAmount = (orderRes['finalPayableAmount'] as num?)?.toDouble() ?? (appliedTopUpCoupon != null ? netPayable : rawAmount);

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
                                  final isCancelled = (result.errorMessage ?? '').toLowerCase().contains('cancel');
                                  await UserService.instance.recordTopUpStatus(
                                    orderId: razorpayOrderId,
                                    amount: payableAmount,
                                    status: isCancelled ? 'CANCELLED' : 'FAILED',
                                    reason: result.errorMessage ?? 'Payment was cancelled or failed',
                                  ).catchError((_) => null);

                                  if (mounted) {
                                    _loadWallet();
                                    messenger.showSnackBar(
                                      SnackBar(
                                        content: Text(result.errorMessage ?? 'Payment was cancelled or failed'),
                                        backgroundColor: isCancelled ? AppColors.slate700 : AppColors.error,
                                      ),
                                    );
                                  }
                                  return;
                                }

                                if (result.paymentId == null || result.signature == null) {
                                  throw Exception('Invalid payment confirmation received from payment gateway');
                                }

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
                          : Text('PROCEED TO PAY ₹${(appliedTopUpCoupon != null ? netPayable : rawAmount).toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold)),
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

  String _normalizeVehicleType(String type) {
    final cleaned = type.trim().toUpperCase().replaceAll(' ', '_');
    if (cleaned.isNotEmpty) return cleaned;
    return 'SEDAN';
  }

  Future<void> _handleConfirmAndPost() async {
    final draft = context.read<RequirementDraftProvider>();

    // Corporate zonal bookings need a valid server quote.
    if (draft.fulfillmentMode == 'DIRECT_DISPATCH' && draft.zonalEnabled) {
      if (draft.zonalQuote == null || draft.zonalQuote!['quoteId'] == null) {
        Fluttertoast.showToast(
          msg: 'Corporate zonal quote is missing. Please return to Step 2 to generate quote.',
          backgroundColor: AppColors.error,
          textColor: Colors.white,
        );
        return;
      }
    }

    final ratePerVehicle = _getRatePerVehicle(draft);
    final rawTotal = draft.fulfillmentMode == 'BIDDING' ? draft.suggestedBudget : (draft.quantity * ratePerVehicle);
    final discount = ((_appliedCoupon?['discountAmount'] as num?)?.toDouble() ?? 0.0);
    final estTotal = (rawTotal - discount).clamp(0.0, double.infinity);

    // Auto-open top-up bottom sheet if wallet balance is insufficient
    if (_walletBalance != null && _walletBalance! < estTotal) {
      Fluttertoast.showToast(
        msg: 'Insufficient wallet balance. Please top up to deploy fleet.',
        backgroundColor: AppColors.error,
        textColor: Colors.white,
      );
      _showTopUpBottomSheet();
      return;
    }

    // Prepare structured notes containing all auxiliary details
    final List<String> notesParts = [];
    if (draft.specialRequests.isNotEmpty) {
      notesParts.add('Special Requests: ${draft.specialRequests}');
    }
    if (draft.tripType.isNotEmpty) {
      notesParts.add('Trip Type: ${draft.tripType}');
    }
    if (draft.pickupInstructions.isNotEmpty) {
      notesParts.add('Pickup Instructions: ${draft.pickupInstructions}');
    }
    if (draft.dropInstructions.isNotEmpty) {
      notesParts.add('Drop Instructions: ${draft.dropInstructions}');
    }
    if (draft.additionalStops.isNotEmpty) {
      notesParts.add('Intermediate Stops: ${draft.additionalStops.join(", ")}');
    }
    if (draft.hasReturn && draft.returnDate != null) {
      notesParts.add('Return Trip: ${draft.returnDate} ${draft.returnTime ?? ""}');
    }
    if (draft.passengers > 0) {
      notesParts.add('Passengers per vehicle: ${draft.passengers}');
    }

    final combinedNotes = notesParts.join(' | ');
    final couponCode = _appliedCoupon?['code'] as String?;

    if (draft.pickupLocation.trim().isEmpty || draft.dropLocation.trim().isEmpty) {
      Fluttertoast.showToast(
        msg: 'Please provide both pickup and drop locations.',
        backgroundColor: AppColors.error,
        textColor: Colors.white,
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final created = await UserService.instance.createRequirement(
        vehicleType: _normalizeVehicleType(draft.vehicleType),
        quantity: draft.quantity,
        fulfillmentMode: draft.fulfillmentMode,
        pickupAddress: draft.pickupLocation.trim(),
        pickupLat: draft.pickupLat != 0.0 ? draft.pickupLat : 28.4595,
        pickupLng: draft.pickupLng != 0.0 ? draft.pickupLng : 77.0266,
        dropAddress: draft.dropLocation.trim(),
        dropLat: draft.dropLat != 0.0 ? draft.dropLat : 28.5562,
        dropLng: draft.dropLng != 0.0 ? draft.dropLng : 77.1000,
        reportingTime: draft.reportingDateTime,
        ratePerVehicle: draft.fulfillmentMode == 'DIRECT_DISPATCH' ? ratePerVehicle : null,
        suggestedBudget: draft.fulfillmentMode == 'BIDDING' ? draft.suggestedBudget : null,
        notes: combinedNotes.isNotEmpty ? combinedNotes : 'Standard Booking Requirement',
        couponCode: couponCode,
        zonalQuoteId: (draft.fulfillmentMode == 'DIRECT_DISPATCH' && draft.zonalEnabled)
            ? (draft.zonalQuote?['quoteId'] as String?)
            : null,
      );

      if (mounted) {
        setState(() => _isSubmitting = false);
        final resultPayload = created is Map<String, dynamic> ? created : <String, dynamic>{};
        draft.reset();
        context.push(AppRoutes.userRequirementPostedConfirmationScreen, extra: resultPayload);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSubmitting = false);
        final rawMsg = e.toString().replaceAll("Exception: ", "").replaceAll("ApiException(400): ", "").replaceAll("BadRequestException: ", "");
        final isLowBalance = rawMsg.toLowerCase().contains("insufficient") || rawMsg.toLowerCase().contains("wallet") || rawMsg.toLowerCase().contains("balance");

        if (isLowBalance) {
          Fluttertoast.showToast(
            msg: rawMsg,
            backgroundColor: AppColors.error,
            textColor: Colors.white,
          );
          _showTopUpBottomSheet();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(rawMsg),
              backgroundColor: AppColors.error,
              duration: const Duration(seconds: 5),
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final draft = context.watch<RequirementDraftProvider>();

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        elevation: 0,
        leading: IconButton(
          onPressed: () => context.pop(),
          icon: Icon(Icons.arrow_back, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
        ),
        title: Text(
          'Review Requirement',
          style: AppTypography.h3(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Stepper Header (5/5)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: List.generate(4, (index) {
                  final stepNum = index + 1;
                  return CircleAvatar(
                    radius: 14,
                    backgroundColor: AppColors.primary,
                    child: Text(
                      '$stepNum',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  );
                }),
              ),
            ),

            const Divider(),

            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Trip Summary Header + Edit Link
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Requirement Summary',
                          style: AppTypography.h3(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        TextButton(
                          onPressed: () => context.pop(),
                          child: Text('Edit', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),

                    const SizedBox(height: AppSpacing.xs),

                    // Details Card Breakdown
                    Builder(
                      builder: (context) {
                        final resolvedPickup = draft.pickupLocation.isNotEmpty
                            ? draft.pickupLocation
                            : (draft.zonalDirection == 'OUTBOUND_FROM_OFFICE'
                                ? OfficeHubDetector.defaultLocationForHub(draft.zonalOfficeHubId)['address'] as String
                                : (draft.zonalLocality != null ? '${draft.zonalLocality!['name']}, Hyderabad, Telangana' : ''));

                        final resolvedDrop = draft.dropLocation.isNotEmpty
                            ? draft.dropLocation
                            : (draft.zonalDirection == 'INBOUND_TO_OFFICE'
                                ? OfficeHubDetector.defaultLocationForHub(draft.zonalOfficeHubId)['address'] as String
                                : (draft.zonalLocality != null ? '${draft.zonalLocality!['name']}, Hyderabad, Telangana' : ''));

                        return Container(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                            borderRadius: BorderRadius.circular(AppRadius.lg),
                            border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                          ),
                          child: Column(
                            children: [
                              // ── STOP 1: PICKUP LOCATION ALWAYS FIRST ──
                              _buildReviewRow(
                                context,
                                Icons.trip_origin_rounded,
                                'Pickup (Stop 1)',
                                resolvedPickup,
                                isDark,
                                valueColor: AppColors.success,
                              ),
                              if (draft.pickupInstructions.isNotEmpty) ...[
                                const Divider(),
                                _buildReviewRow(context, Icons.info_outline, 'Pickup Note', draft.pickupInstructions, isDark),
                              ],
                              const Divider(),

                              // ── STOP 2: DESTINATION LOCATION ALWAYS SECOND ──
                              _buildReviewRow(
                                context,
                                Icons.pin_drop_rounded,
                                'Destination (Stop 2)',
                                resolvedDrop,
                                isDark,
                                valueColor: AppColors.error,
                              ),
                              if (draft.dropInstructions.isNotEmpty) ...[
                                const Divider(),
                                _buildReviewRow(context, Icons.info_outline, 'Drop Note', draft.dropInstructions, isDark),
                              ],
                              if (draft.additionalStops.isNotEmpty) ...[
                                const Divider(),
                                _buildReviewRow(context, Icons.alt_route, 'Intermediate Stops', draft.additionalStops.join(', '), isDark),
                              ],
                              const Divider(),

                              // ── ROUTE DISTANCE & ESTIMATED TIME (40 KM/H AVG) ──
                              if (draft.roadDistanceKm > 0) ...[
                                _buildReviewRow(
                                  context,
                                  Icons.alt_route_rounded,
                                  'Road Distance & ETA',
                                  '${draft.formattedDistance.isNotEmpty ? draft.formattedDistance : "${draft.roadDistanceKm.toStringAsFixed(1)} km"}${draft.formattedEta.isNotEmpty ? " • ~${draft.formattedEta}" : ""} (40 km/h avg)',
                                  isDark,
                                ),
                                const Divider(),
                              ],

                              // ── FULFILLMENT & PRICING CONFIGURATION ──
                              _buildReviewRow(
                                context,
                                Icons.bolt,
                                'Fulfillment Model',
                                draft.fulfillmentMode == 'DIRECT_DISPATCH' ? 'Direct Timed Dispatch' : 'Outstation Reverse Auction',
                                isDark,
                              ),
                              const Divider(),
                              if (draft.fulfillmentMode == 'DIRECT_DISPATCH' && draft.zonalEnabled) ...[
                                _buildReviewRow(
                                  context,
                                  Icons.verified_rounded,
                                  'Pricing Model',
                                  'Corporate Zonal Rate Card (Fixed Fare)',
                                  isDark,
                                  valueColor: AppColors.primary,
                                ),
                                const Divider(),
                                _buildReviewRow(
                                  context,
                                  Icons.business_rounded,
                                  'Office Hub',
                                  draft.zonalOfficeHubId == 'KOKAPET' ? 'Kokapet Hub' : 'HITEC / Nanakramguda',
                                  isDark,
                                ),
                                const Divider(),
                                if (draft.zonalLocality != null) ...[
                                  _buildReviewRow(
                                    context,
                                    Icons.location_city_rounded,
                                    'Employee Locality',
                                    '${draft.zonalLocality!['name']} (${draft.zonalLocality!['zoneLabel'] ?? 'Zone 4'})',
                                    isDark,
                                  ),
                                  const Divider(),
                                ],
                                _buildReviewRow(
                                  context,
                                  Icons.swap_horiz_rounded,
                                  'Direction',
                                  draft.zonalDirection == 'OUTBOUND_FROM_OFFICE' ? 'Office → Home' : 'Home → Office',
                                  isDark,
                                ),
                                const Divider(),
                                _buildReviewRow(
                                  context,
                                  Icons.security_rounded,
                                  'Security Escort',
                                  draft.zonalHasEscort ? 'Included (+ ₹400)' : 'Not Selected',
                                  isDark,
                                  valueColor: draft.zonalHasEscort ? AppColors.accentPurple : null,
                                ),
                                const Divider(),
                              ],
                              if (draft.fulfillmentMode == 'BIDDING') ...[
                                _buildReviewRow(context, Icons.currency_rupee, 'Target Guide Budget', '₹${draft.suggestedBudget.toStringAsFixed(0)}', isDark, valueColor: AppColors.success),
                                const Divider(),
                                _buildReviewRow(context, Icons.timer_outlined, 'Bidding Window', '${draft.biddingWindowMinutes} Minutes', isDark),
                                const Divider(),
                              ] else ...[
                                if (draft.zonalEnabled && draft.zonalQuote != null) ...[
                                  _buildReviewRow(
                                    context,
                                    Icons.receipt_long_outlined,
                                    'Base Fare (${draft.zonalLocality?['zoneLabel'] ?? 'Zone'})',
                                    '₹${draft.zonalQuote!['baseFare'] ?? 800}',
                                    isDark,
                                  ),
                                  const Divider(),
                                  if (draft.zonalHasEscort) ...[
                                    _buildReviewRow(
                                      context,
                                      Icons.shield_outlined,
                                      'Security Escort Fee',
                                      '+ ₹${draft.zonalQuote!['escortFee'] ?? 400}',
                                      isDark,
                                      valueColor: AppColors.accentPurple,
                                    ),
                                    const Divider(),
                                  ],
                                ],
                                _buildReviewRow(context, Icons.currency_rupee, 'Rate per Vehicle', '₹${_getRatePerVehicle(draft).toStringAsFixed(0)}', isDark),
                                const Divider(),
                                _buildReviewRow(context, Icons.payments_outlined, 'Est. Total Cost', '₹${(draft.quantity * _getRatePerVehicle(draft)).toStringAsFixed(0)}', isDark, valueColor: _appliedCoupon != null ? AppColors.textMutedLight : AppColors.success),
                                const Divider(),
                                if (_appliedCoupon != null) ...[
                                  _buildReviewRow(context, Icons.local_offer_outlined, 'Promo Discount (${_appliedCoupon!["code"]})', '- ₹${((_appliedCoupon!["discountAmount"] as num?)?.toDouble() ?? 0).toStringAsFixed(0)}', isDark, valueColor: AppColors.success),
                                  const Divider(),
                                  _buildReviewRow(context, Icons.account_balance_wallet_outlined, 'Net Est. Amount', '₹${((_appliedCoupon!["finalAmount"] as num?)?.toDouble() ?? (draft.quantity * _getRatePerVehicle(draft))).toStringAsFixed(0)}', isDark, valueColor: AppColors.primary),
                                  const Divider(),
                                ],
                              ],
                              _buildReviewRow(
                                context,
                                Icons.directions_car_outlined,
                                'Vehicle Type',
                                _getVehicleCategoryLabel(draft.vehicleType),
                                isDark,
                              ),
                              const Divider(),
                              _buildReviewRow(context, Icons.format_list_numbered, 'Quantity', '${draft.quantity} ${draft.quantity > 1 ? "Vehicles" : "Vehicle"}', isDark),
                              const Divider(),
                              _buildReviewRow(context, Icons.swap_calls, 'Trip Type', draft.tripType, isDark),
                              const Divider(),
                              _buildReviewRow(context, Icons.calendar_today_outlined, 'Pickup Date', draft.pickupDate, isDark),
                              const Divider(),
                              _buildReviewRow(context, Icons.access_time_outlined, 'Pickup Time', draft.pickupTime, isDark),
                              if (draft.hasReturn) ...[
                                const Divider(),
                                _buildReviewRow(context, Icons.event_repeat, 'Return Date/Time', '${draft.returnDate ?? "-"} ${draft.returnTime ?? ""}', isDark),
                              ],
                              const Divider(),
                              _buildReviewRow(context, Icons.person_outline, 'Passengers/Cab', '${draft.passengers}', isDark),
                              if (draft.specialRequests.isNotEmpty) ...[
                                const Divider(),
                                _buildReviewRow(context, Icons.note_outlined, 'Preferences', draft.specialRequests, isDark),
                              ],
                              if (draft.additionalInfo.isNotEmpty) ...[
                                const Divider(),
                                _buildReviewRow(context, Icons.description_outlined, 'Additional Notes', draft.additionalInfo, isDark),
                              ],
                            ],
                          ),
                        );
                      },
                    ),

                    const SizedBox(height: AppSpacing.md),

                    // Promo / Coupon Section Card
                    Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(AppRadius.lg),
                        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.local_offer_outlined, size: 18, color: AppColors.primary),
                              const SizedBox(width: 6),
                              Text('Promo / Coupon Code', style: AppTypography.h4(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.w600)),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _couponController,
                                  textCapitalization: TextCapitalization.characters,
                                  decoration: InputDecoration(
                                    hintText: 'Enter promo code (e.g. ADHOC100)',
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
                                  onPressed: _isValidatingCoupon || _couponController.text.trim().isEmpty
                                      ? null
                                      : () async {
                                          final code = _couponController.text.trim().toUpperCase();
                                          final baseCost = (draft.quantity * _getRatePerVehicle(draft)).toDouble();

                                          setState(() {
                                            _isValidatingCoupon = true;
                                            _couponError = null;
                                          });

                                          try {
                                            final res = await UserService.instance.validateCoupon(
                                              code: code,
                                              amount: baseCost,
                                              context: 'REQUIREMENT_BOOKING',
                                            );

                                            if (res['valid'] == true) {
                                              setState(() {
                                                _appliedCoupon = res;
                                                _couponError = null;
                                                _isValidatingCoupon = false;
                                              });
                                            } else {
                                              setState(() {
                                                _appliedCoupon = null;
                                                _couponError = res['message'] ?? 'Invalid coupon code';
                                                _isValidatingCoupon = false;
                                              });
                                            }
                                          } catch (err) {
                                            setState(() {
                                              _appliedCoupon = null;
                                              _couponError = err.toString().replaceAll('Exception: ', '').replaceAll('ApiException(400): ', '');
                                              _isValidatingCoupon = false;
                                            });
                                          }
                                        },
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: AppColors.primary,
                                    side: const BorderSide(color: AppColors.primary),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                                  ),
                                  child: _isValidatingCoupon
                                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                                      : const Text('APPLY', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                                ),
                              ),
                            ],
                          ),

                          if (_couponError != null)
                            Padding(
                              padding: const EdgeInsets.only(top: 6, left: 4),
                              child: Text(
                                _couponError!,
                                style: const TextStyle(fontSize: 11, color: AppColors.error, fontWeight: FontWeight.w500),
                              ),
                            ),

                          if (_appliedCoupon != null)
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
                                        '${_appliedCoupon!['code']}: ₹${((_appliedCoupon!['discountAmount'] as num?)?.toDouble() ?? 0).toStringAsFixed(0)} discount applied!',
                                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.success),
                                      ),
                                    ],
                                  ),
                                  GestureDetector(
                                    onTap: () {
                                      setState(() {
                                        _appliedCoupon = null;
                                        _couponController.clear();
                                      });
                                    },
                                    child: const Icon(Icons.close, size: 16, color: AppColors.error),
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
                    ),

                    const SizedBox(height: AppSpacing.md),

                    // AdhocX Wallet Balance & Deduction Indicator
                    Builder(
                      builder: (context) {
                        final ratePerVehicle = _getRatePerVehicle(draft);
                        final rawTotal = draft.fulfillmentMode == 'BIDDING' ? draft.suggestedBudget : (draft.quantity * ratePerVehicle);
                        final discount = ((_appliedCoupon?['discountAmount'] as num?)?.toDouble() ?? 0.0);
                        final estTotal = (rawTotal - discount).clamp(0.0, double.infinity);
                        final isInsufficient = _walletBalance != null && _walletBalance! < estTotal;

                        return Container(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          decoration: BoxDecoration(
                            color: isInsufficient
                                ? AppColors.error.withValues(alpha: 0.06)
                                : (isDark ? AppColors.surfaceDark : AppColors.surfaceLight),
                            borderRadius: BorderRadius.circular(AppRadius.lg),
                            border: Border.all(
                              color: isInsufficient
                                  ? AppColors.error.withValues(alpha: 0.5)
                                  : (isDark ? AppColors.borderDark : AppColors.borderLight),
                              width: isInsufficient ? 1.5 : 1.0,
                            ),
                          ),
                          child: Column(
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      Icon(
                                        Icons.account_balance_wallet_outlined,
                                        color: isInsufficient ? AppColors.error : AppColors.primary,
                                        size: 22,
                                      ),
                                      const SizedBox(width: 10),
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'AdhocX Wallet (Platform Deductions)',
                                            style: AppTypography.caption(
                                              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                            ),
                                          ),
                                          Text(
                                            _isLoadingWallet
                                                ? 'Checking...'
                                                : '₹${(_walletBalance ?? 0.0).toStringAsFixed(2)} Available',
                                            style: TextStyle(
                                              fontSize: 15,
                                              fontWeight: FontWeight.bold,
                                              color: isInsufficient ? AppColors.error : AppColors.success,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                  OutlinedButton.icon(
                                    onPressed: () {
                                      _showTopUpBottomSheet();
                                    },
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: isInsufficient ? AppColors.error : AppColors.primary,
                                      side: BorderSide(color: isInsufficient ? AppColors.error : AppColors.primary),
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.full)),
                                    ),
                                    icon: const Icon(Icons.add_circle_outline, size: 14),
                                    label: const Text('Top Up', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                  ),
                                ],
                              ),
                              if (isInsufficient) ...[
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    Icon(Icons.warning_amber_rounded, size: 14, color: AppColors.error),
                                    const SizedBox(width: 6),
                                    Expanded(
                                      child: Text(
                                        'Top up ₹${(estTotal - (_walletBalance ?? 0.0)).toStringAsFixed(0)} more to post this requirement.',
                                        style: const TextStyle(fontSize: 11, color: AppColors.error, fontWeight: FontWeight.w600),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ],
                          ),
                        );
                      },
                    ),

                    const SizedBox(height: AppSpacing.xl),

                    // Bottom Action Buttons (Back + Confirm & Post)
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: _isSubmitting ? null : () => context.pop(),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                            ),
                            child: const Text('Back', style: TextStyle(fontWeight: FontWeight.bold)),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(
                          flex: 2,
                          child: AppPrimaryButton(
                            text: 'Deploy Fleet Dispatch',
                            isLoading: _isSubmitting,
                            onPressed: _handleConfirmAndPost,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReviewRow(BuildContext context, IconData icon, String label, String value, bool isDark, {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: AppColors.primary),
          const SizedBox(width: 8),
          Text(
            label,
            style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: AppTypography.caption(
                color: valueColor ?? (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
