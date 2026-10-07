import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_adaptive_skeleton.dart';
import 'models/cab_cart_item.dart';
import 'models/fleet_template_model.dart';
import 'services/fleet_template_service.dart';
import 'widgets/batch_requirement_details_modal.dart';
import 'widgets/saved_templates_modal.dart';

class RequirementGroupItem {
  final String key;
  final bool isBatch;
  final String? batchId;
  final String title;
  final String status;
  final int totalQuantity;
  final int assignedQuantity;
  final String pickupAddress;
  final String dropAddress;
  final String vehicleSummary;
  final double totalAmount;
  final List<Map<String, dynamic>> items;

  RequirementGroupItem({
    required this.key,
    required this.isBatch,
    this.batchId,
    required this.title,
    required this.status,
    required this.totalQuantity,
    required this.assignedQuantity,
    required this.pickupAddress,
    required this.dropAddress,
    required this.vehicleSummary,
    required this.totalAmount,
    required this.items,
  });
}

class UserRequirementsListScreen extends StatefulWidget {
  const UserRequirementsListScreen({super.key});

  @override
  State<UserRequirementsListScreen> createState() => _UserRequirementsListScreenState();
}

class _UserRequirementsListScreenState extends State<UserRequirementsListScreen> {
  String _selectedTab = 'All';
  bool _isLoading = true;
  List<RequirementGroupItem> _allGroups = [];
  List<RequirementGroupItem> _filteredGroups = [];

  final List<String> _filterTabs = ['All', 'Active', 'Completed', 'Cancelled'];

  @override
  void initState() {
    super.initState();
    _fetchRequirements();
  }

  Future<void> _fetchRequirements() async {
    setState(() => _isLoading = true);
    try {
      final res = await UserService.instance.getRequirements();
      if (mounted) {
        _allGroups = _groupRequirements(res);
        _applyFilter();
      }
    } catch (e) {
      debugPrint('Error fetching requirements: $e');
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  List<RequirementGroupItem> _groupRequirements(List<dynamic> rawList) {
    final Map<String, List<Map<String, dynamic>>> batchBuckets = {};
    final List<Map<String, dynamic>> nonBatchItems = [];

    for (final raw in rawList) {
      if (raw is! Map) continue;
      final item = Map<String, dynamic>.from(raw);
      final notes = item['notes']?.toString();
      final metadata = CabCartItem.parseBatchMetadata(notes);
      final batchId = metadata['batchId'];

      if (batchId != null && batchId.isNotEmpty) {
        if (!batchBuckets.containsKey(batchId)) {
          batchBuckets[batchId] = [];
        }
        batchBuckets[batchId]!.add(item);
      } else {
        nonBatchItems.add(item);
      }
    }

    final List<RequirementGroupItem> groups = [];

    // 1. Grouped Batches (Non-fragmented)
    batchBuckets.forEach((bId, items) {
      final firstNotes = items.first['notes']?.toString();
      final firstMeta = CabCartItem.parseBatchMetadata(firstNotes);
      final groupName = firstMeta['groupName']?.isNotEmpty == true
          ? firstMeta['groupName']!
          : 'Corporate Fleet (${items.length} Vehicles)';

      int totalQty = 0;
      int assignedQty = 0;
      double totalFare = 0.0;
      final Map<String, int> vehicleCounts = {};

      for (final it in items) {
        final q = (it['quantity'] as num?)?.toInt() ?? 1;
        final a = (it['assignedQuantity'] as num?)?.toInt() ?? 0;
        final fare = (it['ratePerVehicle'] as num?)?.toDouble() ??
            (it['totalAmount'] as num?)?.toDouble() ??
            0.0;
        final v = it['vehicleType']?.toString() ?? 'Sedan';

        totalQty += q;
        assignedQty += a;
        totalFare += fare;
        vehicleCounts[v] = (vehicleCounts[v] ?? 0) + q;
      }

      String overallStatus = 'DISPATCHING';
      final allCompleted = items.every((it) => it['status'] == 'COMPLETED' || it['status'] == 'FULFILLED');
      final allCancelled = items.every((it) => it['status'] == 'CANCELLED');
      final anyInProgress = items.any((it) => it['status'] == 'IN_PROGRESS' || ((it['assignedQuantity'] as num?)?.toInt() ?? 0) > 0);
      final allNoDriver = items.every((it) => it['status'] == 'NO_DRIVER_AVAILABLE');

      if (allCompleted) {
        overallStatus = 'COMPLETED';
      } else if (allCancelled) {
        overallStatus = 'CANCELLED';
      } else if (anyInProgress) {
        overallStatus = 'IN_PROGRESS';
      } else if (allNoDriver) {
        overallStatus = 'NO_DRIVER_AVAILABLE';
      } else {
        overallStatus = 'DISPATCHING';
      }

      final vehicleSummary = vehicleCounts.entries.map((e) => '${e.value}x ${e.key}').join(', ');
      final firstPickup = items.first['pickupAddress']?.toString() ?? 'Office Hub';
      final pickupShort = firstPickup.split(',').first.trim();
      final routeSummary = '$pickupShort → ${items.length} destinations';

      groups.add(
        RequirementGroupItem(
          key: bId,
          isBatch: true,
          batchId: bId,
          title: groupName,
          status: overallStatus,
          totalQuantity: totalQty,
          assignedQuantity: assignedQty,
          pickupAddress: firstPickup,
          dropAddress: routeSummary,
          vehicleSummary: vehicleSummary,
          totalAmount: totalFare,
          items: items,
        ),
      );
    });

    // 2. Individual (Non-Batch) Requirements
    for (final it in nonBatchItems) {
      final String id = it['id']?.toString() ?? '';
      final String vehicle = it['vehicleType']?.toString() ?? 'Sedan';
      final int qty = (it['quantity'] as num?)?.toInt() ?? 1;
      final int assigned = (it['assignedQuantity'] as num?)?.toInt() ?? 0;
      final String pickup = it['pickupAddress']?.toString() ?? 'Pickup location';
      final String drop = it['dropAddress']?.toString() ?? 'Drop location';
      final String status = it['status']?.toString() ?? 'POSTED';
      final double fare = (it['ratePerVehicle'] as num?)?.toDouble() ??
          (it['totalAmount'] as num?)?.toDouble() ??
          0.0;

      groups.add(
        RequirementGroupItem(
          key: id,
          isBatch: false,
          title: '$vehicle ($qty Vehicles)',
          status: status,
          totalQuantity: qty,
          assignedQuantity: assigned,
          pickupAddress: pickup,
          dropAddress: drop,
          vehicleSummary: '$qty x $vehicle',
          totalAmount: fare,
          items: [it],
        ),
      );
    }

    return groups;
  }

  void _applyFilter() {
    List<RequirementGroupItem> filtered = _allGroups;
    if (_selectedTab == 'Active') {
      filtered = _allGroups.where((g) {
        final s = g.status;
        return s == 'POSTED' ||
            s == 'DISPATCHING' ||
            s == 'PARTIALLY_FULFILLED' ||
            s == 'IN_PROGRESS' ||
            s == 'NO_DRIVER_AVAILABLE';
      }).toList();
    } else if (_selectedTab == 'Completed') {
      filtered = _allGroups.where((g) {
        final s = g.status;
        return s == 'FULFILLED' || s == 'COMPLETED';
      }).toList();
    } else if (_selectedTab == 'Cancelled') {
      filtered = _allGroups.where((g) {
        final s = g.status;
        return s == 'CANCELLED';
      }).toList();
    }

    setState(() {
      _filteredGroups = filtered;
      _isLoading = false;
    });
  }

  Future<void> _saveGroupAsTemplate(RequirementGroupItem group) async {
    try {
      final List<CabCartItem> templateCabs = [];
      for (int i = 0; i < group.items.length; i++) {
        final it = group.items[i];
        final vehicleType = it['vehicleType']?.toString() ?? 'SEDAN';
        final pickupAddress = it['pickupAddress']?.toString() ?? 'Office Hub';
        final dropAddress = it['dropAddress']?.toString() ?? 'Destination';
        final reportingTimeStr = it['reportingTime']?.toString();
        DateTime reporting = DateTime.now().add(const Duration(hours: 4));
        if (reportingTimeStr != null) {
          reporting = DateTime.tryParse(reportingTimeStr) ?? reporting;
        }

        final fare = (it['ratePerVehicle'] as num?)?.toDouble() ??
            (it['totalAmount'] as num?)?.toDouble() ??
            800.0;

        templateCabs.add(
          CabCartItem(
            id: 'tmpl_cab_${DateTime.now().millisecondsSinceEpoch}_$i',
            vehicleType: vehicleType,
            vehicleLabel: vehicleType == 'SUV' ? 'SUV 7 Seater' : 'Prime Sedan',
            passengers: 4,
            direction: 'OUTBOUND_FROM_OFFICE',
            officeHubId: 'HITEC_NANAKRAMGUDA',
            officeAddress: pickupAddress,
            officeLat: (it['pickupLocation']?['latitude'] as num?)?.toDouble() ?? 17.4435,
            officeLng: (it['pickupLocation']?['longitude'] as num?)?.toDouble() ?? 78.3772,
            localityName: dropAddress.split(',').first.trim(),
            pickupAddress: pickupAddress,
            pickupLat: (it['pickupLocation']?['latitude'] as num?)?.toDouble() ?? 17.4435,
            pickupLng: (it['pickupLocation']?['longitude'] as num?)?.toDouble() ?? 78.3772,
            dropAddress: dropAddress,
            dropLat: (it['dropLocation']?['latitude'] as num?)?.toDouble() ?? 17.3850,
            dropLng: (it['dropLocation']?['longitude'] as num?)?.toDouble() ?? 78.4867,
            tripType: 'One Way',
            hasEscort: false,
            pickupDate: '${reporting.year}-${reporting.month.toString().padLeft(2, '0')}-${reporting.day.toString().padLeft(2, '0')}',
            pickupTime: '${reporting.hour > 12 ? reporting.hour - 12 : (reporting.hour == 0 ? 12 : reporting.hour)}:${reporting.minute.toString().padLeft(2, '0')} ${reporting.hour >= 12 ? 'PM' : 'AM'}',
            reportingDateTime: reporting,
            estimatedFare: fare,
          ),
        );
      }

      final template = FleetTemplate(
        id: 'tmpl_${DateTime.now().millisecondsSinceEpoch}',
        name: group.title,
        cabs: templateCabs,
        createdAt: DateTime.now(),
        notes: 'Saved from requirement group',
      );

      await FleetTemplateService.instance.saveTemplate(template);

      Fluttertoast.showToast(
        msg: 'Saved "${group.title}" as reusable template!',
        backgroundColor: AppColors.success,
        textColor: Colors.white,
      );
    } catch (e) {
      Fluttertoast.showToast(msg: 'Failed to save template: $e');
    }
  }

  void _openGroupDetails(RequirementGroupItem group) {
    if (group.isBatch) {
      showModalBottomSheet(
        context: context,
        useRootNavigator: true,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) => BatchRequirementDetailsModal(
          groupName: group.title,
          batchId: group.batchId ?? '',
          items: group.items,
          onRefreshNeeded: _fetchRequirements,
        ),
      );
    } else {
      context.push(
        AppRoutes.userRequirementDetailsScreen,
        extra: {'id': group.items.first['id'], 'initialData': group.items.first},
      );
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
            onPressed: () {
              showModalBottomSheet(
                context: context,
                useRootNavigator: true,
                isScrollControlled: true,
                backgroundColor: Colors.transparent,
                builder: (_) => const SavedTemplatesModal(),
              );
            },
            icon: const Icon(Icons.bookmark_rounded, color: AppColors.primary),
            tooltip: 'Saved Templates',
          ),
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
                      _applyFilter();
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
              child: AdaptiveSkeleton.repeat(
                isLoading: _isLoading,
                mockCount: 3,
                padding: const EdgeInsets.all(AppSpacing.md),
                separator: const SizedBox(height: AppSpacing.sm),
                mockBuilder: (context, index) => Container(
                  height: 110,
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                    borderRadius: BorderRadius.circular(AppRadius.lg),
                  ),
                ),
                child: _filteredGroups.isEmpty
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
                                'Click "+ Post Requirement" or run a saved template to dispatch cabs.',
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
                          itemCount: _filteredGroups.length,
                          separatorBuilder: (context, index) => const SizedBox(height: AppSpacing.sm),
                          itemBuilder: (context, index) {
                            final group = _filteredGroups[index];
                            return _buildGroupCard(group, isDark);
                          },
                        ),
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

  Widget _buildGroupCard(RequirementGroupItem group, bool isDark) {
    Color statusColor = AppColors.info;
    if (group.status == 'FULFILLED' || group.status == 'COMPLETED') statusColor = AppColors.success;
    if (group.status == 'IN_PROGRESS' || group.status == 'PARTIALLY_FULFILLED') statusColor = AppColors.primary;
    if (group.status == 'NO_DRIVER_AVAILABLE') statusColor = AppColors.warning;
    if (group.status == 'CANCELLED') statusColor = AppColors.error;

    return InkWell(
      onTap: () => _openGroupDetails(group),
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          borderRadius: BorderRadius.circular(AppRadius.lg),
          border: Border.all(
            color: group.isBatch
                ? AppColors.primary.withValues(alpha: 0.35)
                : (isDark ? AppColors.borderDark : AppColors.borderLight),
            width: group.isBatch ? 1.5 : 1.0,
          ),
          boxShadow: group.isBatch
              ? [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.04),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header: Title, Batch tag, and Status
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (group.isBatch) ...[
                  Container(
                    padding: const EdgeInsets.all(7),
                    margin: const EdgeInsets.only(right: 8),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                    child: const Icon(Icons.corporate_fare_rounded, size: 18, color: AppColors.primary),
                  ),
                ],
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              group.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: AppTypography.h4(
                                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          IconButton(
                            icon: const Icon(Icons.bookmark_add_outlined, size: 18, color: AppColors.primary),
                            tooltip: 'Save as Template',
                            visualDensity: VisualDensity.compact,
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                            onPressed: () => _saveGroupAsTemplate(group),
                          ),
                        ],
                      ),
                      if (group.isBatch) ...[
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(AppRadius.sm),
                              ),
                              child: Text(
                                '${group.totalQuantity} Cabs Batch',
                                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primary),
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              group.vehicleSummary,
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
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                  ),
                  child: Text(
                    group.status.replaceAll('_', ' '),
                    style: TextStyle(
                      color: statusColor,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 8),

            // Pickup & Destination Summary
            Row(
              children: [
                const Icon(Icons.trip_origin, size: 12, color: AppColors.primary),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    group.pickupAddress,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.caption(
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 3),
            Row(
              children: [
                const Icon(Icons.location_on, size: 12, color: AppColors.accentPurple),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    group.dropAddress,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.caption(
                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                    ),
                  ),
                ),
              ],
            ),

            // Progress bar if batch
            if (group.isBatch && group.totalQuantity > 1) ...[
              const SizedBox(height: 10),
              ClipRRect(
                borderRadius: BorderRadius.circular(AppRadius.full),
                child: LinearProgressIndicator(
                  value: group.totalQuantity > 0 ? (group.assignedQuantity / group.totalQuantity) : 0.0,
                  backgroundColor: isDark ? AppColors.slate800 : AppColors.slate200,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    group.assignedQuantity == group.totalQuantity ? AppColors.success : AppColors.primary,
                  ),
                  minHeight: 4,
                ),
              ),
            ],

            const SizedBox(height: 10),

            // Bottom Progress & Action Row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Progress: ${group.assignedQuantity}/${group.totalQuantity} Fulfilled',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
                Row(
                  children: [
                    if (group.isBatch) ...[
                      Text(
                        'View ${group.items.length} Cabs',
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary,
                        ),
                      ),
                      const SizedBox(width: 4),
                    ],
                    const Icon(Icons.arrow_forward_ios, size: 11, color: AppColors.primary),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
