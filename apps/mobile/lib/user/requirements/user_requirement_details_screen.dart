import 'dart:async';
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
  final Map<String, dynamic>? initialData;

  const UserRequirementDetailsScreen({
    super.key,
    this.requirementId,
    this.initialData,
  });

  @override
  State<UserRequirementDetailsScreen> createState() => _UserRequirementDetailsScreenState();
}

class _UserRequirementDetailsScreenState extends State<UserRequirementDetailsScreen> {
  bool _isLoading = true;
  Map<String, dynamic>? _requirement;
  String? _errorMessage;
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    if (widget.initialData != null) {
      _requirement = widget.initialData;
      _isLoading = false;
    }
    _loadRequirement();
    _startAutoRefresh();
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  bool _isSyncing = false;

  void _startAutoRefresh() {
    _refreshTimer?.cancel();
    _refreshTimer = Timer.periodic(const Duration(seconds: 12), (_) {
      final status = _requirement?['status'] as String?;
      if (status == 'POSTED' || status == 'DISPATCHING' || status == 'PARTIALLY_FULFILLED' || status == 'OPEN') {
        _loadRequirement(silent: true);
      }
    });
  }

  Future<void> _loadRequirement({bool silent = false}) async {
    if (_isSyncing) return;
    _isSyncing = true;
    if (!silent) {
      setState(() {
        _isLoading = _requirement == null;
        _errorMessage = null;
      });
    }

    try {
      final effectiveId = widget.requirementId ?? _requirement?['id'] as String?;
      if (effectiveId != null && effectiveId.isNotEmpty && !effectiveId.startsWith('REQ-LIVE')) {
        final data = await UserService.instance.getRequirement(effectiveId);
        if (mounted) setState(() => _requirement = data as Map<String, dynamic>?);
      } else {
        // Fallback: fetch most recent requirement for current vendor
        final list = await UserService.instance.getRequirements();
        if (list.isNotEmpty && mounted) {
          final first = list.first;
          final full = await UserService.instance.getRequirement(first['id'] as String);
          if (mounted) setState(() => _requirement = full as Map<String, dynamic>?);
        }
      }
    } catch (e) {
      if (!silent && mounted) setState(() => _errorMessage = e.toString().replaceAll("Exception: ", ""));
    } finally {
      _isSyncing = false;
      if (!silent && mounted) setState(() => _isLoading = false);
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
      case 'POSTED':
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
    final status = req?['status'] as String? ?? 'POSTED';
    final statusColor = _getStatusColor(status);
    final requiredQty = (req?['quantity'] ?? req?['requiredQuantity'] as num?)?.toInt() ?? 1;
    final assignedQty = (req?['assignedQuantity'] as num?)?.toInt() ?? 0;
    final progress = requiredQty > 0 ? (assignedQty / requiredQty).clamp(0.0, 1.0) : 0.0;
    final rawId = req?['id'] as String? ?? widget.requirementId ?? 'LIVE';
    final displayId = rawId.length > 8 ? 'REQ-${rawId.substring(0, 8).toUpperCase()}' : rawId;

    final isBidding = req?['fulfillmentMode'] == 'BIDDING';
    final vehicle = req?['vehicleType'] as String? ?? 'Sedan';
    final pickup = req?['pickupLocation']?['address'] as String? ?? req?['pickupAddress'] as String? ?? 'Pickup Location';
    final drop = req?['dropLocation']?['address'] as String? ?? req?['dropAddress'] as String? ?? 'Drop Location';

    final budget = (req?['ratePerVehicle'] ?? req?['suggestedBudget'] ?? req?['totalAmount'] ?? 0.0) as num;
    final bids = (req?['bids'] as List<dynamic>?) ?? [];
    final assignedDrivers = (req?['assignedDrivers'] as List<dynamic>?) ?? [];

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
            onPressed: () => _loadRequirement(silent: false),
            icon: Icon(Icons.refresh, color: AppColors.primary),
            tooltip: 'Refresh Status',
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
                          ElevatedButton(onPressed: () => _loadRequirement(silent: false), child: const Text('Retry')),
                        ],
                      ),
                    ),
                  )
                : SingleChildScrollView(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Status Header Card
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
                                  Text(
                                    displayId,
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 12,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: AppSpacing.sm),
                              Text(
                                isBidding ? 'Outstation Reverse Auction' : 'Corporate Bulk Booking',
                                style: AppTypography.h2(
                                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '$vehicle • $requiredQty Vehicle${requiredQty > 1 ? "s" : ""}',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                ),
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: AppSpacing.md),

                        // Fulfillment Progress Card
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
                                  Text(
                                    '$assignedQty / $requiredQty Fulfilled',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: assignedQty >= requiredQty ? AppColors.success : AppColors.primary,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              LinearProgressIndicator(
                                value: progress,
                                backgroundColor: isDark ? AppColors.slate800 : AppColors.slate200,
                                valueColor: AlwaysStoppedAnimation<Color>(
                                  assignedQty >= requiredQty ? AppColors.success : AppColors.primary,
                                ),
                                minHeight: 8,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              if (assignedQty < requiredQty) ...[
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    const SizedBox(
                                      width: 12,
                                      height: 12,
                                      child: CircularProgressIndicator(strokeWidth: 2),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      isBidding ? 'Waiting for driver quotes...' : 'Dispatching waves to nearby verified drivers...',
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ],
                          ),
                        ),

                        const SizedBox(height: AppSpacing.md),

                        // Route Card
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
                              Text(
                                'Route Details',
                                style: AppTypography.h4(
                                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: AppSpacing.sm),
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Icon(Icons.my_location_rounded, size: 18, color: AppColors.primary),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text('Pickup', style: TextStyle(fontSize: 11, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                                        Text(pickup, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Icon(Icons.pin_drop_rounded, size: 18, color: AppColors.accentPurple),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text('Destination', style: TextStyle(fontSize: 11, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                                        Text(drop, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const Divider(height: 24),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    isBidding ? 'Target Budget' : 'Rate per Vehicle',
                                    style: TextStyle(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                                  ),
                                  Text(
                                    '₹ ${budget.toStringAsFixed(0)}',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primary),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: AppSpacing.md),

                        // Assigned Drivers Section (Live Real-time Dispatch)
                        if (assignedDrivers.isNotEmpty) ...[
                          Text(
                            'Assigned Drivers (${assignedDrivers.length})',
                            style: AppTypography.h4(
                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 8),
                          ListView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: assignedDrivers.length,
                            itemBuilder: (context, index) {
                              final d = assignedDrivers[index];
                              return Container(
                                margin: const EdgeInsets.only(bottom: 8),
                                padding: const EdgeInsets.all(AppSpacing.md),
                                decoration: BoxDecoration(
                                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                                  borderRadius: BorderRadius.circular(AppRadius.md),
                                  border: Border.all(color: AppColors.success.withValues(alpha: 0.3)),
                                ),
                                child: Row(
                                  children: [
                                    CircleAvatar(
                                      backgroundColor: AppColors.success.withValues(alpha: 0.15),
                                      child: const Icon(Icons.person, color: AppColors.success),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            d['driverName'] as String? ?? 'Verified Driver',
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                          ),
                                          Text(
                                            'Phone: ${d['driverPhone'] ?? "+91 98765 43210"} • Plate: ${d['vehiclePlate'] ?? "DL 01 AB 1234"}',
                                            style: TextStyle(fontSize: 11, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: AppColors.success,
                                        borderRadius: BorderRadius.circular(AppRadius.xs),
                                      ),
                                      child: Text(
                                        (d['tripStatus'] as String? ?? 'ASSIGNED').replaceAll('_', ' '),
                                        style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                        ],

                        // Competing Driver Bids Section (For Outstation Bidding Mode)
                        if (isBidding) ...[
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Driver Quotes (${bids.length})',
                                style: AppTypography.h4(
                                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              if (bids.isNotEmpty)
                                TextButton(
                                  onPressed: () {
                                    showModalBottomSheet(
                                      context: context,
                                      isScrollControlled: true,
                                      backgroundColor: Colors.transparent,
                                      builder: (ctx) => UserBidsBottomSheet(
                                        requirementId: rawId,
                                        onBidAccepted: () => _loadRequirement(silent: false),
                                      ),
                                    );
                                  },
                                  child: const Text('Review All Quotes'),
                                ),
                            ],
                          ),
                          if (bids.isEmpty)
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(AppSpacing.lg),
                              decoration: BoxDecoration(
                                color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                                borderRadius: BorderRadius.circular(AppRadius.md),
                                border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                              ),
                              child: Column(
                                children: [
                                  const Icon(Icons.gavel_rounded, size: 32, color: AppColors.slate400),
                                  const SizedBox(height: 8),
                                  Text(
                                    'No driver bids received yet',
                                    style: TextStyle(fontWeight: FontWeight.bold, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Broadcasted to verified drivers in the region. Quotes will appear here automatically.',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(fontSize: 11, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                                  ),
                                ],
                              ),
                            )
                          else
                            ListView.builder(
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              itemCount: bids.length,
                              itemBuilder: (context, index) {
                                final b = bids[index];
                                final bidAmount = (b['bidAmount'] as num?)?.toDouble() ?? 0.0;
                                final driverName = b['driverName'] as String? ?? 'Driver Partner';
                                final rating = (b['driverRating'] as num?)?.toDouble() ?? 4.9;

                                return Container(
                                  margin: const EdgeInsets.only(bottom: 8),
                                  padding: const EdgeInsets.all(AppSpacing.md),
                                  decoration: BoxDecoration(
                                    color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                                    borderRadius: BorderRadius.circular(AppRadius.md),
                                    border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                                  ),
                                  child: Row(
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(driverName, style: const TextStyle(fontWeight: FontWeight.bold)),
                                            Row(
                                              children: [
                                                const Icon(Icons.star, size: 14, color: AppColors.starAmber),
                                                const SizedBox(width: 2),
                                                Text('$rating', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                                Text(' • ${b['etaMinutes'] ?? 15} mins ETA', style: TextStyle(fontSize: 11, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                                              ],
                                            ),
                                          ],
                                        ),
                                      ),
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.end,
                                        children: [
                                          Text('₹ ${bidAmount.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.primary)),
                                          const SizedBox(height: 4),
                                          ElevatedButton(
                                            onPressed: () async {
                                              try {
                                                await UserService.instance.acceptBid(b['id'] as String);
                                                _loadRequirement(silent: false);
                                              } catch (e) {
                                                if (mounted) {
                                                  ScaffoldMessenger.of(context).showSnackBar(
                                                    SnackBar(content: Text('Failed to accept quote: $e'), backgroundColor: AppColors.error),
                                                  );
                                                }
                                              }
                                            },
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor: AppColors.primary,
                                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                                              minimumSize: Size.zero,
                                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                            ),
                                            child: const Text('Accept Bid', style: TextStyle(fontSize: 11, color: Colors.white)),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                        ],

                        const SizedBox(height: AppSpacing.xl),

                        // Action button
                        AppPrimaryButton(
                          text: 'Back to All Requirements',
                          onPressed: () => context.go(AppRoutes.userRequirementsScreen),
                        ),
                      ],
                    ),
                  ),
      ),
    );
  }
}
