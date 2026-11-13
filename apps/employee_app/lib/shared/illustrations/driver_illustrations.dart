import 'package:flutter/material.dart';
import 'package:adhocx_employee/theme/app_colors.dart';

/// Vector badges and illustrations for Batch 04 (Driver & Cab Assignment)

/// 1. Cab Reassigned Badge (Amber circle with refresh/loop icon)
class CabReassignedBadge extends StatelessWidget {
  const CabReassignedBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 84,
      height: 84,
      decoration: BoxDecoration(
        color: AppColors.warningContainer,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.warningContainer, width: 2),
      ),
      child: const Center(
        child: Icon(Icons.sync_rounded, size: 44, color: AppColors.warning),
      ),
    );
  }
}

/// 2. Assignment Delayed Badge (Clock icon in amber circle)
class AssignmentDelayedBadge extends StatelessWidget {
  const AssignmentDelayedBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 84,
      height: 84,
      decoration: BoxDecoration(
        color: AppColors.warningContainer,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.warningContainer, width: 2),
      ),
      child: const Center(
        child:
            Icon(Icons.access_time_rounded, size: 44, color: AppColors.warning),
      ),
    );
  }
}

/// 3. Driver Replaced Badge (Blue circle with swap arrows)
class DriverReplacedBadge extends StatelessWidget {
  const DriverReplacedBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 84,
      height: 84,
      decoration: BoxDecoration(
        color: AppColors.primarySubtle.withValues(alpha: 0.4),
        shape: BoxShape.circle,
        border: Border.all(
            color: AppColors.primary.withValues(alpha: 0.3), width: 2),
      ),
      child: const Center(
        child: Icon(Icons.swap_horiz_rounded,
            size: 44, color: AppColors.primary),
      ),
    );
  }
}

/// 4. Driver Delay Graphic (Car with clock badge)
class DriverDelayGraphic extends StatelessWidget {
  const DriverDelayGraphic({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 110,
      height: 80,
      decoration: BoxDecoration(
        color: AppColors.primarySubtle,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.center,
        children: [
          const Icon(
            Icons.directions_car_filled_rounded,
            size: 54,
            color: AppColors.primary,
          ),
          Positioned(
            right: 14,
            top: 10,
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: AppColors.warning,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 2),
              ),
              child: const Icon(
                Icons.access_time_filled_rounded,
                size: 16,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 5. Vehicle Issue Badge (Red/coral triangle warning)
class VehicleIssueBadge extends StatelessWidget {
  const VehicleIssueBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 84,
      height: 84,
      decoration: BoxDecoration(
        color: AppColors.errorContainer,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.errorContainer, width: 2),
      ),
      child: const Center(
        child:
            Icon(Icons.warning_amber_rounded, size: 44, color: AppColors.error),
      ),
    );
  }
}

/// 6. No Cab Available Graphic (Car with red X badge)
class NoCabAvailableGraphic extends StatelessWidget {
  const NoCabAvailableGraphic({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 110,
      height: 80,
      decoration: BoxDecoration(
        color: AppColors.primarySubtle,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Stack(
        clipBehavior: Clip.none,
        alignment: Alignment.center,
        children: [
          const Icon(
            Icons.directions_car_filled_rounded,
            size: 54,
            color: AppColors.primary,
          ),
          Positioned(
            right: 14,
            top: 10,
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: AppColors.error,
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 2),
              ),
              child: const Icon(
                Icons.close_rounded,
                size: 16,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// 7. Reusable Driver Avatar with Star Rating & Trip Count
class DriverAvatarCard extends StatelessWidget {
  final String name;
  final double rating;
  final int? tripsCount;
  final VoidCallback? onCall;
  final VoidCallback? onMessage;

  const DriverAvatarCard({
    super.key,
    required this.name,
    required this.rating,
    this.tripsCount,
    this.onCall,
    this.onMessage,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Row(
        children: [
          const CircleAvatar(
            radius: 26,
            backgroundColor: AppColors.primarySubtle,
            child: Icon(Icons.person, color: AppColors.primary, size: 30),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimaryLight,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.star_rounded,
                        size: 16, color: AppColors.starAmber),
                    const SizedBox(width: 4),
                    Text(
                      tripsCount != null
                          ? '$rating ($tripsCount trips)'
                          : '$rating',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textSecondaryLight,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          if (onCall != null)
            IconButton(
              icon: const Icon(Icons.phone_in_talk_rounded,
                  color: AppColors.primary),
              onPressed: onCall,
            ),
        ],
      ),
    );
  }
}
