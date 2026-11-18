import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Notifications Center backed by GET /corporate/me/notifications.
class NotificationsCenterScreen extends StatefulWidget {
  const NotificationsCenterScreen({super.key});

  @override
  State<NotificationsCenterScreen> createState() =>
      _NotificationsCenterScreenState();
}

class _NotificationsCenterScreenState extends State<NotificationsCenterScreen> {
  static const _filters = ['All', 'Trips', 'Updates', 'Support'];
  int _selectedFilter = 0;
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load({bool force = false}) async {
    EmployeeDataProvider? data;
    try {
      data = context.read<EmployeeDataProvider>();
    } catch (_) {
      data = null;
    }
    if (data != null) {
      await data.loadNotifications(force: force);
      data.markAllNotificationsRead();
    }
    if (mounted) setState(() => _initialized = true);
  }

  bool _matches(Map<String, dynamic> n) {
    if (_selectedFilter == 0) return true;
    final type = (n['type'] ?? '').toString().toUpperCase();
    switch (_selectedFilter) {
      case 1:
        return type.contains('TRIP') ||
            type.contains('ROUTE') ||
            type.contains('CAB') ||
            type.contains('DRIVER') ||
            type.contains('BOARD');
      case 2:
        return type.contains('UPDATE') ||
            type.contains('SCHEDULE') ||
            type.contains('ROSTER') ||
            type.contains('GENERAL');
      case 3:
        return type.contains('SUPPORT') ||
            type.contains('TICKET') ||
            type.contains('SOS') ||
            type.contains('SAFE');
      default:
        return true;
    }
  }

  static (IconData, Color) _style(String type) {
    final upper = type.toUpperCase();
    if (upper.contains('TRIP') ||
        upper.contains('CAB') ||
        upper.contains('ROUTE') ||
        upper.contains('DRIVER')) {
      return (Icons.directions_car_filled_rounded, AppColors.primary);
    }
    if (upper.contains('SUPPORT') || upper.contains('TICKET')) {
      return (Icons.headset_mic_rounded, AppColors.success);
    }
    if (upper.contains('SOS') || upper.contains('SAFE')) {
      return (Icons.shield_rounded, AppColors.error);
    }
    return (Icons.notifications_rounded, AppColors.brandOrange);
  }

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    EmployeeDataProvider? data;
    try {
      data = context.watch<EmployeeDataProvider>();
    } catch (_) {}

    if (!_initialized && (data?.loadingNotifications ?? false)) {
      return const EmployeeLoadingScaffold(
        appBar: EmployeeAppBar(title: 'Notifications'),
      );
    }

    final items = (data?.notifications ?? const <Map<String, dynamic>>[])
        .where(_matches)
        .toList();

    return Scaffold(
      backgroundColor: p.background,
      appBar: EmployeeAppBar(
        title: 'Notifications',
        actions: [
          IconButton(
            tooltip: 'Notification preferences',
            icon: Icon(Icons.settings_outlined, color: p.textPrimary),
            onPressed: () => context.push(AppRoutes.notificationPreferences),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            EmployeePillFilter(
              options: _filters,
              selectedIndex: _selectedFilter,
              onSelected: (i) => setState(() => _selectedFilter = i),
            ),
            Expanded(
              child: RefreshIndicator(
                onRefresh: () => _load(force: true),
                child: items.isEmpty
                    ? ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        children: const [
                          SizedBox(height: AppSpacing.xxxl),
                          EmployeeEmptyState(
                            icon: Icons.notifications_off_outlined,
                            title: 'No Notifications',
                            description:
                                'You are all caught up on your commute updates!',
                          ),
                        ],
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(AppSpacing.xl),
                        itemCount: items.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(height: AppSpacing.md),
                        itemBuilder: (context, index) {
                          final n = items[index];
                          final (icon, color) =
                              _style((n['type'] ?? '').toString());
                          final ts = EmployeeDataProvider.formatDisplayTime(
                            n['timestamp']?.toString() ??
                                n['createdAt']?.toString(),
                          );
                          final body = n['message']?.toString() ??
                              n['body']?.toString() ??
                              '';

                          return AppCard(
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  padding:
                                      const EdgeInsets.all(AppSpacing.sm + 2),
                                  decoration: BoxDecoration(
                                    color: color.withAlpha(p.isDark ? 46 : 31),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(icon, color: color, size: 20),
                                ),
                                const SizedBox(width: AppSpacing.md + 2),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Expanded(
                                            child: Text(
                                              '${n['title'] ?? ''}',
                                              style: AppTypography.bodyMedium(
                                                color: p.textPrimary,
                                                fontWeight: FontWeight.w700,
                                              ),
                                            ),
                                          ),
                                          if (ts.isNotEmpty) ...[
                                            const SizedBox(width: AppSpacing.sm),
                                            Text(
                                              ts,
                                              style: AppTypography.micro(
                                                color: p.textMuted,
                                              ),
                                            ),
                                          ],
                                        ],
                                      ),
                                      if (body.isNotEmpty) ...[
                                        const SizedBox(height: AppSpacing.xs),
                                        Text(
                                          body,
                                          style: AppTypography.small(
                                            color: p.textSecondary,
                                          ),
                                        ),
                                      ],
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
    );
  }
}
