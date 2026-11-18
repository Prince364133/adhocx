import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/schedule_widgets.dart';

/// Shared body of the Login / Overnight shift details screens backed by live schedule data.
class ShiftDetailsView extends StatefulWidget {
  final String sectionKey;
  final Widget badge;
  final Color accent;
  final bool preferLogout;

  const ShiftDetailsView({
    super.key,
    required this.sectionKey,
    required this.badge,
    required this.accent,
    this.preferLogout = false,
  });

  @override
  State<ShiftDetailsView> createState() => _ShiftDetailsViewState();
}

class _ShiftDetailsViewState extends State<ShiftDetailsView> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      try {
        final data = context.read<EmployeeDataProvider>();
        data.loadSchedule();
        data.loadProfile();
      } catch (_) {}
    });
  }

  Map<String, dynamic>? _resolveRouteExtra(BuildContext context) {
    try {
      final extra = GoRouterState.of(context).extra;
      if (extra is Map) return Map<String, dynamic>.from(extra);
    } catch (_) {}
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    EmployeeDataProvider? dataProvider;
    try {
      dataProvider = context.watch<EmployeeDataProvider>();
    } catch (_) {}

    final extraItem = _resolveRouteExtra(context);
    final scheduleItems = dataProvider?.scheduleItems ?? const [];
    final matchedItem = extraItem ??
        (scheduleItems.isNotEmpty
            ? scheduleItems.firstWhere(
                (i) {
                  final dir = (i['direction'] ?? '').toString().toUpperCase();
                  return widget.preferLogout
                      ? (dir == 'LOGOUT' || dir == 'DROP')
                      : (dir == 'LOGIN' || dir == 'PICKUP');
                },
                orElse: () => scheduleItems.first,
              )
            : null);

    final profile = dataProvider?.profile;
    final officeName = (profile?['office'] is Map
            ? (profile!['office'] as Map)['name']?.toString()
            : null) ??
        matchedItem?['officeAddress']?.toString() ??
        'Corporate Office';
    final dateStr = matchedItem?['date'] != null
        ? EmployeeDataProvider.formatDisplayDate(matchedItem!['date'].toString())
        : formatScheduleDayLabel(DateTime.now());
    final shiftTimeStr = EmployeeDataProvider.formatDisplayTime(
      matchedItem?['shiftTime']?.toString() ??
          matchedItem?['pickupTime']?.toString(),
    );
    final pickupTimeStr = EmployeeDataProvider.formatDisplayTime(
      matchedItem?['pickupTime']?.toString() ??
          matchedItem?['shiftTime']?.toString(),
    );
    final officeArrivalStr = EmployeeDataProvider.formatDisplayTime(
      matchedItem?['officeArrivalTime']?.toString(),
    );
    final pickupLoc = matchedItem?['pickupAddress']?.toString() ??
        (profile?['defaultPickupLocation'] is Map
            ? (profile!['defaultPickupLocation'] as Map)['addressText']
                ?.toString()
            : null) ??
        'Assigned pickup point';
    final dropLoc = matchedItem?['officeAddress']?.toString() ?? officeName;

    Widget infoRow(IconData icon, String text) => Row(
          children: [
            Icon(icon, size: 20, color: widget.accent),
            const SizedBox(width: AppSpacing.md + 2),
            Expanded(
              child: Text(
                text,
                style: AppTypography.bodyMedium(
                  color: p.textPrimary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        );

    Widget leg(Color color, String title, String place) => Row(
          children: [
            Icon(Icons.location_on, color: color, size: 22),
            const SizedBox(width: AppSpacing.md + 2),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: AppTypography.bodyMedium(
                      color: p.textPrimary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  Text(place,
                      style: AppTypography.caption(color: p.textSecondary)),
                ],
              ),
            ),
          ],
        );

    return Scaffold(
      backgroundColor: p.background,
      appBar: const EmployeeAppBar(),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.pageHorizontal,
            AppSpacing.sm,
            AppSpacing.pageHorizontal,
            AppSpacing.xxl,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Shift Details',
                textAlign: TextAlign.center,
                style: AppTypography.h2(color: p.textPrimary),
              ),
              const SizedBox(height: AppSpacing.md + 2),
              Center(child: widget.badge),
              const SizedBox(height: AppSpacing.xxl),
              AppCard(
                padding: AppSpacing.paddingXl,
                child: Column(
                  children: [
                    infoRow(Icons.calendar_month_outlined, dateStr),
                    Divider(color: p.border, height: AppSpacing.xxl + 4),
                    infoRow(
                      Icons.access_time_rounded,
                      shiftTimeStr.isNotEmpty
                          ? shiftTimeStr
                          : 'No shift assigned',
                    ),
                    Divider(color: p.border, height: AppSpacing.xxl + 4),
                    infoRow(Icons.apartment_rounded, officeName),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.xxl + 4),
              const EmployeeSectionHeader(
                title: 'Transport (Roster)',
                padding: EdgeInsets.zero,
              ),
              const SizedBox(height: AppSpacing.md + 2),
              AppCard(
                padding: AppSpacing.paddingXl,
                backgroundColor: p.surfaceElevated,
                child: Column(
                  children: [
                    leg(
                      AppColors.success,
                      pickupTimeStr.isNotEmpty
                          ? 'Pickup • $pickupTimeStr'
                          : 'Pickup',
                      pickupLoc,
                    ),
                    Divider(color: p.border, height: AppSpacing.xxl + 4),
                    leg(
                      AppColors.warning,
                      officeArrivalStr.isNotEmpty
                          ? 'Drop • $officeArrivalStr'
                          : 'Drop',
                      dropLoc,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
