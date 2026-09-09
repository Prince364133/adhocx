import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';
import 'user_bids_bottom_sheet.dart';

class UserRequirementDetailsScreen extends StatefulWidget {
  final String? requirementId;
  const UserRequirementDetailsScreen({super.key, this.requirementId});

  @override
  State<UserRequirementDetailsScreen> createState() => _UserRequirementDetailsScreenState();
}

class _UserRequirementDetailsScreenState extends State<UserRequirementDetailsScreen> {
  bool _isLoading = true;
  Map<String, dynamic>? _requirement;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadRequirement();
  }

  Future<void> _loadRequirement() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      if (widget.requirementId != null && widget.requirementId!.isNotEmpty) {
        final data = await UserService.instance.getRequirement(widget.requirementId!);
        if (mounted) setState(() => _requirement = data as Map<String, dynamic>?);
      } else {
        // Fallback: fetch most recent requirement
        final list = await UserService.instance.getRequirements();
        if (list.isNotEmpty && mounted) {
          final first = list.first;
          final full = await UserService.instance.getRequirement(first['id'] as String);
          if (mounted) setState(() => _requirement = full as Map<String, dynamic>?);
        }
      }
    } catch (e) {
      if (mounted) setState(() => _errorMessage = e.toString().replaceAll("Exception: ", ""));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'COMPLETED':
      case 'FULFILLED':
        return AppColors.success;
      case 'DISPATCHING':
      case 'IN_PROGRESS':
      case 'OPEN':
        return AppColors.primary;
      case 'PARTIALLY_FULFILLED':
      case 'ACTIVE':
        return AppColors.warning;
      case 'CANCELLED':
      case 'EXPIRED':
        return AppColors.error;
      default:
        return AppColors.slate500;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final req = _requirement;
    final status = req?['status'] as String? ?? 'OPEN';
    final statusColor = _getStatusColor(status);
    final requiredQty = (req?['requiredQuantity'] as num?)?.toInt() ?? 1;
    final assignedQty = (req?['assignedQuantity'] as num?)?.toInt() ?? 0;
    final progress = requiredQty > 0 ? (assignedQty / requiredQty).clamp(0.0, 1.0) : 0.0;
    final reqId = req?['id'] as String? ?? widget.requirementId ?? 'REQ-LIVE';

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
          'Requirement Details',
          style: AppTypography.h3(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            onPressed: _loadRequirement,
            icon: Icon(Icons.refresh, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
          ),
        ],
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _errorMessage != null
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.error_outline, size: 48, color: AppColors.error),
                          const SizedBox(height: 12),
                          Text(_errorMessage!, textAlign: TextAlign.center, style: TextStyle(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight)),
                          const SizedBox(height: 16),
                          ElevatedButton(onPressed: _loadRequirement, child: const Text('Retry')),
                        ],
                      ),
                    ),
                  )
                : SingleChildScrollView(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Status Badge
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: statusColor.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(AppRadius.sm),
                          ),
                          child: Text(
                            status.replaceAll('_', ' '),
                            style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 12),
                          ),
                        ),

                        const SizedBox(height: AppSpacing.xs),

                        // Title & ID
                        Text(
                          req?['title'] as String? ?? 'Bulk Requirement',
                          style: AppTypography.h1(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          'ID: $reqId',
                          style: AppTypography.caption(
                            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                          ),
                        ),

                        const SizedBox(height: AppSpacing.lg),

                        // Details Card
                        Container(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                            borderRadius: BorderRadius.circular(AppRadius.lg),
                            border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                          ),
                          child: Column(
                            children: [
                              _buildDetailRow(context, Icons.bolt, 'Fulfillment Mode', req?['fulfillmentMode'] == 'DIRECT_DISPATCH' ? 'Direct Timed Dispatch' : 'Reverse Auction Bids', isDark),
                              const Divider(),
                              _buildDetailRow(context, Icons.directions_car_outlined, 'Vehicle Type', req?['vehicleType'] as String? ?? 'Sedan', isDark),
                              const Divider(),
                              _buildDetailRow(context, Icons.format_list_numbered, 'Required Quantity', '$requiredQty Vehicles', isDark),
                              const Divider(),
                              _buildDetailRow(context, Icons.check_circle_outline, 'Fulfilled', '$assignedQty / $requiredQty Vehicles', isDark, valueColor: statusColor),
                              const Divider(),
                              _buildDetailRow(context, Icons.location_on_outlined, 'Pickup', req?['pickupAddress'] as String? ?? 'Gurugram', isDark),
                              const Divider(),
                              _buildDetailRow(context, Icons.pin_drop_outlined, 'Destination', req?['dropAddress'] as String? ?? 'IGI Airport', isDark),
                              const Divider(),
                              _buildDetailRow(context, Icons.currency_rupee, 'Est. Budget', '₹ ${(req?['budgetPerVehicle'] ?? 850) * requiredQty}', isDark, valueColor: AppColors.success),
                            ],
                          ),
                        ),

                        const SizedBox(height: AppSpacing.lg),

                        // Bidding Action Banner (if Bidding or has quotes)
                        if (req?['fulfillmentMode'] == 'BIDDING') ...[
                          Container(
                            padding: const EdgeInsets.all(AppSpacing.md),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.08),
                              borderRadius: BorderRadius.circular(AppRadius.lg),
                              border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary,
                                    borderRadius: BorderRadius.circular(AppRadius.md),
                                  ),
                                  child: const Icon(Icons.gavel_rounded, color: Colors.white, size: 22),
                                ),
                                const SizedBox(width: AppSpacing.md),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'Competing Driver Quotes',
                                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                      ),
                                      Text(
                                        'Review driver quotes & accept optimal bid',
                                        style: TextStyle(fontSize: 12, color: isDark ? AppColors.slate400 : AppColors.slate600),
                                      ),
                                    ],
                                  ),
                                ),
                                ElevatedButton(
                                  onPressed: () => UserBidsBottomSheet.show(context, requirementId: reqId),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primary,
                                    foregroundColor: Colors.white,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                                  ),
                                  child: const Text('View Bids', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: AppSpacing.lg),
                        ],

                        // Fulfillment Progress Section
                        Container(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                            borderRadius: BorderRadius.circular(AppRadius.lg),
                            border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Fulfillment Progress',
                                    style: AppTypography.h4(
                                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  Text('$assignedQty / $requiredQty Vehicles', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary)),
                                ],
                              ),
                              const SizedBox(height: 10),
                              ClipRRect(
                                borderRadius: BorderRadius.circular(AppRadius.full),
                                child: LinearProgressIndicator(
                                  value: progress,
                                  minHeight: 10,
                                  backgroundColor: isDark ? AppColors.slate800 : AppColors.slate200,
                                  valueColor: AlwaysStoppedAnimation<Color>(progress >= 1.0 ? AppColors.success : AppColors.primary),
                                ),
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: AppSpacing.xl),

                        // Bottom Actions
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton(
                                onPressed: () => context.push(AppRoutes.userCreateRequirementScreen),
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(vertical: 14),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                                ),
                                child: const Text('New Requirement', style: TextStyle(fontWeight: FontWeight.bold)),
                              ),
                            ),
                            const SizedBox(width: AppSpacing.md),
                            Expanded(
                              flex: 2,
                              child: AppPrimaryButton(
                                text: 'View Fulfillment',
                                onPressed: () => context.push(AppRoutes.userFulfillmentStatusScreen),
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

  Widget _buildDetailRow(BuildContext context, IconData icon, String label, String value, bool isDark, {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        children: [
          Icon(icon, size: 20, color: AppColors.primary),
          const SizedBox(width: 10),
          Text(
            label,
            style: AppTypography.body(
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            ),
          ),
          const Spacer(),
          Expanded(
            flex: 2,
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: AppTypography.h4(
                fontWeight: FontWeight.bold,
                color: valueColor ?? (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
