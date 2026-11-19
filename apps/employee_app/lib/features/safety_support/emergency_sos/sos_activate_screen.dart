import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/safety_illustrations.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import '../widgets/safety_widgets.dart';

/// SOS trigger wired to POST /corporate/safety/sos.
/// Press and hold the siren for 3 seconds to send the emergency alert.
/// NEVER falsely confirms SOS delivery when routeId is missing or API fails.
class SosActivateScreen extends StatefulWidget {
  const SosActivateScreen({super.key});

  static const holdDuration = Duration(seconds: 3);
  static const String helplineNumber = '1800-419-7000';
  static const String emergencyNumber = '112';

  @override
  State<SosActivateScreen> createState() => _SosActivateScreenState();
}

class _SosActivateScreenState extends State<SosActivateScreen> {
  Timer? _holdTimer;
  bool _holding = false;
  bool _sent = false;
  bool _sending = false;
  String? _dispatchError;

  @override
  void dispose() {
    _holdTimer?.cancel();
    super.dispose();
  }

  void _showFailureDialog(String message) {
    if (!mounted) return;
    setState(() {
      _sending = false;
      _sent = false;
      _dispatchError = message;
    });
    showDialog<void>(
      context: context,
      barrierDismissible: true,
      builder: (dialogContext) => AlertDialog(
        title: const Text('SOS Alert Not Sent'),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(dialogContext).pop();
              dialNumber(SosActivateScreen.emergencyNumber);
            },
            child: const Text('Call 112'),
          ),
          FilledButton.icon(
            onPressed: () {
              Navigator.of(dialogContext).pop();
              dialNumber(SosActivateScreen.helplineNumber);
            },
            icon: const Icon(Icons.phone_rounded, size: 18),
            label: const Text('Call Safety Helpline'),
          ),
        ],
      ),
    );
  }

  Future<void> _send() async {
    if (_sent || _sending) return;
    _sent = true;
    _holdTimer?.cancel();
    if (mounted) {
      setState(() {
        _holding = false;
        _sending = true;
        _dispatchError = null;
      });
    }

    final data = maybeEmployeeData(context);
    if (data == null) {
      _showFailureDialog(
        'Unable to reach the SOS dispatch service right now. Please call the 24/7 Safety Helpline (${SosActivateScreen.helplineNumber}) or 112 immediately.',
      );
      return;
    }

    try {
      final next = await data.loadNextTrip();
      final routeId = next?['routeId']?.toString() ?? data.activeRouteId;
      if (routeId == null || routeId.isEmpty) {
        _showFailureDialog(
          'No active trip route was found to dispatch an automated SOS alert. Please call our 24/7 Safety Helpline (${SosActivateScreen.helplineNumber}) or 112 immediately.',
        );
        return;
      }

      final tracking = data.activeTracking;
      final drvLoc = tracking?['driverLocation'] as Map?;
      final pickupLoc = next?['pickupLocation'] as Map?;
      final lat = (drvLoc?['latitude'] as num?)?.toDouble() ??
          (pickupLoc?['latitude'] as num?)?.toDouble() ??
          0.0;
      final lng = (drvLoc?['longitude'] as num?)?.toDouble() ??
          (pickupLoc?['longitude'] as num?)?.toDouble() ??
          0.0;

      final alertPayload = await data.repository.triggerSos(
        routeId: routeId,
        latitude: lat,
        longitude: lng,
        reason: 'Emergency SOS triggered from Employee App',
      );

      if (!mounted) return;
      setState(() => _sending = false);
      context.push(AppRoutes.sosAlertConfirmed, extra: alertPayload).then((_) {
        if (mounted) setState(() => _sent = false);
      });
    } catch (e) {
      final cleanError = e.toString().replaceFirst('Exception: ', '');
      _showFailureDialog(
        'Failed to dispatch SOS alert ($cleanError). Please call the 24/7 Safety Helpline (${SosActivateScreen.helplineNumber}) or 112 immediately.',
      );
    }
  }

  void _startHold() {
    setState(() => _holding = true);
    _holdTimer?.cancel();
    _holdTimer = Timer(SosActivateScreen.holdDuration, _send);
  }

  void _endHold() {
    _holdTimer?.cancel();
    if (mounted) setState(() => _holding = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.errorText,
      appBar: EmployeeAppBar(
        title: 'SOS',
        centerTitle: true,
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        leading: IconButton(
          tooltip: 'Close',
          icon: const Icon(Icons.close_rounded, color: Colors.white),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
      ),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) => SingleChildScrollView(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.pageHorizontal,
              vertical: AppSpacing.xl,
            ),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                minHeight: (constraints.maxHeight - AppSpacing.xl * 2)
                    .clamp(0.0, double.infinity),
              ),
              child: IntrinsicHeight(
                child: Column(
                  children: [
                    if (_dispatchError != null)
                      Container(
                        width: double.infinity,
                        margin: const EdgeInsets.only(bottom: AppSpacing.lg),
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: BoxDecoration(
                          color: Colors.black.withAlpha(80),
                          borderRadius: AppRadius.borderLg,
                          border: Border.all(color: Colors.white.withAlpha(110)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              _dispatchError!,
                              style: AppTypography.small(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: AppSpacing.sm),
                            FilledButton.icon(
                              style: FilledButton.styleFrom(
                                backgroundColor: Colors.white,
                                foregroundColor: AppColors.errorText,
                              ),
                              onPressed: () =>
                                  dialNumber(SosActivateScreen.helplineNumber),
                              icon: const Icon(Icons.phone_in_talk_rounded,
                                  size: 18),
                              label: const Text(
                                'Call Helpline (${SosActivateScreen.helplineNumber})',
                              ),
                            ),
                          ],
                        ),
                      ),
                    const Spacer(),
                    Semantics(
                      button: true,
                      label: 'Hold for 3 seconds to send an emergency alert',
                      onLongPress: _startHold,
                      child: GestureDetector(
                        onTapDown: (_) => _startHold(),
                        onTapUp: (_) => _endHold(),
                        onTapCancel: _endHold,
                        child: AnimatedScale(
                          scale: _holding ? 0.94 : 1,
                          duration: const Duration(milliseconds: 200),
                          child: const SosSirenBadge(),
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xxxl),
                    Text(
                      _sending
                          ? 'Sending emergency SOS alert…'
                          : (_holding
                              ? 'Keep holding…'
                              : 'Press and hold for 3 seconds\nto send an emergency alert.'),
                      textAlign: TextAlign.center,
                      style: AppTypography.bodyLarge(
                        color: Colors.white.withAlpha(230),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const Spacer(),
                    const SizedBox(height: AppSpacing.lg),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: TextButton(
                        onPressed: () => Navigator.of(context).maybePop(),
                        child: Text(
                          'Cancel',
                          style: AppTypography.button(
                            color: Colors.white.withAlpha(179),
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
