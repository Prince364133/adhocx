import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';

class VendorVehicleDetailsScreen extends StatelessWidget {
  const VendorVehicleDetailsScreen({super.key});

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
        title: Text('Vehicle Details', style: AppTypography.h3(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Vehicle Photo Box
              Container(
                height: 160,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : Colors.grey[100],
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                ),
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.directions_car, size: 72, color: Color(0xFF6C5CE7)),
                      const SizedBox(height: 4),
                      Text('Maruti Dzire • White Sedan', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: AppSpacing.lg),

              Text('DL 01 AB 1234', style: AppTypography.h1(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
              Text('White Sedan', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),

              const SizedBox(height: AppSpacing.lg),

              // Specifications Table
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                ),
                child: Column(
                  children: [
                    _buildSpecRow(context, 'Vehicle Type', 'Sedan', isDark),
                    const Divider(),
                    _buildSpecRow(context, 'Make / Model', 'Maruti Dzire', isDark),
                    const Divider(),
                    _buildSpecRow(context, 'Year', '2021', isDark),
                    const Divider(),
                    _buildSpecRow(context, 'Seating Capacity', '4 + 1', isDark),
                    const Divider(),
                    _buildSpecRow(context, 'Fuel Type', 'Petrol', isDark),
                    const Divider(),
                    _buildSpecRow(context, 'RC Status', 'Verified', isDark, isBadge: true),
                    const Divider(),
                    _buildSpecRow(context, 'Insurance Valid Till', '15 Nov 2026', isDark),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSpecRow(BuildContext context, String label, String value, bool isDark, {bool isBadge = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
          if (isBadge)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(color: AppColors.success.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(AppRadius.sm)),
              child: const Text('Verified', style: TextStyle(color: AppColors.success, fontWeight: FontWeight.bold, fontSize: 11)),
            )
          else
            Text(value, style: AppTypography.caption(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
