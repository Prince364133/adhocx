import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';

class VendorReviewRequirementScreen extends StatelessWidget {
  const VendorReviewRequirementScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        elevation: 0,
        leading: IconButton(
          onPressed: () => context.pop(),
          icon: Icon(Icons.arrow_back, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
        ),
        title: Text(
          'Review Requirement',
          style: AppTypography.h3(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Stepper Header (15 Edit badge on step 5)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: List.generate(5, (index) {
                  final stepNum = index + 1;
                  return CircleAvatar(
                    radius: 14,
                    backgroundColor: const Color(0xFF6C5CE7),
                    child: Text(
                      '$stepNum',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  );
                }),
              ),
            ),

            const Divider(),

            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Trip Summary Header + Edit Link
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Trip Summary',
                          style: AppTypography.h3(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        TextButton(
                          onPressed: () => context.pop(),
                          child: const Text('Edit', style: TextStyle(color: Color(0xFF6C5CE7), fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),

                    const SizedBox(height: AppSpacing.xs),

                    // Details Card Breakdown
                    Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(AppRadius.lg),
                        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                      ),
                      child: Column(
                        children: [
                          _buildReviewRow(context, Icons.directions_car_outlined, 'Vehicle Type', 'Sedan', isDark),
                          const Divider(),
                          _buildReviewRow(context, Icons.format_list_numbered, 'Quantity', '10 Vehicles', isDark),
                          const Divider(),
                          _buildReviewRow(context, Icons.swap_calls, 'Trip Type', 'One Way', isDark),
                          const Divider(),
                          _buildReviewRow(context, Icons.location_on_outlined, 'Pickup', 'DLF Cyber City, Gurugram', isDark),
                          const Divider(),
                          _buildReviewRow(context, Icons.pin_drop_outlined, 'Destination', 'Indira Gandhi Airport, Delhi', isDark),
                          const Divider(),
                          _buildReviewRow(context, Icons.calendar_today_outlined, 'Pickup Date', '10 May 2025', isDark),
                          const Divider(),
                          _buildReviewRow(context, Icons.access_time_outlined, 'Pickup Time', '06:30 PM', isDark),
                          const Divider(),
                          _buildReviewRow(context, Icons.alt_route, 'Additional Stops', '0', isDark),
                          const Divider(),
                          _buildReviewRow(context, Icons.person_outline, 'Passengers', '1', isDark),
                          const Divider(),
                          _buildReviewRow(context, Icons.luggage_outlined, 'Luggage', 'Not Specified', isDark),
                          const Divider(),
                          _buildReviewRow(context, Icons.note_outlined, 'Special Requests', '-', isDark),
                        ],
                      ),
                    ),

                    const SizedBox(height: AppSpacing.xl),

                    // Bottom Action Buttons (Back + Confirm & Post)
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => context.pop(),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                            ),
                            child: const Text('Back', style: TextStyle(fontWeight: FontWeight.bold)),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(
                          flex: 2,
                          child: AppPrimaryButton(
                            text: 'Confirm & Post',
                            onPressed: () => context.push(AppRoutes.vendorRequirementPostedConfirmationScreen),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReviewRow(BuildContext context, IconData icon, String label, String value, bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        children: [
          Icon(icon, size: 18, color: const Color(0xFF6C5CE7)),
          const SizedBox(width: 8),
          Text(
            label,
            style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
          ),
          const Spacer(),
          Text(
            value,
            style: AppTypography.caption(
              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}
