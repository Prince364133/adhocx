import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../routes/app_routes.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';
import 'requirement_draft_provider.dart';

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

  @override
  void dispose() {
    _couponController.dispose();
    super.dispose();
  }

  String _normalizeVehicleType(String type) {
    switch (type.trim().toUpperCase()) {
      case 'SEDAN':
        return 'SEDAN';
      case 'SUV':
        return 'SUV';
      case 'HATCHBACK':
        return 'HATCHBACK';
      case 'TEMPO TRAVELLER':
      case 'TEMPO_TRAVELLER':
        return 'TEMPO_TRAVELLER';
      case 'TATA ACE':
      case 'TATA_ACE':
        return 'TATA_ACE';
      case 'PICKUP TRUCK':
      case 'PICKUP_TRUCK':
        return 'PICKUP_TRUCK';
      case 'BUS':
        return 'BUS';
      default:
        return 'SEDAN';
    }
  }

  Future<void> _handleConfirmAndPost(BuildContext context) async {
    final draft = context.read<RequirementDraftProvider>();

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
    if (draft.passengers > 1) {
      notesParts.add('Passengers per vehicle: ${draft.passengers}');
    }
    if (draft.selectedLuggage != null && draft.selectedLuggage!.isNotEmpty) {
      notesParts.add('Luggage: ${draft.selectedLuggage}');
    }
    if (draft.additionalInfo.isNotEmpty) {
      notesParts.add('Additional Info: ${draft.additionalInfo}');
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
        ratePerVehicle: draft.fulfillmentMode == 'DIRECT_DISPATCH' ? 850.0 : null,
        suggestedBudget: draft.fulfillmentMode == 'BIDDING' ? draft.suggestedBudget : null,
        notes: combinedNotes.isNotEmpty ? combinedNotes : 'Standard Booking Requirement',
        couponCode: couponCode,
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
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to post requirement: ${e.toString().replaceAll("Exception: ", "")}'),
            backgroundColor: AppColors.error,
          ),
        );
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
                children: List.generate(5, (index) {
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
                    Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(AppRadius.lg),
                        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                      ),
                      child: Column(
                        children: [
                          _buildReviewRow(context, Icons.bolt, 'Fulfillment Model', draft.fulfillmentMode == 'DIRECT_DISPATCH' ? '⚡ Direct Timed Dispatch' : '🔨 Outstation Reverse Auction', isDark),
                          const Divider(),
                          if (draft.fulfillmentMode == 'BIDDING') ...[
                            _buildReviewRow(context, Icons.currency_rupee, 'Target Guide Budget', '₹${draft.suggestedBudget.toStringAsFixed(0)}', isDark, valueColor: AppColors.success),
                            const Divider(),
                            _buildReviewRow(context, Icons.timer_outlined, 'Bidding Window', '${draft.biddingWindowMinutes} Minutes', isDark),
                            const Divider(),
                          ] else ...[
                            _buildReviewRow(context, Icons.currency_rupee, 'Rate per Vehicle', '₹850', isDark),
                            const Divider(),
                            _buildReviewRow(context, Icons.payments_outlined, 'Est. Total Cost', '₹${(draft.quantity * 850).toStringAsFixed(0)}', isDark, valueColor: _appliedCoupon != null ? AppColors.textMutedLight : AppColors.success),
                            const Divider(),
                            if (_appliedCoupon != null) ...[
                              _buildReviewRow(context, Icons.local_offer_outlined, 'Promo Discount (${_appliedCoupon!["code"]})', '- ₹${((_appliedCoupon!["discountAmount"] as num?)?.toDouble() ?? 0).toStringAsFixed(0)}', isDark, valueColor: AppColors.success),
                              const Divider(),
                              _buildReviewRow(context, Icons.account_balance_wallet_outlined, 'Net Est. Amount', '₹${((_appliedCoupon!["finalAmount"] as num?)?.toDouble() ?? (draft.quantity * 850)).toStringAsFixed(0)}', isDark, valueColor: AppColors.primary),
                              const Divider(),
                            ],
                          ],
                          _buildReviewRow(context, Icons.directions_car_outlined, 'Vehicle Type', draft.vehicleType, isDark),
                          const Divider(),
                          _buildReviewRow(context, Icons.format_list_numbered, 'Quantity', '${draft.quantity} ${draft.quantity > 1 ? "Vehicles" : "Vehicle"}', isDark),
                          const Divider(),
                          _buildReviewRow(context, Icons.swap_calls, 'Trip Type', draft.tripType, isDark),
                          const Divider(),
                          _buildReviewRow(context, Icons.location_on_outlined, 'Pickup', draft.pickupLocation, isDark),
                          if (draft.pickupInstructions.isNotEmpty) ...[
                            const Divider(),
                            _buildReviewRow(context, Icons.info_outline, 'Pickup Note', draft.pickupInstructions, isDark),
                          ],
                          const Divider(),
                          _buildReviewRow(context, Icons.pin_drop_outlined, 'Destination', draft.dropLocation, isDark),
                          if (draft.dropInstructions.isNotEmpty) ...[
                            const Divider(),
                            _buildReviewRow(context, Icons.info_outline, 'Drop Note', draft.dropInstructions, isDark),
                          ],
                          if (draft.additionalStops.isNotEmpty) ...[
                            const Divider(),
                            _buildReviewRow(context, Icons.alt_route, 'Intermediate Stops', draft.additionalStops.join(', '), isDark),
                          ],
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
                          const Divider(),
                          _buildReviewRow(context, Icons.luggage_outlined, 'Luggage', draft.selectedLuggage ?? 'Not Specified', isDark),
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
                                          final baseCost = (draft.quantity * 850).toDouble();

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
                            text: draft.fulfillmentMode == 'BIDDING' ? '🚀 Launch Reverse Auction' : '⚡ Deploy Fleet Dispatch',
                            isLoading: _isSubmitting,
                            onPressed: () => _handleConfirmAndPost(context),
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
