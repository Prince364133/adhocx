import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Vector illustrations for Batch 02 (Home & Trip Overview)

/// 1. Empty State: Calendar with green checkmark (Screen 3)
class EmptyScheduleIllustration extends StatelessWidget {
  const EmptyScheduleIllustration({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 130,
      height: 120,
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.center,
        children: [
          const Icon(
            Icons.calendar_month_rounded,
            size: 64,
            color: AppColors.primaryBlueLight,
          ),
          Positioned(
            bottom: -8,
            right: -8,
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: AppColors.success,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 2.5),
              ),
              child: const Icon(
                Icons.check,
                size: 20,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 2. Car Arrived Illustration: White sedan with orange location pin (Screen 7)
class CarArrivedIllustration extends StatelessWidget {
  const CarArrivedIllustration({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 140,
      height: 110,
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          Positioned(
            top: 14,
            child: Container(
              padding: const EdgeInsets.all(6),
              decoration: const BoxDecoration(
                color: AppColors.secondaryOrange,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.location_on_rounded,
                size: 20,
                color: Colors.white,
              ),
            ),
          ),
          const Positioned(
            bottom: 16,
            child: Icon(
              Icons.directions_car_filled_rounded,
              size: 54,
              color: AppColors.primaryBlueDark,
            ),
          ),
        ],
      ),
    );
  }
}

/// 3. Boarded Seat Illustration: Passenger seat with checkmark (Screen 8)
class BoardedSeatIllustration extends StatelessWidget {
  const BoardedSeatIllustration({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 120,
      height: 110,
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          const Icon(
            Icons.airline_seat_recline_extra_rounded,
            size: 56,
            color: AppColors.primaryBlue,
          ),
          Positioned(
            bottom: 12,
            right: 18,
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: const BoxDecoration(
                color: AppColors.success,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.check,
                size: 14,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 4. In Progress Map Graphic: Mini road map en route to office (Screen 9)
class InProgressMapIllustration extends StatelessWidget {
  const InProgressMapIllustration({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 200,
      width: double.infinity,
      decoration: BoxDecoration(
        color: const Color(0xFFE2E8F0),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Stack(
        children: [
          // Road canvas
          Positioned.fill(
            child: CustomPaint(
              painter: _InProgressRoadPainter(),
            ),
          ),
          // Start point
          Positioned(
            bottom: 30,
            left: 30,
            child: Container(
              padding: const EdgeInsets.all(6),
              decoration: const BoxDecoration(
                color: AppColors.success,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.my_location, size: 16, color: Colors.white),
            ),
          ),
          // Moving cab
          Positioned(
            top: 70,
            left: 120,
            child: Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.18),
                    blurRadius: 8,
                  ),
                ],
              ),
              child: const Icon(
                Icons.directions_car_filled_rounded,
                size: 20,
                color: AppColors.primaryBlue,
              ),
            ),
          ),
          // Destination Office Building Pin
          Positioned(
            top: 24,
            right: 32,
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: const BoxDecoration(
                color: AppColors.primaryBlue,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.apartment_rounded, size: 20, color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }
}

class _InProgressRoadPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final roadPaint = Paint()
      ..color = Colors.white
      ..strokeWidth = 14
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final routePaint = Paint()
      ..color = AppColors.primaryBlue
      ..strokeWidth = 4
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final path = Path()
      ..moveTo(40, size.height - 40)
      ..cubicTo(70, size.height - 40, 90, 100, 130, 80)
      ..cubicTo(160, 65, 200, 40, size.width - 45, 35);

    canvas.drawPath(path, roadPaint);
    canvas.drawPath(path, routePaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// 5. Completed Checkmark Badge (Screen 10)
class TripCompletedBadge extends StatelessWidget {
  const TripCompletedBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 80,
      height: 80,
      decoration: BoxDecoration(
        color: AppColors.successLight,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.successBorder, width: 2),
      ),
      child: const Center(
        child: Icon(Icons.check_rounded, size: 44, color: AppColors.success),
      ),
    );
  }
}

/// 6. Cancelled Cross Badge (Screen 11)
class TripCancelledBadge extends StatelessWidget {
  const TripCancelledBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 80,
      height: 80,
      decoration: BoxDecoration(
        color: AppColors.errorLight,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.errorBorder, width: 2),
      ),
      child: const Center(
        child: Icon(Icons.close_rounded, size: 44, color: AppColors.error),
      ),
    );
  }
}

/// 7. Unserved Warning Badge (Screen 12)
class TripUnservedBadge extends StatelessWidget {
  const TripUnservedBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 80,
      height: 80,
      decoration: BoxDecoration(
        color: AppColors.warningLight,
        shape: BoxShape.circle,
        border: Border.all(color: const Color(0xFFFDE68A), width: 2),
      ),
      child: const Center(
        child: Icon(Icons.warning_amber_rounded, size: 44, color: Color(0xFFD97706)),
      ),
    );
  }
}

