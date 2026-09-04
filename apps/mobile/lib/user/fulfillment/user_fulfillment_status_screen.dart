import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';

class UserFulfillmentStatusScreen extends StatelessWidget {
  const UserFulfillmentStatusScreen({super.key});

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
          'Fulfillment Status',
          style: AppTypography.h3(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            onPressed: () {},
            icon: Icon(Icons.refresh, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.orange.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                ),
                child: const Text(
                  'Partially Fulfilled',
                  style: TextStyle(color: Colors.orange, fontWeight: FontWeight.bold, fontSize: 12),
                ),
              ),

              const SizedBox(height: AppSpacing.xs),

              // Title
              Text(
                '8 / 10 Vehicles Fulfilled',
                style: AppTypography.h1(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.bold,
                ),
              ),

              const SizedBox(height: 8),

              // Progress Bar
              ClipRRect(
                borderRadius: BorderRadius.circular(AppRadius.full),
                child: const LinearProgressIndicator(
                  value: 0.8,
                  minHeight: 8,
                  backgroundColor: Colors.grey,
                  valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF6C5CE7)),
                ),
              ),

              const SizedBox(height: AppSpacing.lg),

              // 3 Status Count Cards (Assigned: 8, Searching: 2, Pending: 0)
              Row(
                children: [
                  Expanded(
                    child: _buildCountCard(context, 'Assigned', '8', AppColors.success, isDark),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildCountCard(context, 'Searching', '2', AppColors.info, isDark),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildCountCard(context, 'Pending', '0', Colors.grey, isDark),
                  ),
                ],
              ),

              const SizedBox(height: AppSpacing.xl),

              // Live Tracking Section Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Live Tracking',
                    style: AppTypography.h3(
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  TextButton(
                    onPressed: () => context.push(AppRoutes.userActiveTripScreen),
                    child: const Text('View Map', style: TextStyle(color: Color(0xFF6C5CE7), fontWeight: FontWeight.bold)),
                  ),
                ],
              ),

              const SizedBox(height: AppSpacing.xs),

              // Map Container Card
              Container(
                height: 180,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : Colors.blueGrey[50],
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                ),
                child: Stack(
                  children: [
                    Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.map, size: 48, color: Color(0xFF6C5CE7)),
                          const SizedBox(height: 8),
                          Text(
                            'Live Vehicles Route Tracking',
                            style: AppTypography.caption(
                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Positioned(
                      bottom: 12,
                      right: 12,
                      child: FloatingActionButton.small(
                        onPressed: () => context.push(AppRoutes.userActiveTripScreen),
                        backgroundColor: const Color(0xFF6C5CE7),
                        child: const Icon(Icons.fullscreen, color: Colors.white),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.xl),

              // Recent Updates List
              Text(
                'Recent Updates',
                style: AppTypography.h3(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.bold,
                ),
              ),

              const SizedBox(height: AppSpacing.sm),

              _buildUpdateTile(
                context,
                time: '11:30 AM',
                message: 'Driver Rahul reached pickup location',
                color: AppColors.success,
                isDark: isDark,
                onTap: () => context.push(AppRoutes.userActiveTripScreen),
              ),
              const SizedBox(height: 8),
              _buildUpdateTile(
                context,
                time: '11:15 AM',
                message: 'Driver Amit accepted requirement REQ-250510-0001',
                color: AppColors.info,
                isDark: isDark,
                onTap: () => context.push(AppRoutes.userActiveTripScreen),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCountCard(BuildContext context, String label, String value, Color color, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: AppTypography.h2(
              color: color,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: AppTypography.caption(
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUpdateTile(BuildContext context, {required String time, required String message, required Color color, required bool isDark, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadius.md),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
        ),
        child: Row(
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: AppTypography.body(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            Text(
              time,
              style: AppTypography.caption(
                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                fontSize: 11,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
