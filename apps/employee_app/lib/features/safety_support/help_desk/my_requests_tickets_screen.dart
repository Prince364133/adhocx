import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/safety_widgets.dart';

/// Screen 8: My Requests (Tickets)
class MyRequestsTicketsScreen extends StatefulWidget {
  const MyRequestsTicketsScreen({super.key});

  @override
  State<MyRequestsTicketsScreen> createState() =>
      _MyRequestsTicketsScreenState();
}

class _MyRequestsTicketsScreenState extends State<MyRequestsTicketsScreen> {
  static const _filters = ['All', 'Open', 'In Progress', 'Closed'];
  int _selectedFilter = 0;

  bool _matches(Map<String, dynamic> ticket) {
    final status = '${ticket['status'] ?? ''}'.toLowerCase();
    switch (_selectedFilter) {
      case 1:
        return status == 'open';
      case 2:
        return status == 'in progress';
      case 3:
        return status == 'resolved' || status == 'closed';
      default:
        return true;
    }
  }

  static IconData _icon(String category) {
    if (category.contains('SOS')) return Icons.notifications_active_rounded;
    if (category.contains('Driving')) return Icons.flag_rounded;
    if (category.contains('Behavior')) return Icons.chat_bubble_outline_rounded;
    if (category.contains('Property')) return Icons.backpack_rounded;
    return Icons.info_outline_rounded;
  }

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadSafetyList('tickets'),
      builder: (context, data) {
        final p = EmployeePalette.of(context);
        final tickets = ((data['items'] as List<dynamic>?) ?? const [])
            .cast<Map<String, dynamic>>()
            .where(_matches)
            .toList();

        return Scaffold(
          backgroundColor: p.background,
          appBar: const EmployeeAppBar(title: 'My Requests'),
          body: SafeArea(
            child: Column(
              children: [
                EmployeePillFilter(
                  options: _filters,
                  selectedIndex: _selectedFilter,
                  onSelected: (i) => setState(() => _selectedFilter = i),
                ),
                Expanded(
                  child: tickets.isEmpty
                      ? EmployeeEmptyState(
                          icon: Icons.confirmation_number_outlined,
                          title: 'No requests here',
                          description:
                              'Nothing matches "${_filters[_selectedFilter]}" right now.',
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(AppSpacing.xl),
                          itemCount: tickets.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: AppSpacing.md),
                          itemBuilder: (context, index) {
                            final item = tickets[index];
                            final category = '${item['category'] ?? ''}';
                            return EmployeeNavTile(
                              icon: _icon(category),
                              title: category,
                              subtitle: '${item['created'] ?? ''}',
                              onTap: () => context
                                  .push(AppRoutes.requestDetailsTracking),
                              trailing: EmployeeStatusBadge.fromString(
                                '${item['status'] ?? ''}',
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
          ),
          bottomNavigationBar: const EmployeeBottomNavBar(currentIndex: -1),
        );
      },
    );
  }
}
