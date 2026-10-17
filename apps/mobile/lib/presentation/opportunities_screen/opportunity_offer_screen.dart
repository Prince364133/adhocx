import 'dart:async';
import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../services/driver_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Screen 3: Time-Sensitive New Trip Offer matching exact design mockup.
class OpportunityOfferScreen extends StatefulWidget {
  final Map<String, dynamic>? offer;
  const OpportunityOfferScreen({super.key, this.offer});

  @override
  State<OpportunityOfferScreen> createState() => _OpportunityOfferScreenState();
}

class _OpportunityOfferScreenState extends State<OpportunityOfferScreen> {
  int _secondsRemaining = 25;
  Timer? _timer;
  bool _isAccepting = false;
  Map<String, dynamic>? _activeOffer;

  @override
  void initState() {
    super.initState();
    _activeOffer = widget.offer;
    if (_activeOffer == null) {
      _loadFirstOffer();
    }
    _startTimer();
  }

  Future<void> _loadFirstOffer() async {
    try {
      final list = await DriverService.instance.getOffers();
      if (list.isNotEmpty && mounted) {
        setState(() => _activeOffer = list.first as Map<String, dynamic>);
      }
    } catch (_) {}
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_secondsRemaining > 0) {
        if (mounted) setState(() => _secondsRemaining--);
      } else {
        _timer?.cancel();
        if (mounted) {
          Fluttertoast.showToast(
            msg: 'Trip offer expired',
            backgroundColor: AppColors.error,
          );
          if (context.canPop()) context.pop();
        }
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _declineOffer() async {
    _timer?.cancel();
    final offerId = _activeOffer?['id'] as String?;
    if (offerId != null) {
      try {
        await DriverService.instance.declineOffer(offerId);
      } catch (_) {}
    }
    Fluttertoast.showToast(msg: 'Trip offer declined');
    if (mounted) {
      if (context.canPop()) {
        context.pop();
      } else {
        context.go(AppRoutes.opportunitiesScreen);
      }
    }
  }

  void _acceptOffer() async {
    _timer?.cancel();
    setState(() => _isAccepting = true);

    final offerId = _activeOffer?['id'] as String?;
    if (offerId != null) {
      try {
        await DriverService.instance.acceptOffer(offerId);
        if (mounted) {
          setState(() => _isAccepting = false);
          Fluttertoast.showToast(
            msg: 'Trip accepted! Navigating to Active Trips...',
            backgroundColor: AppColors.accentGreenDark,
          );
          context.go(AppRoutes.tripsScreen);
        }
        return;
      } catch (err) {
        if (mounted) {
          setState(() => _isAccepting = false);
          Fluttertoast.showToast(
            msg: 'Accept failed: ${err.toString().replaceAll("Exception: ", "")}',
            backgroundColor: AppColors.error,
          );
        }
        return;
      }
    }

    if (mounted) {
      setState(() => _isAccepting = false);
      context.go(AppRoutes.tripsScreen);
    }
  }

  @override
  Widget build(BuildContext context) {
    final formattedSecs = _secondsRemaining.toString().padLeft(2, '0');
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
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
                    color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                    border: Border(
                      bottom: BorderSide(
                        color: isDark ? AppColors.borderDark : AppColors.borderLight,
                      ),
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
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'New Trip Offer',
                          style: AppTypography.h3(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      IconButton(
                        onPressed: () => context.push(AppRoutes.notificationsFeedScreen),
                        icon: Icon(
                          Icons.notifications_none_rounded,
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        ),
                      ),
                    ],
                  ),
                ),

                // ── Scrollable Body ──────────────────────────────────────────
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    children: [
                      // ── Countdown Timer Banner Box ────────────────────────
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.xl),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.warning.withValues(alpha: 0.15) : AppColors.warningContainer,
                          borderRadius: BorderRadius.circular(AppRadius.xl),
                          border: Border.all(
                            color: isDark ? AppColors.warning.withValues(alpha: 0.3) : AppColors.warningContainer,
                          ),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Offer expires in',
                                    style: AppTypography.caption(
                                      color: isDark ? AppColors.warning : AppColors.warningText,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.baseline,
                                    textBaseline: TextBaseline.alphabetic,
                                    children: [
                                      Text(
                                        '00 : $formattedSecs',
                                        style: AppTypography.h1(
                                          color: AppColors.warning,
                                          fontWeight: FontWeight.bold,
                                        ).copyWith(fontSize: 36),
                                      ),
                                      const SizedBox(width: 10),
                                      Text(
                                        'MIN   SEC',
                                        style: AppTypography.caption(
                                          color: AppColors.warning,
                                          fontWeight: FontWeight.bold,
                                        ).copyWith(fontSize: 10),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              width: 56,
                              height: 56,
                              decoration: BoxDecoration(
                                color: isDark ? AppColors.warning.withValues(alpha: 0.2) : AppColors.warningContainer,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.notifications_active_outlined,
                                color: AppColors.warning,
                                size: 30,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),

                      // ── Offer Details Card ─────────────────────────────────
                      Builder(
                        builder: (context) {
                          final req = _activeOffer?['requirement'] as Map<String, dynamic>?;
                          final title = req?['title'] as String? ?? 'Trip Requirement';
                          final vehicle = req?['vehicleType'] as String? ?? 'Sedan';
                          final pickup = req?['pickupAddress'] as String? ?? _activeOffer?['pickup'] as String? ?? 'Pickup address';
                          final drop = req?['dropAddress'] as String? ?? _activeOffer?['drop'] as String? ?? 'Drop address';
                          final rawEarn = _activeOffer?['offeredPrice'] ??
                              _activeOffer?['offeredRate'] ??
                              _activeOffer?['suggestedBudget'] ??
                              _activeOffer?['driverRate'] ??
                              req?['ratePerVehicle'] ??
                              req?['budgetPerVehicle'];
                          final num parsedEarn = rawEarn != null
                              ? ((rawEarn is num) ? rawEarn : (num.tryParse(rawEarn.toString()) ?? 0))
                              : 0;
                          final earnings = parsedEarn > 0 ? '₹ ${parsedEarn.toStringAsFixed(0)}' : '₹ --';

                          return Container(
                            padding: const EdgeInsets.all(AppSpacing.lg),
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                              borderRadius: BorderRadius.circular(AppRadius.lg),
                              border: Border.all(
                                color: isDark ? AppColors.borderDark : AppColors.borderLight,
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: AppColors.warning.withValues(alpha: 0.1),
                                        borderRadius: BorderRadius.circular(AppRadius.md),
                                      ),
                                      child: const Icon(
                                        Icons.card_travel_outlined,
                                        color: AppColors.warning,
                                        size: 22,
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            title,
                                            style: AppTypography.h3(
                                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          Text(
                                            'AdhocX Direct Dispatch',
                                            style: AppTypography.caption(
                                              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                        vertical: 2,
                                      ),
                                      decoration: BoxDecoration(
                                        color: AppColors.warning.withValues(alpha: 0.1),
                                        borderRadius: BorderRadius.circular(AppRadius.xs),
                                      ),
                                      child: Text(
                                        vehicle,
                                        style: AppTypography.caption(
                                          color: AppColors.warning,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: AppSpacing.lg),

                                // Pickup
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Icon(Icons.circle, size: 8, color: AppColors.accentGreenDark),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'Pickup',
                                            style: AppTypography.body(
                                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          Text(
                                            pickup,
                                            style: AppTypography.caption(
                                              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: AppSpacing.md),

                                // Drop
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Icon(Icons.circle, size: 8, color: AppColors.error),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'Drop',
                                            style: AppTypography.body(
                                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          Text(
                                            drop,
                                            style: AppTypography.caption(
                                              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: AppSpacing.lg),

                                // Metrics Specs Row
                                Row(
                                  children: [
                                    Expanded(
                                      child: _buildMetricTile(
                                        icon: Icons.navigation_outlined,
                                        label: 'Distance',
                                        value: '12.4 km',
                                        isDark: isDark,
                                      ),
                                    ),
                                    const SizedBox(width: AppSpacing.sm),
                                    Expanded(
                                      child: _buildMetricTile(
                                        icon: Icons.access_time,
                                        label: 'Duration',
                                        value: '28 min',
                                        isDark: isDark,
                                      ),
                                    ),
                                    const SizedBox(width: AppSpacing.sm),
                                    Expanded(
                                      child: _buildMetricTile(
                                        icon: Icons.account_balance_wallet_outlined,
                                        label: 'Earnings',
                                        value: earnings,
                                        valueColor: isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark,
                                        isDark: isDark,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: AppSpacing.md),
                                Divider(
                                  height: 1,
                                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                                ),
                                const SizedBox(height: AppSpacing.md),

                                // Trip Metadata Row
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    _buildMetaColumn('Dispatch Mode', 'Direct Dispatch', isDark),
                                    _buildMetaColumn('Quantity', '1 Vehicle', isDark),
                                    _buildMetaColumn('Vehicle', vehicle, isDark),
                                  ],
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                      const SizedBox(height: AppSpacing.lg),

                      // ── Policy Agreement Banner ────────────────────────────
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: BoxDecoration(
                          color: AppColors.accentGreenDark.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(
                            color: AppColors.accentGreenDark.withValues(alpha: 0.2),
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.verified_user_outlined,
                              size: 18,
                              color: isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                'By accepting this offer, you agree to complete the trip as per AdhocX policies.',
                                style: AppTypography.caption(
                                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                ).copyWith(fontSize: 11),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),

                      // ── Bottom Action Buttons ──────────────────────────────
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: _declineOffer,
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                side: const BorderSide(color: AppColors.warning),
                                foregroundColor: AppColors.warning,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(AppRadius.md),
                                ),
                              ),
                              child: Text(
                                'DECLINE',
                                style: AppTypography.body(
                                  color: AppColors.warning,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: AppSpacing.md),
                          Expanded(
                            child: ElevatedButton(
                              onPressed: _acceptOffer,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.warning,
                                elevation: 0,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(AppRadius.md),
                                ),
                              ),
                              child: _isAccepting
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        color: Colors.white,
                                        strokeWidth: 2,
                                      ),
                                    )
                                  : Text(
                                      'ACCEPT',
                                      style: AppTypography.body(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
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
        ),
      ),
    );
  }

  Widget _buildMetricTile({
    required IconData icon,
    required String label,
    required String value,
    required bool isDark,
    Color? valueColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceElevatedDark : AppColors.bgLight,
        borderRadius: BorderRadius.circular(AppRadius.sm),
      ),
      child: Column(
        children: [
          Icon(
            icon,
            size: 16,
            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: AppTypography.caption(
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            ).copyWith(fontSize: 10),
          ),
          Text(
            value,
            style: AppTypography.body(
              color: valueColor ?? (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
              fontWeight: FontWeight.bold,
            ).copyWith(fontSize: 13),
          ),
        ],
      ),
    );
  }

  Widget _buildMetaColumn(String label, String value, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppTypography.caption(
            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
          ).copyWith(fontSize: 10),
        ),
        Text(
          value,
          style: AppTypography.caption(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }
}
