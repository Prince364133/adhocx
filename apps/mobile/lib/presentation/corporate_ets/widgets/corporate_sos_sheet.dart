import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../shared/widgets/app_primary_button.dart';
import '../../../shared/widgets/app_secondary_button.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_radius.dart';
import '../../../theme/app_spacing.dart';
import '../../../theme/app_typography.dart';
import '../data/corporate_errors.dart';
import '../data/corporate_ets_api.dart';
import '../logic/corporate_device.dart';
import 'corporate_state_views.dart';

enum _SosPhase { confirm, sending, sent }

/// Driver SOS on an active corporate route (UI-06-04): explicit confirmation, then
/// `POST /corporate/safety/sos` with the current GPS fix and battery. Emergency-number guidance
/// (SAFE-07) is shown before and after sending, and stays available if the alert fails.
class CorporateSosSheet extends StatefulWidget {
  const CorporateSosSheet({
    super.key,
    required this.routeId,
    required this.api,
    required this.device,
    this.stopId,
  });

  final String routeId;
  final String? stopId;
  final CorporateEtsApi api;
  final CorporateDevice device;

  static Future<void> show(
    BuildContext context, {
    required String routeId,
    String? stopId,
    required CorporateEtsApi api,
    required CorporateDevice device,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => CorporateSosSheet(routeId: routeId, stopId: stopId, api: api, device: device),
    );
  }

  @override
  State<CorporateSosSheet> createState() => _CorporateSosSheetState();
}

class _CorporateSosSheetState extends State<CorporateSosSheet> {
  _SosPhase _phase = _SosPhase.confirm;
  CorporateError? _error;

  Future<void> _send() async {
    setState(() {
      _phase = _SosPhase.sending;
      _error = null;
    });
    CorporateFix? fix;
    int? battery;
    try {
      fix = await widget.device.currentFix();
      battery = await widget.device.batteryPct();
    } catch (_) {}
    if (fix == null) {
      if (!mounted) return;
      setState(() {
        _phase = _SosPhase.confirm;
        _error = CorporateError(
          CorporateErrorKind.rejected,
          'Could not get your GPS location, so the SOS was not sent. Turn on location and try again, or call 112 now.',
        );
      });
      return;
    }
    try {
      await widget.api.triggerSos(
        routeId: widget.routeId,
        stopId: widget.stopId,
        lat: fix.latitude,
        lng: fix.longitude,
        batteryPct: battery,
      );
      if (!mounted) return;
      setState(() => _phase = _SosPhase.sent);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _phase = _SosPhase.confirm;
        _error = CorporateError.from(e);
      });
    }
  }

  Future<void> _call112() async {
    try {
      await launchUrl(Uri.parse('tel:112'));
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final sent = _phase == _SosPhase.sent;
    return Container(
      decoration: BoxDecoration(
        color: CorporateSurface.card(context),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
      ),
      padding: const EdgeInsets.all(AppSpacing.xl),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(color: AppColors.error.withValues(alpha: 0.12), shape: BoxShape.circle),
                child: Icon(sent ? Icons.check_circle_rounded : Icons.sos_rounded, color: sent ? AppColors.success : AppColors.error, size: 40),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              sent ? 'SOS sent to AdhocX Command Centre' : 'Send an SOS alert?',
              key: Key(sent ? 'corporate-sos-sent' : 'corporate-sos-confirm-title'),
              textAlign: TextAlign.center,
              style: AppTypography.h3(color: CorporateSurface.text(context), fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              sent
                  ? 'The command centre has your location and route. Stay where it is safe; they will contact you.'
                  : 'Your live location, battery level and route will be sent to the AdhocX 24x7 Command Centre and the client safety desk.',
              textAlign: TextAlign.center,
              style: AppTypography.small(color: CorporateSurface.muted(context)),
              overflow: TextOverflow.visible,
            ),
            const SizedBox(height: AppSpacing.lg),
            Container(
              padding: AppSpacing.paddingMd,
              decoration: BoxDecoration(
                color: AppColors.error.withValues(alpha: 0.08),
                borderRadius: AppRadius.borderMd,
                border: Border.all(color: AppColors.error.withValues(alpha: 0.4)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.local_phone_rounded, color: AppColors.error),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      'In immediate danger or a medical emergency? Call 112 (national emergency number) first.',
                      style: AppTypography.small(color: AppColors.error, fontWeight: FontWeight.w600),
                      overflow: TextOverflow.visible,
                    ),
                  ),
                ],
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: AppSpacing.md),
              CorporateInlineError(error: _error!, title: 'SOS not sent'),
            ],
            const SizedBox(height: AppSpacing.xl),
            if (!sent)
              AppPrimaryButton(
                key: const Key('corporate-sos-send'),
                text: 'Yes, send SOS',
                icon: Icons.sos_rounded,
                variant: AppButtonVariant.danger,
                height: 56,
                isLoading: _phase == _SosPhase.sending,
                onPressed: _phase == _SosPhase.sending ? null : _send,
              ),
            const SizedBox(height: AppSpacing.md),
            AppSecondaryButton(
              text: 'Call 112',
              icon: Icons.call_rounded,
              onPressed: _call112,
            ),
            const SizedBox(height: AppSpacing.sm),
            TextButton(
              onPressed: _phase == _SosPhase.sending ? null : () => Navigator.of(context).maybePop(),
              child: Text(sent ? 'Close' : 'Cancel'),
            ),
          ],
        ),
      ),
    );
  }
}
