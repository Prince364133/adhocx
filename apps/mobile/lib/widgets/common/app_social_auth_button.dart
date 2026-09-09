import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

enum SocialAuthType { google, apple }

/// Clean Vector Google 'G' Logo (Immune to Web CORS / Network failures)
class GoogleVectorIcon extends StatelessWidget {
  final double size;
  const GoogleVectorIcon({super.key, this.size = 20});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _GoogleLogoPainter(),
      ),
    );
  }
}

class _GoogleLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double w = size.width;
    final double h = size.height;
    final center = Offset(w / 2, h / 2);
    final radius = w / 2;
    final strokeWidth = w * 0.22;

    final paintBlue = Paint()
      ..color = AppColors.googleBlue
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.butt;

    final paintGreen = Paint()
      ..color = AppColors.googleGreen
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.butt;

    final paintYellow = Paint()
      ..color = AppColors.googleYellow
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.butt;

    final paintRed = Paint()
      ..color = AppColors.googleRed
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.butt;

    final rect = Rect.fromCircle(center: center, radius: radius - strokeWidth / 2);

    // Red arc (top)
    canvas.drawArc(rect, 3.14159 * 1.15, 3.14159 * 0.7, false, paintRed);
    // Yellow arc (left)
    canvas.drawArc(rect, 3.14159 * 0.65, 3.14159 * 0.5, false, paintYellow);
    // Green arc (bottom)
    canvas.drawArc(rect, 3.14159 * 0.05, 3.14159 * 0.6, false, paintGreen);
    // Blue arc (right)
    canvas.drawArc(rect, 3.14159 * 1.6, 3.14159 * 0.45, false, paintBlue);

    // Blue horizontal bar
    final barPaint = Paint()
      ..color = AppColors.googleBlue
      ..style = PaintingStyle.fill;

    final barRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(center.dx - 1, center.dy - strokeWidth / 2, radius + 1, strokeWidth),
      Radius.circular(strokeWidth * 0.2),
    );
    canvas.drawRRect(barRect, barPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class AppSocialAuthButton extends StatelessWidget {
  final SocialAuthType type;
  final VoidCallback onPressed;

  const AppSocialAuthButton({
    super.key,
    required this.type,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    final isGoogle = type == SocialAuthType.google;
    final label = isGoogle ? 'Continue with Google' : 'Continue with Apple';

    return OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.textPrimaryLight,
        backgroundColor: AppColors.surfaceLight,
        side: BorderSide(color: AppColors.borderLight),
        minimumSize: const Size(double.infinity, 48),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (isGoogle)
            const GoogleVectorIcon(size: 20)
          else
            const Icon(
              Icons.apple,
              size: 22,
              color: Colors.black,
            ),
          const SizedBox(width: AppSpacing.md),
          Text(
            label,
            style: AppTypography.body(
              color: AppColors.textPrimaryLight,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
