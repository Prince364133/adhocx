import 'package:flutter/material.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_radius.dart';
import '../../../theme/app_spacing.dart';
import '../../../theme/app_typography.dart';
import '../feedback/employee_entrance.dart';

/// Brand hero card for the next pickup/drop (Home, Active Trip).
/// Driver tokens: primary gradient, 16px (xxl) radius, flat (no glow shadow),
/// 8px-radius 44px action buttons, Inter scale from AppTypography.
class EmployeeHeroTripCard extends StatelessWidget {
  final String title;
  final String date;
  final String time;
  final String badgeText;
  final bool isDrop;
  final String? driverName;
  final String? vehicleNumber;
  final String? pickupLocation;
  final String? dropLocation;
  final String? primaryActionLabel;
  final VoidCallback? onPrimaryAction;
  final String? secondaryActionLabel;
  final VoidCallback? onSecondaryAction;
  final VoidCallback? onTap;

  const EmployeeHeroTripCard({
    super.key,
    required this.title,
    required this.date,
    required this.time,
    this.badgeText = 'Next Trip',
    this.isDrop = false,
    this.driverName,
    this.vehicleNumber,
    this.pickupLocation,
    this.dropLocation,
    this.primaryActionLabel,
    this.onPrimaryAction,
    this.secondaryActionLabel,
    this.onSecondaryAction,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    const onBrand = Colors.white;
    final onBrandMuted = Colors.white.withAlpha(217);

    return EmployeeEntrance(
      child: Material(
        color: Colors.transparent,
        borderRadius: AppRadius.borderXxl,
        child: InkWell(
          onTap: onTap,
          borderRadius: AppRadius.borderXxl,
          child: Ink(
            width: double.infinity,
            padding: AppSpacing.paddingXl,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  AppColors.primaryGradientStart,
                  AppColors.primaryGradientEnd,
                ],
              ),
              borderRadius: AppRadius.borderXxl,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Badge + date
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.sm + 2,
                        vertical: AppSpacing.xs,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withAlpha(51),
                        borderRadius: AppRadius.borderPill,
                      ),
                      child: Text(
                        badgeText,
                        style: AppTypography.micro(
                          color: onBrand,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Flexible(
                      child: Text(
                        date,
                        maxLines: 1,
                        textAlign: TextAlign.end,
                        style: AppTypography.caption(
                          color: onBrandMuted,
                          fontWeight: FontWeight.w500,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),

                Text(title, style: AppTypography.h3(color: onBrand)),
                const SizedBox(height: AppSpacing.sm),

                Row(
                  children: [
                    Icon(
                      isDrop
                          ? Icons.business_rounded
                          : Icons.directions_car_filled_rounded,
                      color: onBrand,
                      size: 22,
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Text.rich(
                        TextSpan(
                          children: [
                            TextSpan(
                              text: isDrop ? 'Drop at ' : 'Pickup at ',
                              style: AppTypography.body(color: onBrandMuted),
                            ),
                            TextSpan(
                              text: time,
                              style: AppTypography.h2(
                                color: onBrand,
                                fontSize: 20,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),

                if (primaryActionLabel != null ||
                    secondaryActionLabel != null) ...[
                  const SizedBox(height: AppSpacing.lg),
                  Row(
                    children: [
                      if (primaryActionLabel != null)
                        Expanded(
                          flex: 2,
                          child: SizedBox(
                            height: 44,
                            child: ElevatedButton(
                              onPressed: onPrimaryAction,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.white,
                                foregroundColor: AppColors.primaryHover,
                                elevation: 0,
                                shape: RoundedRectangleBorder(
                                  borderRadius: AppRadius.borderMd,
                                ),
                              ),
                              child: Text(
                                primaryActionLabel!,
                                style: AppTypography.button(
                                  color: AppColors.primaryHover,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ),
                        ),
                      if (primaryActionLabel != null &&
                          secondaryActionLabel != null)
                        const SizedBox(width: AppSpacing.sm + 2),
                      if (secondaryActionLabel != null)
                        Expanded(
                          child: SizedBox(
                            height: 44,
                            child: OutlinedButton(
                              onPressed: onSecondaryAction,
                              style: OutlinedButton.styleFrom(
                                foregroundColor: onBrand,
                                side: BorderSide(
                                  color: Colors.white.withAlpha(102),
                                  width: 1.2,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: AppRadius.borderMd,
                                ),
                              ),
                              child: Text(
                                secondaryActionLabel!,
                                style: AppTypography.button(
                                  color: onBrand,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
