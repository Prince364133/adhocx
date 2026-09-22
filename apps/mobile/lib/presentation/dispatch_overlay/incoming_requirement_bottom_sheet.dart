import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../services/driver_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../utils/dispatch_sound_player.dart';

/// Production-grade Incoming Requirement / Trip Offer Global Modal Bottom Sheet.
/// Features a live 30-second countdown timer, route details, fare metrics,
/// haptic pulses, and debounced Accept/Decline actions.
class IncomingRequirementBottomSheet extends StatefulWidget {
  final Map<String, dynamic> offerData;
  final VoidCallback? onDismissed;

  const IncomingRequirementBottomSheet({
    super.key,
    required this.offerData,
    this.onDismissed,
  });

  /// Static helper to display the sheet over any active screen using the root navigator.
  static Future<T?> show<T>({
    required BuildContext context,
    required Map<String, dynamic> offerData,
    VoidCallback? onDismissed,
  }) {
    return showModalBottomSheet<T>(
      context: context,
      isDismissible: false,
      enableDrag: false,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => IncomingRequirementBottomSheet(
        offerData: offerData,
        onDismissed: onDismissed,
      ),
    );
  }

  @override
  State<IncomingRequirementBottomSheet> createState() => _IncomingRequirementBottomSheetState();
}

class _IncomingRequirementBottomSheetState extends State<IncomingRequirementBottomSheet>
    with SingleTickerProviderStateMixin {
  late int _secondsRemaining;
  final int _totalSeconds = 30;
  Timer? _countdownTimer;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _calculateInitialExpiry();
    _startCountdown();
    DispatchSoundPlayer.playIncomingOfferAlert();
  }

  void _calculateInitialExpiry() {
    final expiresAtStr = widget.offerData['expiresAt'] as String?;
    if (expiresAtStr != null) {
      final expiresAt = DateTime.tryParse(expiresAtStr);
      if (expiresAt != null) {
        final diff = expiresAt.difference(DateTime.now()).inSeconds;
        _secondsRemaining = (diff > 0 && diff <= 60) ? diff : _totalSeconds;
        return;
      }
    }
    final inSec = widget.offerData['expiresInSeconds'] as int?;
    _secondsRemaining = (inSec != null && inSec > 0) ? inSec : _totalSeconds;
  }

  void _startCountdown() {
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_secondsRemaining <= 1) {
        timer.cancel();
        setState(() => _secondsRemaining = 0);
        _handleAutoExpired();
      } else {
        setState(() => _secondsRemaining--);
        if (_secondsRemaining <= 5) {
          HapticFeedback.lightImpact();
        }
      }
    });
  }

  void _handleAutoExpired() {
    Fluttertoast.showToast(
      msg: '⏱️ Offer expired. Searching for new trips...',
      backgroundColor: AppColors.slate700,
    );
    if (mounted && Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
      widget.onDismissed?.call();
    }
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    DispatchSoundPlayer.stopAlert();
    super.dispose();
  }

  Future<void> _handleAccept() async {
    if (_isSubmitting) return;
    setState(() => _isSubmitting = true);
    _countdownTimer?.cancel();
    HapticFeedback.mediumImpact();

    final offerId = (widget.offerData['id'] ?? widget.offerData['offerId']) as String? ?? '';
    if (offerId.isEmpty) {
      Fluttertoast.showToast(msg: 'Invalid offer reference', backgroundColor: AppColors.error);
      setState(() => _isSubmitting = false);
      return;
    }

    try {
      await DriverService.instance.acceptOffer(offerId);
      HapticFeedback.heavyImpact();
      Fluttertoast.showToast(
        msg: '🎉 Trip Accepted! Navigate to pickup.',
        backgroundColor: AppColors.accentGreenDark,
        toastLength: Toast.LENGTH_LONG,
      );

      if (mounted) {
        Navigator.of(context).pop(true);
        widget.onDismissed?.call();
        // Route directly to active trips
        context.push(AppRoutes.tripsScreen);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSubmitting = false);
        final errStr = e.toString().toLowerCase();

        // Edge Case: Expired or already claimed by another driver
        if (errStr.contains('expired') || errStr.contains('fulfilled') || errStr.contains('conflict')) {
          Fluttertoast.showToast(
            msg: '⚠️ This trip was already claimed by another partner or expired.',
            backgroundColor: AppColors.warning,
            toastLength: Toast.LENGTH_LONG,
          );
          Navigator.of(context).pop(false);
          widget.onDismissed?.call();
          return;
        }

        // Edge Case: Subscription required / frozen membership
        if (errStr.contains('subscription') || errStr.contains('frozen')) {
          Fluttertoast.showToast(
            msg: '🔒 Subscription required to accept trips. Redirecting to Wallet...',
            backgroundColor: AppColors.error,
            toastLength: Toast.LENGTH_LONG,
          );
          Navigator.of(context).pop(false);
          widget.onDismissed?.call();
          context.push(AppRoutes.walletScreen);
          return;
        }

        Fluttertoast.showToast(
          msg: 'Accept failed: $e',
          backgroundColor: AppColors.error,
        );
        _startCountdown(); // Resume timer if transient network failure
      }
    }
  }

  Future<void> _handleDecline() async {
    if (_isSubmitting) return;
    setState(() => _isSubmitting = true);
    _countdownTimer?.cancel();
    HapticFeedback.selectionClick();

    final offerId = (widget.offerData['id'] ?? widget.offerData['offerId']) as String? ?? '';
    if (offerId.isNotEmpty) {
      try {
        await DriverService.instance.declineOffer(offerId, reason: 'DRIVER_PASSED');
      } catch (_) {
        // Silently handle decline error to avoid trapping the user
      }
    }

    Fluttertoast.showToast(
      msg: 'Offer passed. Continuing radar scan.',
      backgroundColor: AppColors.slate700,
    );

    if (mounted) {
      Navigator.of(context).pop(false);
      widget.onDismissed?.call();
    }
  }

  Color _getTimerColor() {
    if (_secondsRemaining > 15) return AppColors.accentGreen;
    if (_secondsRemaining > 6) return AppColors.warning;
    return AppColors.error;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final offer = widget.offerData;
    final req = offer['requirement'] as Map<String, dynamic>?;

    // Financial & vehicle specs
    final num rate = (offer['offeredRate'] ??
        offer['suggestedBudget'] ??
        offer['offeredPrice'] ??
        req?['ratePerVehicle'] ??
        req?['budget'] ??
        850) as num;
    final vehicle = (offer['vehicleType'] ?? req?['vehicleType'] ?? 'Sedan').toString();
    final pickup = (offer['pickupLocation']?['address'] ??
        offer['pickup'] ??
        offer['pickupAddress'] ??
        req?['pickupAddress'] ??
        'Pickup Location')
        .toString();
    final drop = (offer['dropLocation']?['address'] ??
        offer['drop'] ??
        offer['dropAddress'] ??
        req?['dropAddress'] ??
        'Dropoff Location')
        .toString();

    final distanceKm = (offer['distanceKm'] ?? req?['distanceKm'] ?? 14.8).toString();
    final progress = _secondsRemaining / _totalSeconds;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.35),
            blurRadius: 30,
            offset: const Offset(0, -6),
          ),
        ],
        border: Border(
          top: BorderSide(
            color: _getTimerColor().withValues(alpha: 0.6),
            width: 3,
          ),
        ),
      ),
      padding: EdgeInsets.only(
        left: AppSpacing.lg,
        right: AppSpacing.lg,
        top: AppSpacing.md,
        bottom: MediaQuery.of(context).viewInsets.bottom + AppSpacing.xl,
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Drag Handle / Top Indicator ──────────────────────────────────
            Center(
              child: Container(
                width: 48,
                height: 5,
                margin: const EdgeInsets.only(bottom: AppSpacing.md),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  borderRadius: BorderRadius.circular(AppRadius.full),
                ),
              ),
            ),

            // ── Urgent Countdown Header & Guaranteed Rate ───────────────────
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Circular Countdown Indicator
                Row(
                  children: [
                    SizedBox(
                      width: 44,
                      height: 44,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          CircularProgressIndicator(
                            value: progress.clamp(0.0, 1.0),
                            strokeWidth: 4.5,
                            backgroundColor: isDark
                                ? AppColors.surfaceElevatedDark
                                : AppColors.borderLight,
                            valueColor: AlwaysStoppedAnimation<Color>(_getTimerColor()),
                          ),
                          Text(
                            '$_secondsRemaining',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w900,
                              color: _getTimerColor(),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'INCOMING DISPATCH',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.1,
                            color: _getTimerColor(),
                          ),
                        ),
                        Text(
                          'Tap accept before timer ends',
                          style: AppTypography.caption(
                            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),

                // Guaranteed Fare Pill
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.accentGreenDark.withValues(alpha: 0.14),
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    border: Border.all(color: AppColors.accentGreenDark.withValues(alpha: 0.4)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '₹ ${rate.toStringAsFixed(0)}',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                          color: isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark,
                          letterSpacing: -0.5,
                        ),
                      ),
                      Text(
                        'Guaranteed Fare',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: isDark ? AppColors.textMutedDark : AppColors.textSecondaryLight,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.lg),

            // ── Trip Details & Route Visualizer ─────────────────────────────
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceElevatedDark : AppColors.bgLight,
                borderRadius: BorderRadius.circular(AppRadius.lg),
                border: Border.all(
                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                ),
              ),
              child: Column(
                children: [
                  // Vehicle Badge & Proximity row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(AppRadius.sm),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.directions_car, size: 14, color: AppColors.primary),
                            const SizedBox(width: 4),
                            Text(
                              vehicle.toUpperCase(),
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Row(
                        children: [
                          Icon(
                            Icons.route,
                            size: 14,
                            color: isDark ? AppColors.textMutedDark : AppColors.textSecondaryLight,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '$distanceKm km total',
                            style: AppTypography.caption(
                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const Divider(height: 18),

                  // Route: Pickup
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Padding(
                        padding: EdgeInsets.only(top: 2),
                        child: Icon(Icons.radio_button_checked, size: 16, color: AppColors.accentGreen),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'PICKUP LOCATION',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.8,
                                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              pickup,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: AppTypography.body(
                                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Route: Dropoff
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Padding(
                        padding: EdgeInsets.only(top: 2),
                        child: Icon(Icons.location_on, size: 16, color: AppColors.error),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'DROPOFF DESTINATION',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.8,
                                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              drop,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: AppTypography.body(
                                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                fontWeight: FontWeight.w600,
                              ),
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

            // ── Primary Accept CTA & Secondary Decline CTA ───────────────────
            Row(
              children: [
                // Decline Button
                Expanded(
                  flex: 1,
                  child: SizedBox(
                    height: 52,
                    child: OutlinedButton(
                      onPressed: _isSubmitting ? null : _handleDecline,
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(
                          color: isDark ? AppColors.borderDark : AppColors.borderLight,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                        ),
                      ),
                      child: Text(
                        'PASS',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.md),

                // Accept Button
                Expanded(
                  flex: 2,
                  child: SizedBox(
                    height: 52,
                    child: ElevatedButton(
                      onPressed: _isSubmitting ? null : _handleAccept,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.accentGreenDark,
                        foregroundColor: Colors.white,
                        elevation: 4,
                        shadowColor: AppColors.accentGreenDark.withValues(alpha: 0.5),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                        ),
                      ),
                      child: _isSubmitting
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.5,
                                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            )
                          : const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.check_circle_outline, size: 20),
                                SizedBox(width: 8),
                                Text(
                                  'ACCEPT TRIP',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ],
                            ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
