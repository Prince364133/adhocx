import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';

class UserFulfillmentOverviewScreen extends StatefulWidget {
  final Map<String, dynamic>? requirement;
  const UserFulfillmentOverviewScreen({super.key, this.requirement});

  @override
  State<UserFulfillmentOverviewScreen> createState() => _UserFulfillmentOverviewScreenState();
}

class _UserFulfillmentOverviewScreenState extends State<UserFulfillmentOverviewScreen> {
  bool _isLoading = true;
  Map<String, dynamic>? _requirement;
  List<dynamic> _trips = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      if (widget.requirement != null) {
        _requirement = widget.requirement;
      } else {
        final list = await UserService.instance.getRequirements();
        if (list.isNotEmpty) {
          _requirement = list.first as Map<String, dynamic>;
        }
      }

      final trips = await UserService.instance.getTrips();
      _trips = trips;
    } catch (_) {
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final req = _requirement ?? {};
    final reqCode = req['requirementCode'] ?? req['id'] ?? 'REQ-LIVE';
    final vehicleType = req['vehicleType'] ?? 'Sedan';
    final quantity = (req['quantity'] ?? 1) as int;
    final fulfilled = (req['fulfilledCount'] ?? _trips.where((t) => (t as Map)['status'] != 'CANCELLED').length) as int;
    final status = (req['status'] ?? 'DISPATCHING').toString();
    final progress = quantity > 0 ? (fulfilled / quantity).clamp(0.0, 1.0) : 0.0;

    final assignedCount = _trips.where((t) => (t as Map)['status'] == 'ACCEPTED' || (t as Map)['status'] == 'ASSIGNED').length;
    final onTripCount = _trips.where((t) => (t as Map)['status'] == 'IN_PROGRESS' || (t as Map)['status'] == 'ARRIVED').length;
    final completedCount = _trips.where((t) => (t as Map)['status'] == 'COMPLETED').length;
    final searchingCount = (quantity - (assignedCount + onTripCount + completedCount)).clamp(0, quantity);

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
          'Fulfillment Overview',
          style: AppTypography.h3(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            onPressed: _loadData,
            icon: Icon(Icons.refresh, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
          ),
        ],
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header Title & Dispatched Badge
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '$vehicleType Fleet Requirement',
                                style: AppTypography.h2(
                                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                reqCode.toString(),
                                style: AppTypography.caption(
                                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(AppRadius.sm),
                          ),
                          child: Text(
                            status,
                            style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 12),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    // Required vs Fulfilled Metric Cards Row
                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.all(AppSpacing.md),
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                              borderRadius: BorderRadius.circular(AppRadius.lg),
                              border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                            ),
                            child: Column(
                              children: [
                                Text('Required', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                                const SizedBox(height: 4),
                                Text('$quantity Vehicles', style: AppTypography.h3(color: AppColors.primary, fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.all(AppSpacing.md),
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                              borderRadius: BorderRadius.circular(AppRadius.lg),
                              border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                            ),
                            child: Column(
                              children: [
                                Text('Fulfilled', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                                const SizedBox(height: 4),
                                Text('$fulfilled Vehicles', style: AppTypography.h3(color: AppColors.success, fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    // Progress Bar
                    Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(AppRadius.lg),
                        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                      ),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Fulfillment Progress', style: AppTypography.body(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                              Text('${(progress * 100).toInt()}%', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary)),
                            ],
                          ),
                          const SizedBox(height: 8),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(AppRadius.full),
                            child: LinearProgressIndicator(
                              value: progress,
                              minHeight: 10,
                              backgroundColor: AppColors.slate400,
                              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Align(
                            alignment: Alignment.centerRight,
                            child: Text('$fulfilled / $quantity Vehicles', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    // 4 Status Counters
                    Row(
                      children: [
                        Expanded(child: _buildMetricTile(context, 'Assigned', '$assignedCount', AppColors.success, isDark)),
                        const SizedBox(width: 6),
                        Expanded(child: _buildMetricTile(context, 'Searching', '$searchingCount', AppColors.info, isDark)),
                        const SizedBox(width: 6),
                        Expanded(child: _buildMetricTile(context, 'On Trip', '$onTripCount', AppColors.primary, isDark)),
                        const SizedBox(width: 6),
                        Expanded(child: _buildMetricTile(context, 'Completed', '$completedCount', AppColors.success, isDark)),
                      ],
                    ),

                    const SizedBox(height: AppSpacing.xl),

                    // Recent Activity Header + List
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Recent Activity',
                          style: AppTypography.h3(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        TextButton(
                          onPressed: () => context.push(AppRoutes.userDriverAssignmentsListScreen),
                          child: Text('View all', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),

                    const SizedBox(height: AppSpacing.xs),

                    if (_trips.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.lg),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                        ),
                        child: Center(
                          child: Text(
                            'Matching drivers in progress. Nearby drivers are receiving dispatch offers.',
                            textAlign: TextAlign.center,
                            style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                          ),
                        ),
                      )
                    else
                      ..._trips.take(4).map((t) {
                        final trip = t as Map<String, dynamic>;
                        final driver = trip['driver'] as Map<String, dynamic>?;
                        final driverName = driver?['user']?['fullName'] ?? driver?['fullName'] ?? 'Driver';
                        final vehiclePlate = driver?['vehiclePlate'] ?? trip['vehiclePlate'] ?? 'Vehicle';
                        final tStatus = trip['status'] ?? 'ASSIGNED';
                        final tripId = trip['tripCode'] ?? trip['id'] ?? '';

                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8.0),
                          child: _buildActivityRow(
                            context,
                            '$driverName ($vehiclePlate) • $tStatus ($tripId)',
                            'Live',
                            AppColors.success,
                            isDark,
                          ),
                        );
                      }),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildMetricTile(BuildContext context, String label, String value, Color color, bool isDark) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
      ),
      child: Column(
        children: [
          Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
          const SizedBox(height: 2),
          Text(label, style: TextStyle(fontSize: 10, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
        ],
      ),
    );
  }

  Widget _buildActivityRow(BuildContext context, String text, String time, Color color, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
      ),
      child: Row(
        children: [
          Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          const SizedBox(width: 10),
          Expanded(child: Text(text, style: AppTypography.body(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.w500))),
          Text(time, style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
        ],
      ),
    );
  }
}
