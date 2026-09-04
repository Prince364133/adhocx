import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';

enum TripStatusState {
  upcoming,
  assigned,
  enRoute,
  arrived,
  started,
  inProgress,
  completed,
  cancelled,
  noShow,
}

class UserTripDetailsScreen extends StatefulWidget {
  final TripStatusState initialStatus;

  const UserTripDetailsScreen({
    super.key,
    this.initialStatus = TripStatusState.assigned,
  });

  @override
  State<UserTripDetailsScreen> createState() => _UserTripDetailsScreenState();
}

class _UserTripDetailsScreenState extends State<UserTripDetailsScreen> {
  late TripStatusState _currentStatus;

  @override
  void initState() {
    super.initState();
    _currentStatus = widget.initialStatus;
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
          onPressed: () => context.pop(),
          icon: Icon(Icons.arrow_back, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
        ),
        title: Text('Trip Details', style: AppTypography.h3(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            onPressed: () {},
            icon: const Icon(Icons.phone, color: Color(0xFF6C5CE7)),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // State Switcher Carousel for interactive demo
            Container(
              height: 42,
              margin: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 6),
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: TripStatusState.values.map((status) {
                  final isSelected = _currentStatus == status;
                  return Padding(
                    padding: const EdgeInsets.only(right: 6.0),
                    child: ChoiceChip(
                      label: Text(_getStatusLabel(status)),
                      selected: isSelected,
                      onSelected: (selected) {
                        if (selected) setState(() => _currentStatus = status);
                      },
                      selectedColor: _getStatusColor(status),
                      backgroundColor: isDark ? AppColors.surfaceDark : Colors.grey[200],
                      labelStyle: TextStyle(
                        color: isSelected ? Colors.white : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                        fontSize: 11,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      ),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.full)),
                    ),
                  );
                }).toList(),
              ),
            ),

            // Main Body Content
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header Title & Status Badge
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Airport Transfer', style: AppTypography.h2(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                            Text('REQ-250510-0001', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: _getStatusColor(_currentStatus).withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(AppRadius.sm),
                          ),
                          child: Text(
                            _getStatusLabel(_currentStatus),
                            style: TextStyle(color: _getStatusColor(_currentStatus), fontWeight: FontWeight.bold, fontSize: 12),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: AppSpacing.md),

                    // Route Card
                    _buildRouteCard(context, isDark),

                    const SizedBox(height: AppSpacing.lg),

                    // Driver Card
                    _buildDriverCard(context, isDark),

                    const SizedBox(height: AppSpacing.lg),

                    // State Specific Section Banner / Map / Info
                    _buildStateSpecificContent(context, isDark),

                    const SizedBox(height: AppSpacing.lg),

                    // Vehicle Count Box
                    _buildVehicleCountsBox(context, isDark),

                    const SizedBox(height: AppSpacing.lg),

                    // Estimated Amount / CTA
                    _buildActionFooter(context, isDark),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getStatusLabel(TripStatusState status) {
    switch (status) {
      case TripStatusState.upcoming:
        return 'Upcoming';
      case TripStatusState.assigned:
        return 'Assigned';
      case TripStatusState.enRoute:
        return 'En Route';
      case TripStatusState.arrived:
        return 'Arrived';
      case TripStatusState.started:
        return 'Trip Started';
      case TripStatusState.inProgress:
        return 'In Progress';
      case TripStatusState.completed:
        return 'Completed';
      case TripStatusState.cancelled:
        return 'Cancelled';
      case TripStatusState.noShow:
        return 'No-Show';
    }
  }

  Color _getStatusColor(TripStatusState status) {
    switch (status) {
      case TripStatusState.upcoming:
      case TripStatusState.assigned:
      case TripStatusState.enRoute:
      case TripStatusState.started:
      case TripStatusState.inProgress:
        return const Color(0xFF6C5CE7);
      case TripStatusState.arrived:
        return Colors.purple;
      case TripStatusState.completed:
        return AppColors.success;
      case TripStatusState.cancelled:
        return AppColors.error;
      case TripStatusState.noShow:
        return Colors.orange;
    }
  }

  Widget _buildRouteCard(BuildContext context, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
      ),
      child: Column(
        children: [
          Row(
            children: [
              const Icon(Icons.event, size: 16, color: Color(0xFF6C5CE7)),
              const SizedBox(width: 8),
              Text('10 May 2025, 06:30 PM', style: AppTypography.caption(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: const [
              Icon(Icons.circle, size: 8, color: AppColors.success),
              SizedBox(width: 8),
              Text('DLF Cyber City, Gurugram', style: TextStyle(fontSize: 12)),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: const [
              Icon(Icons.circle, size: 8, color: AppColors.error),
              SizedBox(width: 8),
              Text('Indira Gandhi Airport, Delhi', style: TextStyle(fontSize: 12)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDriverCard(BuildContext context, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
      ),
      child: Row(
        children: [
          const CircleAvatar(radius: 20, backgroundColor: Color(0xFF6C5CE7), child: Text('RS', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold))),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Rahul Sharma 4.8 ★', style: AppTypography.caption(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                Text('DL 01 AB 1234 • White Sedan', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontSize: 10)),
              ],
            ),
          ),
          IconButton(
            onPressed: () {},
            icon: Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(color: const Color(0xFF6C5CE7).withValues(alpha: 0.1), shape: BoxShape.circle),
              child: const Icon(Icons.phone, color: Color(0xFF6C5CE7), size: 18),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStateSpecificContent(BuildContext context, bool isDark) {
    switch (_currentStatus) {
      case TripStatusState.assigned:
        return _buildStatusBanner('Driver has been assigned and confirmed.', '09:15 AM', AppColors.success, isDark);

      case TripStatusState.enRoute:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Live Location', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            Container(
              height: 120,
              width: double.infinity,
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : Colors.blueGrey[50],
                borderRadius: BorderRadius.circular(AppRadius.lg),
                border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
              ),
              child: const Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.map, size: 36, color: Color(0xFF6C5CE7)),
                    SizedBox(height: 4),
                    Text('Driver En Route to Pickup (ETA 9:25 AM)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ),
          ],
        );

      case TripStatusState.arrived:
        return Column(
          children: [
            _buildStatusBanner('Driver has arrived at pickup location.', '09:20 AM', AppColors.success, isDark),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              onPressed: () {},
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(42),
                foregroundColor: const Color(0xFF6C5CE7),
                side: const BorderSide(color: Color(0xFF6C5CE7)),
              ),
              icon: const Icon(Icons.chat_bubble_outline, size: 16),
              label: const Text('Chat with Driver'),
            ),
          ],
        );

      case TripStatusState.started:
        return _buildStatusBanner('Trip has been started by driver.', '09:35 AM', AppColors.success, isDark);

      case TripStatusState.inProgress:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Live Tracking', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            Container(
              height: 120,
              width: double.infinity,
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : Colors.blueGrey[50],
                borderRadius: BorderRadius.circular(AppRadius.lg),
                border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
              ),
              child: const Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.navigation, size: 36, color: Color(0xFF6C5CE7)),
                    SizedBox(height: 4),
                    Text('ETA: 09:50 AM • 10.6 km Remaining', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ),
          ],
        );

      case TripStatusState.completed:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildStatusBanner('Trip completed successfully.', '10:02 AM', AppColors.success, isDark),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                borderRadius: BorderRadius.circular(AppRadius.lg),
                border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Trip Summary', style: AppTypography.h4(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: const [Text('Distance', style: TextStyle(fontSize: 12)), Text('23.4 km', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))]),
                  const Divider(),
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: const [Text('Duration', style: TextStyle(fontSize: 12)), Text('1h 32m', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12))]),
                ],
              ),
            ),
          ],
        );

      case TripStatusState.cancelled:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildStatusBanner('Trip was cancelled by driver.', '08:15 AM', AppColors.error, isDark),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: const Color(0xFF6C5CE7).withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(AppRadius.md),
                border: Border.all(color: const Color(0xFF6C5CE7).withValues(alpha: 0.2)),
              ),
              child: const Text('Full refund will be processed.', style: TextStyle(color: Color(0xFF6C5CE7), fontWeight: FontWeight.bold, fontSize: 12)),
            ),
          ],
        );

      case TripStatusState.noShow:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildStatusBanner('Passenger did not show up.', '08:45 AM', Colors.orange, isDark),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: Colors.orange.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(AppRadius.md),
                border: Border.all(color: Colors.orange.withValues(alpha: 0.2)),
              ),
              child: const Text('No-show fee applied as per policy.', style: TextStyle(color: Colors.orange, fontWeight: FontWeight.bold, fontSize: 12)),
            ),
          ],
        );

      case TripStatusState.upcoming:
        return _buildStatusBanner('Trip scheduled for 10 May 2025', '06:30 PM', const Color(0xFF6C5CE7), isDark);
    }
  }

  Widget _buildStatusBanner(String title, String sub, Color color, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(Icons.info_outline, color: color, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight)),
                Text(sub, style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontSize: 10)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVehicleCountsBox(BuildContext context, bool isDark) {
    return Row(
      children: [
        Expanded(child: _buildCount(context, 'Assigned', '8', AppColors.success, isDark)),
        const SizedBox(width: 8),
        Expanded(child: _buildCount(context, 'On Trip', _currentStatus == TripStatusState.started || _currentStatus == TripStatusState.inProgress ? '8' : '0', const Color(0xFF6C5CE7), isDark)),
        const SizedBox(width: 8),
        Expanded(child: _buildCount(context, 'Pending', '2', Colors.grey, isDark)),
      ],
    );
  }

  Widget _buildCount(BuildContext context, String label, String value, Color color, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
      ),
      child: Column(
        children: [
          Text(label, style: TextStyle(fontSize: 10, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
          const SizedBox(height: 2),
          Text(value, style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: color)),
        ],
      ),
    );
  }

  Widget _buildActionFooter(BuildContext context, bool isDark) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Amount (Estimated)', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
              Text('₹ 24,750.00', style: AppTypography.h3(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        AppPrimaryButton(
          text: 'View Activity Timeline',
          onPressed: () => context.push(AppRoutes.userTripTimelineActivityScreen),
        ),
      ],
    );
  }
}
