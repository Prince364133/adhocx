import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';

class UserActiveTripScreen extends StatefulWidget {
  final Map<String, dynamic>? trip;
  const UserActiveTripScreen({super.key, this.trip});

  @override
  State<UserActiveTripScreen> createState() => _UserActiveTripScreenState();
}

class _UserActiveTripScreenState extends State<UserActiveTripScreen> {
  Map<String, dynamic>? _trip;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    if (widget.trip != null) {
      _trip = widget.trip;
      _isLoading = false;
    } else {
      _loadActiveTrip();
    }
  }

  Future<void> _loadActiveTrip() async {
    setState(() => _isLoading = true);
    try {
      final list = await UserService.instance.getTrips();
      if (list.isNotEmpty && mounted) {
        // prefer in_progress or accepted
        final active = list.firstWhere(
          (t) => (t as Map)['status'] == 'IN_PROGRESS' || (t as Map)['status'] == 'ARRIVED' || (t as Map)['status'] == 'ACCEPTED',
          orElse: () => list.first,
        );
        setState(() => _trip = active as Map<String, dynamic>);
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
    final driver = trip['driver'] as Map<String, dynamic>?;
    final driverUser = driver?['user'] as Map<String, dynamic>?;
    final driverName = driverUser?['fullName'] ?? driver?['fullName'] ?? 'Assigned Driver';
    final vehiclePlate = driver?['vehiclePlate'] ?? trip['vehiclePlate'] ?? 'DL 01 AB 1234';
    final vehicleModel = driver?['vehicleModel'] ?? trip['vehicleModel'] ?? 'White Sedan';
    final rating = (driver?['rating'] ?? 4.8).toString();
    final status = (trip['status'] ?? 'IN_PROGRESS').toString();
    final tripCode = trip['tripCode'] ?? trip['id'] ?? 'TRP-LIVE';

    final pickup = trip['pickupLocation'] as Map<String, dynamic>?;
    final drop = trip['dropLocation'] as Map<String, dynamic>?;
    final pickupAddr = pickup?['address'] ?? 'DLF Cyber City, Gurugram';
    final dropAddr = drop?['address'] ?? 'Indira Gandhi International Airport, Delhi';

    final isAssigned = status == 'ASSIGNED' || status == 'ACCEPTED' || status == 'ARRIVED' || status == 'IN_PROGRESS' || status == 'COMPLETED';
    final isArrived = status == 'ARRIVED' || status == 'IN_PROGRESS' || status == 'COMPLETED';
    final isStarted = status == 'IN_PROGRESS' || status == 'COMPLETED';
    final isCompleted = status == 'COMPLETED';

    final timelineSteps = [
      {'time': 'Assigned', 'title': 'Driver Assigned & Accepted', 'isDone': isAssigned},
      {'time': 'Arrived', 'title': 'Driver Arrived at Pickup Location', 'isDone': isArrived, 'isCurrent': status == 'ARRIVED'},
      {'time': 'In-Transit', 'title': 'Trip In Progress with OTP Verification', 'isDone': isStarted, 'isCurrent': status == 'IN_PROGRESS'},
      {'time': 'Completed', 'title': 'Dropoff & Trip Settlement', 'isDone': isCompleted},
    ];

    final initials = driverName.split(' ').map((e) => e.isNotEmpty ? e[0] : '').take(2).join().toUpperCase();

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        elevation: 0,
        leading: IconButton(
          onPressed: () => context.pop(),
          icon: Icon(Icons.arrow_back, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
        ),
        title: Text(
          'Active Trip',
          style: AppTypography.h3(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            onPressed: _loadActiveTrip,
            icon: Icon(Icons.refresh, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
          ),
        ],
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Requirement Title Header + Status Badge
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Fleet Trip Details',
                              style: AppTypography.h3(
                                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              tripCode.toString(),
                              style: AppTypography.caption(
                                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                              ),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.info.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(AppRadius.sm),
                          ),
                          child: Text(
                            status,
                            style: TextStyle(color: AppColors.info, fontWeight: FontWeight.bold, fontSize: 12),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    // Driver Profile Info Card
                    Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(AppRadius.lg),
                        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                      ),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 24,
                            backgroundColor: AppColors.primary,
                            child: Text(
                              initials.isNotEmpty ? initials : 'D',
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      driverName,
                                      style: AppTypography.h4(
                                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Row(
                                      children: [
                                        const Icon(Icons.star, size: 14, color: AppColors.starAmber),
                                        const SizedBox(width: 2),
                                        Text(rating, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                      ],
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '$vehiclePlate • $vehicleModel',
                                  style: AppTypography.caption(
                                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            onPressed: () {},
                            icon: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.1),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(Icons.phone, color: AppColors.primary, size: 20),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    // Locations Card
                    Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(AppRadius.lg),
                        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                      ),
                      child: Column(
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(Icons.circle, size: 10, color: AppColors.success),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Pickup Location', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                                    Text(pickupAddr, style: AppTypography.body(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 8.0),
                            child: Divider(),
                          ),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(Icons.circle, size: 10, color: AppColors.error),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Drop Location', style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                                    Text(dropAddr, style: AppTypography.body(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: AppSpacing.xl),

                    // Timeline Stepper Section
                    Text(
                      'Trip Lifecycle',
                      style: AppTypography.h3(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                      ),
                    ),

                    const SizedBox(height: AppSpacing.md),

                    Container(
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(AppRadius.lg),
                        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                      ),
                      child: Column(
                        children: List.generate(timelineSteps.length, (index) {
                          final step = timelineSteps[index];
                          final isDone = step['isDone'] == true;
                          final isLast = index == timelineSteps.length - 1;

                          return Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              SizedBox(
                                width: 80,
                                child: Text(
                                  step['time'] as String,
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: isDone ? (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight) : AppColors.slate400,
                                  ),
                                ),
                              ),
                              Column(
                                children: [
                                  Container(
                                    width: 12,
                                    height: 12,
                                    decoration: BoxDecoration(
                                      color: isDone ? AppColors.primary : AppColors.slate400,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  if (!isLast) Container(width: 2, height: 32, color: isDone ? AppColors.primary : AppColors.slate300),
                                ],
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Padding(
                                  padding: const EdgeInsets.only(bottom: 16.0),
                                  child: Text(
                                    step['title'] as String,
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: isDone ? FontWeight.bold : FontWeight.normal,
                                      color: isDone ? (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight) : AppColors.slate400,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          );
                        }),
                      ),
                    ),

                    const SizedBox(height: AppSpacing.xl),

                    AppPrimaryButton(
                      text: 'View Full Timeline Activity',
                      onPressed: () => context.push(AppRoutes.userTripTimelineActivityScreen, extra: trip),
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}
