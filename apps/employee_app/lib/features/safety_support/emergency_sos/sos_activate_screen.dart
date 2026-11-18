import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/safety_illustrations.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';

/// SOS trigger wired to POST /corporate/safety/sos.
/// Press and hold the siren for 3 seconds to send the emergency alert.
class SosActivateScreen extends StatefulWidget {
  const SosActivateScreen({super.key});

  static const holdDuration = Duration(seconds: 3);

  @override
  State<SosActivateScreen> createState() => _SosActivateScreenState();
}

class _SosActivateScreenState extends State<SosActivateScreen> {
  Timer? _holdTimer;
  bool _holding = false;
  bool _sent = false;
  bool _sending = false;

  @override
  void dispose() {
    _holdTimer?.cancel();
    super.dispose();
  }

  Future<void> _send() async {
    if (_sent || _sending) return;
    _sent = true;
    _holdTimer?.cancel();
    if (mounted) {
      setState(() {
        _holding = false;
        _sending = true;
      });
    }

    Map<String, dynamic>? alertPayload;
    final data = maybeEmployeeData(context);
    if (data != null) {
      try {
        final next = await data.loadNextTrip();
        final routeId = next?['routeId']?.toString() ?? data.activeRouteId;
        if (routeId != null && routeId.isNotEmpty) {
          final tracking = data.activeTracking;
          final drvLoc = tracking?['driverLocation'] as Map?;
          final pickupLoc = next?['pickupLocation'] as Map?;
          final lat = (drvLoc?['latitude'] as num?)?.toDouble() ??
              (pickupLoc?['latitude'] as num?)?.toDouble() ??
              0.0;
          final lng = (drvLoc?['longitude'] as num?)?.toDouble() ??
              (pickupLoc?['longitude'] as num?)?.toDouble() ??
              0.0;
          alertPayload = await data.repository.triggerSos(
            routeId: routeId,
            latitude: lat,
            longitude: lng,
            reason: 'Emergency SOS triggered from Employee App',
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'SOS dispatch notice: ${e.toString().replaceFirst('Exception: ', '')}',
              ),
              backgroundColor: AppColors.error,
            ),
          );
        }
      }
    }

    if (!mounted) return;
    setState(() => _sending = false);
    context.push(AppRoutes.sosAlertConfirmed, extra: alertPayload).then((_) {
      if (mounted) setState(() => _sent = false);
    });
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
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.pageHorizontal,
            vertical: AppSpacing.xl,
          ),
          child: Column(
            children: [
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
    );
  }
}
