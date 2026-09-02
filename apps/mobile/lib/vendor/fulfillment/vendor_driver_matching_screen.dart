import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';

class VendorDriverMatchingScreen extends StatelessWidget {
  const VendorDriverMatchingScreen({super.key});

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
          'Driver Matching',
          style: AppTypography.h3(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            onPressed: () {},
            icon: Icon(Icons.info_outline, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            children: [
              // Header Title
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Airport Transfer', style: AppTypography.h3(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                      Text('REQ-250510-0001', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(color: const Color(0xFF6C5CE7).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(AppRadius.sm)),
                    child: const Text('Dispatched', style: TextStyle(color: Color(0xFF6C5CE7), fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
                ],
              ),

              const SizedBox(height: AppSpacing.xl),

              // Radar Pulse Animation Graphic Container
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppSpacing.xl),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                ),
                child: Column(
                  children: [
                    Text('Finding drivers for 2 vehicles', style: AppTypography.h3(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Text('Expanding search radius...', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                    const SizedBox(height: AppSpacing.xl),

                    // Radar Graphic circles
                    Stack(
                      alignment: Alignment.center,
                      children: [
                        Container(width: 180, height: 180, decoration: BoxDecoration(shape: BoxShape.circle, color: const Color(0xFF6C5CE7).withValues(alpha: 0.05))),
                        Container(width: 130, height: 130, decoration: BoxDecoration(shape: BoxShape.circle, color: const Color(0xFF6C5CE7).withValues(alpha: 0.1))),
                        Container(width: 80, height: 80, decoration: BoxDecoration(shape: BoxShape.circle, color: const Color(0xFF6C5CE7).withValues(alpha: 0.2))),
                        Container(
                          width: 44,
                          height: 44,
                          decoration: const BoxDecoration(color: Color(0xFF6C5CE7), shape: BoxShape.circle),
                          child: const Icon(Icons.directions_car, color: Colors.white),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.lg),

              // Stats List Container
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                ),
                child: Column(
                  children: [
                    _buildStatLine(context, Icons.radar, 'Searching in 8.0 km radius', 'Active', isDark, isBadge: true),
                    const Divider(),
                    _buildStatLine(context, Icons.person_outline, 'Drivers Online', '25', isDark),
                    const Divider(),
                    _buildStatLine(context, Icons.people_outline, 'Matching Drivers', '18', isDark),
                    const Divider(),
                    _buildStatLine(context, Icons.timer_outlined, 'Estimated Time', '2 - 5 min', isDark),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.lg),

              // Bottom Info Banner
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: const Color(0xFF6C5CE7).withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline, color: Color(0xFF6C5CE7), size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'We are expanding search to find the best available drivers.',
                        style: TextStyle(fontSize: 12, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatLine(BuildContext context, IconData icon, String label, String value, bool isDark, {bool isBadge = false}) {
    return Row(
      children: [
        Icon(icon, size: 18, color: const Color(0xFF6C5CE7)),
        const SizedBox(width: 10),
        Text(label, style: AppTypography.body(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight)),
        const Spacer(),
        if (isBadge)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(color: AppColors.success.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(AppRadius.sm)),
            child: const Text('Active', style: TextStyle(color: AppColors.success, fontWeight: FontWeight.bold, fontSize: 11)),
          )
        else
          Text(value, style: AppTypography.body(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
      ],
    );
  }
}
