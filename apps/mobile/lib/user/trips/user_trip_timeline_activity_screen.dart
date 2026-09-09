import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';

class UserTripTimelineActivityScreen extends StatefulWidget {
  final Map<String, dynamic>? trip;
  const UserTripTimelineActivityScreen({super.key, this.trip});

  @override
  State<UserTripTimelineActivityScreen> createState() => _UserTripTimelineActivityScreenState();
}

class _UserTripTimelineActivityScreenState extends State<UserTripTimelineActivityScreen> {
  Map<String, dynamic>? _trip;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    if (widget.trip != null) {
      _trip = widget.trip;
      _isLoading = false;
    } else {
      _loadTrip();
    }
  }

  Future<void> _loadTrip() async {
    setState(() => _isLoading = true);
    try {
      final list = await UserService.instance.getTrips();
      if (list.isNotEmpty && mounted) {
        setState(() => _trip = list.first as Map<String, dynamic>);
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final trip = _trip ?? {};
    final tripCode = trip['tripCode'] ?? trip['id'] ?? 'TRP-LIVE';
    final status = (trip['status'] ?? 'COMPLETED').toString();
    final driver = trip['driver'] as Map<String, dynamic>?;
    final driverName = driver?['user']?['fullName'] ?? driver?['fullName'] ?? 'Assigned Driver';

    final isAssigned = status == 'ASSIGNED' || status == 'ACCEPTED' || status == 'ARRIVED' || status == 'IN_PROGRESS' || status == 'COMPLETED';
    final isArrived = status == 'ARRIVED' || status == 'IN_PROGRESS' || status == 'COMPLETED';
    final isStarted = status == 'IN_PROGRESS' || status == 'COMPLETED';
    final isCompleted = status == 'COMPLETED';

    final events = [
      {'title': 'Requirement Dispatched to Drivers', 'time': 'Live Event', 'isDone': true},
      {'title': 'Driver $driverName Assigned & Accepted', 'time': isAssigned ? 'Confirmed' : 'Pending', 'isDone': isAssigned},
      {'title': 'Driver En Route to Pickup Location', 'time': isAssigned ? 'Active' : 'Pending', 'isDone': isAssigned},
      {'title': 'Driver Arrived at Pickup', 'time': isArrived ? 'Arrived' : 'Pending', 'isDone': isArrived},
      {'title': 'Trip In-Transit (OTP Verified)', 'time': isStarted ? 'Started' : 'Pending', 'isDone': isStarted},
      {'title': 'Trip Dropoff & Ledger Settlement', 'time': isCompleted ? 'Completed' : 'Pending', 'isDone': isCompleted},
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
        title: Text('Trip Timeline', style: AppTypography.h3(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Trip Activity History', style: AppTypography.h3(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                            Text(tripCode.toString(), style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(color: AppColors.success.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(AppRadius.sm)),
                          child: Text(status, style: const TextStyle(color: AppColors.success, fontWeight: FontWeight.bold, fontSize: 12)),
                        ),
                      ],
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    // Activity Timeline Stepper Card
                    Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(AppRadius.lg),
                        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                      ),
                      child: Column(
                        children: List.generate(events.length, (index) {
                          final item = events[index];
                          final isDone = item['isDone'] == true;
                          final bool isLast = index == events.length - 1;

                          return Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Column(
                                children: [
                                  Icon(isDone ? Icons.check_circle : Icons.circle_outlined, size: 18, color: isDone ? AppColors.success : AppColors.slate400),
                                  if (!isLast) Container(width: 2, height: 36, color: isDone ? AppColors.success : AppColors.slate300),
                                ],
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Padding(
                                  padding: const EdgeInsets.only(bottom: 20.0),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        item['title'] as String,
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          color: isDone ? (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight) : AppColors.slate400,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(item['time'] as String, style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          );
                        }),
                      ),
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}
