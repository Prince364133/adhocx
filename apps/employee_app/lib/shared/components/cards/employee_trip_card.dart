import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../theme/app_colors.dart';
import '../badges/employee_status_badge.dart';
import '../feedback/employee_entrance.dart';
import '../feedback/employee_press_scale.dart';

/// Standard Trip List Item Card for AdhocX.
/// Used across Trip History, Daily Schedule, and Overview screens.
class EmployeeTripCard extends StatelessWidget {
  final String title;
  final String date;
  final String? time;
  final String? status;
  final String? route;
  final bool isDrop;
  final VoidCallback? onTap;
  final Widget? trailing;
  final bool enableAnimations;

  const EmployeeTripCard({
    super.key,
    required this.title,
    required this.date,
    this.time,
    this.status,
    this.route,
    this.isDrop = false,
    this.onTap,
    this.trailing,
    this.enableAnimations = true,
  });

  @override
  Widget build(BuildContext context) {
    return EmployeeEntrance(
      enabled: enableAnimations,
      child: EmployeePressScale(
        enabled: enableAnimations && onTap != null,
        child: Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.border),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: onTap,
              borderRadius: BorderRadius.circular(16),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Direction Icon Badge
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: isDrop
                            ? const Color(0xFFFFEDD5)
                            : AppColors.primaryBlueSoft,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        isDrop
                            ? Icons.business_rounded
                            : Icons.directions_car_filled_rounded,
                        color: isDrop
                            ? AppColors.secondaryOrange
                            : AppColors.primaryBlue,
                        size: 22,
                      ),
                    ),
                    const SizedBox(width: 14),

                    // Main Info
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  title,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.inter(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                              ),
                              if (status != null) ...[
                                const SizedBox(width: 8),
                                EmployeeStatusBadge.fromString(status),
                              ],
                            ],
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Text(
                                date,
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  color: AppColors.textMuted,
                                ),
                              ),
                              if (time != null) ...[
                                Text(
                                  ' • $time',
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              ],
                            ],
                          ),
                          if (route != null) ...[
                            const SizedBox(height: 4),
                            Text(
                              route!,
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),

                    // Trailing Action / Chevron
                    if (trailing != null) ...[
                      const SizedBox(width: 8),
                      trailing!,
                    ] else if (onTap != null) ...[
                      const SizedBox(width: 8),
                      const Icon(
                        Icons.chevron_right_rounded,
                        size: 20,
                        color: AppColors.textMuted,
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
