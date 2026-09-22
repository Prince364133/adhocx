import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../services/driver_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../shared/widgets/app_adaptive_skeleton.dart';
import 'driver_submit_bid_sheet.dart';

/// Screen 1: Nearby Opportunities List matching exact design mockup.
class OpportunitiesScreen extends StatefulWidget {
  const OpportunitiesScreen({super.key});

  @override
  State<OpportunitiesScreen> createState() => _OpportunitiesScreenState();
}

class _OpportunitiesScreenState extends State<OpportunitiesScreen> {
  String _selectedCategory = 'All';
  List<String> _categories = ['All', 'Sedan', 'SUV', 'Hatchback'];
  bool _isLoading = true;
  bool _isOnActiveTrip = false;
  List<dynamic> _offers = [];

  @override
  void initState() {
    super.initState();
    _loadOffers();
  }

  Future<void> _loadOffers({bool force = false}) async {
    setState(() => _isLoading = true);
    try {
      final results = await Future.wait([
        DriverService.instance.getOffers(forceRefresh: force),
        DriverService.instance.getBiddingOpportunities(forceRefresh: force),
        DriverService.instance.getTrips(forceRefresh: force).catchError((_) => <dynamic>[]),
        DriverService.instance.getVehicleCategories().catchError((_) => <Map<String, dynamic>>[]),
      ]);
      final directOffers = results[0];
      final bidOpportunities = results[1];
      final trips = results[2];
      final dynamicTiers = results[3];

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

      // Filter direct offers: only show SENT offers for requirements the driver doesn't already have a trip for
      final filteredDirectOffers = directOffers.where((o) {
        final status = (o['status'] ?? 'SENT').toString().toUpperCase();
        if (status != 'SENT') return false;
        final reqId = o['requirementId']?.toString();
        if (reqId != null && fulfilledRequirementIds.contains(reqId)) return false;
        return true;
      }).toList();

      // Filter bidding opportunities: exclude accepted bids and requirements with existing trips
      final filteredBidOpportunities = bidOpportunities.where((o) {
        final reqId = (o['requirementId'] ?? o['id'])?.toString();
        if (reqId != null && fulfilledRequirementIds.contains(reqId)) return false;
        // If bid was already accepted, hide from opportunities
        final myBid = o['myBid'] as Map<String, dynamic>?;
        if (myBid != null && myBid['status'] == 'ACCEPTED') return false;
        return true;
      }).toList();

      if (mounted) {
        setState(() {
          _offers = [...filteredDirectOffers, ...filteredBidOpportunities];
          _isOnActiveTrip = activeTrip != null;
          if (dynamicTiers.isNotEmpty) {
            final catSet = <String>{'All'};
            for (final t in dynamicTiers) {
              final label = (t['categoryLabel'] ?? t['vehicleType'] ?? '').toString();
              if (label.isNotEmpty) catSet.add(label);
            }
            _categories = catSet.toList();
          }
        });
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final filteredOps = _selectedCategory == 'All'
        ? _offers
        : _offers.where((o) {
            final vType = (o['requirement']?['vehicleType'] ?? o['vehicleType'] ?? '').toString().toLowerCase();
            final sel = _selectedCategory.toLowerCase();
            return vType == sel || sel.contains(vType) || vType.contains(sel);
          }).toList();

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
                          'Opportunities',
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
                              Text(
                                'Nearby trips',
                                style: AppTypography.caption(
                                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
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
                      const SizedBox(height: AppSpacing.md),

                      // Vehicle Filter Chips
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: _categories.map((cat) {
                            final isSelected = _selectedCategory == cat;
                            return GestureDetector(
                              onTap: () => setState(() => _selectedCategory = cat),
                              child: Container(
                                margin: const EdgeInsets.only(right: 8),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 8,
                                ),
                                decoration: BoxDecoration(
                                  color: isSelected
                                      ? (isDark ? AppColors.primary : AppColors.textPrimaryLight)
                                      : (isDark ? AppColors.surfaceDark : AppColors.surfaceLight),
                                  borderRadius: BorderRadius.circular(AppRadius.full),
                                  border: Border.all(
                                    color: isSelected
                                        ? (isDark ? AppColors.primary : AppColors.textPrimaryLight)
                                        : (isDark ? AppColors.borderDark : AppColors.borderLight),
                                  ),
                                ),
                                child: Text(
                                  cat,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                    color: isSelected
                                        ? Colors.white
                                        : (isDark ? AppColors.textSecondaryDark : AppColors.textPrimaryLight),
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
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
                            'You are currently on an active trip. Direct dispatches are paused. You can still view and bid on future scheduled trips.',
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
                        'vehicleType': 'Sedan',
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
                                        'No active opportunities right now',
                                        style: AppTypography.h3(
                                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'Make sure you are online and check back in a few moments',
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
    final isBidding = op['fulfillmentMode'] == 'BIDDING' || req?['fulfillmentMode'] == 'BIDDING';
    final title = req?['title'] as String? ?? op['title'] as String? ?? (isBidding ? 'Outstation Reverse Auction' : 'Fleet Trip Dispatch');
    final category = req?['vehicleType'] as String? ?? op['vehicleType'] as String? ?? op['category'] as String? ?? 'Sedan';
    final pickup = req?['pickupAddress'] as String? ?? op['pickup'] as String? ?? op['pickupLocation']?['address'] as String? ?? 'Pickup location';
    final drop = req?['dropAddress'] as String? ?? op['drop'] as String? ?? op['dropLocation']?['address'] as String? ?? 'Destination location';
    final budgetVal = (op['suggestedBudget'] ?? op['offeredPrice'] ?? op['offerAmount'] ?? req?['budgetPerVehicle'] ?? 850) as num;
    final earnings = '₹ ${budgetVal.toInt()}';
    final hasMyBid = op['hasMyBid'] == true;
    final myBid = op['myBid'] as Map<String, dynamic>?;
    final opColor = isBidding ? (isDark ? Colors.indigoAccent : Colors.indigo) : AppColors.primary;

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
                  isBidding ? Icons.gavel_rounded : Icons.card_travel_outlined,
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
                      isBidding ? '🔨 Reverse Auction • Driver Quotes Open' : '⚡ Direct Timed Dispatch • Available Now',
                      style: AppTypography.caption(
                        color: isBidding ? (isDark ? Colors.indigoAccent : Colors.indigo) : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                        fontWeight: isBidding ? FontWeight.w600 : FontWeight.normal,
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
                    isBidding ? 'Target Budget' : 'Est. earnings',
                    style: AppTypography.caption(
                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                    ).copyWith(fontSize: 10),
                  ),
                  Text(
                    earnings,
                    style: AppTypography.h3(
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Divider(
            height: 1,
            color: isDark ? AppColors.borderDark : AppColors.borderLight,
          ),
          const SizedBox(height: AppSpacing.md),
          if (isBidding) ...[
            if (hasMyBid)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: isDark ? 0.2 : 0.12),
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                ),
                child: Center(
                  child: Text(
                    '✓ Your Quote Submitted: ₹${(myBid?["bidAmount"] as num?)?.toInt() ?? budgetVal.toInt()} (${myBid?["status"] ?? "PENDING"})',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                      color: isDark ? AppColors.accentGreen : AppColors.success,
                    ),
                  ),
                ),
              )
            else
              GestureDetector(
                onTap: () async {
                  final submitted = await DriverSubmitBidSheet.show(context, opportunity: op);
                  if (submitted == true) {
                    _loadOffers();
                  }
                },
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      '🔨 SUBMIT QUOTE / BID',
                      style: AppTypography.caption(
                        color: isDark ? Colors.indigoAccent : Colors.indigo,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Icon(
                      Icons.arrow_forward,
                      size: 16,
                      color: isDark ? Colors.indigoAccent : Colors.indigo,
                    ),
                  ],
                ),
              ),
          ] else ...[
            GestureDetector(
              onTap: () => context.push(AppRoutes.opportunityOfferScreen, extra: op),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'VIEW OFFER & ACCEPT',
                    style: AppTypography.caption(
                      color: isDark ? AppColors.primaryLight : opColor,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Icon(
                    Icons.chevron_right,
                    size: 16,
                    color: isDark ? AppColors.primaryLight : opColor,
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
