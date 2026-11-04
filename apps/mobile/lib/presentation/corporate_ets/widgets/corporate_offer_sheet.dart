import 'dart:async';

import 'package:flutter/material.dart';

import '../../../shared/widgets/app_primary_button.dart';
import '../../../shared/widgets/app_secondary_button.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_radius.dart';
import '../../../theme/app_spacing.dart';
import '../../../theme/app_typography.dart';
import '../../../utils/dispatch_sound_player.dart';
import '../data/corporate_models.dart';
import '../logic/corporate_ets_coordinator.dart';
import '../logic/corporate_timers.dart';
import 'corporate_state_views.dart';

enum _SheetPhase { open, accepting, rejecting, accepted, rejected, expired, unavailable }

/// Corporate route offer popup (UI-04-01, DRV-06/07).
///
/// The countdown runs off the server expiry. "Accepted" is shown only after the accept call
/// returns 2xx; a 409 / expired response closes the offer with the server's reason.
class CorporateOfferSheet extends StatefulWidget {
  const CorporateOfferSheet({
    super.key,
    required this.offer,
    required this.coordinator,
    this.onViewDuties,
  });

  final CorporateOffer offer;
  final CorporateEtsCoordinator coordinator;

  /// Invoked from the confirmation state ("View duty").
  final VoidCallback? onViewDuties;

  /// Presents the popup above the whole app (non-dismissible: decide, or let it expire).
  static Future<void> show(
    BuildContext context, {
    required CorporateOffer offer,
    required CorporateEtsCoordinator coordinator,
    VoidCallback? onViewDuties,
    bool playAlert = true,
  }) async {
    coordinator.offerSheetOpened(offer.routeId);
    if (playAlert) unawaited(DispatchSoundPlayer.playIncomingOfferAlert());
    try {
      await showModalBottomSheet<void>(
        context: context,
        useRootNavigator: true,
        isScrollControlled: true,
        isDismissible: false,
        enableDrag: false,
        backgroundColor: Colors.transparent,
        builder: (_) => CorporateOfferSheet(
          offer: offer,
          coordinator: coordinator,
          onViewDuties: onViewDuties,
        ),
      );
    } finally {
      if (playAlert) unawaited(DispatchSoundPlayer.stopAlert());
      coordinator.offerSheetClosed(offer.routeId);
    }
  }

  @override
  State<CorporateOfferSheet> createState() => _CorporateOfferSheetState();
}

class _CorporateOfferSheetState extends State<CorporateOfferSheet> {
  late CorporateOffer _offer = widget.offer;
  late OfferCountdown _countdown = OfferCountdown(_offer.deadline);
  Timer? _ticker;
  _SheetPhase _phase = _SheetPhase.open;
  String? _message;
  bool _messageIsError = false;

  @override
  void initState() {
    super.initState();
    widget.coordinator.addListener(_onCoordinatorChanged);
    _ticker = Timer.periodic(const Duration(milliseconds: 250), (_) => _tick());
    _tick();
  }

  @override
  void dispose() {
    _ticker?.cancel();
    widget.coordinator.removeListener(_onCoordinatorChanged);
    super.dispose();
  }

  DateTime get _now => widget.coordinator.now();

  void _tick() {
    if (!mounted) return;
    if (_phase == _SheetPhase.open && _countdown.isExpired(_now)) {
      setState(() {
        _phase = _SheetPhase.expired;
        _message = 'The 60-second window has closed. The route is being offered to another driver.';
        _messageIsError = true;
      });
      _ticker?.cancel();
      // Re-sync with the server (it may already show a newer offer).
      unawaited(widget.coordinator.restorePendingOffer().then((_) {}, onError: (_) {}));
      return;
    }
    if (_phase == _SheetPhase.open) setState(() {});
  }

  void _onCoordinatorChanged() {
    if (!mounted || _phase != _SheetPhase.open) return;
    final live = widget.coordinator.pendingOffer;
    if (live == null || live.routeId != _offer.routeId) {
      // Withdrawn by ops / re-plan, or replaced: never leave a dead offer actionable.
      if (_countdown.isExpired(_now)) return; // the ticker reports expiry
      setState(() {
        _phase = _SheetPhase.unavailable;
        _message = 'This offer was withdrawn and is no longer available.';
        _messageIsError = true;
      });
      _ticker?.cancel();
    } else if (live.deadline != _offer.deadline) {
      setState(() {
        _offer = live;
        _countdown = OfferCountdown(live.deadline);
      });
    }
  }

  Future<void> _accept() async {
    setState(() {
      _phase = _SheetPhase.accepting;
      _message = null;
    });
    final res = await widget.coordinator.acceptOffer(_offer);
    if (!mounted) return;
    setState(() {
      switch (res.outcome) {
        case OfferActionOutcome.confirmed:
          _phase = _SheetPhase.accepted;
          _ticker?.cancel();
          _message = res.message;
          _messageIsError = false;
          unawaited(DispatchSoundPlayer.stopAlert());
          break;
        case OfferActionOutcome.unavailable:
          _phase = _SheetPhase.unavailable;
          _ticker?.cancel();
          _message = res.message;
          _messageIsError = true;
          break;
        case OfferActionOutcome.retry:
        case OfferActionOutcome.failed:
          _phase = _countdown.isExpired(_now) ? _SheetPhase.expired : _SheetPhase.open;
          _offer = widget.coordinator.pendingOffer?.routeId == _offer.routeId
              ? widget.coordinator.pendingOffer!
              : _offer;
          _countdown = OfferCountdown(_offer.deadline);
          _message = res.message;
          _messageIsError = true;
          break;
      }
    });
  }

  Future<void> _reject() async {
    final reason = await _askRejectReason();
    if (reason == null || !mounted) return;
    setState(() {
      _phase = _SheetPhase.rejecting;
      _message = null;
    });
    final res = await widget.coordinator.rejectOffer(_offer, reason: reason.isEmpty ? null : reason);
    if (!mounted) return;
    setState(() {
      switch (res.outcome) {
        case OfferActionOutcome.confirmed:
          _phase = _SheetPhase.rejected;
          _ticker?.cancel();
          _message = res.message;
          _messageIsError = false;
          break;
        case OfferActionOutcome.unavailable:
          _phase = _SheetPhase.unavailable;
          _ticker?.cancel();
          _message = res.message;
          _messageIsError = true;
          break;
        case OfferActionOutcome.retry:
        case OfferActionOutcome.failed:
          _phase = _countdown.isExpired(_now) ? _SheetPhase.expired : _SheetPhase.open;
          _message = res.message;
          _messageIsError = true;
          break;
      }
    });
    if (res.outcome == OfferActionOutcome.confirmed) {
      unawaited(DispatchSoundPlayer.stopAlert());
      if (mounted) Navigator.of(context).maybePop();
    }
  }

  Future<String?> _askRejectReason() {
    const reasons = ['Too far from pickup', 'Vehicle not available', 'Already on another duty', 'Other'];
    return showDialog<String>(
      context: context,
      builder: (ctx) => SimpleDialog(
        title: const Text('Decline this route?'),
        children: [
          for (final r in reasons)
            SimpleDialogOption(
              onPressed: () => Navigator.of(ctx).pop(r),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
                child: Text(r),
              ),
            ),
          SimpleDialogOption(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text('Keep offer', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final seconds = _countdown.remainingSeconds(_now);
    final busy = _phase == _SheetPhase.accepting || _phase == _SheetPhase.rejecting;
    final closed = _phase == _SheetPhase.accepted ||
        _phase == _SheetPhase.rejected ||
        _phase == _SheetPhase.expired ||
        _phase == _SheetPhase.unavailable;
    final o = _offer;

    return Container(
      decoration: BoxDecoration(
        color: CorporateSurface.card(context),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
      ),
      padding: const EdgeInsets.all(AppSpacing.xl),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  const Icon(Icons.corporate_fare_rounded, color: AppColors.primary),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      'New corporate route${o.direction != null ? ' • ${o.direction}' : ''}',
                      style: AppTypography.h4(color: CorporateSurface.text(context), fontWeight: FontWeight.bold),
                    ),
                  ),
                  if (!closed) _CountdownPill(seconds: seconds, fraction: _countdown.fractionLeft(_now)),
                ],
              ),
              if (o.tenantName != null) ...[
                const SizedBox(height: AppSpacing.xs),
                Text(o.tenantName!, style: AppTypography.small(color: CorporateSurface.muted(context))),
              ],
              const SizedBox(height: AppSpacing.lg),
              _InfoRow(
                icon: Icons.schedule_rounded,
                label: o.isLogout ? 'Report at office by' : 'First pickup',
                value: o.targetPickup1Time != null
                    ? formatClock(o.targetPickup1Time)
                    : (o.shiftTime ?? '--'),
              ),
              _InfoRow(icon: Icons.place_outlined, label: 'Pickup area', value: o.originAddress ?? '--'),
              if (o.destinationAddress != null)
                _InfoRow(icon: Icons.flag_outlined, label: 'Destination', value: o.destinationAddress!),
              _InfoRow(
                icon: Icons.alt_route_rounded,
                label: 'Stops • Passengers',
                value: '${o.stopsCount ?? '--'} stops • ${o.passengerCount ?? '--'} passengers',
              ),
              _InfoRow(icon: Icons.straighten_rounded, label: 'Distance', value: formatDistanceMeters(o.totalDistanceMeters)),
              const SizedBox(height: AppSpacing.md),
              Container(
                padding: AppSpacing.paddingMd,
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.12),
                  borderRadius: AppRadius.borderMd,
                ),
                child: Column(
                  children: [
                    Text('GUARANTEED PAYOUT', style: AppTypography.micro(color: AppColors.success, fontWeight: FontWeight.bold)),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      o.farePaise != null ? formatPaise(o.farePaise!) : '--',
                      key: const Key('corporate-offer-payout'),
                      style: AppTypography.h2(color: AppColors.success, fontWeight: FontWeight.w800),
                    ),
                  ],
                ),
              ),
              if (_message != null) ...[
                const SizedBox(height: AppSpacing.md),
                Container(
                  key: const Key('corporate-offer-message'),
                  padding: AppSpacing.paddingMd,
                  decoration: BoxDecoration(
                    color: (_messageIsError ? AppColors.error : AppColors.success).withValues(alpha: 0.12),
                    borderRadius: AppRadius.borderMd,
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _messageIsError ? Icons.error_outline : Icons.verified_rounded,
                        color: _messageIsError ? AppColors.error : AppColors.success,
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Text(
                          _message!,
                          style: AppTypography.small(
                            color: _messageIsError ? AppColors.error : AppColors.success,
                            fontWeight: FontWeight.w600,
                          ),
                          overflow: TextOverflow.visible,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: AppSpacing.xl),
              if (_phase == _SheetPhase.accepted) ...[
                Text(
                  'Route accepted',
                  key: const Key('corporate-offer-accepted'),
                  textAlign: TextAlign.center,
                  style: AppTypography.h3(color: CorporateSurface.text(context), fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  o.isLogout
                      ? 'Be at the office by ${formatClock(o.targetPickup1Time)}.'
                      : 'Reach pickup 1 by ${formatClock(o.targetPickup1Time)}.',
                  textAlign: TextAlign.center,
                  style: AppTypography.small(color: CorporateSurface.muted(context)),
                ),
                const SizedBox(height: AppSpacing.lg),
                AppPrimaryButton(
                  text: 'View duty',
                  icon: Icons.event_note_rounded,
                  onPressed: () {
                    Navigator.of(context).maybePop();
                    widget.onViewDuties?.call();
                  },
                ),
              ] else if (closed) ...[
                AppSecondaryButton(
                  text: 'Close',
                  onPressed: () => Navigator.of(context).maybePop(),
                ),
              ] else ...[
                AppPrimaryButton(
                  key: const Key('corporate-offer-accept'),
                  text: 'Accept route',
                  icon: Icons.lock_rounded,
                  variant: AppButtonVariant.accentGreen,
                  height: 56,
                  isLoading: _phase == _SheetPhase.accepting,
                  onPressed: busy ? null : _accept,
                ),
                const SizedBox(height: AppSpacing.md),
                AppSecondaryButton(
                  key: const Key('corporate-offer-reject'),
                  text: 'Decline offer',
                  isLoading: _phase == _SheetPhase.rejecting,
                  onPressed: busy ? null : _reject,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _CountdownPill extends StatelessWidget {
  const _CountdownPill({required this.seconds, required this.fraction});
  final int seconds;
  final double fraction;

  @override
  Widget build(BuildContext context) {
    final urgent = seconds <= 10;
    final color = urgent ? AppColors.error : AppColors.warning;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.xs),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: AppRadius.borderPill,
        border: Border.all(color: color.withValues(alpha: 0.5)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(value: fraction, strokeWidth: 2.4, color: color),
          ),
          const SizedBox(width: AppSpacing.sm),
          Text(
            '${seconds}s',
            key: const Key('corporate-offer-countdown'),
            style: AppTypography.body(color: color, fontWeight: FontWeight.w800),
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.icon, required this.label, required this.value});
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: CorporateSurface.muted(context)),
          const SizedBox(width: AppSpacing.sm),
          SizedBox(
            width: 120,
            child: Text(label, style: AppTypography.small(color: CorporateSurface.muted(context))),
          ),
          Expanded(
            child: Text(
              value,
              style: AppTypography.body(color: CorporateSurface.text(context), fontWeight: FontWeight.w600),
              overflow: TextOverflow.visible,
            ),
          ),
        ],
      ),
    );
  }
}
