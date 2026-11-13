import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Trips tab: completed trip history grouped by month.
class TripHistoryOverviewScreen extends StatefulWidget {
  const TripHistoryOverviewScreen({super.key});

  @override
  State<TripHistoryOverviewScreen> createState() =>
      _TripHistoryOverviewScreenState();
}

class _TripHistoryOverviewScreenState extends State<TripHistoryOverviewScreen> {
  static const _tabs = ['All', 'Pickup', 'Drop'];
  int _selectedTab = 0;

  static bool _isDrop(String type) {
    final t = type.toLowerCase();
    return t.contains('drop') || t.contains('logout');
  }

  bool _matches(Map<String, dynamic> trip) {
    final type = '${trip['type'] ?? ''}';
    switch (_selectedTab) {
      case 1:
        return !_isDrop(type);
      case 2:
        return _isDrop(type);
      default:
        return true;
    }
  }

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () async => (await MockDataService.getHistoryProfileData())[
          'trip_history'] as Map<String, dynamic>?,
      builder: (context, history) {
        final p = EmployeePalette.of(context);
        List<Map<String, dynamic>> pick(String key) =>
            ((history[key] as List<dynamic>?) ?? const [])
                .cast<Map<String, dynamic>>()
                .where(_matches)
                .toList();
        final thisMonth = pick('this_month');
        final lastMonth = pick('last_month');

        Widget section(String title, List<Map<String, dynamic>> trips) =>
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  title,
                  style: AppTypography.small(
                    color: p.textSecondary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                for (final t in trips)
                  EmployeeTripCard(
                    title: '${t['type'] ?? ''}',
                    date: '${t['date'] ?? ''}',
                    status: '${t['status'] ?? ''}',
                    isDrop: _isDrop('${t['type'] ?? ''}'),
                    onTap: () => context.push(AppRoutes.tripHistoryDetails),
                  ),
                const SizedBox(height: AppSpacing.lg),
              ],
            );

        return Scaffold(
          backgroundColor: p.background,
          appBar: EmployeeAppBar(
            title: 'Trip History',
            onBack: () => context.go(AppRoutes.homeUpcomingPickup),
            actions: [
              IconButton(
                tooltip: 'Trip analytics',
                icon: Icon(Icons.bar_chart_rounded, color: p.accent),
                onPressed: () => context.push(AppRoutes.tripSummaryAnalytics),
              ),
            ],
          ),
          body: SafeArea(
            child: Column(
              children: [
                EmployeePillFilter(
                  options: _tabs,
                  selectedIndex: _selectedTab,
                  onSelected: (i) => setState(() => _selectedTab = i),
                ),
                Expanded(
                  child: thisMonth.isEmpty && lastMonth.isEmpty
                      ? const EmployeeEmptyState(
                          icon: Icons.history_rounded,
                          title: 'No Trip History',
                          description:
                              'No completed commute trips recorded in this period.',
                        )
                      : ListView(
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.xl,
                            vertical: AppSpacing.lg,
                          ),
                          children: [
                            if (thisMonth.isNotEmpty)
                              section('This Month', thisMonth),
                            if (lastMonth.isNotEmpty)
                              section('Last Month', lastMonth),
                          ],
                        ),
                ),
              ],
            ),
          ),
          bottomNavigationBar: const EmployeeBottomNavBar(currentIndex: 2),
        );
      },
    );
  }
}
