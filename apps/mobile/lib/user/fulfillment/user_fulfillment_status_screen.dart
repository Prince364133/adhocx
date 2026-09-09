import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';

class UserFulfillmentStatusScreen extends StatefulWidget {
  final Map<String, dynamic>? requirement;
  const UserFulfillmentStatusScreen({super.key, this.requirement});

  @override
  State<UserFulfillmentStatusScreen> createState() => _UserFulfillmentStatusScreenState();
}

class _UserFulfillmentStatusScreenState extends State<UserFulfillmentStatusScreen> {
  Map<String, dynamic>? _requirement;
  List<dynamic> _trips = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    if (widget.requirement != null) {
      _requirement = widget.requirement;
    }
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      if (_requirement == null) {
        final reqs = await UserService.instance.getRequirements();
        if (reqs.isNotEmpty) {
          _requirement = reqs.first as Map<String, dynamic>;
        }
      }
      final trips = await UserService.instance.getTrips();
      if (mounted) setState(() => _trips = trips);
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
    final quantity = (req['quantity'] ?? 1) as int;
    final fulfilled = (req['fulfilledCount'] ?? _trips.where((t) => t['status'] != 'CANCELLED').length) as int;
    final status = (req['status'] ?? 'DISPATCHING').toString();
    final progress = quantity > 0 ? (fulfilled / quantity).clamp(0.0, 1.0) : 0.0;

    final assignedCount = _trips.where((t) => t['status'] == 'ACCEPTED' || t['status'] == 'ASSIGNED').length;
    final searchingCount = (quantity - fulfilled).clamp(0, quantity);

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
                    // Badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.warning.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                      ),
                      child: Text(
                        status,
                        style: TextStyle(color: AppColors.warning, fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                    ),

                    const SizedBox(height: AppSpacing.xs),

                    // Title
                    Text(
                      '$fulfilled / $quantity Vehicles Fulfilled',
                      style: AppTypography.h1(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                      ),
                    ),

                    const SizedBox(height: 8),

                    // Progress Bar
                    ClipRRect(
                      borderRadius: BorderRadius.circular(AppRadius.full),
                      child: LinearProgressIndicator(
                        value: progress,
                        minHeight: 8,
                        backgroundColor: AppColors.slate400,
                        valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
                      ),
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    // 3 Status Count Cards
                    Row(
                      children: [
                        Expanded(
                          child: _buildCountCard(context, 'Assigned', '$assignedCount', AppColors.success, isDark),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _buildCountCard(context, 'Searching', '$searchingCount', AppColors.info, isDark),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _buildCountCard(context, 'Total', '$quantity', AppColors.slate400, isDark),
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
                          child: Text('View Map', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),

                    const SizedBox(height: AppSpacing.xs),

                    // Map Container Card
                    Container(
                      height: 180,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.slate100,
                        borderRadius: BorderRadius.circular(AppRadius.lg),
                        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                      ),
                      child: Stack(
                        children: [
                          Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.map, size: 48, color: AppColors.primary),
                                const SizedBox(height: 8),
                                Text(
                                  'Live Fleet Route Tracking',
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
                              backgroundColor: AppColors.primary,
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

                    if (_trips.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                        ),
                        child: Center(
                          child: Text(
                            'Dispatching offers to verified drivers in the region...',
                            style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                          ),
                        ),
                      )
                    else
                      ..._trips.take(3).map((t) {
                        final trip = t as Map<String, dynamic>;
                        final driver = trip['driver'] as Map<String, dynamic>?;
                        final driverName = driver?['user']?['fullName'] ?? driver?['fullName'] ?? 'Driver';
                        final tStatus = trip['status'] ?? 'ASSIGNED';
                        final code = trip['tripCode'] ?? trip['id'] ?? '';

                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8.0),
                          child: _buildUpdateTile(
                            context,
                            time: 'Live',
                            message: 'Driver $driverName update: $tStatus ($code)',
                            color: AppColors.success,
                            isDark: isDark,
                            onTap: () => context.push(AppRoutes.userActiveTripScreen, extra: trip),
                          ),
                        );
                      }),
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
          Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
          const SizedBox(height: 2),
          Text(label, style: TextStyle(fontSize: 11, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
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
            Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
            const SizedBox(width: 10),
            Expanded(child: Text(message, style: AppTypography.body(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.w500))),
            const SizedBox(width: 8),
            Text(time, style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
          ],
        ),
      ),
    );
  }
}
