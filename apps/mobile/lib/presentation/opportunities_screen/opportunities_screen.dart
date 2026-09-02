import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
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

  final List<Map<String, dynamic>> _allOpportunities = [
    {
      'title': 'Corporate Transfer',
      'category': 'Sedan',
      'pickupDistance': '3.8 km away',
      'time': 'Today, 6:30 PM',
      'pickup': 'DLF Cyber City, Gurugram',
      'drop': 'IGI Airport T3, New Delhi',
      'earnings': '₹850',
      'color': Color(0xFF6366f1),
      'icon': Icons.card_travel_outlined,
    },
    {
      'title': 'Airport Transfer',
      'category': 'SUV',
      'pickupDistance': '6.2 km away',
      'time': 'Today, 8:00 PM',
      'pickup': 'Gurugram Railway Station',
      'drop': 'IGI Airport T1, New Delhi',
      'earnings': '₹950',
      'color': Color(0xFFf97316),
      'icon': Icons.flight_takeoff_outlined,
    },
    {
      'title': 'Hotel Transfer',
      'category': 'Sedan',
      'pickupDistance': '8.5 km away',
      'time': 'Today, 7:15 PM',
      'pickup': 'Cyber Hub, Gurugram',
      'drop': 'Le Meridian Hotel',
      'earnings': '₹720',
      'color': Color(0xFF0284c7),
      'icon': Icons.location_city_outlined,
    },
    {
      'title': 'VIP Corporate Ride',
      'category': 'Premium',
      'pickupDistance': '4.1 km away',
      'time': 'Today, 9:30 PM',
      'pickup': 'Golf Course Road, Gurugram',
      'drop': 'Taj Palace, New Delhi',
      'earnings': '₹1,450',
      'color': Color(0xFF8b5cf6),
      'icon': Icons.star_outline_rounded,
    },
  ];

  @override
  Widget build(BuildContext context) {
    final filteredOps = _selectedCategory == 'All'
        ? _allOpportunities
        : _allOpportunities.where((o) => o['category'] == _selectedCategory).toList();

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
                  decoration: const BoxDecoration(
                    color: AppColors.surfaceLight,
                    border: Border(
                      bottom: BorderSide(color: AppColors.borderLight),
                    ),
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () {},
                        icon: const Icon(
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
                        icon: const Icon(
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
                      final op = filteredOps[index];
                      final Color opColor = op['color'] as Color;

                      return Container(
                        padding: const EdgeInsets.all(AppSpacing.lg),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(
                            color: opColor.withValues(alpha: 0.3),
                            width: 1.5,
                          ),
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x06000000),
                              blurRadius: 4,
                              offset: Offset(0, 2),
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
                                  child: Icon(
                                    op['icon'] as IconData,
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
                                        op['title'] as String,
                                        style: AppTypography.body(
                                          color: AppColors.textPrimaryLight,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      Text(
                                        'Pickup • ${op['pickupDistance']} • ${op['time']}',
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
                                    op['category'] as String,
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
                                    op['pickup'] as String,
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
                                    op['drop'] as String,
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
                                      op['earnings'] as String,
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
                            const Divider(height: 1, color: AppColors.borderLight),
                            const SizedBox(height: AppSpacing.md),

                            // View Details Action Link
                            GestureDetector(
                              onTap: () => context.push(AppRoutes.opportunityDetailsScreen),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    'VIEW DETAILS',
                                    style: AppTypography.caption(
                                      color: opColor,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  Icon(Icons.chevron_right, size: 16, color: opColor),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    },
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
