import 'dart:async';
import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import '../../core/networking/api_client.dart';
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
  static const Set<String> _terminalStatuses = {
    'ACCEPTED',
    'DECLINED',
    'CANCELLED',
    'WITHDRAWN',
    'SUPERSEDED',
    'FAILED',
  };

  int _secondsRemaining = 25;
  Timer? _timer;
  bool _isAccepting = false;
  bool _isExpired = false;
  String? _terminalStatus;
  Map<String, dynamic>? _activeOffer;

  @override
  void initState() {
    super.initState();
    _activeOffer = widget.offer != null ? Map<String, dynamic>.from(widget.offer!) : null;
    _applyOfferState(_activeOffer);
    _loadOfferDetails();
  }

  String? _extractOfferId(Map<String, dynamic>? offer) {
    final raw = offer?['id']?.toString().trim() ?? offer?['offerId']?.toString().trim();
    if (raw == null || raw.isEmpty) return null;
    return raw;
  }

  String _formatTerminalStatus(String status) {
    switch (status.toUpperCase()) {
      case 'ACCEPTED':
        return 'Accepted';
      case 'DECLINED':
        return 'Declined';
      case 'CANCELLED':
        return 'Cancelled';
      case 'WITHDRAWN':
        return 'Withdrawn';
      case 'SUPERSEDED':
        return 'Unavailable';
      case 'FAILED':
        return 'Expired';
      case 'EXPIRED':
        return 'Expired';
      default:
        return status;
    }
  }

  /// Synchronizes countdown and expiry/terminal state from an offer payload.
  void _applyOfferState(Map<String, dynamic>? offer, {bool fromServer = false}) {
    final status = offer?['status']?.toString().trim().toUpperCase();
    if (status == 'EXPIRED') {
      _timer?.cancel();
      _isExpired = true;
      _terminalStatus = null;
      _secondsRemaining = 0;
      return;
    }
    if (status != null && _terminalStatuses.contains(status)) {
      _timer?.cancel();
      _isExpired = false;
      _terminalStatus = status;
      _secondsRemaining = 0;
      return;
    }

    final expiresAtStr = offer?['expiresAt']?.toString();
    if (expiresAtStr != null && expiresAtStr.isNotEmpty) {
      final expiresAt = DateTime.tryParse(expiresAtStr);
      if (expiresAt != null) {
        final diff = expiresAt.difference(DateTime.now()).inSeconds;
        if (diff <= 0) {
          _timer?.cancel();
          _isExpired = true;
          _terminalStatus = null;
          _secondsRemaining = 0;
          return;
        }
        _isExpired = false;
        _terminalStatus = null;
        _secondsRemaining = diff;
        _startTimer();
        return;
      }
    }

    final expSec = int.tryParse(offer?['expiresInSeconds']?.toString() ?? '');
    if (expSec != null) {
      if (expSec <= 0) {
        _timer?.cancel();
        _isExpired = true;
        _terminalStatus = null;
        _secondsRemaining = 0;
        return;
      }
      if (!fromServer || _secondsRemaining <= 0) {
        _secondsRemaining = expSec;
      } else {
        _secondsRemaining = expSec;
      }
    }

    _isExpired = false;
    _terminalStatus = null;
    _startTimer();
  }

  Future<void> _loadOfferDetails() async {
    final targetId = _extractOfferId(_activeOffer) ?? _extractOfferId(widget.offer);
    if (targetId != null) {
      try {
        final detailed = await DriverService.instance.getOfferById(targetId);
        if (detailed != null && mounted) {
          setState(() {
            _activeOffer = detailed;
            _applyOfferState(detailed, fromServer: true);
          });
          return;
        }
      } on ApiException catch (e) {
        if (e.statusCode != 404 && e.statusCode != 403 && e.statusCode != 410) {
          return;
        }
      } catch (_) {
        return;
      }
    }

    try {
      final list = await DriverService.instance.getOffers(forceRefresh: true);
      if (!mounted) return;
      if (list.isNotEmpty) {
        if (targetId != null) {
          final matches = list.whereType<Map>().where(
                (o) => o['id']?.toString() == targetId || o['offerId']?.toString() == targetId,
              );
          if (matches.isNotEmpty) {
            final updated = Map<String, dynamic>.from(matches.first);
            setState(() {
              _activeOffer = updated;
              _applyOfferState(updated, fromServer: true);
            });
            return;
          }
        } else {
          final first = list.first;
          if (first is Map) {
            final updated = Map<String, dynamic>.from(first);
            setState(() {
              _activeOffer = updated;
              _applyOfferState(updated, fromServer: true);
            });
            return;
          }
        }
      }

      if (targetId != null) {
        _timer?.cancel();
        setState(() {
          _isExpired = true;
          _terminalStatus = null;
          _secondsRemaining = 0;
        });
      }
    } catch (_) {}
  }

  void _startTimer() {
    _timer?.cancel();
    if (_isExpired || _terminalStatus != null || _secondsRemaining <= 0) {
      return;
    }
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) {
        t.cancel();
        return;
      }
      if (_secondsRemaining > 1) {
        setState(() => _secondsRemaining--);
      } else {
        t.cancel();
        setState(() {
          _secondsRemaining = 0;
          _isExpired = true;
        });
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _declineOffer() async {
    if (_isExpired || _terminalStatus != null || _isAccepting) return;
    _timer?.cancel();
    final offerId = _extractOfferId(_activeOffer);
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
        context.go(AppRoutes.homeScreen);
      }
    }
  }

  void _acceptOffer() async {
    if (_isExpired || _terminalStatus != null || _isAccepting) return;
    _timer?.cancel();
    setState(() => _isAccepting = true);

    final offerId = _extractOfferId(_activeOffer);
    if (offerId != null) {
      try {
        await DriverService.instance.acceptOffer(offerId);
        if (mounted) {
          setState(() => _isAccepting = false);
          Fluttertoast.showToast(
            msg: 'Trip accepted! Your trip is available on Home.',
            backgroundColor: AppColors.accentGreenDark,
          );
          context.go(AppRoutes.homeScreen);
        }
        return;
      } catch (err) {
        if (mounted) {
          final msg = err.toString().replaceAll('Exception: ', '');
          final isExpiredErr = msg.toLowerCase().contains('expir');
          setState(() {
            _isAccepting = false;
            if (isExpiredErr) {
              _isExpired = true;
              _secondsRemaining = 0;
            }
          });
          Fluttertoast.showToast(
            msg: isExpiredErr ? 'This trip offer has expired' : 'Accept failed: $msg',
            backgroundColor: AppColors.error,
          );
        }
        return;
      }
    }

    if (mounted) {
      setState(() => _isAccepting = false);
      context.go(AppRoutes.homeScreen);
    }
  }

  String? _firstNonEmptyString(List<dynamic> candidates) {
    for (final c in candidates) {
      final str = c?.toString().trim();
      if (str != null && str.isNotEmpty) return str;
    }
    return null;
  }

  String _formatDistance(Map<String, dynamic>? req) {
    final raw = _activeOffer?['tripDistanceKm'] ?? _activeOffer?['distanceKm'] ?? req?['tripDistanceKm'] ?? req?['distanceKm'];
    final d = raw is num ? raw.toDouble() : double.tryParse(raw?.toString() ?? '');
    if (d != null && d > 0) return '${d.toStringAsFixed(1)} km';
    return '--';
  }

  String _formatDuration(Map<String, dynamic>? req) {
    final raw = _activeOffer?['tripEtaMinutes'] ?? _activeOffer?['durationMinutes'] ?? req?['tripEtaMinutes'] ?? req?['durationMinutes'];
    final m = raw is num ? raw.round() : int.tryParse(raw?.toString() ?? '');
    if (m != null && m > 0) return '$m min';
    return '--';
  }

  String _formatEarnings() {
    final payout = DriverService.resolveDriverPayout(_activeOffer);
    if (payout > 0) return DriverService.resolveDriverPayoutFormatted(_activeOffer);
    if (_extractOfferId(_activeOffer) != null) {
      final rawRate = _activeOffer?['rate'];
      final rateVal = rawRate is num ? rawRate.toDouble() : double.tryParse(rawRate?.toString() ?? '');
      if (rateVal != null && rateVal > 0) {
        return '₹${rateVal.toStringAsFixed(0)}';
      }
    }
    return '₹--';
  }

  @override
  Widget build(BuildContext context) {
    final formattedMins = (_secondsRemaining ~/ 60).toString().padLeft(2, '0');
    final formattedSecs = (_secondsRemaining % 60).toString().padLeft(2, '0');
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bool isInactive = _isExpired || _terminalStatus != null;
    final String? inactiveLabel = _isExpired ? 'Expired' : (_terminalStatus != null ? _formatTerminalStatus(_terminalStatus!) : null);
    final Color bannerAccent = _isExpired
        ? AppColors.error
        : (_terminalStatus == 'ACCEPTED'
            ? AppColors.accentGreenDark
            : (_terminalStatus != null ? (isDark ? AppColors.textMutedDark : AppColors.textMutedLight) : AppColors.warning));
    final Color bannerBg = _isExpired
        ? AppColors.error.withValues(alpha: isDark ? 0.16 : 0.1)
        : (_terminalStatus != null ? bannerAccent.withValues(alpha: 0.12) : (isDark ? AppColors.warning.withValues(alpha: 0.15) : AppColors.warningContainer));
    final Color bannerBorder = _isExpired
        ? AppColors.error.withValues(alpha: 0.35)
        : (_terminalStatus != null ? bannerAccent.withValues(alpha: 0.3) : (isDark ? AppColors.warning.withValues(alpha: 0.3) : AppColors.warningContainer));
    final IconData bannerIcon = _isExpired
        ? Icons.timer_off_outlined
        : (_terminalStatus == 'ACCEPTED' ? Icons.check_circle_outline : (_terminalStatus != null ? Icons.cancel_outlined : Icons.notifications_active_outlined));

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
                            context.go(AppRoutes.homeScreen);
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
                          color: bannerBg,
                          borderRadius: BorderRadius.circular(AppRadius.xl),
                          border: Border.all(
                            color: bannerBorder,
                          ),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    isInactive ? 'Offer status' : 'Offer expires in',
                                    style: AppTypography.caption(
                                      color: isInactive ? bannerAccent : (isDark ? AppColors.warning : AppColors.warningText),
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  if (inactiveLabel != null)
                                    Text(
                                      inactiveLabel,
                                      style: AppTypography.h1(
                                        color: bannerAccent,
                                        fontWeight: FontWeight.bold,
                                      ).copyWith(fontSize: 32),
                                    )
                                  else
                                    FittedBox(
                                      fit: BoxFit.scaleDown,
                                      alignment: Alignment.centerLeft,
                                      child: Row(
                                        crossAxisAlignment: CrossAxisAlignment.baseline,
                                        textBaseline: TextBaseline.alphabetic,
                                        children: [
                                          Text(
                                            '$formattedMins : $formattedSecs',
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
                                    ),
                                ],
                              ),
                            ),
                            Container(
                              width: 56,
                              height: 56,
                              decoration: BoxDecoration(
                                color: isInactive ? bannerAccent.withValues(alpha: 0.18) : (isDark ? AppColors.warning.withValues(alpha: 0.2) : AppColors.warningContainer),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                bannerIcon,
                                color: bannerAccent,
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
                          final title = _firstNonEmptyString([req?['title'], _activeOffer?['title']]) ?? 'Trip Requirement';
                          final vehicle = _firstNonEmptyString([req?['vehicleType'], _activeOffer?['vehicleType']]) ?? 'Sedan';
                          final pickup = _firstNonEmptyString([
                                req?['pickupAddress'],
                                (req?['pickupLocation'] as Map?)?['address'],
                                _activeOffer?['pickupAddress'],
                                (_activeOffer?['pickupLocation'] as Map?)?['address'],
                                _activeOffer?['pickup'],
                              ]) ??
                              'Pickup address';
                          final drop = _firstNonEmptyString([
                                req?['dropAddress'],
                                (req?['dropLocation'] as Map?)?['address'],
                                _activeOffer?['dropAddress'],
                                (_activeOffer?['dropLocation'] as Map?)?['address'],
                                _activeOffer?['drop'],
                              ]) ??
                              'Drop address';
                          final distanceText = _formatDistance(req);
                          final durationText = _formatDuration(req);
                          final earnings = _formatEarnings();

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
                                        value: distanceText,
                                        isDark: isDark,
                                      ),
                                    ),
                                    const SizedBox(width: AppSpacing.sm),
                                    Expanded(
                                      child: _buildMetricTile(
                                        icon: Icons.access_time,
                                        label: 'Duration',
                                        value: durationText,
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
                      if (isInactive)
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton(
                            onPressed: () {
                              if (context.canPop()) {
                                context.pop();
                              } else {
                                context.go(AppRoutes.homeScreen);
                              }
                            },
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              side: BorderSide(color: bannerAccent),
                              foregroundColor: bannerAccent,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(AppRadius.md),
                              ),
                            ),
                            child: Text(
                              'GO BACK',
                              style: AppTypography.body(
                                color: bannerAccent,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        )
                      else
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
