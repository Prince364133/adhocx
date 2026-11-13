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
        color: AppColors.successContainer,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.accentGreenLight, width: 2),
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
        color: AppColors.slate100,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.borderLight, width: 1.5),
      ),
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.center,
        children: [
          const Icon(
            Icons.calendar_month_rounded,
            size: 54,
            color: AppColors.primarySubtle,
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
        color: AppColors.warningContainer,
        shape: BoxShape.circle,
      ),
      child: const Center(
        child: Icon(Icons.access_time_filled_rounded, size: 30, color: AppColors.warning),
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
        color: AppColors.successContainer,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.accentGreenLight, width: 2),
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
        color: AppColors.errorContainer,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.errorContainer, width: 2),
      ),
      child: const Center(
        child: Icon(Icons.close_rounded, size: 44, color: AppColors.error),
      ),
    );
  }
}


