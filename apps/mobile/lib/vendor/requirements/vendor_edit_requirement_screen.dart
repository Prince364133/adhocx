import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';

class VendorEditRequirementScreen extends StatelessWidget {
  const VendorEditRequirementScreen({super.key});

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
          'Edit Requirement',
          style: AppTypography.h3(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Requirement deleted')),
              );
              context.pop();
            },
            child: const Text('Delete', style: TextStyle(color: AppColors.error, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Trip Summary Box + Edit Link
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
                    onPressed: () => context.push(AppRoutes.vendorCreateRequirementScreen),
                    child: const Text('Edit', style: TextStyle(color: Color(0xFF6C5CE7), fontWeight: FontWeight.bold)),
                  ),
                ],
              ),

              const SizedBox(height: AppSpacing.xs),

              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                ),
                child: Column(
                  children: [
                    _buildSummaryRow(context, Icons.directions_car_outlined, 'Vehicle Type', 'Sedan', isDark),
                    const Divider(),
                    _buildSummaryRow(context, Icons.format_list_numbered, 'Quantity', '10 Vehicles', isDark),
                    const Divider(),
                    _buildSummaryRow(context, Icons.location_on_outlined, 'Pickup', 'DLF Cyber City, Gurugram', isDark),
                    const Divider(),
                    _buildSummaryRow(context, Icons.pin_drop_outlined, 'Destination', 'Indira Gandhi Airport, Delhi', isDark),
                    const Divider(),
                    _buildSummaryRow(context, Icons.event_outlined, 'Date & Time', '10 May 2025, 06:30 PM', isDark),
                    const Divider(),
                    _buildSummaryRow(context, Icons.swap_calls, 'Trip Type', 'One Way', isDark),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.lg),

              // Expandable Sections List
              Container(
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                ),
                child: Column(
                  children: [
                    ListTile(
                      title: const Text('Additional Stops', style: TextStyle(fontWeight: FontWeight.w500)),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: const [
                          Text('0 stops', style: TextStyle(color: Colors.grey, fontSize: 13)),
                          Icon(Icons.chevron_right, size: 20),
                        ],
                      ),
                      onTap: () {},
                    ),
                    const Divider(height: 1),
                    ListTile(
                      title: const Text('Passengers', style: TextStyle(fontWeight: FontWeight.w500)),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: const [
                          Text('1 Passenger', style: TextStyle(color: Colors.grey, fontSize: 13)),
                          Icon(Icons.chevron_right, size: 20),
                        ],
                      ),
                      onTap: () {},
                    ),
                    const Divider(height: 1),
                    ListTile(
                      title: const Text('Special Requests', style: TextStyle(fontWeight: FontWeight.w500)),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: const [
                          Text('No requests', style: TextStyle(color: Colors.grey, fontSize: 13)),
                          Icon(Icons.chevron_right, size: 20),
                        ],
                      ),
                      onTap: () {},
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.xl),

              // Update Requirement Button
              AppPrimaryButton(
                text: 'Update Requirement',
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Requirement updated successfully!')),
                  );
                  context.pop();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSummaryRow(BuildContext context, IconData icon, String label, String value, bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        children: [
          Icon(icon, size: 18, color: const Color(0xFF6C5CE7)),
          const SizedBox(width: 8),
          Text(label, style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
          const Spacer(),
          Text(value, style: AppTypography.caption(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
