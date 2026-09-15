import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';

class UserAssignmentTimelineScreen extends StatefulWidget {
  final Map<String, dynamic>? requirement;
  const UserAssignmentTimelineScreen({super.key, this.requirement});

  @override
  State<UserAssignmentTimelineScreen> createState() => _UserAssignmentTimelineScreenState();
}

class _UserAssignmentTimelineScreenState extends State<UserAssignmentTimelineScreen> {
  Map<String, dynamic>? _requirement;
  List<dynamic> _trips = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    if (widget.requirement != null) {
      _requirement = widget.requirement;
    }
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      if (_requirement == null) {
        final reqs = await UserService.instance.getRequirements();
        if (reqs.isNotEmpty) {
          _requirement = reqs.first as Map<String, dynamic>;
        }
      }
      final trips = await UserService.instance.getTrips();
      if (mounted) setState(() => _trips = trips);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final req = _requirement ?? {};
    final rawId = (req['requirementCode'] ?? req['id'] ?? widget.requirement?['id'] ?? '').toString();
    final reqCode = rawId.length > 8 ? 'REQ-${rawId.substring(0, 8).toUpperCase()}' : (rawId.isNotEmpty ? rawId : 'REQ-LIVE');
    final vehicleType = req['vehicleType'] ?? 'Sedan';
    final quantity = (req['quantity'] ?? 1) as int;
    final status = (req['status'] ?? 'DISPATCHING').toString();

    final assignedCount = _trips.where((t) => t['status'] == 'ACCEPTED' || t['status'] == 'ASSIGNED').length;
    final onTripCount = _trips.where((t) => t['status'] == 'IN_PROGRESS' || t['status'] == 'ARRIVED').length;
    final completedCount = _trips.where((t) => t['status'] == 'COMPLETED').length;

    final events = [
      {'title': 'Requirement Created & Dispatched', 'time': 'Just now', 'color': AppColors.success, 'isDone': true},
      {'title': 'Driver Broadcast Radius Expanded (15-100km)', 'time': 'Live', 'color': AppColors.success, 'isDone': true},
      {'title': '$assignedCount Drivers Assigned', 'time': assignedCount > 0 ? 'Confirmed' : 'Pending', 'color': assignedCount > 0 ? AppColors.success : AppColors.info, 'isDone': assignedCount > 0},
      {'title': '$onTripCount Drivers En Route / Arrived', 'time': onTripCount > 0 ? 'Active' : 'Awaiting', 'color': onTripCount > 0 ? AppColors.primary : AppColors.slate400, 'isDone': onTripCount > 0},
      {'title': '$completedCount Trips Completed', 'time': completedCount > 0 ? 'Completed' : 'Pending', 'color': completedCount > 0 ? AppColors.success : AppColors.slate400, 'isDone': completedCount > 0},
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
        title: Text('Assignment Timeline', style: AppTypography.h3(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            onPressed: _loadData,
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
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('$vehicleType ($quantity Vehicles)', style: AppTypography.h3(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
                            Text(reqCode.toString(), style: AppTypography.caption(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(color: AppColors.warning.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(AppRadius.sm)),
                          child: Text(status, style: TextStyle(color: AppColors.warning, fontWeight: FontWeight.bold, fontSize: 12)),
                        ),
                      ],
                    ),

                    const SizedBox(height: AppSpacing.lg),

                    // Timeline Stepper Card
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
                          final Color color = item['color'] as Color;
                          final bool isLast = index == events.length - 1;

                          return Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Column(
                                children: [
                                  Container(width: 12, height: 12, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                                  if (!isLast) Container(width: 2, height: 36, color: AppColors.slate300),
                                ],
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Padding(
                                  padding: const EdgeInsets.only(bottom: 20.0),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(item['title'] as String, style: TextStyle(fontWeight: FontWeight.bold, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight)),
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
