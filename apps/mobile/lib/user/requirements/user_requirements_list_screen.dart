import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';

class UserRequirementsListScreen extends StatefulWidget {
  const UserRequirementsListScreen({super.key});

  @override
  State<UserRequirementsListScreen> createState() => _UserRequirementsListScreenState();
}

class _UserRequirementsListScreenState extends State<UserRequirementsListScreen> {
  String _selectedTab = 'All';
  bool _isLoading = true;
  List<dynamic> _requirements = [];

  final List<String> _filterTabs = ['All', 'Active', 'Completed', 'Cancelled'];

  @override
  void initState() {
    super.initState();
    _fetchRequirements();
  }

  Future<void> _fetchRequirements() async {
    setState(() => _isLoading = true);
    try {
      String? statusQuery;
      if (_selectedTab == 'Active') statusQuery = 'DISPATCHING';
      if (_selectedTab == 'Completed') statusQuery = 'FULFILLED';
      if (_selectedTab == 'Cancelled') statusQuery = 'CANCELLED';

      final res = await UserService.instance.getRequirements(status: statusQuery);
      if (mounted) {
        setState(() {
          _requirements = res;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Error fetching requirements: $e');
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
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
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go(AppRoutes.userHomeScreen);
            }
          },
          icon: Icon(Icons.arrow_back, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
        ),
        title: Text(
          'Requirements',
          style: AppTypography.h2(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            onPressed: _fetchRequirements,
            icon: Icon(Icons.refresh, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Filter Tabs (Horizontal Scrollable)
            Container(
              height: 40,
              margin: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                itemCount: _filterTabs.length,
                separatorBuilder: (context, index) => const SizedBox(width: AppSpacing.xs),
                itemBuilder: (context, index) {
                  final tab = _filterTabs[index];
                  final isSelected = _selectedTab == tab;

                  return GestureDetector(
                    onTap: () {
                      setState(() => _selectedTab = tab);
                      _fetchRequirements();
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 8),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppColors.primary
                            : (isDark ? AppColors.surfaceDark : AppColors.surfaceLight),
                        borderRadius: BorderRadius.circular(AppRadius.full),
                        border: Border.all(
                          color: isSelected
                              ? AppColors.primary
                              : (isDark ? AppColors.borderDark : AppColors.borderLight),
                        ),
                      ),
                      child: Center(
                        child: Text(
                          tab,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                            color: isSelected
                                ? Colors.white
                                : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),

            const Divider(height: 1),

            // Requirements List
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                  : _requirements.isEmpty
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(AppSpacing.xl),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.inventory_2_outlined, size: 64, color: AppColors.textMutedLight),
                                const SizedBox(height: AppSpacing.md),
                                Text(
                                  'No Requirements in "$_selectedTab"',
                                  style: AppTypography.h3(
                                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: AppSpacing.xs),
                                Text(
                                  'Click "+ Post Requirement" to create a new fleet trip.',
                                  textAlign: TextAlign.center,
                                  style: AppTypography.caption(
                                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        )
                      : RefreshIndicator(
                          onRefresh: _fetchRequirements,
                          color: AppColors.primary,
                          child: ListView.separated(
                            padding: const EdgeInsets.all(AppSpacing.md),
                            itemCount: _requirements.length,
                            separatorBuilder: (context, index) => const SizedBox(height: AppSpacing.sm),
                            itemBuilder: (context, index) {
                              final item = _requirements[index];
                              final String id = item['id'] ?? '';
                              final String vehicle = item['vehicleType'] ?? 'Sedan';
                              final int qty = item['quantity'] ?? 1;
                              final int assigned = item['assignedQuantity'] ?? 0;
                              final String pickup = item['pickupAddress'] ?? 'Pickup location';
                              final String drop = item['dropAddress'] ?? 'Drop location';
                              final String status = item['status'] ?? 'POSTED';

                              Color statusColor = AppColors.info;
                              if (status == 'FULFILLED' || status == 'COMPLETED') statusColor = AppColors.success;
                              if (status == 'PARTIALLY_FULFILLED') statusColor = AppColors.warning;
                              if (status == 'CANCELLED') statusColor = AppColors.error;

                              return InkWell(
                                onTap: () => context.push(
                                  AppRoutes.userRequirementDetailsScreen,
                                  extra: {'id': id},
                                ),
                                borderRadius: BorderRadius.circular(AppRadius.lg),
                                child: Container(
                                  padding: const EdgeInsets.all(AppSpacing.md),
                                  decoration: BoxDecoration(
                                    color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                                    borderRadius: BorderRadius.circular(AppRadius.lg),
                                    border: Border.all(
                                      color: isDark ? AppColors.borderDark : AppColors.borderLight,
                                    ),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            '$vehicle ($qty Vehicles)',
                                            style: AppTypography.h4(
                                              color: isDark
                                                  ? AppColors.textPrimaryDark
                                                  : AppColors.textPrimaryLight,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: statusColor.withValues(alpha: 0.12),
                                              borderRadius: BorderRadius.circular(AppRadius.sm),
                                            ),
                                            child: Text(
                                              status.replaceAll('_', ' '),
                                              style: TextStyle(
                                                color: statusColor,
                                                fontSize: 11,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 6),
                                      Row(
                                        children: [
                                          Icon(Icons.trip_origin, size: 12, color: AppColors.primary),
                                          const SizedBox(width: 6),
                                          Expanded(
                                            child: Text(
                                              pickup,
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              style: AppTypography.caption(
                                                color: isDark
                                                    ? AppColors.textPrimaryDark
                                                    : AppColors.textPrimaryLight,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 2),
                                      Row(
                                        children: [
                                          Icon(Icons.location_on, size: 12, color: AppColors.accentPurple),
                                          const SizedBox(width: 6),
                                          Expanded(
                                            child: Text(
                                              drop,
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              style: AppTypography.caption(
                                                color: isDark
                                                    ? AppColors.textMutedDark
                                                    : AppColors.textMutedLight,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 10),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            'Progress: $assigned/$qty Fulfilled',
                                            style: TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.bold,
                                              color: AppColors.primary,
                                            ),
                                          ),
                                          const Icon(Icons.arrow_forward_ios, size: 12, color: AppColors.textMutedLight),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        onPressed: () => context.push(AppRoutes.userCreateRequirementScreen),
        icon: const Icon(Icons.add),
        label: const Text('Post Requirement', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
    );
  }
}
