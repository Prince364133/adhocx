import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

class NotificationsCenterScreen extends StatefulWidget {
  const NotificationsCenterScreen({super.key});

  @override
  State<NotificationsCenterScreen> createState() =>
      _NotificationsCenterScreenState();
}

class _NotificationsCenterScreenState extends State<NotificationsCenterScreen> {
  static const _filters = ['All', 'Trips', 'Updates', 'Support'];
  static const _types = [null, 'trips', 'updates', 'support'];
  int _selectedFilter = 0;

  static (IconData, Color) _style(String type) {
    switch (type) {
      case 'trips':
        return (Icons.directions_car_filled_rounded, AppColors.primary);
      case 'updates':
        return (Icons.update_rounded, AppColors.brandOrange);
      case 'support':
        return (Icons.headset_mic_rounded, AppColors.success);
      default:
        return (Icons.notifications_rounded, AppColors.accentPurple);
    }
  }

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () async => {
        'items': (await MockDataService.getHistoryProfileData())['notifications'],
      },
      builder: (context, data) {
        final p = EmployeePalette.of(context);
        final wanted = _types[_selectedFilter];
        final items = ((data['items'] as List<dynamic>?) ?? const [])
            .cast<Map<String, dynamic>>()
            .where((n) =>
                wanted == null || '${n['type'] ?? ''}'.toLowerCase() == wanted)
            .toList();

        return Scaffold(
          backgroundColor: p.background,
          appBar: EmployeeAppBar(
            title: 'Notifications',
            actions: [
              IconButton(
                tooltip: 'Notification preferences',
                icon: Icon(Icons.settings_outlined, color: p.textPrimary),
                onPressed: () =>
                    context.push(AppRoutes.notificationPreferences),
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
                  child: items.isEmpty
                      ? const EmployeeEmptyState(
                          icon: Icons.notifications_off_outlined,
                          title: 'No Notifications',
                          description:
                              'You are all caught up on your commute updates!',
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(AppSpacing.xl),
                          itemCount: items.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: AppSpacing.md),
                          itemBuilder: (context, index) {
                            final n = items[index];
                            final (icon, color) = _style('${n['type'] ?? ''}');
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
                                            const SizedBox(width: AppSpacing.sm),
                                            Text(
                                              '${n['time'] ?? ''}',
                                              style: AppTypography.micro(
                                                color: p.textMuted,
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: AppSpacing.xs),
                                        Text(
                                          '${n['body'] ?? ''}',
                                          style: AppTypography.small(
                                            color: p.textSecondary,
                                          ),
                                        ),
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
        );
      },
    );
  }
}
