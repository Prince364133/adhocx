import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../theme/app_colors.dart';
import '../buttons/employee_pill_filter.dart';
import '../feedback/employee_entrance.dart';

/// Reusable Driver & Vehicle Information Card for AdhocX.
/// Displays driver profile, rating, vehicle registration, and quick contact action buttons.
class EmployeeDriverCard extends StatelessWidget {
  final String name;
  final double rating;
  final String? vehicleModel;
  final String vehicleNumber;
  final String? phone;
  final String? experience;
  final VoidCallback? onCall;
  final VoidCallback? onChat;
  final VoidCallback? onViewDetails;

  const EmployeeDriverCard({
    super.key,
    required this.name,
    this.rating = 4.8,
    this.vehicleModel,
    required this.vehicleNumber,
    this.phone,
    this.experience,
    this.onCall,
    this.onChat,
    this.onViewDetails,
  });

  @override
  Widget build(BuildContext context) {
    return EmployeeEntrance(
      delay: const Duration(milliseconds: 80),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          children: [
            Row(
              children: [
                // Driver Avatar with Verification Check
                Stack(
                  alignment: Alignment.bottomRight,
                  children: [
                    const CircleAvatar(
                      radius: 26,
                      backgroundColor: AppColors.primaryBlueLight,
                      child: Icon(
                        Icons.person,
                        size: 30,
                        color: AppColors.primaryBlue,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.all(3),
                      decoration: const BoxDecoration(
                        color: AppColors.success,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.check,
                          size: 10, color: Colors.white),
                    ),
                  ],
                ),
                const SizedBox(width: 14),

                // Name, Rating, Vehicle Model
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: GoogleFonts.inter(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Row(
                        children: [
                          const Icon(Icons.star_rounded,
                              size: 16, color: AppColors.accentAmber),
                          const SizedBox(width: 3),
                          Text(
                            rating.toStringAsFixed(1),
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          if (experience != null) ...[
                            Text(
                              ' • $experience',
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                color: AppColors.textMuted,
                              ),
                            ),
                          ],
                        ],
                      ),
                      if (vehicleModel != null) ...[
                        const SizedBox(height: 3),
                        Text(
                          vehicleModel!,
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),

                // Vehicle Number Badge
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceMuted,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Text(
                    vehicleNumber,
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ],
            ),

            // Action Buttons: Call & Chat
            if (onCall != null || onChat != null || onViewDetails != null) ...[
              const SizedBox(height: 14),
              const Divider(height: 1, color: AppColors.borderSubtle),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  if (onViewDetails != null)
                    TextButton(
                      onPressed: onViewDetails,
                      style: TextButton.styleFrom(
                        padding: EdgeInsets.zero,
                        minimumSize: const Size(50, 30),
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      child: Text(
                        'View Driver Profile',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primaryBlue,
                        ),
                      ),
                    )
                  else
                    const SizedBox.shrink(),
                  Row(
                    children: [
                      if (onChat != null) ...[
                        EmployeeIconButton(
                          icon: Icons.chat_bubble_outline_rounded,
                          onPressed: onChat,
                          size: 36,
                          iconSize: 18,
                          backgroundColor: AppColors.primaryBlueSoft,
                          iconColor: AppColors.primaryBlue,
                          tooltip: 'Message Driver',
                        ),
                        const SizedBox(width: 8),
                      ],
                      if (onCall != null) ...[
                        EmployeeIconButton(
                          icon: Icons.phone_rounded,
                          onPressed: onCall,
                          size: 36,
                          iconSize: 18,
                          backgroundColor: AppColors.successLight,
                          iconColor: AppColors.success,
                          tooltip: 'Call Driver',
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
