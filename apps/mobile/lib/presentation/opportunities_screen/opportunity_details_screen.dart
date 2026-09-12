import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../services/driver_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_primary_button.dart';

/// Screen 2: Opportunity Details matching exact design mockup.
class OpportunityDetailsScreen extends StatefulWidget {
  final Map<String, dynamic>? offer;
  const OpportunityDetailsScreen({super.key, this.offer});

  @override
  State<OpportunityDetailsScreen> createState() => _OpportunityDetailsScreenState();
}

class _OpportunityDetailsScreenState extends State<OpportunityDetailsScreen> {
  Map<String, dynamic>? _offer;
  bool _isLoading = true;
  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
    if (widget.offer != null) {
      _offer = widget.offer;
      _isLoading = false;
    } else {
      _loadOffer();
    }
  }

  Future<void> _loadOffer() async {
    setState(() => _isLoading = true);
    try {
      final list = await DriverService.instance.getOffers();
      if (list.isNotEmpty && mounted) {
        setState(() => _offer = list.first as Map<String, dynamic>);
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _handleInterest() async {
    setState(() => _isProcessing = true);
    await Future.delayed(const Duration(milliseconds: 400));

    if (mounted) {
      setState(() => _isProcessing = false);
      Fluttertoast.showToast(
        msg: 'Receiving time-sensitive offer...',
        backgroundColor: AppColors.primary,
      );

      // Navigate to Time-Sensitive Offer screen
      context.push(AppRoutes.opportunityOfferScreen, extra: _offer);
    }
  }

  @override
  Widget build(BuildContext context) {
    final offer = _offer ?? {};
    final vehicleType = offer['vehicleType'] ?? 'Sedan';
    final pickup = offer['pickupLocation'] as Map<String, dynamic>?;
    final drop = offer['dropLocation'] as Map<String, dynamic>?;
    final pickupAddr = pickup?['address'] ?? 'DLF Cyber City, Gurugram';
    final dropAddr = drop?['address'] ?? 'Indira Gandhi International Airport, Delhi';
    final payout = offer['payoutAmount'] ?? offer['fare'] ?? 450;
    final requirement = offer['requirement'] as Map<String, dynamic>?;
    final reqCode = requirement?['requirementCode'] ?? offer['id'] ?? 'REQ-LIVE';

    return Scaffold(
      backgroundColor: AppColors.bgLight,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Column(
              children: [
                // ── App Header ───────────────────────────────────────────────
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.lg,
                    vertical: AppSpacing.md,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceLight,
                    border: Border(
                      bottom: BorderSide(color: AppColors.borderLight),
                    ),
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () {
                          if (context.canPop()) {
                            context.pop();
                          } else {
                            context.go(AppRoutes.opportunitiesScreen);
                          }
                        },
                        icon: Icon(
                          Icons.arrow_back,
                          color: AppColors.textPrimaryLight,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Opportunity Details',
                          style: AppTypography.h3(
                            color: AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      IconButton(
                        onPressed: () {
                          Fluttertoast.showToast(msg: 'Opportunity link copied');
                        },
                        icon: Icon(
                          Icons.share_outlined,
                          color: AppColors.textPrimaryLight,
                        ),
                      ),
                    ],
                  ),
                ),

                // ── Scrollable Body ──────────────────────────────────────────
                Expanded(
                  child: _isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : ListView(
                          padding: const EdgeInsets.all(AppSpacing.lg),
                          children: [
                            // ── Header Title & Badge Row ───────────────────────────
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(AppRadius.md),
                                  ),
                                  child: Icon(
                                    Icons.directions_car_rounded,
                                    color: AppColors.primary,
                                    size: 24,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '$vehicleType Trip Opportunity',
                                        style: AppTypography.h2(
                                          color: AppColors.textPrimaryLight,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      Text(
                                        reqCode.toString(),
                                        style: AppTypography.caption(
                                          color: AppColors.textMutedLight,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(AppRadius.full),
                                  ),
                                  child: Text(
                                    vehicleType,
                                    style: AppTypography.caption(
                                      color: AppColors.primary,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: AppSpacing.lg),

                            // ── Interactive Map Preview Container ──────────────────
                            Container(
                              height: 180,
                              decoration: BoxDecoration(
                                color: AppColors.surfaceLight,
                                borderRadius: BorderRadius.circular(AppRadius.lg),
                                border: Border.all(color: AppColors.borderLight),
                              ),
                              child: Stack(
                                children: [
                                  Center(
                                    child: Icon(
                                      Icons.map_outlined,
                                      size: 80,
                                      color: AppColors.primary.withValues(alpha: 0.3),
                                    ),
                                  ),
                                  Positioned(
                                    bottom: 12,
                                    right: 12,
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 10,
                                        vertical: 4,
                                      ),
                                      decoration: BoxDecoration(
                                        color: AppColors.surfaceLight,
                                        borderRadius: BorderRadius.circular(AppRadius.full),
                                        border: Border.all(color: AppColors.borderLight),
                                      ),
                                      child: Text(
                                        'Verified Route',
                                        style: AppTypography.caption(
                                          color: AppColors.textPrimaryLight,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: AppSpacing.lg),

                            // ── Pickup & Drop Breakdown ────────────────────────────
                            Container(
                              padding: const EdgeInsets.all(AppSpacing.lg),
                              decoration: BoxDecoration(
                                color: AppColors.surfaceLight,
                                borderRadius: BorderRadius.circular(AppRadius.lg),
                                border: Border.all(color: AppColors.borderLight),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Icon(Icons.circle, size: 10, color: AppColors.accentGreenDark),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              'Pickup',
                                              style: AppTypography.body(
                                                color: AppColors.textPrimaryLight,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              pickupAddr,
                                              style: AppTypography.caption(color: AppColors.textSecondaryLight),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: AppSpacing.md),
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Icon(Icons.circle, size: 10, color: AppColors.error),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              'Destination',
                                              style: AppTypography.body(
                                                color: AppColors.textPrimaryLight,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              dropAddr,
                                              style: AppTypography.caption(color: AppColors.textSecondaryLight),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: AppSpacing.lg),

                            // ── Fare & Payout Card ─────────────────────────────────
                            Container(
                              padding: const EdgeInsets.all(AppSpacing.lg),
                              decoration: BoxDecoration(
                                color: AppColors.surfaceLight,
                                borderRadius: BorderRadius.circular(AppRadius.lg),
                                border: Border.all(color: AppColors.borderLight),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text('Estimated Driver Earnings', style: AppTypography.caption(color: AppColors.textMutedLight)),
                                      const SizedBox(height: 4),
                                      Text('₹ $payout.00', style: AppTypography.h1(color: AppColors.primary, fontWeight: FontWeight.bold)),
                                    ],
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: AppColors.success.withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(AppRadius.sm),
                                    ),
                                    child: const Text(
                                      'Guaranteed Payout',
                                      style: TextStyle(color: AppColors.success, fontWeight: FontWeight.bold, fontSize: 11),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: AppSpacing.xl),

                            AppPrimaryButton(
                              text: _isProcessing ? 'Processing Offer...' : 'Review & Accept Offer (₹ $payout)',
                              onPressed: _isProcessing ? null : _handleInterest,
                            ),
                          ],
                        ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
