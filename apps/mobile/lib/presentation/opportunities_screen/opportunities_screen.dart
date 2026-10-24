import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_service.dart';
import '../../services/driver_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../shared/widgets/app_adaptive_skeleton.dart';

import '../../utils/vehicle_utils.dart';
import '../../services/language_service.dart';

/// Screen 1: Nearby Opportunities List with strict vehicle category isolation.
class OpportunitiesScreen extends StatefulWidget {
  const OpportunitiesScreen({super.key});

  @override
  State<OpportunitiesScreen> createState() => _OpportunitiesScreenState();
}

class _OpportunitiesScreenState extends State<OpportunitiesScreen> {
  String? _driverVehicleCategory;
  bool _isLoading = true;
  bool _isOnActiveTrip = false;
  List<dynamic> _offers = [];

  @override
  void initState() {
    super.initState();
    _loadOffers();
  }

  /// Normalizes any raw vehicle string into standardized categories
  static String normalizeVehicleCategory(String? raw) => VehicleUtils.normalizeVehicleCategory(raw);

  Future<void> _loadOffers({bool force = false}) async {
    setState(() => _isLoading = true);
    try {
      final results = await Future.wait([
        DriverService.instance.getOffers(forceRefresh: force),
        DriverService.instance.getBiddingOpportunities(forceRefresh: force).catchError((_) => <dynamic>[]),
        DriverService.instance.getTrips(forceRefresh: force).catchError((_) => <dynamic>[]),
        DriverService.instance.getProfile(forceRefresh: force).catchError((_) => null),
      ]);
      final directOffers = results[0] as List<dynamic>;
      final biddingOps = results[1] as List<dynamic>;
      final trips = results[2] as List<dynamic>;
      final driverProfile = results[3];

      // 1. Resolve Driver's Registered Vehicle Category safely across all payload layers
      String registeredVehicle = VehicleUtils.extractVehicleType(driverProfile);
      if (registeredVehicle.isEmpty) {
        registeredVehicle = VehicleUtils.extractVehicleType(AuthService.instance.currentUser?.driverProfile);
      }
      if (registeredVehicle.isEmpty) {
        try {
          final prefs = await SharedPreferences.getInstance();
          final stored = prefs.getString('driver_vehicle_type') ?? prefs.getString('vehicle_type');
          if (stored != null && stored.isNotEmpty) {
            registeredVehicle = VehicleUtils.normalizeVehicleCategory(stored);
          }
        } catch (_) {}
      }
      if (registeredVehicle.isEmpty) {
        registeredVehicle = 'SEDAN';
      }

      final activeTrip = trips.firstWhere(
        (t) => t['status'] == 'IN_PROGRESS' || t['status'] == 'ARRIVED' || t['status'] == 'ASSIGNED',
        orElse: () => null,
      );

      // Build set of requirementIds the driver already has trips for
      final Set<String> fulfilledRequirementIds = {};
      for (final t in trips) {
        final status = (t['status'] ?? '').toString();
        if (status == 'ASSIGNED' || status == 'ARRIVED' || status == 'IN_PROGRESS' || status == 'COMPLETED') {
          final reqId = t['requirementId']?.toString();
          if (reqId != null) fulfilledRequirementIds.add(reqId);
        }
      }

      // Merge direct offers & bidding opportunities, deduplicating and removing fulfilled
      final combinedOps = <dynamic>[];
      final seenOpIds = <String>{};

      for (final o in directOffers) {
        final status = (o['status'] ?? 'SENT').toString().toUpperCase();
        if (status != 'SENT') continue;
        final reqId = (o['requirementId'] ?? o['id'])?.toString();
        if (reqId != null && fulfilledRequirementIds.contains(reqId)) continue;
        if (reqId != null && !seenOpIds.contains(reqId)) {
          seenOpIds.add(reqId);
          combinedOps.add(o);
        }
      }

      for (final b in biddingOps) {
        final reqId = (b['requirementId'] ?? b['id'])?.toString();
        if (reqId != null && fulfilledRequirementIds.contains(reqId)) continue;
        if (reqId != null && !seenOpIds.contains(reqId)) {
          seenOpIds.add(reqId);
          combinedOps.add(b);
        }
      }

      if (mounted) {
        setState(() {
          _offers = combinedOps;
          _driverVehicleCategory = registeredVehicle;
          _isOnActiveTrip = activeTrip != null;
        });
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    context.watch<LanguageProvider>();
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final driverNorm = normalizeVehicleCategory(_driverVehicleCategory);

    // Filter opportunities strictly matching the driver's registered vehicle category
    final filteredOps = _offers.where((o) {
      final reqMap = o['requirement'] as Map<String, dynamic>?;
      final rawVType = (reqMap?['vehicleType'] ?? o['vehicleType'] ?? o['category'] ?? '').toString();
      final reqNorm = normalizeVehicleCategory(rawVType);

      // CRITICAL: A sedan driver NEVER sees SUV or Hatchback opportunities!
      if (driverNorm.isNotEmpty) {
        if (reqNorm.isNotEmpty && reqNorm != driverNorm) {
          return false;
        }
      }

      return true;
    }).toList();

    final driverCategoryDisplay = VehicleUtils.getDisplayLabel(driverNorm);

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Column(
              children: [
                // ── App Header ───────────────────────────────────────────────
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.lg,
                    vertical: AppSpacing.md,
                  ),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                    border: Border(
                      bottom: BorderSide(
                        color: isDark ? AppColors.borderDark : AppColors.borderLight,
                      ),
                    ),
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () {},
                        icon: Icon(
                          Icons.menu,
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          context.tr('Opportunities'),
                          style: AppTypography.h2(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      IconButton(
                        onPressed: () => context.push(AppRoutes.notificationsFeedScreen),
                        icon: Icon(
                          Icons.notifications_none_rounded,
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        ),
                      ),
                    ],
                  ),
                ),

                // ── Subheader Banner & Filter Pills ─────────────────────────
                Padding(
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    context.tr('Nearby trips'),
                                    style: AppTypography.caption(
                                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AppColors.primary.withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(AppRadius.full),
                                    ),
                                    child: Text(
                                      driverCategoryDisplay,
                                      style: const TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.primary,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${filteredOps.length} opportunities nearby',
                                style: AppTypography.h3(
                                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceLight,
                              borderRadius: BorderRadius.circular(AppRadius.md),
                              border: Border.all(
                                color: isDark ? AppColors.borderDark : AppColors.borderLight,
                              ),
                            ),
                            child: const Icon(
                              Icons.near_me_outlined,
                              color: AppColors.primary,
                              size: 20,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                if (_isOnActiveTrip) ...[
                  Container(
                    margin: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.xs),
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      color: AppColors.brandOrange.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      border: Border.all(color: AppColors.brandOrange.withValues(alpha: 0.4)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.info_outline, color: AppColors.brandOrange, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'You are currently on an active trip. Direct dispatches are paused. Complete your ongoing trip to receive new direct dispatch trips.',
                            style: AppTypography.caption(
                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.sm),
                ],

                // ── Opportunities Cards List ──────────────────────────────────
                Expanded(
                  child: AdaptiveSkeleton.repeat(
                    isLoading: _isLoading,
                    mockCount: 3,
                    padding: const EdgeInsets.fromLTRB(
                      AppSpacing.lg,
                      0,
                      AppSpacing.lg,
                      100,
                    ),
                    separator: const SizedBox(height: AppSpacing.md),
                    mockBuilder: (context, index) => _buildOpportunityCard(
                      {
                        'title': 'Fleet Corporate Dispatch',
                        'vehicleType': driverCategoryDisplay,
                        'pickup': 'Cyber City, Building 10, DLF Phase 2, Gurugram',
                        'drop': 'Indira Gandhi International Airport, Terminal 3, New Delhi',
                        'offeredPrice': 1450.0,
                        'fulfillmentMode': 'DIRECT_DISPATCH',
                      },
                      isDark,
                    ),
                    child: filteredOps.isEmpty
                        ? RefreshIndicator(
                            onRefresh: () => _loadOffers(force: true),
                            child: ListView(
                              children: [
                                const SizedBox(height: 60),
                                Center(
                                  child: Column(
                                    children: [
                                      Icon(
                                        Icons.near_me_disabled_outlined,
                                        size: 48,
                                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                      ),
                                      const SizedBox(height: 12),
                                      Text(
                                        'No active $driverCategoryDisplay opportunities',
                                        style: AppTypography.h3(
                                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'Make sure you are online to receive matching $driverCategoryDisplay trips.',
                                        style: AppTypography.caption(
                                          color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: () => _loadOffers(force: true),
                            child: ListView.separated(
                              padding: const EdgeInsets.fromLTRB(
                                AppSpacing.lg,
                                0,
                                AppSpacing.lg,
                                100,
                              ),
                              itemCount: filteredOps.length,
                              separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
                              itemBuilder: (context, index) => _buildOpportunityCard(
                                filteredOps[index] as Map<String, dynamic>,
                                isDark,
                              ),
                            ),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildOpportunityCard(Map<String, dynamic> op, bool isDark) {
    final req = op['requirement'] as Map<String, dynamic>?;
    final title = req?['title'] as String? ?? op['title'] as String? ?? 'Fleet Trip Dispatch';
    final rawCat = req?['vehicleType'] as String? ?? op['vehicleType'] as String? ?? op['category'] as String? ?? 'Sedan';
    final category = normalizeVehicleCategory(rawCat) == 'SEDAN'
        ? 'Prime Sedan'
        : normalizeVehicleCategory(rawCat) == 'SUV'
            ? 'SUV 7 Seater'
            : normalizeVehicleCategory(rawCat) == 'HATCHBACK'
                ? 'Compact Hatchback'
                : rawCat;

    final pickup = req?['pickupAddress'] as String? ?? op['pickup'] as String? ?? op['pickupLocation']?['address'] as String? ?? 'Pickup location';
    final drop = req?['dropAddress'] as String? ?? op['drop'] as String? ?? op['dropLocation']?['address'] as String? ?? 'Destination location';
    final rawBudget = op['offeredPrice'] ??
        op['offerAmount'] ??
        op['offeredRate'] ??
        op['driverRate'] ??
        req?['ratePerVehicle'] ??
        req?['budgetPerVehicle'] ??
        req?['suggestedBudget'] ??
        op['suggestedBudget'];
    final num budgetVal = rawBudget != null
        ? ((rawBudget is num) ? rawBudget : (num.tryParse(rawBudget.toString()) ?? 0))
        : 0;
    final earnings = budgetVal > 0 ? '₹ ${budgetVal.toInt()}' : '₹ --';
    final opColor = AppColors.primary;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(
          color: opColor.withValues(alpha: isDark ? 0.45 : 0.35),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: opColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                child: Icon(
                  Icons.card_travel_outlined,
                  color: opColor,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: AppTypography.body(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      'Direct Dispatch • Guaranteed Net Payout',
                      style: AppTypography.caption(
                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                        fontWeight: FontWeight.normal,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: opColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(AppRadius.xs),
                ),
                child: Text(
                  category,
                  style: AppTypography.caption(
                    color: opColor,
                    fontWeight: FontWeight.bold,
                  ).copyWith(fontSize: 10),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.circle, size: 8, color: AppColors.accentGreenDark),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  pickup,
                  style: AppTypography.caption(
                    color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.circle, size: 8, color: AppColors.error),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  drop,
                  style: AppTypography.caption(
                    color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                  ),
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    'Net Rate',
                    style: AppTypography.caption(
                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  Text(
                    earnings,
                    style: AppTypography.h3(
                      color: AppColors.primary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () {
                    context.push(
                      AppRoutes.opportunityDetailsScreen,
                      extra: op,
                    );
                  },
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(
                      color: isDark ? AppColors.borderDark : AppColors.borderLight,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                  ),
                  child: Text(
                    'View Details',
                    style: TextStyle(
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: () {
                    context.push(
                      AppRoutes.opportunityOfferScreen,
                      extra: op,
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    elevation: 0,
                  ),
                  child: const Text(
                    'Accept Offer',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
