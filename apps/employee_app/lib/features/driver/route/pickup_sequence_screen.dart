import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Pickup Sequence / Route backed by real routeStops from nextTrip or GET /corporate/routes/:id.
class PickupSequenceScreen extends StatelessWidget {
  const PickupSequenceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () async {
        final data = maybeEmployeeData(context);
        if (data == null) return const {'stops': []};
        final next = await data.loadNextTrip();
        if (next != null && next['routeStops'] is List && (next['routeStops'] as List).isNotEmpty) {
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
          appBar: const EmployeeAppBar(title: 'Trip Route (Pickup)'),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppSpacing.xl),
              child: TripSectionCard(
                title: 'Pickup & Drop Stops',
                description:
                    'Estimated pickup order calculated for optimal commute efficiency.',
                child: stops.isEmpty
                    ? Text(
                        'No active route stops available yet.',
                        style: AppTypography.small(color: p.textSecondary),
                      )
                    : TripTimeline(
                        entries: [
                          for (var i = 0; i < stops.length; i++)
                            () {
                              final stop =
                                  Map<String, dynamic>.from(stops[i] as Map);
                              final isCurrent = stop['isCurrentUser'] == true ||
                                  stop['isCurrentUserStop'] == true;
                              final stopType =
                                  (stop['stopType'] ?? '').toString().toUpperCase();
                              final isDrop = stopType == 'DROP' ||
                                  stopType == 'DROPOFF' ||
                                  stopType == 'OFFICE';
                              final seq =
                                  stop['stopSequence']?.toString() ?? '${i + 1}';
                              final eta = EmployeeDataProvider.formatDisplayTime(
                                stop['plannedEta']?.toString(),
                              );
                              final address =
                                  stop['addressText']?.toString() ??
                                      (isDrop ? 'Office Destination' : 'Commuter Stop');
                              final status =
                                  (stop['status'] ?? '').toString();

                              return TripTimelineEntry(
                                dotColor: isCurrent
                                    ? AppColors.primary
                                    : isDrop
                                        ? AppColors.brandOrange
                                        : p.border,
                                dotChild: isDrop
                                    ? const Icon(Icons.business_rounded,
                                        size: 12, color: Colors.white)
                                    : isCurrent
                                        ? const Icon(Icons.person,
                                            size: 12, color: Colors.white)
                                        : Text(
                                            seq,
                                            style: AppTypography.micro(
                                              color: p.textSecondary,
                                              fontSize: 10,
                                              fontWeight: FontWeight.w700,
                                            ),
                                          ),
                                title: isCurrent
                                    ? 'Your Stop (Stop $seq)'
                                    : (isDrop
                                        ? 'Office Destination'
                                        : 'Stop $seq'),
                                emphasise: isCurrent,
                                titleTrailing: isCurrent
                                    ? const EmployeeStatusBadge(
                                        label: 'Your Stop',
                                        variant: BadgeVariant.inProgress,
                                      )
                                    : isDrop
                                        ? const EmployeeStatusBadge(
                                            label: 'Office Drop',
                                            variant: BadgeVariant.pending,
                                          )
                                        : (status.isNotEmpty
                                            ? EmployeeStatusBadge(label: status)
                                            : null),
                                subtitle: [
                                  if (eta.isNotEmpty) eta,
                                  address,
                                ].join(' • '),
                              );
                            }(),
                        ],
                      ),
              ),
            ),
          ),
        );
      },
    );
  }
}
