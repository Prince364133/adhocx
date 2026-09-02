import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';

class VendorActiveTripScreen extends StatelessWidget {
  const VendorActiveTripScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final timelineSteps = [
      {'time': '05:45 PM', 'title': 'Assigned', 'isDone': true},
      {'time': '05:50 PM', 'title': 'Accepted', 'isDone': true},
      {'time': '06:05 PM', 'title': 'En Route to Pickup', 'isDone': true, 'isCurrent': true},
      {'time': '06:20 PM', 'title': 'Arrived at Pickup (Expected 06:30 PM)', 'isDone': false},
      {'time': '--:--', 'title': 'Trip Started', 'isDone': false},
      {'time': '--:--', 'title': 'Trip Completed', 'isDone': false},
    ];

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
          'Active Trip',
          style: AppTypography.h3(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            onPressed: () {},
            icon: const Icon(Icons.phone, color: Color(0xFF6C5CE7)),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Requirement Title Header + Status Badge
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Airport Transfer',
                        style: AppTypography.h3(
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        'REQ-250510-0001',
                        style: AppTypography.caption(
                          color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.info.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                    ),
                    child: const Text(
                      'En Route',
                      style: TextStyle(color: AppColors.info, fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: AppSpacing.lg),

              // Driver Profile Info Card
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                ),
                child: Row(
                  children: [
                    const CircleAvatar(
                      radius: 24,
                      backgroundColor: Color(0xFF6C5CE7),
                      child: Text('RS', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                'Rahul Sharma',
                                style: AppTypography.h4(
                                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Row(
                                children: const [
                                  Icon(Icons.star, size: 14, color: Colors.amber),
                                  SizedBox(width: 2),
                                  Text('4.8', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'DL 01 AB 1234 • White Sedan',
                            style: AppTypography.caption(
                              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () {},
                      icon: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF6C5CE7).withValues(alpha: 0.1),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.phone, color: Color(0xFF6C5CE7), size: 20),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.xl),

              // Timeline Stepper Section
              Text(
                'Trip Timeline',
                style: AppTypography.h3(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.bold,
                ),
              ),

              const SizedBox(height: AppSpacing.md),

              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                ),
                child: Column(
                  children: List.generate(timelineSteps.length, (index) {
                    final step = timelineSteps[index];
                    final isDone = step['isDone'] == true;
                    final isCurrent = step['isCurrent'] == true;
                    final isLast = index == timelineSteps.length - 1;

                    return Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SizedBox(
                          width: 64,
                          child: Text(
                            step['time'] as String,
                            style: TextStyle(
                              fontSize: 11,
                              color: isDone ? (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight) : Colors.grey,
                            ),
                          ),
                        ),
                        Column(
                          children: [
                            Container(
                              width: 14,
                              height: 14,
                              decoration: BoxDecoration(
                                color: isCurrent
                                    ? const Color(0xFF6C5CE7)
                                    : (isDone ? AppColors.success : Colors.grey[300]),
                                shape: BoxShape.circle,
                              ),
                              child: isDone && !isCurrent
                                  ? const Icon(Icons.check, size: 10, color: Colors.white)
                                  : null,
                            ),
                            if (!isLast)
                              Container(
                                width: 2,
                                height: 32,
                                color: isDone ? AppColors.success : Colors.grey[300],
                              ),
                          ],
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Padding(
                            padding: const EdgeInsets.only(bottom: 24.0),
                            child: Text(
                              step['title'] as String,
                              style: TextStyle(
                                fontWeight: isDone ? FontWeight.bold : FontWeight.normal,
                                color: isDone ? (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight) : Colors.grey,
                              ),
                            ),
                          ),
                        ),
                      ],
                    );
                  }),
                ),
              ),

              const SizedBox(height: AppSpacing.xl),

              // Bottom Action Buttons
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => context.push(AppRoutes.vendorRequirementDetailsScreen),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                      ),
                      child: const Text('View Details', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: AppPrimaryButton(
                      text: 'Live Tracking',
                      onPressed: () => context.push(AppRoutes.vendorFulfillmentStatusScreen),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
