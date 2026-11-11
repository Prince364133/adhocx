import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../theme/app_colors.dart';
import '../feedback/employee_entrance.dart';
import '../feedback/employee_press_scale.dart';

/// Flagship Gradient Hero Trip Card for AdhocX Home and Active Trip screens.
/// Displays next upcoming pickup or drop with high visual contrast and key actions.
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
          borderRadius: BorderRadius.circular(22),
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(22),
            child: Ink(
              width: double.infinity,
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                gradient: AppColors.primaryGradient,
                borderRadius: BorderRadius.circular(22),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primaryBlue.withValues(alpha: 0.24),
                    blurRadius: 18,
                    offset: const Offset(0, 8),
                  ),
                ],
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
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          badgeText,
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ),
                      Text(
                        date,
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: Colors.white.withValues(alpha: 0.9),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Trip Title
                  Text(
                    title,
                    style: GoogleFonts.inter(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Time & Direction Icon
                  Row(
                    children: [
                      Icon(
                        isDrop
                            ? Icons.business_rounded
                            : Icons.directions_car_filled_rounded,
                        color: Colors.white,
                        size: 24,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        isDrop ? 'Drop at ' : 'Pickup at ',
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          color: Colors.white.withValues(alpha: 0.85),
                        ),
                      ),
                      Text(
                        time,
                        style: GoogleFonts.inter(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),

                  // Action Buttons Row
                  if (primaryActionLabel != null ||
                      secondaryActionLabel != null) ...[
                    const SizedBox(height: 18),
                    Row(
                      children: [
                        if (primaryActionLabel != null)
                          Expanded(
                            flex: 2,
                            child: SizedBox(
                              height: 44,
                              child: EmployeePressScale(
                                enabled: onPrimaryAction != null,
                                borderRadius: 22,
                                shadowColor: Colors.white,
                                child: ElevatedButton(
                                  onPressed: onPrimaryAction,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.white,
                                    foregroundColor: AppColors.primaryBlueDark,
                                    elevation: 0,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(22),
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
                                borderRadius: 22,
                                shadowColor: Colors.white,
                                child: OutlinedButton(
                                  onPressed: onSecondaryAction,
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: Colors.white,
                                    side: BorderSide(
                                      color:
                                          Colors.white.withValues(alpha: 0.4),
                                      width: 1.2,
                                    ),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(22),
                                    ),
                                  ),
                                  child: Text(
                                    secondaryActionLabel!,
                                    style: GoogleFonts.inter(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: Colors.white,
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
