import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';

class UserNotificationSettingsScreen extends StatefulWidget {
  const UserNotificationSettingsScreen({super.key});

  @override
  State<UserNotificationSettingsScreen> createState() => _UserNotificationSettingsScreenState();
}

class _UserNotificationSettingsScreenState extends State<UserNotificationSettingsScreen> {
  bool _newRequirement = true;
  bool _driverAssignments = true;
  bool _fulfillmentUpdates = true;
  bool _noDriverAlerts = true;

  bool _tripUpdates = true;
  bool _driverEnRoute = true;
  bool _tripCompleted = true;
  bool _tripCancellation = true;

  bool _paymentSuccess = true;
  bool _paymentFailed = true;
  bool _refundsSettlements = true;

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
        title: Text('Notification Settings', style: AppTypography.h3(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Requirements & Fulfillment
              Text('Requirements & Fulfillment', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              Container(
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                ),
                child: Column(
                  children: [
                    _buildSwitch('New Requirement Updates', _newRequirement, (val) => setState(() => _newRequirement = val), isDark),
                    const Divider(height: 1),
                    _buildSwitch('Driver Assignments', _driverAssignments, (val) => setState(() => _driverAssignments = val), isDark),
                    const Divider(height: 1),
                    _buildSwitch('Fulfillment Updates', _fulfillmentUpdates, (val) => setState(() => _fulfillmentUpdates = val), isDark),
                    const Divider(height: 1),
                    _buildSwitch('No Driver Available Alerts', _noDriverAlerts, (val) => setState(() => _noDriverAlerts = val), isDark),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.lg),

              // Trips
              Text('Trips', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              Container(
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                ),
                child: Column(
                  children: [
                    _buildSwitch('Trip Updates', _tripUpdates, (val) => setState(() => _tripUpdates = val), isDark),
                    const Divider(height: 1),
                    _buildSwitch('Driver En Route', _driverEnRoute, (val) => setState(() => _driverEnRoute = val), isDark),
                    const Divider(height: 1),
                    _buildSwitch('Trip Completed', _tripCompleted, (val) => setState(() => _tripCompleted = val), isDark),
                    const Divider(height: 1),
                    _buildSwitch('Trip Cancellation', _tripCancellation, (val) => setState(() => _tripCancellation = val), isDark),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.lg),

              // Payments
              Text('Payments', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              Container(
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                ),
                child: Column(
                  children: [
                    _buildSwitch('Payment Success', _paymentSuccess, (val) => setState(() => _paymentSuccess = val), isDark),
                    const Divider(height: 1),
                    _buildSwitch('Payment Failed', _paymentFailed, (val) => setState(() => _paymentFailed = val), isDark),
                    const Divider(height: 1),
                    _buildSwitch('Refunds & Settlements', _refundsSettlements, (val) => setState(() => _refundsSettlements = val), isDark),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSwitch(String title, bool val, ValueChanged<bool> onChanged, bool isDark) {
    return SwitchListTile(
      title: Text(title, style: TextStyle(fontSize: 13, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight)),
      value: val,
      onChanged: onChanged,
      activeThumbColor: AppColors.primary,
    );
  }
}
