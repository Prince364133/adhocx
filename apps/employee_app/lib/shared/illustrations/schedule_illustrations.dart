import 'package:flutter/material.dart';
import 'package:adhocx_employee/theme/app_colors.dart';

/// Vector illustrations for Batch 03 (Schedule & Calendar)

/// 1. Paper Airplane Submitted Badge (Screen 10)
class PaperPlaneSubmittedBadge extends StatelessWidget {
  const PaperPlaneSubmittedBadge({super.key});

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
        child: Icon(Icons.send_rounded, size: 38, color: AppColors.success),
      ),
    );
  }
}

/// 2. Calendar No Trips Badge (Screen 7)
class CalendarNoTripsBadge extends StatelessWidget {
  const CalendarNoTripsBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 110,
      height: 100,
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border, width: 1.5),
      ),
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.center,
        children: [
          const Icon(
            Icons.calendar_month_rounded,
            size: 54,
            color: AppColors.primaryBlueLight,
          ),
          Positioned(
            bottom: -8,
            right: -8,
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: AppColors.error,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 2.5),
              ),
              child: const Icon(
                Icons.close_rounded,
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

/// 3. Pending Clock Badge (Screen 11)
class PendingClockBadge extends StatelessWidget {
  const PendingClockBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 56,
      height: 56,
      decoration: const BoxDecoration(
        color: Color(0xFFFEF3C7),
        shape: BoxShape.circle,
      ),
      child: const Center(
        child: Icon(Icons.access_time_filled_rounded, size: 30, color: Color(0xFFD97706)),
      ),
    );
  }
}

/// 4. Approved Checkmark Badge (Screen 12)
class RequestApprovedBadge extends StatelessWidget {
  const RequestApprovedBadge({super.key});

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

/// 5. Rejected Cross Badge (Screen 13)
class RequestRejectedBadge extends StatelessWidget {
  const RequestRejectedBadge({super.key});

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


