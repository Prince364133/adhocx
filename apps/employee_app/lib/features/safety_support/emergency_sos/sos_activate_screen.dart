import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/illustrations/safety_illustrations.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';

/// SOS trigger. Emergency surface: fixed crimson in light and dark mode.
///
/// Two deliberate gestures send the alert (each exactly once):
/// - press and hold the siren for 3 seconds, or
/// - slide the thumb to the end and release.
class SosActivateScreen extends StatefulWidget {
  const SosActivateScreen({super.key});

  static const holdDuration = Duration(seconds: 3);

  @override
  State<SosActivateScreen> createState() => _SosActivateScreenState();
}

class _SosActivateScreenState extends State<SosActivateScreen> {
  double _sliderValue = 0;
  Timer? _holdTimer;
  bool _holding = false;
  bool _sent = false;

  @override
  void dispose() {
    _holdTimer?.cancel();
    super.dispose();
  }

  void _send() {
    if (_sent) return; // never fire twice
    _sent = true;
    _holdTimer?.cancel();
    context.push(AppRoutes.sosAlertConfirmed).then((_) {
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
            horizontal: AppSpacing.xxl,
            vertical: AppSpacing.xl,
          ),
          child: Column(
            children: [
              const Spacer(),
              Semantics(
                button: true,
                label: 'Hold for 3 seconds to send an emergency alert',
                onLongPress: _send,
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
                _holding
                    ? 'Keep holding…'
                    : 'Press and hold for 3 seconds\nto send an emergency alert.',
                textAlign: TextAlign.center,
                style: AppTypography.bodyLarge(
                  color: Colors.white.withAlpha(230),
                  fontWeight: FontWeight.w600,
                ),
              ),
              const Spacer(),
              Container(
                width: double.infinity,
                height: 56,
                padding: const EdgeInsets.all(AppSpacing.xs),
                decoration: BoxDecoration(
                  color: Colors.black.withAlpha(64),
                  borderRadius: AppRadius.borderPill,
                  border: Border.all(color: Colors.white.withAlpha(77)),
                ),
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Text(
                      'Slide to Send SOS',
                      style: AppTypography.bodyMedium(
                        color: Colors.white.withAlpha(217),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    SliderTheme(
                      data: SliderTheme.of(context).copyWith(
                        thumbShape:
                            const RoundSliderThumbShape(enabledThumbRadius: 22),
                        thumbColor: AppColors.error,
                        activeTrackColor: Colors.transparent,
                        inactiveTrackColor: Colors.transparent,
                        overlayColor: Colors.transparent,
                      ),
                      child: Slider(
                        value: _sliderValue,
                        semanticFormatterCallback: (v) =>
                            v >= 0.9 ? 'Release to send SOS' : 'Slide to send SOS',
                        onChanged: (v) => setState(() => _sliderValue = v),
                        // Fire once, on release — previously every drag
                        // update past 90% pushed another alert screen.
                        onChangeEnd: (v) {
                          if (v >= 0.9) _send();
                          setState(() => _sliderValue = 0);
                        },
                      ),
                    ),
                  ],
                ),
              ),
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
