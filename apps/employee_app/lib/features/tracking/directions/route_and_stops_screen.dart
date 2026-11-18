import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Route & Stops backed by live routeStops from nextTrip or GET /corporate/routes/:id.
class RouteAndStopsScreen extends StatelessWidget {
  const RouteAndStopsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () async {
        final data = maybeEmployeeData(context);
        if (data == null) return const {'stops': []};
        final next = await data.loadNextTrip();
        if (next != null &&
            next['routeStops'] is List &&
            (next['routeStops'] as List).isNotEmpty) {
          return {'stops': next['routeStops']};
        }
        final routeId = next?['routeId']?.toString();
        if (routeId != null && routeId.isNotEmpty) {
          final route = await data.loadRouteDetails(routeId);
          if (route != null && route['stops'] is List) {
            return {'stops': route['stops']};
          }
        }
        return const {'stops': []};
      },
      builder: (context, data) {
        final p = EmployeePalette.of(context);
        final stops = (data['stops'] as List<dynamic>?) ?? const [];

        return Scaffold(
          backgroundColor: p.background,
          appBar: const EmployeeAppBar(title: 'Trip Route'),
          body: SafeArea(
            child: Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.pageHorizontal,
                      vertical: AppSpacing.xl,
                    ),
                    child: AppCard(
                      width: double.infinity,
                      padding: AppSpacing.paddingXl,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Route Stops',
                            style: AppTypography.h4(
                              color: p.textPrimary,
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: AppSpacing.xl),
                          if (stops.isEmpty)
                            Text(
                              'No stops assigned to an active route yet.',
                              style: AppTypography.small(color: p.textSecondary),
                            )
                          else
                            for (var i = 0; i < stops.length; i++)
                              _StopRow(
                                stop: Map<String, dynamic>.from(stops[i] as Map),
                                index: i,
                                isLast: i == stops.length - 1,
                              ),
                        ],
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.xl,
                    0,
                    AppSpacing.xl,
                    AppSpacing.lg,
                  ),
                  child: EmployeePrimaryButton(
                    label: 'View on Map',
                    icon: Icons.map_rounded,
                    onPressed: () => context.push(AppRoutes.tripLiveMapFull),
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

class _StopRow extends StatelessWidget {
  final Map<String, dynamic> stop;
  final int index;
  final bool isLast;

  const _StopRow({
    required this.stop,
    required this.index,
    required this.isLast,
  });

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    final stopType = (stop['stopType'] ?? '').toString().toUpperCase();
    final isDrop = stopType == 'DROP' || stopType == 'OFFICE';
    final isCurrent = stop['isCurrentUser'] == true;
    final seq = stop['stopSequence']?.toString() ?? '${index + 1}';
    final eta = EmployeeDataProvider.formatDisplayTime(
      stop['plannedEta']?.toString(),
    );
    final address = stop['addressText']?.toString() ??
        (isDrop ? 'Office Destination' : 'Commuter Stop');
    final status = stop['status']?.toString() ?? '';

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              Container(
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  color: isCurrent
                      ? AppColors.primary
                      : (isDrop ? AppColors.brandOrange : AppColors.success),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isDrop
                      ? Icons.business_rounded
                      : (isCurrent ? Icons.person : Icons.check),
                  size: 13,
                  color: Colors.white,
                ),
              ),
              if (!isLast)
                Expanded(child: Container(width: 2, color: p.borderSubtle)),
            ],
          ),
          const SizedBox(width: AppSpacing.md + 2),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : AppSpacing.xxl),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isCurrent
                        ? 'Your Stop (Stop $seq)'
                        : (isDrop ? 'Office Destination' : 'Stop $seq'),
                    style: AppTypography.bodyMedium(
                      color: isCurrent ? p.accent : p.textPrimary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    [
                      if (eta.isNotEmpty) 'ETA $eta',
                      if (status.isNotEmpty) status,
                      address,
                    ].join(' • '),
                    style: AppTypography.caption(color: p.textSecondary),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
