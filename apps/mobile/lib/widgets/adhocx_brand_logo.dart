import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';

/// Reusable AdhocX brand logo & icon components for the mobile application.
class AdhocxBrandLogo extends StatelessWidget {
  final double? width;
  final double? height;
  final BoxFit fit;
  final bool useSvg;

  const AdhocxBrandLogo({
    super.key,
    this.width,
    this.height = 36,
    this.fit = BoxFit.contain,
    this.useSvg = false,
  });

  @override
  Widget build(BuildContext context) {
    if (useSvg) {
      return SvgPicture.asset(
        'assets/images/adhocx_logo.svg',
        width: width,
        height: height,
        fit: fit,
      );
    }

    return Image.asset(
      'assets/images/adhocx_logo.png',
      width: width,
      height: height,
      fit: fit,
      errorBuilder: (context, error, stackTrace) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const AdhocxBrandIcon(size: 32),
            const SizedBox(width: 8),
            RichText(
              text: TextSpan(
                children: [
                  TextSpan(
                    text: 'Adhoc',
                    style: AppTypography.h3(
                      color: AppColors.textPrimaryDark,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  TextSpan(
                    text: 'X',
                    style: AppTypography.h3(
                      color: AppColors.primaryLight,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}

/// Standalone 'X' icon badge for AdhocX.
class AdhocxBrandIcon extends StatelessWidget {
  final double size;
  final double? borderRadius;
  final bool showBorder;
  final bool useSvg;

  const AdhocxBrandIcon({
    super.key,
    this.size = 48,
    this.borderRadius,
    this.showBorder = true,
    this.useSvg = false,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveRadius = borderRadius ?? (size * 0.25);

    if (useSvg) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(effectiveRadius),
        child: SvgPicture.asset(
          'assets/images/adhocx_icon.svg',
          width: size,
          height: size,
          fit: BoxFit.contain,
        ),
      );
    }

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(effectiveRadius),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.25),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(effectiveRadius),
        child: Image.asset(
          'assets/images/adhocx_icon.png',
          width: size,
          height: size,
          fit: BoxFit.contain,
          errorBuilder: (context, error, stackTrace) {
            return Container(
              width: size,
              height: size,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.primaryGradientStart, AppColors.primaryGradientEnd],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(effectiveRadius),
              ),
              child: Center(
                child: Text(
                  'X',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    fontSize: size * 0.55,
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
