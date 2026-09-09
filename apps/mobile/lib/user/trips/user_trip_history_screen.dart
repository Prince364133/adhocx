import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';

class UserTripHistoryScreen extends StatefulWidget {
  const UserTripHistoryScreen({super.key});

  @override
  State<UserTripHistoryScreen> createState() => _UserTripHistoryScreenState();
}

class _UserTripHistoryScreenState extends State<UserTripHistoryScreen> {
  String _selectedFilter = 'All';
  bool _isLoading = true;
  List<dynamic> _trips = [];

  final List<String> _filters = ['All', 'Active', 'Completed', 'Cancelled'];

  @override
  void initState() {
    super.initState();
    _loadTrips();
  }

  Future<void> _loadTrips() async {
    setState(() => _isLoading = true);
    try {
      final list = await UserService.instance.getTrips();
      if (mounted) setState(() => _trips = list);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<dynamic> get _filteredTrips {
    if (_selectedFilter == 'All') return _trips;
    if (_selectedFilter == 'Active') {
      return _trips.where((t) {
        final s = (t as Map)['status'];
        return s == 'IN_PROGRESS' || s == 'ACCEPTED' || s == 'ASSIGNED' || s == 'ARRIVED';
      }).toList();
    }
    if (_selectedFilter == 'Completed') {
      return _trips.where((t) => (t as Map)['status'] == 'COMPLETED').toList();
    }
    if (_selectedFilter == 'Cancelled') {
      return _trips.where((t) => (t as Map)['status'] == 'CANCELLED').toList();
    }
    return _trips;
  }

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
        title: Text('Trip History', style: AppTypography.h3(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            onPressed: _loadTrips,
            icon: Icon(Icons.refresh, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
            child: Row(
              children: _filters.map((filter) {
                final isSelected = _selectedFilter == filter;
                return Padding(
                  padding: const EdgeInsets.only(right: 8.0),
                  child: ChoiceChip(
                    label: Text(filter),
                    selected: isSelected,
                    onSelected: (selected) {
                      if (selected) setState(() => _selectedFilter = filter);
                    },
                    selectedColor: AppColors.primary,
                    backgroundColor: isDark ? AppColors.surfaceDark : AppColors.slate200,
                    labelStyle: TextStyle(
                      color: isSelected ? Colors.white : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    ),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.full)),
                  ),
                );
              }).toList(),
            ),
          ),

          const SizedBox(height: AppSpacing.xs),

          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _filteredTrips.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.history, size: 48, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                            const SizedBox(height: 12),
                            Text('No trip records found', style: AppTypography.body(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                          ],
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        itemCount: _filteredTrips.length,
                        separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
                        itemBuilder: (context, index) {
                          final t = _filteredTrips[index] as Map<String, dynamic>;
                          return _buildTripCard(context, t, isDark);
                        },
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildTripCard(BuildContext context, Map<String, dynamic> t, bool isDark) {
    final status = (t['status'] ?? 'COMPLETED').toString();
    final tripCode = t['tripCode'] ?? t['id'] ?? 'TRP-LIVE';
    final pickup = t['pickupLocation'] as Map<String, dynamic>?;
    final drop = t['dropLocation'] as Map<String, dynamic>?;
    final pickupAddr = pickup?['address'] ?? 'Pickup Location';
    final dropAddr = drop?['address'] ?? 'Drop Location';

    Color badgeColor = AppColors.success;
    if (status == 'IN_PROGRESS' || status == 'ARRIVED' || status == 'ACCEPTED') badgeColor = AppColors.primary;
    if (status == 'CANCELLED') badgeColor = AppColors.error;

    return InkWell(
      onTap: () => context.push(AppRoutes.userHistoricalTripDetailsScreen, extra: t),
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: Container(
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
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: Icon(Icons.directions_car_outlined, color: AppColors.primary),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(tripCode.toString(), style: AppTypography.caption(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 2),
                  Text('$pickupAddr → $dropAddr', maxLines: 1, overflow: TextOverflow.ellipsis, style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontSize: 11)),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: badgeColor.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(AppRadius.sm),
              ),
              child: Text(status, style: TextStyle(color: badgeColor, fontSize: 11, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}
