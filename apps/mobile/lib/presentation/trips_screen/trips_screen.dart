import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

class TripsScreen extends StatefulWidget {
  const TripsScreen({super.key});

  @override
  State<TripsScreen> createState() => _TripsScreenState();
}

class _TripsScreenState extends State<TripsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _timeFilter = 'Today';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
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
                          'Trips',
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

                // ── 3 Tabs Bar ───────────────────────────────────────────────
                Container(
                  color: AppColors.surfaceLight,
                  child: TabBar(
                    controller: _tabController,
                    indicatorColor: AppColors.primary,
                    indicatorWeight: 3,
                    labelColor: AppColors.primary,
                    unselectedLabelColor: AppColors.textMutedLight,
                    labelStyle: AppTypography.body(fontWeight: FontWeight.bold),
                    tabs: const [
                      Tab(text: 'Upcoming'),
                      Tab(text: 'Active'),
                      Tab(text: 'Completed'),
                    ],
                  ),
                ),

                // ── Tab Views ────────────────────────────────────────────────
                Expanded(
                  child: TabBarView(
                    controller: _tabController,
                    children: [
                      _buildUpcomingTab(),
                      _buildActiveTab(),
                      _buildCompletedTab(),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TAB 1: UPCOMING TRIPS VIEW
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildUpcomingTab() {
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      children: [
        Text(
          'Today',
          style: AppTypography.caption(
            color: AppColors.textMutedLight,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),

        // Trip Card 1
        _buildUpcomingTripCard(
          time: '06:30 AM',
          title: 'Corporate Transfer',
          badgeText: 'Assigned',
          pickup: 'DLF Cyber City, Gurugram',
          drop: 'IGI Airport T3, New Delhi',
          vehicle: 'Sedan',
          passengers: '1 Passenger',
          payout: '₹850',
        ),
        const SizedBox(height: AppSpacing.md),

        // Trip Card 2
        _buildUpcomingTripCard(
          time: '08:00 AM',
          title: 'Airport Transfer',
          badgeText: 'Assigned',
          pickup: 'Gurugram Railway Station',
          drop: 'IGI Airport T1, New Delhi',
          vehicle: 'SUV',
          passengers: '1 Passenger',
          payout: '₹950',
        ),
        const SizedBox(height: AppSpacing.xl),

        Text(
          'Tomorrow',
          style: AppTypography.caption(
            color: AppColors.textMutedLight,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),

        // Trip Card 3
        _buildUpcomingTripCard(
          time: '09:00 AM',
          title: 'Hotel Transfer',
          badgeText: 'Assigned',
          pickup: 'Cyber Hub, Gurugram',
          drop: 'Le Meridian Hotel',
          vehicle: 'Sedan',
          passengers: '1 Passenger',
          payout: '₹720',
        ),
      ],
    );
  }

  Widget _buildUpcomingTripCard({
    required String time,
    required String title,
    required String badgeText,
    required String pickup,
    required String drop,
    required String vehicle,
    required String passengers,
    required String payout,
  }) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                time,
                style: AppTypography.body(
                  color: AppColors.primary,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: AppTypography.body(
                    color: AppColors.textPrimaryLight,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.primaryLight.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(AppRadius.xs),
                ),
                child: Text(
                  badgeText,
                  style: AppTypography.caption(
                    color: AppColors.primary,
                    fontWeight: FontWeight.bold,
                  ).copyWith(fontSize: 10),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),

          // Pickup Location
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

          // Drop Location
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
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          const Divider(height: 1, color: AppColors.borderLight),
          const SizedBox(height: AppSpacing.md),

          Row(
            children: [
              const Icon(Icons.directions_car_outlined, size: 14, color: AppColors.textMutedLight),
              const SizedBox(width: 4),
              Text(vehicle, style: AppTypography.caption(color: AppColors.textMutedLight)),
              const SizedBox(width: 16),
              const Icon(Icons.person_outline, size: 14, color: AppColors.textMutedLight),
              const SizedBox(width: 4),
              Text(passengers, style: AppTypography.caption(color: AppColors.textMutedLight)),
              const Spacer(),
              Text(
                payout,
                style: AppTypography.body(
                  color: AppColors.textPrimaryLight,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),

          GestureDetector(
            onTap: () => context.push(AppRoutes.tripDetailsScreen),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'VIEW DETAILS',
                  style: AppTypography.caption(
                    color: AppColors.primary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(width: 4),
                const Icon(Icons.chevron_right, size: 16, color: AppColors.primary),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TAB 2: ACTIVE TRIP VIEW
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildActiveTab() {
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      children: [
        // Green Banner
        Container(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: 12),
          decoration: const BoxDecoration(
            color: AppColors.accentGreenDark,
            borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.lg)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'ONGOING TRIP',
                style: AppTypography.caption(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                'Trip ID: AY10234',
                style: AppTypography.caption(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),

        // Main Active Trip Card
        Container(
          padding: const EdgeInsets.all(AppSpacing.lg),
          decoration: BoxDecoration(
            color: AppColors.surfaceLight,
            borderRadius: const BorderRadius.vertical(bottom: Radius.circular(AppRadius.lg)),
            border: Border.all(color: AppColors.borderLight),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Corporate Transfer',
                    style: AppTypography.h3(
                      color: AppColors.textPrimaryLight,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.accentGreenDark.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(AppRadius.xs),
                    ),
                    child: Text(
                      'In Progress',
                      style: AppTypography.caption(
                        color: AppColors.accentGreenDark,
                        fontWeight: FontWeight.bold,
                      ).copyWith(fontSize: 10),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),

              // Pickup Location
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.circle, size: 8, color: AppColors.accentGreenDark),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Pickup',
                          style: AppTypography.caption(
                            color: AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          'DLF Cyber City, Gurugram\nTower A, Gate 2',
                          style: AppTypography.caption(color: AppColors.textSecondaryLight),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),

              // Drop Location
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.circle, size: 8, color: AppColors.error),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Drop',
                          style: AppTypography.caption(
                            color: AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          'IGI Airport T3, New Delhi\nDeparture Gate Road',
                          style: AppTypography.caption(color: AppColors.textSecondaryLight),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),

              // Mock Map Preview
              Container(
                height: 140,
                decoration: BoxDecoration(
                  color: const Color(0xFFe2e8f0),
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                child: Stack(
                  children: [
                    Center(
                      child: Icon(
                        Icons.map_outlined,
                        size: 64,
                        color: Colors.blue.withValues(alpha: 0.15),
                      ),
                    ),
                    Positioned(
                      bottom: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: const BoxDecoration(
                          color: AppColors.primary,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.navigation_outlined,
                          size: 16,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),

              // Trip Progress Stepper
              Text(
                'Trip Progress',
                style: AppTypography.caption(
                  color: AppColors.textMutedLight,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildStepNode(title: 'Assigned', isDone: true),
                  Expanded(child: _buildStepLine(isDone: true)),
                  _buildStepNode(title: 'Arrived', isDone: true),
                  Expanded(child: _buildStepLine(isDone: true)),
                  _buildStepNode(title: 'In Progress', isDone: true, isActive: true),
                  Expanded(child: _buildStepLine(isDone: false)),
                  _buildStepNode(title: 'Completed', isDone: false),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              const Divider(height: 1, color: AppColors.borderLight),
              const SizedBox(height: AppSpacing.md),

              // Passenger & Payout Row
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Passenger', style: AppTypography.caption(color: AppColors.textMutedLight)),
                        Text(
                          'Rohit Mehra',
                          style: AppTypography.body(
                            color: AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          '+91 98765 43210',
                          style: AppTypography.caption(color: AppColors.textMutedLight),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () {},
                    icon: const Icon(Icons.phone_outlined, color: AppColors.primary),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('Earnings', style: AppTypography.caption(color: AppColors.textMutedLight)),
                      Text(
                        '₹850',
                        style: AppTypography.h3(
                          color: AppColors.textPrimaryLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text('Est.', style: AppTypography.caption(color: AppColors.textMutedLight)),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.xl),

              // Large Purple Action Button
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: () => context.push(AppRoutes.tripDetailsScreen),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                  ),
                  child: Text(
                    'VIEW TRIP DETAILS',
                    style: AppTypography.body(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TAB 3: COMPLETED TRIPS VIEW
  // ───────────────────────────────────────────────────────────────────────────
  Widget _buildCompletedTab() {
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      children: [
        // Time Filters Bar
        Row(
          children: [
            ['Today', 'This Week', 'This Month'].map((filter) {
              final isSelected = _timeFilter == filter;
              return GestureDetector(
                onTap: () => setState(() => _timeFilter = filter),
                child: Container(
                  margin: const EdgeInsets.only(right: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: isSelected ? AppColors.primary : AppColors.surfaceLight,
                    borderRadius: BorderRadius.circular(AppRadius.full),
                    border: Border.all(
                      color: isSelected ? AppColors.primary : AppColors.borderLight,
                    ),
                  ),
                  child: Text(
                    filter,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                      color: isSelected ? Colors.white : AppColors.textPrimaryLight,
                    ),
                  ),
                ),
              );
            }).toList(),
            const Spacer(),
            const Icon(Icons.filter_list_rounded, color: AppColors.textPrimaryLight),
          ].expand((e) => e is List<Widget> ? e : [e as Widget]).toList(),
        ),
        const SizedBox(height: AppSpacing.lg),

        Text(
          'Today',
          style: AppTypography.caption(
            color: AppColors.textMutedLight,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),

        // Completed Card 1
        _buildCompletedTripCard(
          time: '10:15 AM',
          title: 'Airport Transfer',
          payout: '₹720',
          pickup: 'Cyber Hub, Gurugram',
          drop: 'IGI Airport T1, New Delhi',
          vehicle: 'Sedan',
          passengers: '1 Passenger',
        ),
        const SizedBox(height: AppSpacing.md),

        // Completed Card 2
        _buildCompletedTripCard(
          time: '08:30 AM',
          title: 'Corporate Transfer',
          payout: '₹850',
          pickup: 'DLF Cyber City, Gurugram',
          drop: 'IGI Airport T3, New Delhi',
          vehicle: 'Sedan',
          passengers: '1 Passenger',
        ),
        const SizedBox(height: AppSpacing.xl),

        Text(
          'Yesterday',
          style: AppTypography.caption(
            color: AppColors.textMutedLight,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: AppSpacing.sm),

        // Completed Card 3
        _buildCompletedTripCard(
          time: '06:45 AM',
          title: 'Hotel Transfer',
          payout: '₹650',
          pickup: 'Gurugram Railway Station',
          drop: 'Le Meridian Hotel',
          vehicle: 'Sedan',
          passengers: '1 Passenger',
        ),
        const SizedBox(height: AppSpacing.xl),

        // Today's Summary Card
        Container(
          padding: const EdgeInsets.all(AppSpacing.lg),
          decoration: BoxDecoration(
            color: AppColors.accentGreenDark.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: AppColors.accentGreenDark.withValues(alpha: 0.2)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                "Today's Summary",
                style: AppTypography.caption(
                  color: AppColors.accentGreenDark,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildSummaryMetric('Trips', '3'),
                  _buildSummaryMetric('Earnings', '₹2,220'),
                  _buildSummaryMetric('Distance', '56 km'),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildCompletedTripCard({
    required String time,
    required String title,
    required String payout,
    required String pickup,
    required String drop,
    required String vehicle,
    required String passengers,
  }) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                time,
                style: AppTypography.body(
                  color: AppColors.primary,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: AppTypography.body(
                    color: AppColors.textPrimaryLight,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              Text(
                payout,
                style: AppTypography.body(
                  color: AppColors.accentGreenDark,
                  fontWeight: FontWeight.bold,
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
                child: Text(pickup, style: AppTypography.caption(color: AppColors.textSecondaryLight)),
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
                child: Text(drop, style: AppTypography.caption(color: AppColors.textSecondaryLight)),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          const Divider(height: 1, color: AppColors.borderLight),
          const SizedBox(height: AppSpacing.md),

          Row(
            children: [
              const Icon(Icons.directions_car_outlined, size: 14, color: AppColors.textMutedLight),
              const SizedBox(width: 4),
              Text(vehicle, style: AppTypography.caption(color: AppColors.textMutedLight)),
              const SizedBox(width: 16),
              const Icon(Icons.person_outline, size: 14, color: AppColors.textMutedLight),
              const SizedBox(width: 4),
              Text(passengers, style: AppTypography.caption(color: AppColors.textMutedLight)),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: AppColors.accentGreenDark.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(AppRadius.xs),
                ),
                child: Text(
                  'Completed',
                  style: AppTypography.caption(
                    color: AppColors.accentGreenDark,
                    fontWeight: FontWeight.bold,
                  ).copyWith(fontSize: 10),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStepNode({required String title, required bool isDone, bool isActive = false}) {
    return Column(
      children: [
        Container(
          width: 18,
          height: 18,
          decoration: BoxDecoration(
            color: isActive
                ? AppColors.primary
                : (isDone ? AppColors.accentGreenDark : AppColors.borderLight),
            shape: BoxShape.circle,
          ),
          child: Icon(
            Icons.check,
            size: 12,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          title,
          style: TextStyle(
            fontSize: 10,
            fontWeight: isDone || isActive ? FontWeight.bold : FontWeight.w500,
            color: isDone || isActive ? AppColors.textPrimaryLight : AppColors.textMutedLight,
          ),
        ),
      ],
    );
  }

  Widget _buildStepLine({required bool isDone}) {
    return Container(
      height: 2,
      color: isDone ? AppColors.accentGreenDark : AppColors.borderLight,
    );
  }

  Widget _buildSummaryMetric(String label, String value) {
    return Column(
      children: [
        Text(label, style: AppTypography.caption(color: AppColors.textMutedLight)),
        const SizedBox(height: 2),
        Text(
          value,
          style: AppTypography.h3(
            color: AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }
}