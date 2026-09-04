import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';

class UserPaymentDetailsScreen extends StatelessWidget {
  const UserPaymentDetailsScreen({super.key});

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
        title: Text('Payment Details', style: AppTypography.h3(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            onPressed: () {},
            icon: Icon(Icons.file_upload_outlined, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Card
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(color: Colors.purple.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(AppRadius.md)),
                      child: const Icon(Icons.directions_car_outlined, color: Color(0xFF6C5CE7)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Airport Transfer', style: AppTypography.h4(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                          Text('REQ-250510-0001', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: Colors.orange.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(AppRadius.sm)),
                      child: const Text('Pending', style: TextStyle(color: Colors.orange, fontWeight: FontWeight.bold, fontSize: 11)),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.lg),

              Text('₹ 24,750.00', style: AppTypography.h1(color: const Color(0xFF6C5CE7), fontWeight: FontWeight.bold)),
              Text('Total Amount', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),

              const SizedBox(height: AppSpacing.lg),

              // Particulars List
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                ),
                child: Column(
                  children: [
                    _buildRow(context, 'Trip Date', '10 May 2025, 06:30 PM', isDark),
                    const Divider(),
                    _buildRow(context, 'Pickup', 'DLF Cyber City, Gurugram', isDark),
                    const Divider(),
                    _buildRow(context, 'Destination', 'Indira Gandhi Airport, Delhi', isDark),
                    const Divider(),
                    _buildRow(context, 'Vehicle Type', 'Sedan', isDark),
                    const Divider(),
                    _buildRow(context, 'Vehicles', '10', isDark),
                    const Divider(),
                    _buildRow(context, 'Payment Method', 'Net Banking', isDark),
                    const Divider(),
                    _buildRow(context, 'Transaction ID', 'TXN-250510-7854', isDark),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.lg),

              // Stepper
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                ),
                child: Column(
                  children: [
                    _buildStep(context, 'Payment Initiated', '10 May 2025, 07:15 PM', isDone: true, isLast: false, isDark: isDark),
                    _buildStep(context, 'Processing', '—', isDone: false, isCurrent: true, isLast: false, isDark: isDark),
                    _buildStep(context, 'Payment Completed', '—', isDone: false, isLast: true, isDark: isDark),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.xl),

              AppPrimaryButton(
                text: 'Contact Support',
                onPressed: () {},
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRow(BuildContext context, String label, String value, bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
          Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight)),
        ],
      ),
    );
  }

  Widget _buildStep(BuildContext context, String title, String sub, {required bool isDone, bool isCurrent = false, required bool isLast, required bool isDark}) {
    Color color = Colors.grey;
    if (isDone) color = const Color(0xFF6C5CE7);
    if (isCurrent) color = Colors.orange;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Icon(isDone ? Icons.check_circle : Icons.circle_outlined, size: 16, color: color),
            if (!isLast) Container(width: 2, height: 28, color: Colors.grey[300]),
          ],
        ),
        const SizedBox(width: 10),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight)),
            Text(sub, style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontSize: 10)),
          ],
        ),
      ],
    );
  }
}
