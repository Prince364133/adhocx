import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../services/driver_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Screen 1: Nearby Opportunities List matching exact design mockup.
class OpportunitiesScreen extends StatefulWidget {
  const OpportunitiesScreen({super.key});

  @override
  State<OpportunitiesScreen> createState() => _OpportunitiesScreenState();
}

class _OpportunitiesScreenState extends State<OpportunitiesScreen> {
  String _selectedCategory = 'All';
  bool _isLoading = true;
  List<dynamic> _offers = [];

  @override
  void initState() {
    super.initState();
    _loadOffers();
  }

  Future<void> _loadOffers() async {
    setState(() => _isLoading = true);
    try {
      final list = await DriverService.instance.getOffers();
      if (mounted) setState(() => _offers = list);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final filteredOps = _selectedCategory == 'All'
        ? _offers
        : _offers.where((o) {
            final vType = (o['requirement']?['vehicleType'] ?? o['vehicleType'] ?? '').toString();
            return vType.toLowerCase() == _selectedCategory.toLowerCase();
          }).toList();

    return Scaffold(
      backgroundColor: AppColors.bgLight,
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
                    color: AppColors.surfaceLight,
                    border: Border(
                      bottom: BorderSide(color: AppColors.borderLight),
                    ),
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () {},
                        icon: Icon(
                          Icons.menu,
                          color: AppColors.textPrimaryLight,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Opportunities',
                          style: AppTypography.h2(
                            color: AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      IconButton(
                        onPressed: () => context.push(AppRoutes.notificationsSettingsScreen),
                        icon: Icon(
                          Icons.notifications_none_rounded,
                          color: AppColors.textPrimaryLight,
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
                                  color: AppColors.textMutedLight,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              Text(
                                '${filteredOps.length} opportunities nearby',
                                style: AppTypography.h3(
                                  color: AppColors.textPrimaryLight,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppColors.surfaceLight,
                              borderRadius: BorderRadius.circular(AppRadius.md),
                              border: Border.all(color: AppColors.borderLight),
                            ),
                            child: Icon(
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
                          children: ['All', 'Sedan', 'SUV', 'Premium'].map((cat) {
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
                                  color: isSelected ? AppColors.textPrimaryLight : AppColors.surfaceLight,
                                  borderRadius: BorderRadius.circular(AppRadius.full),
                                  border: Border.all(
                                    color: isSelected ? AppColors.textPrimaryLight : AppColors.borderLight,
                                  ),
                                ),
                                child: Text(
                                  cat,
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                    color: isSelected ? Colors.white : AppColors.textPrimaryLight,
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

                // ── Opportunities Cards List ──────────────────────────────────
                Expanded(
                  child: _isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : filteredOps.isEmpty
                          ? RefreshIndicator(
                              onRefresh: _loadOffers,
                              child: ListView(
                                children: [
                                  const SizedBox(height: 60),
                                  Center(
                                    child: Column(
                                      children: [
                                        Icon(Icons.near_me_disabled_outlined, size: 48, color: AppColors.textMutedLight),
                                        const SizedBox(height: 12),
                                        Text('No active opportunities right now', style: AppTypography.h3(color: AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                                        const SizedBox(height: 4),
                                        Text('Make sure you are online and check back in a few moments', style: AppTypography.caption(color: AppColors.textMutedLight)),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            )
                          : RefreshIndicator(
                              onRefresh: _loadOffers,
                              child: ListView.separated(
                                padding: const EdgeInsets.fromLTRB(
                                  AppSpacing.lg,
                                  0,
                                  AppSpacing.lg,
                                  100,
                                ),
                                itemCount: filteredOps.length,
                                separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
                                itemBuilder: (context, index) {
                                  final op = filteredOps[index] as Map<String, dynamic>;
                                  final req = op['requirement'] as Map<String, dynamic>?;
                                  final offerId = op['id'] as String? ?? '';
                                  final title = req?['title'] as String? ?? op['title'] as String? ?? 'Trip Requirement';
                                  final category = req?['vehicleType'] as String? ?? op['category'] as String? ?? 'Sedan';
                                  final pickup = req?['pickupAddress'] as String? ?? op['pickup'] as String? ?? 'Pickup location';
                                  final drop = req?['dropAddress'] as String? ?? op['drop'] as String? ?? 'Destination location';
                                  final earnings = '₹ ${(op['offeredPrice'] ?? op['offerAmount'] ?? req?['budgetPerVehicle'] ?? 850)}';
                                  const opColor = AppColors.primary;

                                  return Container(
                                    padding: const EdgeInsets.all(AppSpacing.lg),
                                    decoration: BoxDecoration(
                                      color: AppColors.surfaceLight,
                                      borderRadius: BorderRadius.circular(AppRadius.lg),
                                      border: Border.all(
                                        color: opColor.withValues(alpha: 0.3),
                                        width: 1.5,
                                      ),
                                      boxShadow: [
                                        BoxShadow(
                                          color: Colors.black.withValues(alpha: 0.03),
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
                                                color: opColor.withValues(alpha: 0.1),
                                                borderRadius: BorderRadius.circular(AppRadius.md),
                                              ),
                                              child: const Icon(
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
                                                      color: AppColors.textPrimaryLight,
                                                      fontWeight: FontWeight.bold,
                                                    ),
                                                  ),
                                                  Text(
                                                    'Direct Dispatch • Available Now',
                                                    style: AppTypography.caption(
                                                      color: AppColors.textMutedLight,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                            Container(
                                              padding: const EdgeInsets.symmetric(
                                                horizontal: 8,
                                                vertical: 2,
                                              ),
                                              decoration: BoxDecoration(
                                                color: opColor.withValues(alpha: 0.1),
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

                                        // Pickup
                                        Row(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            const Icon(Icons.circle, size: 8, color: AppColors.accentGreenDark),
                                            const SizedBox(width: 10),
                                            Expanded(
                                              child: Text(
                                                pickup,
                                                style: AppTypography.caption(color: AppColors.textSecondaryLight),
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 6),

                                        // Drop & Earnings
                                        Row(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            const Icon(Icons.circle, size: 8, color: AppColors.error),
                                            const SizedBox(width: 10),
                                            Expanded(
                                              child: Text(
                                                drop,
                                                style: AppTypography.caption(color: AppColors.textSecondaryLight),
                                              ),
                                            ),
                                            Column(
                                              crossAxisAlignment: CrossAxisAlignment.end,
                                              children: [
                                                Text(
                                                  'Est. earnings',
                                                  style: AppTypography.caption(color: AppColors.textMutedLight).copyWith(fontSize: 10),
                                                ),
                                                Text(
                                                  earnings,
                                                  style: AppTypography.h3(
                                                    color: AppColors.textPrimaryLight,
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: AppSpacing.md),
                                        Divider(height: 1, color: AppColors.borderLight),
                                        const SizedBox(height: AppSpacing.md),

                                        // View Details Action Link
                                        GestureDetector(
                                          onTap: () => context.push(AppRoutes.opportunityOfferScreen, extra: op),
                                          child: Row(
                                            mainAxisAlignment: MainAxisAlignment.center,
                                            children: [
                                              Text(
                                                'VIEW OFFER & ACCEPT',
                                                style: AppTypography.caption(
                                                  color: opColor,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                              const SizedBox(width: 4),
                                              const Icon(Icons.chevron_right, size: 16, color: opColor),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  );
                                },
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
}
