import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/illustrations/safety_illustrations.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import '../widgets/safety_widgets.dart';

/// Direct phone call to the 24/7 Safety Team via url_launcher `tel:`.
class SafetyTeamCallScreen extends StatefulWidget {
  const SafetyTeamCallScreen({super.key});

  static const String safetyHelplineNumber = '1800-419-7000';

  @override
  State<SafetyTeamCallScreen> createState() => _SafetyTeamCallScreenState();
}

class _SafetyTeamCallScreenState extends State<SafetyTeamCallScreen> {
  bool _calling = false;

  Future<void> _placeCall() async {
    setState(() => _calling = true);
    await dialNumber(SafetyTeamCallScreen.safetyHelplineNumber);
  }

  Widget _roundButton({
    required IconData icon,
    required Color color,
    required String label,
    required VoidCallback onTap,
  }) {
    return Semantics(
      button: true,
      label: label,
      excludeSemantics: true,
      child: Material(
        color: color,
        shape: const CircleBorder(),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.xl),
            child: Icon(icon, size: 32, color: Colors.white),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    void hangUp() => Navigator.of(context).maybePop();

    return Scaffold(
      backgroundColor: AppColors.slate900,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.pageHorizontal,
            vertical: AppSpacing.xxxl,
          ),
          child: Column(
            children: [
              const SizedBox(height: AppSpacing.xxxl),
              Text(
                'Safety Team',
                style: AppTypography.h1(color: Colors.white, fontSize: 26),
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                _calling
                    ? 'Dialing ${SafetyTeamCallScreen.safetyHelplineNumber}…'
                    : '24/7 Helpline • ${SafetyTeamCallScreen.safetyHelplineNumber}',
                style: AppTypography.body(
                  color: _calling
                      ? AppColors.accentGreenLight
                      : Colors.white.withAlpha(179),
                  fontWeight: FontWeight.w500,
                ),
              ),
              const Spacer(),
              const SafetyCallPulseAvatar(),
              const Spacer(),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _roundButton(
                    icon: Icons.call_rounded,
                    color: AppColors.success,
                    label: 'Call safety team',
                    onTap: _placeCall,
                  ),
                  _roundButton(
                    icon: Icons.call_end_rounded,
                    color: AppColors.error,
                    label: 'Close',
                    onTap: hangUp,
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.xxl),
            ],
          ),
        ),
      ),
    );
  }
}
