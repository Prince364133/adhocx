import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../theme/app_colors.dart';
import '../feedback/employee_press_scale.dart';

/// Primary Brand Action Button for AdhocX.
/// Uses the AdhocX brand color with a compact corporate shape and loading state.
class EmployeePrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final double height;
  final double? width;
  final IconData? icon;
  final Color? backgroundColor;
  final Color? foregroundColor;
  final Gradient? gradient;
  final double borderRadius;

  const EmployeePrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.isLoading = false,
    this.height = 48,
    this.width,
    this.icon,
    this.backgroundColor,
    this.foregroundColor,
    this.gradient,
    this.borderRadius = 12,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveBg = backgroundColor ?? AppColors.primaryBlue;
    final effectiveFg = foregroundColor ?? AppColors.textLight;
    final isEnabled = onPressed != null && !isLoading;

    return SizedBox(
      width: width ?? double.infinity,
      height: height,
      child: EmployeePressScale(
        enabled: isEnabled,
        borderRadius: borderRadius,
        shadowColor: Colors.transparent,
        child: DecoratedBox(
          decoration: BoxDecoration(
            gradient: (gradient != null && isEnabled) ? gradient : null,
            borderRadius: BorderRadius.circular(borderRadius),
          ),
          child: ElevatedButton(
            onPressed: isLoading ? null : onPressed,
            style: ElevatedButton.styleFrom(
              backgroundColor:
                  gradient != null ? Colors.transparent : effectiveBg,
              foregroundColor: effectiveFg,
              disabledBackgroundColor: effectiveBg.withValues(alpha: 0.55),
              disabledForegroundColor: effectiveFg.withValues(alpha: 0.75),
              elevation: 0,
              shadowColor: Colors.transparent,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(borderRadius),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 24),
            ),
            child: isLoading
                ? SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      valueColor: AlwaysStoppedAnimation<Color>(effectiveFg),
                    ),
                  )
                : Row(
                    mainAxisSize: MainAxisSize.min,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (icon != null) ...[
                        Icon(icon, size: 20, color: effectiveFg),
                        const SizedBox(width: 8),
                      ],
                      Flexible(
                        child: Text(
                          label,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: effectiveFg,
                            letterSpacing: 0.1,
                          ),
                        ),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}
