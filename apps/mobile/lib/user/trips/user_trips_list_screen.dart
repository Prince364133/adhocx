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
  List<Map<String, dynamic>> _allTrips = [];

  final List<String> _tabs = ['Upcoming', 'Active', 'Completed', 'Cancelled'];

  @override
  void initState() {
    super.initState();
    _loadTrips();
  }

  Future<void> _loadTrips() async {
    setState(() => _isLoading = true);
    try {
      final results = await Future.wait([
        UserService.instance.getTrips().catchError((e) {
          debugPrint('⚠️ [USER TRIPS LIST] Error fetching trips: $e');
          return <dynamic>[];
        }),
        UserService.instance.getRequirements().catchError((e) {
          debugPrint('⚠️ [USER TRIPS LIST] Error fetching requirements: $e');
          return <dynamic>[];
        }),
      ]);

      final List<dynamic> rawTrips = results[0];
      final List<dynamic> rawReqs = results[1];

      final List<Map<String, dynamic>> combined = [];
      final Set<String> seenTripIds = {};
      final Set<String> seenReqIds = {};

      // 1. Add direct trips
      for (final t in rawTrips) {
        if (t is Map) {
          final map = Map<String, dynamic>.from(t);
          final id = map['id']?.toString() ?? '';
          final reqId = (map['requirementId'] ?? (map['requirement'] is Map ? map['requirement']['id'] : null))?.toString();
          if (id.isNotEmpty && !seenTripIds.contains(id)) {
            seenTripIds.add(id);
            if (reqId != null && reqId.isNotEmpty) {
              seenReqIds.add(reqId);
            }
            combined.add(map);
          }
        }
      }

      // 2. Add requirements (and any child trips)
      for (final r in rawReqs) {
        if (r is Map) {
          final map = Map<String, dynamic>.from(r);
          final reqId = map['id']?.toString() ?? '';
          final reqTrips = map['trips'];

          if (reqTrips is List && reqTrips.isNotEmpty) {
            for (final rt in reqTrips) {
              if (rt is Map) {
                final tripMap = Map<String, dynamic>.from(rt);
                tripMap['requirement'] = map;
                final tId = tripMap['id']?.toString() ?? '';
                if (tId.isNotEmpty && !seenTripIds.contains(tId)) {
                  seenTripIds.add(tId);
                  combined.add(tripMap);
                }
              }
            }
            if (reqId.isNotEmpty) seenReqIds.add(reqId);
          } else {
            // Requirement doesn't have an active trip record yet (searching, open, scheduled, or cancelled)
            if (reqId.isNotEmpty && !seenReqIds.contains(reqId)) {
              seenReqIds.add(reqId);
              combined.add({
                'id': reqId,
                'requirementId': reqId,
                'isRequirementOnly': true,
                'status': map['status'] ?? 'SCHEDULED',
                'vehicleType': map['vehicleType'] ?? 'Sedan',
                'quantity': map['quantity'] ?? 1,
                'fare': map['ratePerVehicle'] ?? map['suggestedBudget'] ?? map['budgetPerVehicle'] ?? map['totalAmount'],
                'pickupLocation': map['pickupLocation'],
                'dropLocation': map['dropLocation'],
                'reportingTime': map['reportingTime'] ?? map['scheduledPickupTime'] ?? map['createdAt'],
                'createdAt': map['createdAt'],
                'notes': map['notes'],
                'requirement': map,
              });
            }
          }
        }
      }

      // Sort newest reporting/created time first
      combined.sort((a, b) {
        final aTime = DateTime.tryParse(a['reportingTime']?.toString() ?? a['createdAt']?.toString() ?? '') ?? DateTime(1970);
        final bTime = DateTime.tryParse(b['reportingTime']?.toString() ?? b['createdAt']?.toString() ?? '') ?? DateTime(1970);
        return bTime.compareTo(aTime);
      });

      if (mounted) {
        setState(() {
          _allTrips = combined;

          // Auto-select tab with active trips if upcoming is empty
          final activeCount = _countForTab('Active');
          final upcomingCount = _countForTab('Upcoming');
          if (_selectedTab == 'Upcoming' && upcomingCount == 0 && activeCount > 0) {
            _selectedTab = 'Active';
          }
        });
      }
    } catch (e) {
      debugPrint('⚠️ [USER TRIPS LIST] Exception loading data: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  int _countForTab(String tab) {
    return _allTrips.where((t) => _matchesTab(t, tab)).length;
  }

  bool _matchesTab(Map<String, dynamic> trip, String tab) {
    final st = (trip['status'] ?? '').toString().toUpperCase();
    if (tab == 'Upcoming') {
      return st == 'ASSIGNED' ||
          st == 'DRIVER_ASSIGNED' ||
          st == 'SCHEDULED' ||
          st == 'CONFIRMED' ||
          st == 'SEARCHING' ||
          st == 'POSTED' ||
          st == 'OPEN' ||
          st == 'MATCHING' ||
          st == 'PENDING';
    } else if (tab == 'Active') {
      return st == 'ARRIVED' ||
          st == 'IN_PROGRESS' ||
          st == 'STARTED' ||
          st == 'EN_ROUTE' ||
          st == 'ENROUTE' ||
          st == 'DRIVER_EN_ROUTE' ||
          st == 'ON_THE_WAY';
    } else if (tab == 'Completed') {
      return st == 'COMPLETED' || st == 'FULFILLED';
    } else {
      return st == 'CANCELLED' || st == 'FAILED' || st == 'EXPIRED' || st == 'REJECTED';
    }
  }

  List<Map<String, dynamic>> get _filteredTrips {
    return _allTrips.where((t) => _matchesTab(t, _selectedTab)).toList();
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
            tooltip: 'Refresh Trips',
          ),
        ],
      ),
      body: Column(
        children: [
          // Segmented Tabs Header with Badge Counts
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
                final count = _countForTab(tab);
                final label = count > 0 ? '$tab ($count)' : tab;

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
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 2),
                        child: FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text(
                            label,
                            textAlign: TextAlign.center,
                            maxLines: 1,
                            style: TextStyle(
                              color: isSelected ? Colors.white : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),

          const SizedBox(height: AppSpacing.xs),

          // Trips List or Empty State
          Expanded(
            child: AdaptiveSkeleton.repeat(
              isLoading: _isLoading,
              mockCount: 3,
              padding: const EdgeInsets.all(AppSpacing.md),
              separator: const SizedBox(height: AppSpacing.sm),
              mockBuilder: (context, index) => _buildMockTile(isDark),
              child: list.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(20),
                              decoration: BoxDecoration(
                                color: (isDark ? Colors.white : Colors.black).withValues(alpha: 0.05),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                Icons.directions_car_outlined,
                                size: 52,
                                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                              ),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'No $_selectedTab Trips',
                              style: AppTypography.h3(
                                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              _selectedTab == 'Upcoming' || _selectedTab == 'Active'
                                  ? 'You do not have any $_selectedTab.toLowerCase() trips at the moment.'
                                  : 'No $_selectedTab.toLowerCase() trip history recorded.',
                              textAlign: TextAlign.center,
                              style: AppTypography.small(
                                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                              ),
                            ),
                            if (_selectedTab == 'Upcoming' || _selectedTab == 'Active') ...[
                              const SizedBox(height: 20),
                              ElevatedButton.icon(
                                onPressed: () => context.push(AppRoutes.userCreateRequirementScreen),
                                icon: const Icon(Icons.add, size: 18),
                                label: const Text('Book a Trip'),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _loadTrips,
                      child: ListView.separated(
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.all(AppSpacing.md),
                        itemCount: list.length,
                        separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
                        itemBuilder: (context, index) => _buildTripTile(list[index], isDark),
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTripTile(Map<String, dynamic> trip, bool isDark) {
    final req = trip['requirement'] as Map<String, dynamic>? ?? (trip['isRequirementOnly'] == true ? trip : {});
    final driver = trip['driver'] as Map<String, dynamic>? ?? {};
    final driverUser = driver['user'] as Map<String, dynamic>? ?? {};
    final driverName = driverUser['fullName'] ?? driverUser['name'] ?? driver['fullName'];
    final vehiclePlate = driver['vehiclePlate'] ?? trip['vehiclePlate'];

    final status = (trip['status'] ?? 'SCHEDULED').toString().toUpperCase();
    final vehicle = (trip['vehicleType'] ?? req['vehicleType'] ?? 'Sedan').toString();
    final quantity = req['quantity'] ?? trip['quantity'] ?? 1;

    final tripId = (trip['id'] ?? 'TRIP').toString();
    final shortId = tripId.length > 8 ? tripId.substring(0, 8).toUpperCase() : tripId;

    final pickup = _extractAddress(trip['pickupLocation'] ?? req['pickupLocation']);
    final drop = _extractAddress(trip['dropLocation'] ?? req['dropLocation']);

    final timeStr = _formatReportingTime(trip['reportingTime'] ?? req['reportingTime'] ?? trip['createdAt']);

    // Color logic
    Color statusColor = AppColors.info;
    if (status == 'ARRIVED' || status == 'IN_PROGRESS' || status == 'STARTED' || status == 'EN_ROUTE' || status == 'ON_THE_WAY') {
      statusColor = AppColors.success;
    } else if (status == 'COMPLETED' || status == 'FULFILLED') {
      statusColor = AppColors.accentPurple;
    } else if (status == 'CANCELLED' || status == 'FAILED' || status == 'EXPIRED') {
      statusColor = AppColors.error;
    } else if (status == 'SEARCHING' || status == 'POSTED' || status == 'MATCHING') {
      statusColor = AppColors.warning;
    }

    final fareVal = req['ratePerVehicle'] ?? req['budgetPerVehicle'] ?? req['suggestedBudget'] ?? req['totalAmount'] ?? trip['fare'];
    final fareStr = fareVal != null ? '₹$fareVal' : '--';

    return InkWell(
      onTap: () {
        final reqId = (req['id'] ?? trip['requirementId'] ?? trip['id'])?.toString();
        final effectiveTripId = trip['isRequirementOnly'] == true ? null : trip['id']?.toString();

        context.push(
          AppRoutes.userActiveTripScreen,
          extra: {
            'trip': trip,
            'tripId': effectiveTripId,
            'requirementId': reqId,
            'id': effectiveTripId ?? reqId,
            ...trip,
          },
        );
      },
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          borderRadius: BorderRadius.circular(AppRadius.lg),
          border: Border.all(
            color: isDark ? AppColors.borderDark : AppColors.borderLight,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Row: Vehicle, ID, Status & Fare
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(9),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.directions_car, color: AppColors.primary, size: 20),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        quantity > 1 ? '$quantity x $vehicle' : '$vehicle Transfer',
                        style: AppTypography.h4(
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'ID: $shortId • $timeStr',
                        style: AppTypography.caption(
                          color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
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
                        style: TextStyle(
                          color: statusColor,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      fareStr,
                      style: AppTypography.body(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ],
            ),

            const SizedBox(height: 12),
            const Divider(height: 1),
            const SizedBox(height: 10),

            // Route: Pickup and Drop
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Column(
                  children: [
                    const Icon(Icons.circle, size: 10, color: AppColors.success),
                    Container(width: 1.5, height: 16, color: Colors.grey.withValues(alpha: 0.4)),
                    const Icon(Icons.location_on, size: 12, color: AppColors.error),
                  ],
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        pickup,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        drop,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            // Driver info footer if assigned
            if (driverName != null) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.bgDark : AppColors.slate100,
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.person, size: 14, color: AppColors.primary),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        driverName,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        ),
                      ),
                    ),
                    if (vehiclePlate != null)
                      Text(
                        vehiclePlate.toString(),
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                        ),
                      ),
                  ],
                ),
              ),
            ] else if (trip['isRequirementOnly'] == true && (status == 'SEARCHING' || status == 'MATCHING' || status == 'POSTED')) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.warning.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                ),
                child: Row(
                  children: [
                    const SizedBox(
                      width: 12,
                      height: 12,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.warning),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Dispatching nearby fleet drivers...',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppColors.warning,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildMockTile(bool isDark) {
    return Container(
      height: 110,
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.lg),
      ),
    );
  }

  String _extractAddress(dynamic loc) {
    if (loc == null) return 'Location pending';
    if (loc is Map) {
      return (loc['address'] ?? loc['name'] ?? loc['formattedAddress'] ?? 'Location confirmed').toString();
    }
    return loc.toString();
  }

  String _formatReportingTime(dynamic time) {
    if (time == null) return 'Flexible Schedule';
    final dt = DateTime.tryParse(time.toString());
    if (dt == null) return time.toString();
    final local = dt.toLocal();
    final hour = local.hour > 12 ? local.hour - 12 : (local.hour == 0 ? 12 : local.hour);
    final ampm = local.hour >= 12 ? 'PM' : 'AM';
    final min = local.minute.toString().padLeft(2, '0');
    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${local.day} ${months[local.month - 1]}, $hour:$min $ampm';
  }
}
