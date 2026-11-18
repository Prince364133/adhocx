import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/boarding_illustrations.dart';

/// Polls real trip tracking (`GET /corporate/me/trips/:id/tracking`) until
/// `stopStatus == 'BOARDED'`, with clean timeout/retry UI if not yet confirmed.
class VerifyingBoardingScreen extends StatefulWidget {
  final Duration pollInterval;
  final int maxAttempts;

  const VerifyingBoardingScreen({
    super.key,
    this.pollInterval = const Duration(seconds: 2),
    this.maxAttempts = 15,
  });

  @override
  State<VerifyingBoardingScreen> createState() =>
      _VerifyingBoardingScreenState();
}

class _VerifyingBoardingScreenState extends State<VerifyingBoardingScreen> {
  Timer? _pollTimer;
  int _attempts = 0;
  bool _timedOut = false;
  bool _checking = false;
  String? _statusMessage;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _startPolling());
  }

  void _startPolling() {
    _pollTimer?.cancel();
    if (!mounted) return;
    setState(() {
      _attempts = 0;
      _timedOut = false;
      _statusMessage = null;
    });
    _pollOnce();
  }

  Future<void> _pollOnce() async {
    if (!mounted || _checking) return;
    final data = maybeEmployeeData(context);
    if (data == null) {
      // No live data provider attached (e.g. isolated widget preview).
      return;
    }

    _checking = true;
    _attempts++;
    try {
      final tracking = await data.loadTracking(force: true);
      if (!mounted) return;

      final stopStatus = (tracking?['stopStatus'] ??
              data.nextTrip?['stopStatus'] ??
              '')
          .toString()
          .toUpperCase();

      if (stopStatus == 'BOARDED' ||
          stopStatus == 'IN_TRANSIT' ||
          stopStatus == 'ON_TRIP') {
        _pollTimer?.cancel();
        context.pushReplacement(AppRoutes.boardingSuccessful);
        return;
      }

      if (_attempts >= widget.maxAttempts) {
        setState(() {
          _timedOut = true;
          _statusMessage =
              'Driver confirmation is taking longer than expected. Please ask your driver to confirm your boarding OTP and tap Retry.';
        });
        return;
      }

      _pollTimer?.cancel();
      _pollTimer = Timer(widget.pollInterval, _pollOnce);
    } catch (e) {
      if (!mounted) return;
      if (_attempts >= widget.maxAttempts) {
        setState(() {
          _timedOut = true;
          _statusMessage =
              'Unable to verify boarding status right now (${e.toString().replaceFirst('Exception: ', '')}).';
        });
      } else {
        _pollTimer?.cancel();
        _pollTimer = Timer(widget.pollInterval, _pollOnce);
      }
    } finally {
      _checking = false;
    }
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_timedOut) {
      return EmployeeCenteredLayout(
        appBar: const EmployeeAppBar(),
        illustration: const VerifyingBoardingSpinner(),
        title: 'Waiting for Driver Confirmation',
        message: _statusMessage ??
            'Your driver has not confirmed boarding yet. Please verify your OTP with the driver and retry.',
        actions: [
          EmployeePrimaryButton(
            label: 'Retry Verification',
            icon: Icons.refresh_rounded,
            onPressed: _startPolling,
          ),
          EmployeeSecondaryButton(
            label: 'Report Boarding Issue',
            onPressed: () => context.push(AppRoutes.boardingIssue),
          ),
        ],
      );
    }

    return const EmployeeCenteredLayout(
      illustration: VerifyingBoardingSpinner(),
      title: 'Verifying Boarding...',
      message: 'Please wait while your driver confirms your boarding.',
    );
  }
}
