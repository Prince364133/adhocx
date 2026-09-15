import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../animations/app_bouncing_wrapper.dart';

/// Centralized Surface Card for AdhocX Mobile according to docs/04_DESIGN_SYSTEM.md.
class AppCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final Color? backgroundColor;
  final Color? borderColor;
  final double? width;
  final double? height;

  const AppCard({
    super.key,
    required this.child,
    this.padding = AppSpacing.paddingLg,
    this.onTap,
    this.backgroundColor,
    this.borderColor,
    this.width,
    this.height,
  });

  @override
  Widget build(BuildContext context) {
    final cardContent = Container(
      width: width,
      height: height,
      padding: padding,
      decoration: BoxDecoration(
        color: backgroundColor ?? AppColors.surfaceDark,
        borderRadius: AppRadius.borderLg,
        border: Border.all(
          color: borderColor ?? AppColors.borderDark,
          width: 1.2,
        ),
      ),
      child: child,
    );

    if (onTap != null) {
      return AppBouncingWrapper(
        onTap: onTap,
        lowerBound: 0.98,
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onTap,
            borderRadius: AppRadius.borderLg,
            child: cardContent,
          ),
        ),
      );
    }

    return cardContent;
  }
}

