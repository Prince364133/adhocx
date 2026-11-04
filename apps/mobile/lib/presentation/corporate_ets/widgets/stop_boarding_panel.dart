import 'dart:async';

import 'package:flutter/material.dart';

import '../../../shared/widgets/app_otp_field.dart';
import '../../../shared/widgets/app_primary_button.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_radius.dart';
import '../../../theme/app_spacing.dart';
import '../../../theme/app_typography.dart';
import '../data/corporate_errors.dart';
import '../data/corporate_models.dart';
import '../logic/corporate_device.dart';
import '../logic/corporate_ets_coordinator.dart';
import '../logic/corporate_timers.dart';
import 'corporate_state_views.dart';

/// No-show reasons offered to the driver; the selected text is sent as the audit reason.
const List<String> kCorporateNoShowReasons = [
  'Employee did not arrive within 5 minutes',
  'Employee not reachable',
  'Employee asked the cab to leave',
  'Other',
];

/// Boarding verification at an arrived pickup (UI-05-04): 5:00 wait countdown from the server
/// arrival time, 4-digit OTP entry, and the no-show action that stays locked for 5 minutes.
class StopBoardingPanel extends StatefulWidget {
  const StopBoardingPanel({
    super.key,
    required this.routeId,
    required this.stop,
    required this.coordinator,
    required this.device,
    required this.onStopUpdated,
  });

  final String routeId;
  final CorporateStop stop;
  final CorporateEtsCoordinator coordinator;
  final CorporateDevice device;

  /// Called after the server confirmed a boarding or a no-show; the parent re-fetches the route.
  final Future<void> Function(String message) onStopUpdated;

  @override
  State<StopBoardingPanel> createState() => _StopBoardingPanelState();
}

class _StopBoardingPanelState extends State<StopBoardingPanel> {
  Timer? _ticker;
  late StopWaitClock _clock;
  String _otp = '';
  int _otpFieldGeneration = 0;
  bool _verifying = false;
  bool _markingNoShow = false;
  CorporateError? _otpError;
  CorporateError? _noShowError;

  @override
  void initState() {
    super.initState();
    _clock = _buildClock();
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void didUpdateWidget(covariant StopBoardingPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.stop.stopId != widget.stop.stopId ||
        oldWidget.stop.actualArrivalTime != widget.stop.actualArrivalTime) {
      _clock = _buildClock();
    }
  }

  StopWaitClock _buildClock() => StopWaitClock(
        // A missing arrival time is treated as "just arrived": the lock never opens early.
        arrivalTime: widget.stop.actualArrivalTime ?? widget.coordinator.now(),
        dwell: Duration(seconds: widget.stop.dwellBufferSeconds),
        serverOffset: widget.coordinator.clockOffsetFor(widget.stop.stopId),
      );

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  Future<void> _submitOtp() async {
    final code = _otp.trim();
    if (code.length != 4) {
      setState(() => _otpError = CorporateError(CorporateErrorKind.rejected, 'Enter the 4-digit OTP shown in the employee app.'));
      return;
    }
    setState(() {
      _verifying = true;
      _otpError = null;
    });
    try {
      await widget.coordinator.api.verifyOtp(widget.routeId, widget.stop.stopId, code);
      if (!mounted) return;
      setState(() => _verifying = false);
      await widget.onStopUpdated('Boarding verified for ${widget.stop.employeeName ?? 'the employee'}.');
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _verifying = false;
        _otpError = CorporateError.from(e);
        _otp = '';
        _otpFieldGeneration++;
      });
    }
  }

  Future<void> _markNoShow() async {
    final reason = await showDialog<String>(
      context: context,
      builder: (_) => _NoShowReasonDialog(employeeName: widget.stop.employeeName),
    );
    if (reason == null || reason.trim().isEmpty || !mounted) return;
    setState(() {
      _markingNoShow = true;
      _noShowError = null;
    });
    CorporateFix? fix;
    try {
      fix = await widget.device.currentFix();
    } catch (_) {}
    try {
      await widget.coordinator.api.markNoShow(
        widget.routeId,
        widget.stop.stopId,
        reason: reason.trim(),
        lat: fix?.latitude,
        lng: fix?.longitude,
      );
      if (!mounted) return;
      setState(() => _markingNoShow = false);
      await widget.onStopUpdated('No-show recorded. Proceed to the next stop.');
    } catch (e) {
      if (!mounted) return;
      final err = CorporateError.from(e);
      setState(() {
        _markingNoShow = false;
        _noShowError = err;
        final left = err.noShowSecondsRemaining;
        if (left != null) _clock = _clock.reanchored(widget.coordinator.now(), left);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final now = widget.coordinator.now();
    final remaining = _clock.remaining(now);
    final unlocked = _clock.noShowUnlocked(now);
    final busy = _verifying || _markingNoShow;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: AppSpacing.paddingLg,
          decoration: BoxDecoration(
            color: (unlocked ? AppColors.error : AppColors.warning).withValues(alpha: 0.12),
            borderRadius: AppRadius.borderLg,
            border: Border.all(color: (unlocked ? AppColors.error : AppColors.warning).withValues(alpha: 0.5)),
          ),
          child: Column(
            children: [
              Text(
                unlocked ? 'WAIT WINDOW OVER' : 'STOP WAIT TIMER',
                style: AppTypography.micro(color: unlocked ? AppColors.error : AppColors.warningText, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                StopWaitClock.format(remaining),
                key: const Key('corporate-wait-countdown'),
                style: AppTypography.display(color: unlocked ? AppColors.error : AppColors.warning, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                unlocked
                    ? 'The employee did not board within 5 minutes. You may mark a no-show.'
                    : 'Wait for the employee. The 5-minute window started when you arrived.',
                textAlign: TextAlign.center,
                style: AppTypography.small(color: CorporateSurface.muted(context)),
                overflow: TextOverflow.visible,
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        Text(
          'Enter the boarding OTP from ${widget.stop.employeeName ?? 'the employee'}',
          style: AppTypography.body(color: CorporateSurface.text(context), fontWeight: FontWeight.w600),
          overflow: TextOverflow.visible,
        ),
        const SizedBox(height: AppSpacing.sm),
        AppOtpField(
          key: ValueKey('corporate-otp-${widget.stop.stopId}-$_otpFieldGeneration'),
          length: 4,
          autofocus: false,
          onChanged: (v) => _otp = v,
          onCompleted: (v) => _otp = v,
        ),
        if (_otpError != null) ...[
          const SizedBox(height: AppSpacing.sm),
          Text(
            _otpError!.message,
            key: const Key('corporate-otp-error'),
            style: AppTypography.small(color: AppColors.error, fontWeight: FontWeight.w600),
            overflow: TextOverflow.visible,
          ),
        ],
        const SizedBox(height: AppSpacing.md),
        AppPrimaryButton(
          key: const Key('corporate-otp-submit'),
          text: 'Verify & board',
          icon: Icons.verified_user_rounded,
          height: 56,
          isLoading: _verifying,
          onPressed: busy ? null : _submitOtp,
        ),
        const SizedBox(height: AppSpacing.xl),
        Divider(color: CorporateSurface.border(context)),
        const SizedBox(height: AppSpacing.md),
        AppPrimaryButton(
          key: const Key('corporate-noshow-button'),
          text: unlocked ? 'Mark no-show (employee absent)' : 'No-show unlocks in ${StopWaitClock.format(remaining)}',
          icon: Icons.person_off_rounded,
          variant: AppButtonVariant.danger,
          isLoading: _markingNoShow,
          onPressed: (unlocked && !busy) ? _markNoShow : null,
        ),
        if (_noShowError != null) ...[
          const SizedBox(height: AppSpacing.sm),
          CorporateInlineError(error: _noShowError!, title: 'No-show not recorded'),
        ],
      ],
    );
  }
}

class _NoShowReasonDialog extends StatefulWidget {
  const _NoShowReasonDialog({this.employeeName});
  final String? employeeName;

  @override
  State<_NoShowReasonDialog> createState() => _NoShowReasonDialogState();
}

class _NoShowReasonDialogState extends State<_NoShowReasonDialog> {
  String? _selected;
  final TextEditingController _other = TextEditingController();

  @override
  void dispose() {
    _other.dispose();
    super.dispose();
  }

  String? get _reason {
    if (_selected == null) return null;
    if (_selected == 'Other') {
      final t = _other.text.trim();
      return t.isEmpty ? null : t;
    }
    return _selected;
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Confirm no-show'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Confirm that ${widget.employeeName ?? 'the employee'} did not arrive at the pickup point after 5 minutes. '
              'A reason is required and is shown to the employee and their company.',
            ),
            const SizedBox(height: AppSpacing.md),
            RadioGroup<String>(
              groupValue: _selected,
              onChanged: (v) => setState(() => _selected = v),
              child: Column(
                children: [
                  for (final r in kCorporateNoShowReasons)
                    RadioListTile<String>(
                      key: Key('corporate-noshow-reason-$r'),
                      value: r,
                      title: Text(r),
                      contentPadding: EdgeInsets.zero,
                      dense: true,
                    ),
                ],
              ),
            ),
            if (_selected == 'Other')
              TextField(
                key: const Key('corporate-noshow-other'),
                controller: _other,
                maxLength: 200,
                decoration: const InputDecoration(labelText: 'Describe the reason'),
                onChanged: (_) => setState(() {}),
              ),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Cancel')),
        FilledButton(
          key: const Key('corporate-noshow-confirm'),
          style: FilledButton.styleFrom(backgroundColor: AppColors.error),
          onPressed: _reason == null ? null : () => Navigator.of(context).pop(_reason),
          child: const Text('Mark no-show'),
        ),
      ],
    );
  }
}
