import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/illustrations/safety_illustrations.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';

/// Incoming / connected call with the safety team.
/// Call surface: fixed dark slate in light and dark mode.
class SafetyTeamCallScreen extends StatefulWidget {
  const SafetyTeamCallScreen({super.key});

  @override
  State<SafetyTeamCallScreen> createState() => _SafetyTeamCallScreenState();
}

class _SafetyTeamCallScreenState extends State<SafetyTeamCallScreen> {
  bool _answered = false;
  bool _muted = false;
  bool _speaker = false;

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

  Widget _toggle({
    required IconData icon,
    required bool active,
    required String label,
    required VoidCallback onTap,
  }) {
    return IconButton(
      tooltip: label,
      isSelected: active,
      onPressed: onTap,
      style: IconButton.styleFrom(
        backgroundColor:
            active ? Colors.white.withAlpha(46) : Colors.transparent,
      ),
      icon: Icon(icon, color: Colors.white, size: 28),
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
            horizontal: AppSpacing.xxl,
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
                _answered ? 'Connected • 00:14' : 'Incoming Emergency Call...',
                style: AppTypography.body(
                  color: _answered
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
                children: _answered
                    ? [
                        // Mute / speaker were dead buttons; now toggle.
                        _toggle(
                          icon: _muted
                              ? Icons.mic_off_rounded
                              : Icons.mic_rounded,
                          active: _muted,
                          label: _muted ? 'Unmute' : 'Mute',
                          onTap: () => setState(() => _muted = !_muted),
                        ),
                        _roundButton(
                          icon: Icons.call_end_rounded,
                          color: AppColors.error,
                          label: 'End call',
                          onTap: hangUp,
                        ),
                        _toggle(
                          icon: Icons.volume_up_rounded,
                          active: _speaker,
                          label: _speaker ? 'Speaker off' : 'Speaker on',
                          onTap: () => setState(() => _speaker = !_speaker),
                        ),
                      ]
                    : [
                        _roundButton(
                          icon: Icons.call_rounded,
                          color: AppColors.success,
                          label: 'Accept call',
                          onTap: () => setState(() => _answered = true),
                        ),
                        _roundButton(
                          icon: Icons.call_end_rounded,
                          color: AppColors.error,
                          label: 'Decline call',
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
