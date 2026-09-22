import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_adaptive_skeleton.dart';

class UserTripsListScreen extends StatefulWidget {
  const UserTripsListScreen({super.key});

  @override
  State<UserTripsListScreen> createState() => _UserTripsListScreenState();
}

class _UserTripsListScreenState extends State<UserTripsListScreen> {
  String _selectedTab = 'Upcoming';
  bool _isLoading = true;
  List<dynamic> _allTrips = [];

  final List<String> _tabs = ['Upcoming', 'Active', 'Completed', 'Cancelled'];

  @override
  void initState() {
    super.initState();
    _loadTrips();
  }

  Future<void> _loadTrips() async {
    setState(() => _isLoading = true);
    try {
      final list = await UserService.instance.getTrips();
      if (mounted) setState(() => _allTrips = list);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<dynamic> get _filteredTrips {
    if (_selectedTab == 'Upcoming') {
      return _allTrips.where((t) {
        final st = (t['status'] ?? '').toString().toUpperCase();
        return st == 'ASSIGNED' || st == 'DRIVER_ASSIGNED' || st == 'SCHEDULED';
      }).toList();
    } else if (_selectedTab == 'Active') {
      return _allTrips.where((t) {
        final st = (t['status'] ?? '').toString().toUpperCase();
        return st == 'ARRIVED' || st == 'IN_PROGRESS' || st == 'STARTED';
      }).toList();
    } else if (_selectedTab == 'Completed') {
      return _allTrips.where((t) {
        final st = (t['status'] ?? '').toString().toUpperCase();
        return st == 'COMPLETED';
      }).toList();
    } else {
      return _allTrips.where((t) {
        final st = (t['status'] ?? '').toString().toUpperCase();
        return st == 'CANCELLED';
      }).toList();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final list = _filteredTrips;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        elevation: 0,
        title: Text(
          'Trips',
          style: AppTypography.h2(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            onPressed: _loadTrips,
            icon: Icon(Icons.refresh, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
          ),
        ],
      ),
      body: Column(
        children: [
          // Segmented Tabs Header
          Container(
            margin: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceDark : AppColors.slate200,
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: Row(
              children: _tabs.map((tab) {
                final isSelected = _selectedTab == tab;
                return Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _selectedTab = tab),
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        color: isSelected ? AppColors.primary : Colors.transparent,
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                      ),
                      child: Text(
                        tab,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: isSelected ? Colors.white : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),

          const SizedBox(height: AppSpacing.xs),

          // Trips List
          Expanded(
            child: AdaptiveSkeleton.repeat(
              isLoading: _isLoading,
              mockCount: 4,
              padding: const EdgeInsets.all(AppSpacing.md),
              separator: const SizedBox(height: AppSpacing.sm),
              mockBuilder: (context, index) => _buildTripTile(
                {
                  'id': 'TRIP-9901',
                  'status': 'SCHEDULED',
                  'fare': 1250,
                  'requirement': {'vehicleType': 'Sedan'},
                  'driver': {'user': {'name': 'Driver Assigned'}},
                },
                isDark,
              ),
              child: list.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.directions_car_outlined, size: 48, color: AppColors.textMutedLight),
                          const SizedBox(height: 12),
                          Text(
                            'No $_selectedTab Trips',
                            style: AppTypography.body(color: AppColors.textMutedLight),
                          ),
                        ],
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      itemCount: list.length,
                      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
                      itemBuilder: (context, index) => _buildTripTile(
                        list[index] as Map<String, dynamic>? ?? {},
                        isDark,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTripTile(Map<String, dynamic> trip, bool isDark) {
    final req = trip['requirement'] as Map<String, dynamic>? ?? {};
    final driver = trip['driver'] as Map<String, dynamic>? ?? {};
    final driverUser = driver['user'] as Map<String, dynamic>? ?? {};
    final driverName = driverUser['name'] ?? 'Driver Assigned';
    final status = (trip['status'] ?? 'SCHEDULED').toString().toUpperCase();
    final vehicle = req['vehicleType'] ?? 'Sedan';
    final tripId = (trip['id'] ?? 'TRIP').toString();
    final shortId = tripId.length > 8 ? tripId.substring(0, 8).toUpperCase() : tripId;

    Color statusColor = AppColors.info;
    if (status == 'ARRIVED' || status == 'IN_PROGRESS' || status == 'STARTED') {
      statusColor = AppColors.accentGreenDark;
    } else if (status == 'COMPLETED') {
      statusColor = AppColors.accentPurple;
    } else if (status == 'CANCELLED') {
      statusColor = AppColors.error;
    }

    return InkWell(
      onTap: () => context.push(AppRoutes.userRequirementDetailsScreen, extra: {'id': req['id'] ?? trip['requirementId']}),
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
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.directions_car, color: AppColors.primary),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '$vehicle Transfer',
                    style: AppTypography.h4(
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'ID: $shortId',
                    style: AppTypography.caption(
                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Driver: $driverName',
                    style: AppTypography.caption(
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                  ),
                  child: Text(
                    status,
                    style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '₹${trip['fare'] ?? '850'}',
                  style: AppTypography.body(
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

