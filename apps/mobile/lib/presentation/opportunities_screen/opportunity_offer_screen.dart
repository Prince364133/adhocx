import 'dart:async';
import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Screen 3: Time-Sensitive New Trip Offer matching exact design mockup.
class OpportunityOfferScreen extends StatefulWidget {
  const OpportunityOfferScreen({super.key});

  @override
  State<OpportunityOfferScreen> createState() => _OpportunityOfferScreenState();
}

class _OpportunityOfferScreenState extends State<OpportunityOfferScreen> {
  int _secondsRemaining = 23;
  Timer? _timer;
  bool _isAccepting = false;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_secondsRemaining > 0) {
        setState(() => _secondsRemaining--);
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

  void _declineOffer() {
    _timer?.cancel();
    Fluttertoast.showToast(msg: 'Trip offer declined');
    if (context.canPop()) {
      context.pop();
    } else {
      context.go(AppRoutes.opportunitiesScreen);
    }
  }

  void _acceptOffer() async {
    _timer?.cancel();
    setState(() => _isAccepting = true);
    await Future.delayed(const Duration(milliseconds: 600));

    if (mounted) {
      setState(() => _isAccepting = false);
      Fluttertoast.showToast(
        msg: 'Trip AY10234 accepted! Navigating to Active Trip...',
        backgroundColor: AppColors.accentGreenDark,
      );

      // Navigate to Active Trip details
      context.go(AppRoutes.tripDetailsScreen);
    }
  }

  @override
  Widget build(BuildContext context) {
    final formattedSecs = _secondsRemaining.toString().padLeft(2, '0');

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
                  decoration: const BoxDecoration(
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
                        icon: const Icon(
                          Icons.arrow_back,
                          color: AppColors.textPrimaryLight,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'New Trip Offer',
                          style: AppTypography.h3(
                            color: AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      IconButton(
                        onPressed: () => context.push(AppRoutes.notificationsSettingsScreen),
                        icon: const Icon(
                          Icons.notifications_none_rounded,
                          color: AppColors.textPrimaryLight,
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
                          color: const Color(0xFFfff7ed),
                          borderRadius: BorderRadius.circular(AppRadius.xl),
                          border: Border.all(color: const Color(0xFFffedd5)),
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
                                      color: const Color(0xFFc2410c),
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
                                          color: const Color(0xFFea580c),
                                          fontWeight: FontWeight.bold,
                                        ).copyWith(fontSize: 36),
                                      ),
                                      const SizedBox(width: 10),
                                      Text(
                                        'MIN   SEC',
                                        style: AppTypography.caption(
                                          color: const Color(0xFFea580c),
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
                              decoration: const BoxDecoration(
                                color: Color(0xFFffedd5),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.notifications_active_outlined,
                                color: Color(0xFFea580c),
                                size: 30,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),

                      // ── Offer Details Card ─────────────────────────────────
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
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFea580c).withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(AppRadius.md),
                                  ),
                                  child: const Icon(
                                    Icons.card_travel_outlined,
                                    color: Color(0xFFea580c),
                                    size: 22,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Corporate Transfer',
                                        style: AppTypography.h3(
                                          color: AppColors.textPrimaryLight,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      Text(
                                        'One-way trip',
                                        style: AppTypography.caption(
                                          color: AppColors.textMutedLight,
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
                                    color: const Color(0xFFea580c).withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(AppRadius.xs),
                                  ),
                                  child: Text(
                                    'Sedan',
                                    style: AppTypography.caption(
                                      color: const Color(0xFFea580c),
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
                                          color: AppColors.textPrimaryLight,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      Text(
                                        'DLF Cyber City, Gurugram\nTower A, Gate 2, Phase 3',
                                        style: AppTypography.caption(color: AppColors.textSecondaryLight),
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
                                          color: AppColors.textPrimaryLight,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      Text(
                                        'IGI Airport T3, New Delhi\nDeparture Gate Road',
                                        style: AppTypography.caption(color: AppColors.textSecondaryLight),
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
                                  ),
                                ),
                                const SizedBox(width: AppSpacing.sm),
                                Expanded(
                                  child: _buildMetricTile(
                                    icon: Icons.access_time,
                                    label: 'Duration',
                                    value: '28 min',
                                  ),
                                ),
                                const SizedBox(width: AppSpacing.sm),
                                Expanded(
                                  child: _buildMetricTile(
                                    icon: Icons.account_balance_wallet_outlined,
                                    label: 'Earnings',
                                    value: '₹850',
                                    valueColor: AppColors.accentGreenDark,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: AppSpacing.md),
                            const Divider(height: 1, color: AppColors.borderLight),
                            const SizedBox(height: AppSpacing.md),

                            // Trip Metadata Row
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                _buildMetaColumn('Trip type', 'Corporate Transfer'),
                                _buildMetaColumn('Passenger', '1'),
                                _buildMetaColumn('Vehicle', 'Sedan'),
                              ],
                            ),
                          ],
                        ),
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
                            const Icon(
                              Icons.verified_user_outlined,
                              size: 18,
                              color: AppColors.accentGreenDark,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                'By accepting this offer, you agree to complete the trip as per AdhocX policies.',
                                style: AppTypography.caption(
                                  color: AppColors.textSecondaryLight,
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
                                side: const BorderSide(color: Color(0xFFea580c)),
                                foregroundColor: const Color(0xFFea580c),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(AppRadius.md),
                                ),
                              ),
                              child: Text(
                                'DECLINE',
                                style: AppTypography.body(
                                  color: const Color(0xFFea580c),
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
                                backgroundColor: const Color(0xFFea580c),
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
    Color? valueColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: AppColors.bgLight,
        borderRadius: BorderRadius.circular(AppRadius.sm),
      ),
      child: Column(
        children: [
          Icon(icon, size: 16, color: AppColors.textMutedLight),
          const SizedBox(height: 2),
          Text(
            label,
            style: AppTypography.caption(color: AppColors.textMutedLight).copyWith(fontSize: 10),
          ),
          Text(
            value,
            style: AppTypography.body(
              color: valueColor ?? AppColors.textPrimaryLight,
              fontWeight: FontWeight.bold,
            ).copyWith(fontSize: 13),
          ),
        ],
      ),
    );
  }

  Widget _buildMetaColumn(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppTypography.caption(color: AppColors.textMutedLight).copyWith(fontSize: 10),
        ),
        Text(
          value,
          style: AppTypography.caption(
            color: AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }
}
