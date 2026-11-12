import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../theme/app_colors.dart';
import '../feedback/employee_entrance.dart';
import '../feedback/employee_press_scale.dart';

/// Compact trip summary card for AdhocX Home and Active Trip screens.
/// Displays next upcoming pickup or drop with key actions.
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
    return EmployeeEntrance(
      child: EmployeePressScale(
        enabled: onTap != null,
        child: Material(
          color: Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(10),
            child: Ink(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.border, width: 1.2),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top row: Badge + Date
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.primaryBlueLight,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          badgeText,
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primaryBlue,
                          ),
                        ),
                      ),
                      Text(
                        date,
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Trip Title
                  Text(
                    title,
                    style: GoogleFonts.inter(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Time & Direction Icon
                  Row(
                    children: [
                      Icon(
                        isDrop
                            ? Icons.business_rounded
                            : Icons.directions_car_filled_rounded,
                        color: AppColors.primaryBlue,
                        size: 22,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        isDrop ? 'Drop at ' : 'Pickup at ',
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      Text(
                        time,
                        style: GoogleFonts.inter(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),

                  // Action Buttons Row
                  if (primaryActionLabel != null ||
                      secondaryActionLabel != null) ...[
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        if (primaryActionLabel != null)
                          Expanded(
                            flex: 2,
                            child: SizedBox(
                              height: 44,
                              child: EmployeePressScale(
                                enabled: onPrimaryAction != null,
                                borderRadius: 10,
                                shadowColor: AppColors.primaryBlue,
                                child: ElevatedButton(
                                  onPressed: onPrimaryAction,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primaryBlue,
                                    foregroundColor: Colors.white,
                                    elevation: 0,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                  ),
                                  child: Text(
                                    primaryActionLabel!,
                                    style: GoogleFonts.inter(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        if (primaryActionLabel != null &&
                            secondaryActionLabel != null)
                          const SizedBox(width: 10),
                        if (secondaryActionLabel != null)
                          Expanded(
                            flex: 1,
                            child: SizedBox(
                              height: 44,
                              child: EmployeePressScale(
                                enabled: onSecondaryAction != null,
                                borderRadius: 10,
                                shadowColor: AppColors.primaryBlue,
                                child: OutlinedButton(
                                  onPressed: onSecondaryAction,
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: AppColors.primaryBlue,
                                    side: const BorderSide(
                                      color: AppColors.border,
                                      width: 1.2,
                                    ),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                  ),
                                  child: Text(
                                    secondaryActionLabel!,
                                    style: GoogleFonts.inter(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.primaryBlue,
                                    ),
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
      ),
    );
  }
}
