import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// My Requests (Tickets) backed by GET /corporate/me/tickets.
class MyRequestsTicketsScreen extends StatefulWidget {
  const MyRequestsTicketsScreen({super.key});

  @override
  State<MyRequestsTicketsScreen> createState() =>
      _MyRequestsTicketsScreenState();
}

class _MyRequestsTicketsScreenState extends State<MyRequestsTicketsScreen> {
  static const _filters = ['All', 'Open', 'In Progress', 'Closed'];
  int _selectedFilter = 0;
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadTickets());
  }

  Future<void> _loadTickets({bool force = false}) async {
    EmployeeDataProvider? data;
    try {
      data = context.read<EmployeeDataProvider>();
    } catch (_) {
      data = null;
    }
    if (data != null) {
      await data.loadTickets(force: force);
    }
    if (mounted) setState(() => _initialized = true);
  }

  bool _matches(Map<String, dynamic> ticket) {
    final status = (ticket['status'] ?? '').toString().toUpperCase();
    switch (_selectedFilter) {
      case 1:
        return status == 'OPEN' ||
            status == 'NEW' ||
            status == 'REOPENED' ||
            status == 'ASSIGNED';
      case 2:
        return status == 'IN_PROGRESS' ||
            status == 'WAITING_FOR_CORPORATE' ||
            status == 'ASSIGNED';
      case 3:
        return status == 'RESOLVED' || status == 'CLOSED';
      default:
        return true;
    }
  }

  static IconData _icon(String category) {
    final upper = category.toUpperCase();
    if (upper.contains('SAFETY') || upper.contains('SOS')) {
      return Icons.notifications_active_rounded;
    }
    if (upper.contains('DRIVER')) return Icons.person_outline_rounded;
    if (upper.contains('LOST')) return Icons.backpack_rounded;
    if (upper.contains('ROUTE') || upper.contains('DELAY')) {
      return Icons.flag_rounded;
    }
    return Icons.info_outline_rounded;
  }

  static String _prettyStatus(String raw) {
    return raw.replaceAll('_', ' ');
  }

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    EmployeeDataProvider? data;
    try {
      data = context.watch<EmployeeDataProvider>();
    } catch (_) {}

    if (!_initialized && (data?.loadingTickets ?? false)) {
      return const EmployeeLoadingScaffold(
        appBar: EmployeeAppBar(title: 'My Requests'),
      );
    }

    final tickets = (data?.tickets ?? const <Map<String, dynamic>>[])
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
              child: RefreshIndicator(
                onRefresh: () => _loadTickets(force: true),
                child: tickets.isEmpty
                    ? ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        children: [
                          const SizedBox(height: AppSpacing.xxxl),
                          EmployeeEmptyState(
                            icon: Icons.confirmation_number_outlined,
                            title: 'No requests here',
                            description:
                                'Nothing matches "${_filters[_selectedFilter]}" right now.',
                          ),
                        ],
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(AppSpacing.xl),
                        itemCount: tickets.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(height: AppSpacing.md),
                        itemBuilder: (context, index) {
                          final item = tickets[index];
                          final category =
                              (item['category'] ?? 'GENERAL_SUPPORT')
                                  .toString();
                          final subject = item['subject']?.toString() ??
                              category.replaceAll('_', ' ');
                          final created = EmployeeDataProvider.formatDisplayDate(
                            item['createdAt']?.toString(),
                          );
                          final status =
                              _prettyStatus((item['status'] ?? 'OPEN').toString());
                          return EmployeeNavTile(
                            icon: _icon(category),
                            title: subject,
                            subtitle: created.isNotEmpty
                                ? created
                                : category.replaceAll('_', ' '),
                            onTap: () => context.push(
                              AppRoutes.requestDetailsTracking,
                              extra: item,
                            ),
                            trailing: EmployeeStatusBadge.fromString(status),
                          );
                        },
                      ),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: const EmployeeBottomNavBar(currentIndex: -1),
    );
  }
}
