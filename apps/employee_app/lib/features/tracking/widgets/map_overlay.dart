import 'package:flutter/material.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Round floating button for full-screen map screens (back, layers…).
class MapOverlayButton extends StatelessWidget {
  final IconData icon;
  final String tooltip;
  final VoidCallback? onPressed;
  final bool accent;

  const MapOverlayButton({
    super.key,
    required this.icon,
    required this.tooltip,
    required this.onPressed,
    this.accent = false,
  });

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    return Material(
      color: p.surface,
      shape: CircleBorder(side: BorderSide(color: p.border)),
      elevation: 2,
      shadowColor: Colors.black26,
      child: IconButton(
        tooltip: tooltip,
        icon: Icon(icon, size: 20, color: accent ? p.accent : p.textPrimary),
        onPressed: onPressed,
      ),
    );
  }
}

/// Pill-shaped floating title ("Live Tracking").
class MapOverlayTitle extends StatelessWidget {
  final String title;

  const MapOverlayTitle({super.key, required this.title});

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    return Material(
      color: p.surface,
      elevation: 2,
      shadowColor: Colors.black26,
      shape: StadiumBorder(side: BorderSide(color: p.border)),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg,
          vertical: AppSpacing.sm,
        ),
        child: Text(
          title,
          style: AppTypography.bodyMedium(
            color: p.textPrimary,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

/// Floating bottom card over a full-screen map.
class MapFloatingCard extends StatelessWidget {
  final Widget child;

  const MapFloatingCard({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    return Material(
      color: p.surface,
      elevation: 6,
      shadowColor: Colors.black38,
      shape: RoundedRectangleBorder(
        borderRadius: AppRadius.borderXxl,
        side: BorderSide(color: p.border),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.xl,
          vertical: AppSpacing.lg,
        ),
        child: child,
      ),
    );
  }
}
