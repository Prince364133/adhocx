import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:adhocx_employee/theme/app_colors.dart';

/// Clean, scalable vector illustrations crafted for the AdhocX Employee App.
/// Matches the Batch 01 visual mockup exactly without requiring external assets.

/// 1. Welcome Illustration (Modern City & Sedan Car)
class WelcomeIllustration extends StatelessWidget {
  final double height;
  const WelcomeIllustration({super.key, this.height = 190});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            const Color(0xFFE8F1FD),
            const Color(0xFFF3F7FD).withValues(alpha: 0.8),
            Colors.white,
          ],
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Background soft blue cloud circles
          Positioned(
            top: 20,
            left: 30,
            child: Container(
              width: 90,
              height: 90,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFD6E6FD).withValues(alpha: 0.4),
              ),
            ),
          ),
          Positioned(
            top: 15,
            right: 40,
            child: Container(
              width: 110,
              height: 110,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFD6E6FD).withValues(alpha: 0.4),
              ),
            ),
          ),
          // City Buildings
          Positioned(
            bottom: 45,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                _buildBuilding(38, 90, const Color(0xFFBFD7FC)),
                const SizedBox(width: 4),
                _buildBuilding(50, 120, const Color(0xFF9BBBFC),
                    hasWindows: true),
                const SizedBox(width: 4),
                _buildBuilding(54, 135, const Color(0xFF6F9EFA),
                    hasWindows: true),
                const SizedBox(width: 4),
                _buildBuilding(44, 105, const Color(0xFF9BBBFC)),
                const SizedBox(width: 4),
                _buildBuilding(34, 75, const Color(0xFFBFD7FC)),
              ],
            ),
          ),
          // Road Line
          Positioned(
            bottom: 24,
            left: 20,
            right: 20,
            child: Container(
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFCBD5E1),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          // White Modern Corporate Sedan Car
          Positioned(
            bottom: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFCEE0FD), width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primaryBlue.withValues(alpha: 0.12),
                    blurRadius: 16,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.directions_car_filled,
                    size: 26,
                    color: AppColors.primaryBlue,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Corporate Commute',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primaryBlueDark,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  static Widget _buildBuilding(double width, double height, Color color,
      {bool hasWindows = false}) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: color,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
      ),
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
      child: hasWindows
          ? Column(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: List.generate(
                4,
                (_) => Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    Container(
                        width: 4,
                        height: 4,
                        color: Colors.white.withValues(alpha: 0.8)),
                    Container(
                        width: 4,
                        height: 4,
                        color: Colors.white.withValues(alpha: 0.8)),
                  ],
                ),
              ),
            )
          : null,
    );
  }
}

/// 2. City Skyline Silhouette (for bottom of Login Options)
class CitySilhouetteIllustration extends StatelessWidget {
  final double height;
  const CitySilhouetteIllustration({super.key, this.height = 110});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: height,
      width: double.infinity,
      child: Opacity(
        opacity: 0.22,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            _bar(24, 40),
            _bar(30, 65),
            _bar(20, 50),
            _bar(36, 95),
            _bar(28, 70),
            _bar(40, 105),
            _bar(26, 60),
            _bar(34, 85),
            _bar(22, 45),
            _bar(32, 75),
          ],
        ),
      ),
    );
  }

  Widget _bar(double w, double h) {
    return Container(
      width: w,
      height: h,
      decoration: const BoxDecoration(
        color: AppColors.primaryBlue,
        borderRadius: BorderRadius.vertical(top: Radius.circular(3)),
      ),
    );
  }
}

/// 3. Company SSO Badge (Shield with Corporate Building)
class CompanySsoBadge extends StatelessWidget {
  const CompanySsoBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 88,
      height: 88,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFE0ECFD), Color(0xFFC7DEFC)],
        ),
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryBlue.withValues(alpha: 0.18),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: const Center(
        child: Icon(
          Icons.apartment_rounded,
          size: 44,
          color: AppColors.primaryBlue,
        ),
      ),
    );
  }
}

/// 4. Verified Account Badge (Screen 7)
class VerifiedAccountBadge extends StatelessWidget {
  const VerifiedAccountBadge({super.key});

  @override
  Widget build(BuildContext context) {
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    final badge = Container(
      width: 80,
      height: 80,
      decoration: BoxDecoration(
        color: AppColors.successLight,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.successBorder, width: 2),
        boxShadow: [
          BoxShadow(
            color: AppColors.success.withValues(alpha: 0.18),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
    );

    if (reduceMotion) {
      return SizedBox(
        width: 80,
        height: 80,
        child: Stack(
          alignment: Alignment.center,
          children: [
            badge,
            const Icon(
              Icons.check_rounded,
              size: 42,
              color: AppColors.success,
            ),
          ],
        ),
      );
    }

    return SizedBox(
      width: 80,
      height: 80,
      child: Stack(
        alignment: Alignment.center,
        clipBehavior: Clip.none,
        children: [
          TweenAnimationBuilder<double>(
            tween: Tween<double>(begin: 0, end: 1),
            duration: const Duration(milliseconds: 620),
            curve: Curves.easeOutCubic,
            builder: (context, value, child) => Opacity(
              opacity: 0.3 * (1 - value),
              child: Transform.scale(
                scale: 0.7 + (0.8 * value),
                child: child,
              ),
            ),
            child: Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: AppColors.success.withValues(alpha: 0.45),
                  width: 2,
                ),
              ),
            ),
          ),
          TweenAnimationBuilder<double>(
            tween: Tween<double>(begin: 0.78, end: 1),
            duration: const Duration(milliseconds: 420),
            curve: Curves.easeOutBack,
            builder: (context, scale, child) => Transform.scale(
              scale: scale,
              child: child,
            ),
            child: badge,
          ),
          TweenAnimationBuilder<double>(
            tween: Tween<double>(begin: 0.2, end: 1),
            duration: const Duration(milliseconds: 320),
            curve: Curves.easeOutBack,
            builder: (context, scale, child) => Opacity(
              opacity: scale.clamp(0, 1),
              child: Transform.scale(scale: scale, child: child),
            ),
            child: const Icon(
              Icons.check_rounded,
              size: 42,
              color: AppColors.success,
            ),
          ),
        ],
      ),
    );
  }
}

/// 5. Permission Badges (Screens 8 & 9)
class PermissionBadge extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final Color backgroundColor;

  const PermissionBadge({
    super.key,
    required this.icon,
    this.iconColor = AppColors.primaryBlue,
    this.backgroundColor = const Color(0xFFEFF6FF),
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 90,
      height: 90,
      decoration: BoxDecoration(
        color: backgroundColor,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: iconColor.withValues(alpha: 0.16),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Center(
        child: Icon(icon, size: 44, color: iconColor),
      ),
    );
  }
}

/// 6. Calendar Schedule Illustration (Onboarding 1/3)
class CalendarScheduleIllustration extends StatelessWidget {
  const CalendarScheduleIllustration({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 170,
      height: 150,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryBlue.withValues(alpha: 0.12),
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          // Header Bar
          Container(
            height: 42,
            decoration: const BoxDecoration(
              color: AppColors.primaryBlue,
              borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                        color: Colors.white, shape: BoxShape.circle)),
                Text(
                  'ROSTER',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                    letterSpacing: 1.5,
                  ),
                ),
                Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                        color: Colors.white, shape: BoxShape.circle)),
              ],
            ),
          ),
          // Calendar Grid
          Positioned(
            top: 54,
            left: 14,
            right: 14,
            bottom: 12,
            child: GridView.builder(
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 5,
                mainAxisSpacing: 6,
                crossAxisSpacing: 6,
              ),
              itemCount: 15,
              itemBuilder: (context, index) {
                final isSelected = index == 7;
                return Container(
                  decoration: BoxDecoration(
                    color: isSelected
                        ? AppColors.secondaryOrange
                        : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Center(
                    child: Text(
                      '${index + 1}',
                      style: GoogleFonts.inter(
                        fontSize: 10,
                        fontWeight:
                            isSelected ? FontWeight.w800 : FontWeight.w500,
                        color:
                            isSelected ? Colors.white : AppColors.textSecondary,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          // Clock Badge on bottom right
          Positioned(
            bottom: -10,
            right: -10,
            child: Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: AppColors.secondaryOrange,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 3),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.secondaryOrange.withValues(alpha: 0.35),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: const Icon(
                Icons.access_time_filled_rounded,
                size: 24,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 7. Route Map Illustration (Onboarding 2/3)
class RouteMapIllustration extends StatelessWidget {
  const RouteMapIllustration({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 170,
      height: 150,
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryBlue.withValues(alpha: 0.12),
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Map road lines
          Positioned.fill(
            child: CustomPaint(
              painter: _MapRoutePainter(),
            ),
          ),
          // Start point
          Positioned(
            top: 28,
            left: 28,
            child: Container(
              width: 14,
              height: 14,
              decoration: BoxDecoration(
                color: AppColors.primaryBlue,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 2.5),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primaryBlue.withValues(alpha: 0.35),
                    blurRadius: 6,
                  ),
                ],
              ),
            ),
          ),
          // Moving Car
          Positioned(
            top: 68,
            left: 68,
            child: Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.15),
                    blurRadius: 8,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: const Icon(
                Icons.directions_car_rounded,
                size: 18,
                color: AppColors.primaryBlue,
              ),
            ),
          ),
          // Destination Pin (Orange)
          Positioned(
            bottom: 24,
            right: 28,
            child: Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: AppColors.secondaryOrange,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 2.5),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.secondaryOrange.withValues(alpha: 0.4),
                    blurRadius: 8,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: const Icon(
                Icons.location_on_rounded,
                size: 18,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _MapRoutePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final roadPaint = Paint()
      ..color = const Color(0xFFE2E8F0)
      ..strokeWidth = 12
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final routePaint = Paint()
      ..color = AppColors.primaryBlue
      ..strokeWidth = 4
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final path = Path()
      ..moveTo(35, 35)
      ..lineTo(35, 80)
      ..cubicTo(35, 95, 60, 95, 75, 80)
      ..lineTo(110, 50)
      ..cubicTo(125, 40, 140, 60, 140, 120);

    canvas.drawPath(path, roadPaint);
    canvas.drawPath(path, routePaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// 8. SOS Shield Illustration (Onboarding 3/3)
class SosShieldIllustration extends StatelessWidget {
  const SosShieldIllustration({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 140,
      height: 140,
      decoration: BoxDecoration(
        color: AppColors.secondaryOrangeLight,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: AppColors.secondaryOrange.withValues(alpha: 0.25),
            blurRadius: 28,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Center(
        child: Container(
          width: 96,
          height: 104,
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Color(0xFFFF7E39),
                AppColors.secondaryOrange,
                Color(0xFFE04E00),
              ],
            ),
            borderRadius: BorderRadius.only(
              topLeft: Radius.circular(24),
              topRight: Radius.circular(24),
              bottomLeft: Radius.circular(48),
              bottomRight: Radius.circular(48),
            ),
            boxShadow: [
              BoxShadow(
                color: Color(0x40FF5F09),
                blurRadius: 16,
                offset: Offset(0, 8),
              ),
            ],
          ),
          child: Center(
            child: Text(
              'SOS',
              style: GoogleFonts.inter(
                fontSize: 26,
                fontWeight: FontWeight.w900,
                color: Colors.white,
                letterSpacing: 2.0,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// 9. All Set Sunburst Checkmark (Onboarding Complete - Screen 13)
class AllSetIllustration extends StatelessWidget {
  const AllSetIllustration({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 110,
      height: 110,
      decoration: BoxDecoration(
        color: AppColors.successLight,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.successBorder, width: 2),
        boxShadow: [
          BoxShadow(
            color: AppColors.success.withValues(alpha: 0.24),
            blurRadius: 32,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: const Center(
        child: Icon(
          Icons.check_rounded,
          size: 56,
          color: AppColors.success,
        ),
      ),
    );
  }
}

/// 10. Access Unavailable Badge (Screen 15)
class AccessUnavailableBadge extends StatelessWidget {
  const AccessUnavailableBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 90,
      height: 90,
      decoration: BoxDecoration(
        color: AppColors.errorLight,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.errorBorder, width: 2),
        boxShadow: [
          BoxShadow(
            color: AppColors.error.withValues(alpha: 0.2),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: const Center(
        child: Icon(
          Icons.close_rounded,
          size: 46,
          color: AppColors.error,
        ),
      ),
    );
  }
}
