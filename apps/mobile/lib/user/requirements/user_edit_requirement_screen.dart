import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';
import '../../core/utils/app_toast.dart';

class UserEditRequirementScreen extends StatefulWidget {
  final Map<String, dynamic>? requirementData;
  const UserEditRequirementScreen({super.key, this.requirementData});

  @override
  State<UserEditRequirementScreen> createState() => _UserEditRequirementScreenState();
}

class _UserEditRequirementScreenState extends State<UserEditRequirementScreen> {
  bool _isDeleting = false;

  static const _months = [
    '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  String _formatDateTime(String? isoDate) {
    if (isoDate == null || isoDate.isEmpty) return '—';
    try {
      final dt = DateTime.parse(isoDate).toLocal();
      final day = dt.day.toString().padLeft(2, '0');
      final month = (dt.month >= 1 && dt.month <= 12) ? _months[dt.month] : '';
      final hour = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
      final ampm = dt.hour >= 12 ? 'PM' : 'AM';
      final min = dt.minute.toString().padLeft(2, '0');
      return '$day $month ${dt.year}, $hour:$min $ampm';
    } catch (_) {
      return isoDate;
    }
  }

  Future<void> _handleDelete() async {
    final req = widget.requirementData ?? {};
    final id = req['id']?.toString();

    if (id == null || id.isEmpty) {
      context.pop();
      return;
    }

    setState(() => _isDeleting = true);
    try {
      await UserService.instance.cancelRequirement(id, reason: 'Cancelled by requester');
      if (mounted) {
        Fluttertoast.showToast(msg: 'Requirement cancelled successfully');
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        AppToast.showError(e, context: context);
      }
    } finally {
      if (mounted) setState(() => _isDeleting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final req = widget.requirementData ?? {};
    final vehicleType = (req['vehicleType'] ?? 'Commercial Sedan').toString();
    final quantity = (req['quantity'] ?? req['requiredQuantity'] ?? 1).toString();
    final pickup = req['pickupLocation'] as Map<String, dynamic>?;
    final drop = req['dropLocation'] as Map<String, dynamic>?;
    final pickupAddr = pickup?['address'] ?? '—';
    final dropAddr = drop?['address'] ?? '—';
    final reportingTime = _formatDateTime(req['reportingTime'] as String? ?? req['createdAt'] as String?);
    final fulfillmentMode = req['fulfillmentMode'] ?? 'DIRECT_DISPATCH';

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
            onPressed: _isDeleting ? null : _handleDelete,
            child: Text(_isDeleting ? 'Deleting...' : 'Cancel Booking', style: TextStyle(color: AppColors.error, fontWeight: FontWeight.bold)),
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
                    onPressed: () => context.push(AppRoutes.userCreateRequirementScreen),
                    child: Text('Re-Post', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
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
                    _buildSummaryRow(context, Icons.directions_car_outlined, 'Vehicle Type', vehicleType, isDark),
                    const Divider(),
                    _buildSummaryRow(context, Icons.format_list_numbered, 'Quantity', '$quantity Vehicles', isDark),
                    const Divider(),
                    _buildSummaryRow(context, Icons.location_on_outlined, 'Pickup', pickupAddr, isDark),
                    const Divider(),
                    _buildSummaryRow(context, Icons.pin_drop_outlined, 'Destination', dropAddr, isDark),
                    const Divider(),
                    _buildSummaryRow(context, Icons.event_outlined, 'Date & Time', reportingTime, isDark),
                    const Divider(),
                    _buildSummaryRow(context, Icons.swap_calls, 'Mode', fulfillmentMode, isDark),
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
                      title: const Text('Special Notes', style: TextStyle(fontWeight: FontWeight.w500)),
                      trailing: Text(
                        req['notes'] != null && req['notes'].toString().isNotEmpty ? 'Provided' : 'Standard',
                        style: const TextStyle(color: AppColors.slate400, fontSize: 13),
                      ),
                    ),
                    const Divider(height: 1),
                    ListTile(
                      title: const Text('Budget / Rate', style: TextStyle(fontWeight: FontWeight.w500)),
                      trailing: Text(
                        req['ratePerVehicle'] != null ? '₹${req['ratePerVehicle']}/veh' : (req['suggestedBudget'] != null ? '₹${req['suggestedBudget']}' : 'Market Dynamic'),
                        style: TextStyle(color: isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark, fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.xl),

              // Done Button
              AppPrimaryButton(
                text: 'Done',
                onPressed: () {
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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: AppColors.primary),
          const SizedBox(width: 8),
          Text(label, style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
          const Spacer(),
          Expanded(
            flex: 2,
            child: Text(
              value,
              textAlign: TextAlign.right,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.caption(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }
}
