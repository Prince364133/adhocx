import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';

class UserDriverAssignmentsListScreen extends StatefulWidget {
  final List<dynamic>? initialTrips;
  const UserDriverAssignmentsListScreen({super.key, this.initialTrips});

  @override
  State<UserDriverAssignmentsListScreen> createState() => _UserDriverAssignmentsListScreenState();
}

class _UserDriverAssignmentsListScreenState extends State<UserDriverAssignmentsListScreen> {
  String _selectedTab = 'All';
  bool _isLoading = true;
  List<dynamic> _trips = [];

  @override
  void initState() {
    super.initState();
    if (widget.initialTrips != null) {
      _trips = widget.initialTrips!;
      _isLoading = false;
    } else {
      _loadTrips();
    }
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
    if (_selectedTab == 'All') return _trips;
    if (_selectedTab == 'Assigned') {
      return _trips.where((t) {
        final s = (t as Map)['status'];
        return s == 'ASSIGNED' || s == 'ACCEPTED';
      }).toList();
    }
    if (_selectedTab == 'On Trip') {
      return _trips.where((t) {
        final s = (t as Map)['status'];
        return s == 'IN_PROGRESS' || s == 'ARRIVED';
      }).toList();
    }
    if (_selectedTab == 'Completed') {
      return _trips.where((t) => (t as Map)['status'] == 'COMPLETED').toList();
    }
    return _trips;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final allCount = _trips.length;
    final assignedCount = _trips.where((t) => t['status'] == 'ASSIGNED' || t['status'] == 'ACCEPTED').length;
    final onTripCount = _trips.where((t) => t['status'] == 'IN_PROGRESS' || t['status'] == 'ARRIVED').length;
    final completedCount = _trips.where((t) => t['status'] == 'COMPLETED').length;

    final tabs = [
      {'key': 'All', 'label': 'All ($allCount)'},
      {'key': 'Assigned', 'label': 'Assigned ($assignedCount)'},
      {'key': 'On Trip', 'label': 'On Trip ($onTripCount)'},
      {'key': 'Completed', 'label': 'Completed ($completedCount)'},
    ];

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
          'Driver Assignments',
          style: AppTypography.h3(
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
          // Filter Tabs Row
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
            child: Row(
              children: tabs.map((tab) {
                final isSelected = _selectedTab == tab['key'];
                return Padding(
                  padding: const EdgeInsets.only(right: 8.0),
                  child: ChoiceChip(
                    label: Text(tab['label']!),
                    selected: isSelected,
                    onSelected: (selected) {
                      if (selected) setState(() => _selectedTab = tab['key']!);
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

          // Drivers List Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Drivers (${_filteredTrips.length})',
                style: AppTypography.caption(
                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),

          const SizedBox(height: AppSpacing.xs),

          // Drivers Cards List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _filteredTrips.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.directions_car_outlined, size: 48, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                            const SizedBox(height: 12),
                            Text(
                              'No assigned drivers in this tab',
                              style: AppTypography.body(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                            ),
                          ],
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        itemCount: _filteredTrips.length,
                        separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
                        itemBuilder: (context, index) {
                          final t = _filteredTrips[index] as Map<String, dynamic>;
                          final driver = t['driver'] as Map<String, dynamic>?;
                          final driverUser = driver?['user'] as Map<String, dynamic>?;
                          final driverName = driverUser?['fullName'] ?? driver?['fullName'] ?? 'Assigned Driver';
                          final vehiclePlate = driver?['vehiclePlate'] ?? t['vehiclePlate'] ?? 'DL Vehicle';
                          final vehicleModel = driver?['vehicleModel'] ?? t['vehicleModel'] ?? 'Sedan';
                          final status = (t['status'] ?? 'ASSIGNED').toString();

                          Color badgeColor = AppColors.success;
                          if (status == 'CANCELLED') badgeColor = AppColors.error;
                          if (status == 'IN_PROGRESS' || status == 'ARRIVED') badgeColor = AppColors.primary;

                          return InkWell(
                            onTap: () => context.push(AppRoutes.userDriverDetailsScreen, extra: t),
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
                                  CircleAvatar(
                                    radius: 20,
                                    backgroundColor: AppColors.primary,
                                    child: Text(
                                      driverName.isNotEmpty ? driverName.substring(0, 1).toUpperCase() : 'D',
                                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          driverName,
                                          style: AppTypography.h4(
                                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          '$vehiclePlate • $vehicleModel',
                                          style: AppTypography.caption(
                                            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: badgeColor.withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(AppRadius.sm),
                                    ),
                                    child: Text(
                                      status,
                                      style: TextStyle(color: badgeColor, fontSize: 11, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
