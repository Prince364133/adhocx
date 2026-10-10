import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../routes/app_routes.dart';
import '../../services/razorpay_checkout_service.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';
import 'models/cab_cart_item.dart';
import 'models/fleet_template_model.dart';
import 'requirement_draft_provider.dart';
import 'services/fleet_template_service.dart';
import 'widgets/add_cab_modal_bottom_sheet.dart';
import 'widgets/saved_templates_modal.dart';

class UserCreateRequirementScreen extends StatefulWidget {
  const UserCreateRequirementScreen({super.key});

  @override
  State<UserCreateRequirementScreen> createState() => _UserCreateRequirementScreenState();
}

class _UserCreateRequirementScreenState extends State<UserCreateRequirementScreen> {
  bool _isDeploying = false;
  final TextEditingController _couponController = TextEditingController();
  final TextEditingController _cartNameController = TextEditingController();
  bool _isValidatingCoupon = false;
  Map<String, dynamic>? _appliedCoupon;
  String? _couponError;

  double? _walletBalance;
  bool _isLoadingWallet = true;

  @override
  void initState() {
    super.initState();
    final draft = context.read<RequirementDraftProvider>();
    _cartNameController.text = draft.cartName;
    _loadWallet();
  }

  @override
  void dispose() {
    _couponController.dispose();
    _cartNameController.dispose();
    super.dispose();
  }

  Future<void> _saveCurrentCartAsTemplate() async {
    final draft = context.read<RequirementDraftProvider>();
    if (draft.cabs.isEmpty) {
      Fluttertoast.showToast(msg: 'Add at least one cab to save as template.');
      return;
    }

    final nameController = TextEditingController(
      text: _cartNameController.text.trim().isNotEmpty
          ? _cartNameController.text.trim()
          : 'Corporate Transfer to Malakpet',
    );

    final templateName = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.bookmark_add_rounded, color: AppColors.primary),
            SizedBox(width: 8),
            Text('Save as Template', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Save this multi-cab cart as a reusable template to run daily with 1-click.',
              style: TextStyle(fontSize: 12, color: AppColors.slate600),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: nameController,
              decoration: const InputDecoration(
                labelText: 'Template Name',
                hintText: 'e.g. Corporate Transfer to Malakpet',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () => Navigator.pop(ctx, nameController.text.trim()),
            child: const Text('Save Template', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (templateName != null && templateName.isNotEmpty) {
      final template = FleetTemplate(
        id: 'tmpl_${DateTime.now().millisecondsSinceEpoch}',
        name: templateName,
        cabs: List.from(draft.cabs),
        createdAt: DateTime.now(),
      );

      await FleetTemplateService.instance.saveTemplate(template);
      _cartNameController.text = templateName;
      draft.setCartName(templateName);

      Fluttertoast.showToast(
        msg: 'Template "$templateName" saved! Run daily anytime.',
        backgroundColor: AppColors.success,
        textColor: Colors.white,
      );
    }
  }

  void _showSavedTemplatesBottomSheet() async {
    final loaded = await showModalBottomSheet<bool>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const SavedTemplatesModal(),
    );

    if (loaded == true && mounted) {
      final draft = context.read<RequirementDraftProvider>();
      _cartNameController.text = draft.cartName;
      setState(() {});
    }
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
      if (mounted) setState(() => _isLoadingWallet = false);
    }
  }

  Future<void> _applyCoupon(double totalFare) async {
    final code = _couponController.text.trim().toUpperCase();
    if (code.isEmpty) return;

    setState(() {
      _isValidatingCoupon = true;
      _couponError = null;
    });

    try {
      final res = await UserService.instance.validateCoupon(
        code: code,
        amount: totalFare > 0 ? totalFare : 500,
        context: 'REQUIREMENT_POSTING',
      );

      if (res['valid'] == true) {
        setState(() {
          _appliedCoupon = res;
          _couponError = null;
          _isValidatingCoupon = false;
        });
        Fluttertoast.showToast(
          msg: 'Coupon $code applied successfully!',
          backgroundColor: AppColors.success,
          textColor: Colors.white,
        );
      } else {
        setState(() {
          _appliedCoupon = null;
          _couponError = res['message']?.toString() ?? 'Invalid coupon code';
          _isValidatingCoupon = false;
        });
      }
    } catch (e) {
      setState(() {
        _appliedCoupon = null;
        _couponError = e
            .toString()
            .replaceAll('Exception: ', '')
            .replaceAll('ApiException(400): ', '');
        _isValidatingCoupon = false;
      });
    }
  }

  Future<void> _openAddCabSheet() async {
    final draft = context.read<RequirementDraftProvider>();
    final newCab = await showModalBottomSheet<CabCartItem>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AddCabModalBottomSheet(
        cabNumber: draft.totalCabsCount + 1,
      ),
    );

    if (newCab != null && mounted) {
      draft.addCab(newCab);
      Fluttertoast.showToast(
        msg: 'Cab #${draft.totalCabsCount} added to manifest!',
        backgroundColor: AppColors.success,
        textColor: Colors.white,
      );
    }
  }

  Future<void> _openEditCabSheet(int index, CabCartItem cab) async {
    final draft = context.read<RequirementDraftProvider>();
    final updatedCab = await showModalBottomSheet<CabCartItem>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AddCabModalBottomSheet(
        existingItem: cab,
        cabNumber: index + 1,
      ),
    );

    if (updatedCab != null && mounted) {
      draft.updateCab(index, updatedCab);
      Fluttertoast.showToast(
        msg: 'Cab #${index + 1} updated!',
        backgroundColor: AppColors.primary,
        textColor: Colors.white,
      );
    }
  }

  void _duplicateCab(CabCartItem cab) {
    final draft = context.read<RequirementDraftProvider>();
    final clone = cab.copyWith(
      id: 'cab_${DateTime.now().millisecondsSinceEpoch}',
      isExpanded: false,
    );
    draft.addCab(clone);
    Fluttertoast.showToast(
      msg: 'Cab #${draft.totalCabsCount} cloned from Cab #${draft.cabs.indexOf(cab) + 1}!',
      backgroundColor: AppColors.primary,
      textColor: Colors.white,
    );
  }

  void _showTopUpBottomSheet() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final amountController = TextEditingController(text: '1000');
    bool isProcessing = false;

    showModalBottomSheet(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return SafeArea(
              top: false,
              child: Container(
                padding: EdgeInsets.only(
                  bottom: MediaQuery.of(context).viewInsets.bottom + 24,
                  top: 16,
                  left: 16,
                  right: 16,
                ),
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.slate700 : AppColors.slate300,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  Text(
                    'Instant Wallet Top Up',
                    style: AppTypography.h4(
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: amountController,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      prefixIcon: const Icon(Icons.currency_rupee, size: 20),
                      labelText: 'Top-up Amount (INR)',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: isProcessing
                          ? null
                          : () async {
                              final amt = double.tryParse(amountController.text.trim()) ?? 0;
                              if (amt < 100) {
                                Fluttertoast.showToast(msg: 'Minimum top up is ₹100');
                                return;
                              }
                              setModalState(() => isProcessing = true);
                              try {
                                final order = await UserService.instance.createTopUpOrder(amt);
                                final orderId = (order['orderId'] ?? order['razorpayOrderId']) as String;
                                final keyId = (order['keyId'] as String?) ?? 'rzp_test_ADHOCX_DEMO';
                                if (ctx.mounted) {
                                  Navigator.pop(ctx);
                                }
                                final result = await RazorpayCheckoutService.instance.openCheckout(
                                  keyId: keyId,
                                  orderId: orderId,
                                  amount: amt,
                                  name: 'AdhocX Wallet Top-Up',
                                  description: 'Add funds to AdhocX wallet',
                                );
                                if (result.success && result.paymentId != null && result.signature != null) {
                                  await UserService.instance.verifyWalletTopUp(
                                    razorpayOrderId: result.orderId ?? orderId,
                                    razorpayPaymentId: result.paymentId!,
                                    razorpaySignature: result.signature!,
                                    amount: amt,
                                  );
                                  _loadWallet();
                                  Fluttertoast.showToast(msg: 'Wallet credited successfully!');
                                } else {
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
                              } catch (e) {
                                setModalState(() => isProcessing = false);
                                Fluttertoast.showToast(msg: 'Top up failed: $e');
                              }
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                      ),
                      child: isProcessing
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Text('Proceed to Pay & Top Up', style: TextStyle(fontWeight: FontWeight.bold)),
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

  Future<void> _handleDeployAllCabs() async {
    final draft = context.read<RequirementDraftProvider>();
    if (draft.cabs.isEmpty) {
      Fluttertoast.showToast(
        msg: 'Please add at least one cab to deploy.',
        backgroundColor: AppColors.error,
        textColor: Colors.white,
      );
      return;
    }

    final double discount = ((_appliedCoupon?['discountAmount'] as num?)?.toDouble() ?? 0.0);
    final double netTotal = (draft.cartTotalEstimatedFare - discount).clamp(0.0, double.infinity);

    // Check wallet balance
    if (_walletBalance != null && _walletBalance! < netTotal) {
      Fluttertoast.showToast(
        msg: 'Insufficient wallet balance. Please top up to deploy fleet.',
        backgroundColor: AppColors.error,
        textColor: Colors.white,
      );
      _showTopUpBottomSheet();
      return;
    }

    setState(() => _isDeploying = true);

    // Show parallel deployment progress dialog
    final List<String> deploymentLogs = [];
    final List<bool> completedFlags = List.filled(draft.cabs.length, false);

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogCtx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.xl)),
              title: Row(
                children: [
                  const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(strokeWidth: 2.5),
                  ),
                  const SizedBox(width: 12),
                  const Text('Parallel Fleet Dispatch', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ],
              ),
              content: SizedBox(
                width: double.maxFinite,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Broadcasting ${draft.cabs.length} cabs to verified drivers in parallel...',
                      style: const TextStyle(fontSize: 12, color: AppColors.slate600),
                    ),
                    const SizedBox(height: 14),
                    ...List.generate(draft.cabs.length, (idx) {
                      final cab = draft.cabs[idx];
                      final isDone = completedFlags[idx];
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        decoration: BoxDecoration(
                          color: isDone
                              ? AppColors.success.withValues(alpha: 0.1)
                              : AppColors.primary.withValues(alpha: 0.06),
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(
                            color: isDone
                                ? AppColors.success.withValues(alpha: 0.3)
                                : AppColors.primary.withValues(alpha: 0.2),
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              isDone ? Icons.check_circle_rounded : Icons.search_rounded,
                              size: 18,
                              color: isDone ? AppColors.success : AppColors.primary,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Cab #${idx + 1}: ${cab.vehicleLabel} (${cab.pickupShort} → ${cab.dropShort})',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: isDone ? AppColors.success : null,
                                ),
                              ),
                            ),
                            Text(
                              isDone ? 'Dispatched' : 'Searching...',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: isDone ? AppColors.success : AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                  ],
                ),
              ),
            );
          },
        );
      },
    );

    try {
      final List<dynamic> createdRequirements = [];
      final batchId = 'BATCH_${DateTime.now().millisecondsSinceEpoch}_${draft.cabs.length}';
      final groupName = _cartNameController.text.trim().isNotEmpty
          ? _cartNameController.text.trim()
          : draft.cartName;

      // Deploy each cab in parallel
      await Future.wait(
        draft.cabs.asMap().entries.map((entry) async {
          final idx = entry.key;
          final cab = entry.value;

          try {
            final res = await UserService.instance.createRequirement(
              vehicleType: cab.vehicleType,
              quantity: 1,
              fulfillmentMode: 'DIRECT_DISPATCH',
              pickupAddress: cab.pickupAddress,
              pickupLat: cab.pickupLat != 0.0 ? cab.pickupLat : 17.4435,
              pickupLng: cab.pickupLng != 0.0 ? cab.pickupLng : 78.3772,
              dropAddress: cab.dropAddress,
              dropLat: cab.dropLat != 0.0 ? cab.dropLat : 17.3850,
              dropLng: cab.dropLng != 0.0 ? cab.dropLng : 78.4867,
              reportingTime: cab.reportingDateTime,
              ratePerVehicle: cab.estimatedFare,
              notes: cab.buildFormattedNotes(
                batchId: batchId,
                groupName: groupName,
                cabIndex: idx + 1,
                totalCabs: draft.cabs.length,
              ),
              couponCode: _appliedCoupon?['code'] as String?,
              zonalQuoteId: cab.zonalQuoteId,
            );
            createdRequirements.add(res);
            completedFlags[idx] = true;
          } catch (err) {
            completedFlags[idx] = true;
            deploymentLogs.add('Cab #${idx + 1} deployment notice: $err');
          }
        }),
      );

      // Dismiss dialog
      if (mounted) {
        Navigator.of(context, rootNavigator: true).pop();
      }

      setState(() => _isDeploying = false);

      Fluttertoast.showToast(
        msg: 'All ${draft.cabs.length} cabs deployed to parallel driver search!',
        backgroundColor: AppColors.success,
        textColor: Colors.white,
      );

      final totalDeploys = createdRequirements.length;
      final firstReq = createdRequirements.isNotEmpty && createdRequirements.first is Map<String, dynamic>
          ? createdRequirements.first as Map<String, dynamic>
          : {
              'id': 'REQ-BATCH-${DateTime.now().millisecondsSinceEpoch}',
              'vehicleType': 'MULTI_CAB_FLEET',
              'quantity': totalDeploys,
              'status': 'ACTIVE',
            };

      draft.clearCart();

      if (mounted) {
        context.push(
          AppRoutes.userRequirementPostedConfirmationScreen,
          extra: {
            ...firstReq,
            'isBatch': true,
            'batchId': batchId,
            'groupName': groupName,
            'totalCabs': totalDeploys,
            'deployedCount': totalDeploys,
          },
        );
      }
    } catch (e) {
      if (mounted) {
        Navigator.of(context, rootNavigator: true).pop();
        setState(() => _isDeploying = false);
      }
      Fluttertoast.showToast(
        msg: 'Deployment error: ${e.toString().replaceAll("Exception: ", "")}',
        backgroundColor: AppColors.error,
        textColor: Colors.white,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final draft = context.watch<RequirementDraftProvider>();

    final double discount = ((_appliedCoupon?['discountAmount'] as num?)?.toDouble() ?? 0.0);
    final double netTotal = (draft.cartTotalEstimatedFare - discount).clamp(0.0, double.infinity);
    final bool isInsufficient = _walletBalance != null && _walletBalance! < netTotal;

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
          'Create Requirement',
          style: AppTypography.h3(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            onPressed: _showSavedTemplatesBottomSheet,
            icon: const Icon(Icons.bookmark_rounded, color: AppColors.primary),
            tooltip: 'Saved Templates',
          ),
          IconButton(
            onPressed: () => context.push(AppRoutes.userBulkPostingScreen),
            icon: Icon(Icons.tune, color: AppColors.primary),
            tooltip: 'Bulk Upload CSV',
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Top Enterprise Multi-Cab Dispatch Banner
            Container(
              margin: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppColors.primary.withValues(alpha: 0.12),
                    AppColors.accentPurple.withValues(alpha: 0.08),
                  ],
                ),
                borderRadius: BorderRadius.circular(AppRadius.lg),
                border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                    child: const Icon(Icons.local_shipping_outlined, color: AppColors.primary, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Multi-Cab Fleet Manifest (Add to Cart)',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                        Text(
                          'Book multiple cabs for different pickup/drop locations and departure times.',
                          style: TextStyle(
                            fontSize: 11,
                            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Main Manifest List
            Expanded(
              child: draft.cabs.isEmpty
                  ? Center(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.all(AppSpacing.xl),
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(maxWidth: 420),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                width: 80,
                                height: 80,
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withValues(alpha: 0.1),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.add_shopping_cart_rounded, size: 40, color: AppColors.primary),
                              ),
                              const SizedBox(height: 16),
                              Text(
                                'Your Fleet Manifest is Empty',
                                style: AppTypography.h4(
                                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                  fontWeight: FontWeight.bold,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Add cabs with custom routes, timings, and passenger counts. All cabs will be searched in parallel.',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 13,
                                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                ),
                              ),
                              const SizedBox(height: 24),
                              LayoutBuilder(
                                builder: (context, constraints) {
                                  final isStacked = constraints.maxWidth < 360;
                                  if (isStacked) {
                                    return Column(
                                      children: [
                                        SizedBox(
                                          width: double.infinity,
                                          child: ElevatedButton.icon(
                                            onPressed: _openAddCabSheet,
                                            icon: const Icon(Icons.add_rounded, size: 20),
                                            label: const Text('Add First Cab', style: TextStyle(fontWeight: FontWeight.bold)),
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor: AppColors.primary,
                                              foregroundColor: Colors.white,
                                              padding: const EdgeInsets.symmetric(vertical: 14),
                                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                                            ),
                                          ),
                                        ),
                                        const SizedBox(height: 10),
                                        SizedBox(
                                          width: double.infinity,
                                          child: OutlinedButton.icon(
                                            onPressed: _showSavedTemplatesBottomSheet,
                                            icon: const Icon(Icons.bookmark_rounded, size: 18),
                                            label: const Text('Saved Templates', style: TextStyle(fontWeight: FontWeight.bold)),
                                            style: OutlinedButton.styleFrom(
                                              foregroundColor: AppColors.primary,
                                              padding: const EdgeInsets.symmetric(vertical: 14),
                                              side: const BorderSide(color: AppColors.primary),
                                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                                            ),
                                          ),
                                        ),
                                      ],
                                    );
                                  }
                                  return Row(
                                    children: [
                                      Expanded(
                                        child: ElevatedButton.icon(
                                          onPressed: _openAddCabSheet,
                                          icon: const Icon(Icons.add_rounded, size: 18),
                                          label: const Text(
                                            'Add First Cab',
                                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: AppColors.primary,
                                            foregroundColor: Colors.white,
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 14),
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: OutlinedButton.icon(
                                          onPressed: _showSavedTemplatesBottomSheet,
                                          icon: const Icon(Icons.bookmark_rounded, size: 18),
                                          label: const Text(
                                            'Saved Templates',
                                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          style: OutlinedButton.styleFrom(
                                            foregroundColor: AppColors.primary,
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 14),
                                            side: const BorderSide(color: AppColors.primary),
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                                          ),
                                        ),
                                      ),
                                    ],
                                  );
                                },
                              ),
                            ],
                          ),
                        ),
                      ),
                    )
                  : ListView(
                      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 8),
                      children: [
                        // Cart / Manifest Name & Save as Template Bar
                        Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                            borderRadius: BorderRadius.circular(AppRadius.md),
                            border: Border.all(
                              color: AppColors.primary.withValues(alpha: 0.3),
                            ),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.label_outline_rounded, size: 18, color: AppColors.primary),
                              const SizedBox(width: 8),
                              Expanded(
                                child: TextField(
                                  controller: _cartNameController,
                                  decoration: const InputDecoration(
                                    isDense: true,
                                    border: InputBorder.none,
                                    hintText: 'Cart Name (e.g. Corporate Transfer to Malakpet)',
                                    hintStyle: TextStyle(fontSize: 13),
                                  ),
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                  onChanged: (val) => draft.setCartName(val),
                                ),
                              ),
                              IconButton(
                                icon: const Icon(Icons.bookmark_add_rounded, color: AppColors.primary, size: 22),
                                tooltip: 'Save Cart as Template',
                                onPressed: _saveCurrentCartAsTemplate,
                              ),
                            ],
                          ),
                        ),

                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                'Cabs in Manifest (${draft.cabs.length})',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                TextButton.icon(
                                  onPressed: _showSavedTemplatesBottomSheet,
                                  style: TextButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                                    minimumSize: Size.zero,
                                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                  ),
                                  icon: const Icon(Icons.bookmarks_outlined, size: 14, color: AppColors.primary),
                                  label: const Text('Templates', style: TextStyle(fontSize: 11, color: AppColors.primary)),
                                ),
                                const SizedBox(width: 4),
                                TextButton(
                                  onPressed: () => draft.clearCart(),
                                  style: TextButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                                    minimumSize: Size.zero,
                                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                  ),
                                  child: const Text('Clear All', style: TextStyle(fontSize: 11, color: AppColors.error)),
                                ),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),

                        // List of Cabs
                        ...draft.cabs.asMap().entries.map((entry) {
                          final idx = entry.key;
                          final cab = entry.value;

                          return Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                              borderRadius: BorderRadius.circular(AppRadius.lg),
                              border: Border.all(
                                color: isDark ? AppColors.borderDark : AppColors.borderLight,
                              ),
                            ),
                            child: Column(
                              children: [
                                // Closed / Collapsed Header Bar
                                InkWell(
                                  onTap: () => draft.toggleCabExpanded(idx),
                                  borderRadius: BorderRadius.circular(AppRadius.lg),
                                  child: Padding(
                                    padding: const EdgeInsets.all(12),
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        // Vehicle Icon
                                        Container(
                                          padding: const EdgeInsets.all(10),
                                          decoration: BoxDecoration(
                                            color: AppColors.primary.withValues(alpha: 0.12),
                                            borderRadius: BorderRadius.circular(AppRadius.md),
                                          ),
                                          child: Icon(
                                            cab.vehicleType == 'SUV'
                                                ? Icons.airport_shuttle_rounded
                                                : Icons.directions_car_rounded,
                                            color: AppColors.primary,
                                            size: 22,
                                          ),
                                        ),
                                        const SizedBox(width: 12),

                                        // Summary Content
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Row(
                                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                children: [
                                                  Expanded(
                                                    child: Text(
                                                      'Cab #${idx + 1} • ${cab.vehicleLabel}',
                                                      style: const TextStyle(
                                                        fontWeight: FontWeight.bold,
                                                        fontSize: 14,
                                                      ),
                                                      maxLines: 1,
                                                      overflow: TextOverflow.ellipsis,
                                                    ),
                                                  ),
                                                  const SizedBox(width: 8),
                                                  Container(
                                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                                    decoration: BoxDecoration(
                                                      color: AppColors.success.withValues(alpha: 0.12),
                                                      borderRadius: BorderRadius.circular(AppRadius.sm),
                                                    ),
                                                    child: Text(
                                                      '₹${cab.estimatedFare.toStringAsFixed(0)}',
                                                      style: const TextStyle(
                                                        fontSize: 13,
                                                        fontWeight: FontWeight.bold,
                                                        color: AppColors.success,
                                                      ),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              const SizedBox(height: 4),

                                              // Route Summary
                                              Text(
                                                '${cab.pickupShort} → ${cab.dropShort}',
                                                style: const TextStyle(
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.w600,
                                                  color: AppColors.primary,
                                                ),
                                              ),
                                              const SizedBox(height: 6),

                                              // Chips row
                                              Wrap(
                                                spacing: 6,
                                                runSpacing: 4,
                                                children: [
                                                  _buildMiniChip(
                                                    Icons.calendar_today_rounded,
                                                    '${cab.pickupDate}, ${cab.pickupTime}',
                                                    isDark,
                                                  ),
                                                  _buildMiniChip(
                                                    Icons.people_outline,
                                                    '${cab.passengers} pax',
                                                    isDark,
                                                  ),
                                                  if (cab.hasEscort)
                                                    _buildMiniChip(
                                                      Icons.shield_outlined,
                                                      'Security Escort',
                                                      isDark,
                                                      chipColor: AppColors.accentPurple,
                                                    ),
                                                ],
                                              ),
                                            ],
                                          ),
                                        ),

                                        // Expand chevron
                                        Icon(
                                          cab.isExpanded ? Icons.expand_less : Icons.expand_more,
                                          color: AppColors.slate400,
                                        ),
                                      ],
                                    ),
                                  ),
                                ),

                                // Expanded Details View
                                if (cab.isExpanded) ...[
                                  const Divider(height: 1),
                                  Padding(
                                    padding: const EdgeInsets.all(12),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        // Direction
                                        Row(
                                          children: [
                                            const Icon(Icons.swap_horiz_rounded, size: 16, color: AppColors.primary),
                                            const SizedBox(width: 6),
                                            Expanded(
                                              child: Text(
                                                'Direction: ${cab.isOutbound ? "Office Hub → Employee Locality" : "Employee Locality → Office Hub"}',
                                                style: TextStyle(
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.w600,
                                                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                                ),
                                                maxLines: 2,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 8),

                                        // Pickup & Drop full addresses
                                        Row(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            const Icon(Icons.circle, size: 8, color: AppColors.success),
                                            const SizedBox(width: 8),
                                            Expanded(
                                              child: Text('Pickup: ${cab.pickupAddress}',
                                                  style: const TextStyle(fontSize: 12)),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 6),
                                        Row(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            const Icon(Icons.circle, size: 8, color: AppColors.error),
                                            const SizedBox(width: 8),
                                            Expanded(
                                              child: Text('Destination: ${cab.dropAddress}',
                                                  style: const TextStyle(fontSize: 12)),
                                            ),
                                          ],
                                        ),

                                        if (cab.additionalStops.isNotEmpty) ...[
                                          const SizedBox(height: 6),
                                          Text(
                                            'Intermediate Stops: ${cab.additionalStops.join(" • ")}',
                                            style: TextStyle(
                                              fontSize: 11,
                                              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                            ),
                                          ),
                                        ],

                                        if (cab.additionalInfo.isNotEmpty) ...[
                                          const SizedBox(height: 6),
                                          Text(
                                            'Notes: ${cab.additionalInfo}',
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontStyle: FontStyle.italic,
                                              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                            ),
                                          ),
                                        ],

                                        if (cab.formattedDistance.isNotEmpty) ...[
                                          const SizedBox(height: 6),
                                          Text(
                                            'Road Telemetry: ${cab.formattedDistance} (~${cab.formattedEta})',
                                            style: TextStyle(
                                              fontSize: 11,
                                              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                            ),
                                          ),
                                        ],

                                        const SizedBox(height: 12),

                                        // Action buttons (Edit, Duplicate, Remove)
                                        Align(
                                          alignment: Alignment.centerRight,
                                          child: Wrap(
                                            alignment: WrapAlignment.end,
                                            spacing: 8,
                                            runSpacing: 6,
                                            children: [
                                              OutlinedButton.icon(
                                                onPressed: () => _duplicateCab(cab),
                                                icon: const Icon(Icons.copy_rounded, size: 14),
                                                label: const Text('Clone', style: TextStyle(fontSize: 11)),
                                                style: OutlinedButton.styleFrom(
                                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                                ),
                                              ),
                                              OutlinedButton.icon(
                                                onPressed: () => _openEditCabSheet(idx, cab),
                                                icon: const Icon(Icons.edit_outlined, size: 14),
                                                label: const Text('Edit', style: TextStyle(fontSize: 11)),
                                                style: OutlinedButton.styleFrom(
                                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                                ),
                                              ),
                                              OutlinedButton.icon(
                                                onPressed: () => draft.removeCab(idx),
                                                icon: const Icon(Icons.delete_outline, size: 14, color: AppColors.error),
                                                label: const Text('Remove', style: TextStyle(fontSize: 11, color: AppColors.error)),
                                                style: OutlinedButton.styleFrom(
                                                  foregroundColor: AppColors.error,
                                                  side: const BorderSide(color: AppColors.error),
                                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          );
                        }),

                        // "+ Add More Cab" Button
                        OutlinedButton.icon(
                          onPressed: _openAddCabSheet,
                          icon: const Icon(Icons.add_circle_outline, size: 18),
                          label: const Text('+ Add More Cab to Booking',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppColors.primary,
                            side: BorderSide(color: AppColors.primary.withValues(alpha: 0.6), style: BorderStyle.solid),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                          ),
                        ),
                        const SizedBox(height: 20),
                      ],
                    ),
            ),

            // Bottom Sticky Panel (Promo code, Wallet, Summary, Deploy)
            if (draft.cabs.isNotEmpty)
              Container(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.08),
                      blurRadius: 10,
                      offset: const Offset(0, -3),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Promo code row
                    Row(
                      children: [
                        Expanded(
                          child: SizedBox(
                            height: 40,
                            child: TextField(
                              controller: _couponController,
                              textCapitalization: TextCapitalization.characters,
                              decoration: InputDecoration(
                                hintText: 'Enter promo code (e.g. ADHOC100)',
                                hintStyle: const TextStyle(fontSize: 12),
                                isDense: true,
                                prefixIcon: const Icon(Icons.local_offer_outlined, size: 18, color: AppColors.primary),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        SizedBox(
                          height: 40,
                          child: OutlinedButton(
                            onPressed: _isValidatingCoupon
                                ? null
                                : () => _applyCoupon(draft.cartTotalEstimatedFare),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppColors.primary,
                              side: const BorderSide(color: AppColors.primary),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                            ),
                            child: _isValidatingCoupon
                                ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                                : const Text('APPLY', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                          ),
                        ),
                      ],
                    ),

                    if (_couponError != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: Text(_couponError!, style: const TextStyle(fontSize: 11, color: AppColors.error)),
                        ),
                      ),

                    if (_appliedCoupon != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Row(
                          children: [
                            const Icon(Icons.check_circle, size: 14, color: AppColors.success),
                            const SizedBox(width: 4),
                            Text(
                              '${_appliedCoupon!['code']}: ₹${discount.toStringAsFixed(0)} discount applied!',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.success),
                            ),
                          ],
                        ),
                      ),

                    const SizedBox(height: 10),

                    // Wallet Balance
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: isInsufficient
                            ? AppColors.error.withValues(alpha: 0.08)
                            : (isDark ? AppColors.bgDark : AppColors.slate100),
                        borderRadius: BorderRadius.circular(AppRadius.md),
                        border: Border.all(
                          color: isInsufficient
                              ? AppColors.error.withValues(alpha: 0.3)
                              : Colors.transparent,
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Row(
                              children: [
                                Icon(
                                  Icons.account_balance_wallet_outlined,
                                  size: 16,
                                  color: isInsufficient ? AppColors.error : AppColors.primary,
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    _isLoadingWallet
                                        ? 'Checking Wallet...'
                                        : 'Wallet: ₹${(_walletBalance ?? 0.0).toStringAsFixed(0)} Available',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: isInsufficient ? AppColors.error : null,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          InkWell(
                            onTap: _showTopUpBottomSheet,
                            child: const Text('+ Top Up', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary)),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 10),

                    // Summary & Deploy Button Row
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${draft.cabs.length} Cabs Selected',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                ),
                              ),
                              Text(
                                '₹${netTotal.toStringAsFixed(0)}',
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Expanded(
                          flex: 2,
                          child: AppPrimaryButton(
                            text: 'Review & Deploy (${draft.cabs.length})',
                            isLoading: _isDeploying,
                            onPressed: _handleDeployAllCabs,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildMiniChip(IconData icon, String text, bool isDark, {Color? chipColor}) {
    final color = chipColor ?? AppColors.primary;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: color),
          const SizedBox(width: 3),
          Flexible(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: color,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
