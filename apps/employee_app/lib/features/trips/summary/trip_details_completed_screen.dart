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

class TripDetailsCompletedScreen extends StatelessWidget {
  const TripDetailsCompletedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadLiveLatestTrip(context),
      builder: (context, trip) {
        final p = EmployeePalette.of(context);
        final type = EmployeeDataProvider.formatDirectionLabel(
          trip['direction']?.toString(),
        );
        final date = EmployeeDataProvider.formatDisplayDate(
          trip['shiftDate']?.toString(),
        );
        final status =
            (trip['status'] ?? trip['routeStatus'] ?? 'Scheduled').toString();
        final plannedEta = EmployeeDataProvider.formatDisplayTime(
          trip['plannedEta']?.toString() ?? trip['shiftTime']?.toString(),
        );
        final arrival = EmployeeDataProvider.formatDisplayTime(
          trip['actualArrivalTime']?.toString(),
        );
        final departure = EmployeeDataProvider.formatDisplayTime(
          trip['actualDepartureTime']?.toString(),
        );
        final pickupAddr = trip['pickupAddress']?.toString() ??
            (trip['pickupLocation'] is Map
                ? (trip['pickupLocation'] as Map)['addressText']?.toString()
                : null) ??
            'Pickup point';
        final destAddr = trip['destinationAddress']?.toString() ??
            (trip['officeDestination'] is Map
                ? (trip['officeDestination'] as Map)['name']?.toString()
                : null) ??
            'Destination';

        final timeline = <Map<String, String>>[
          {
            'event': 'Pickup scheduled • $pickupAddr',
            'time': plannedEta.isNotEmpty ? plannedEta : 'Scheduled',
          },
          if (arrival.isNotEmpty)
            {'event': 'Cab arrived at pickup point', 'time': arrival},
          if (departure.isNotEmpty)
            {'event': 'Completed / Drop off • $destAddr', 'time': departure}
          else
            {'event': 'Destination • $destAddr', 'time': status},
        ];

        return TripStageScaffold(
          title: 'Trip Details',
          statusLabel: status,
          statusVariant: status.toUpperCase() == 'COMPLETED'
              ? BadgeVariant.completed
              : BadgeVariant.upcoming,
          alignStart: true,
          children: [
            Text(
              date.isNotEmpty ? '$type • $date' : type,
              style: AppTypography.h4(
                color: p.textPrimary,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            AppCard(
              padding: AppSpacing.paddingXl,
              child: Column(
                children: List.generate(timeline.length, (index) {
                  final item = timeline[index];
                  final isLast = index == timeline.length - 1;

                  return EmployeeEntrance(
                    delay: Duration(milliseconds: (index * 55).clamp(0, 330)),
                    child: IntrinsicHeight(
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Column(
                            children: [
                              Container(
                                width: 22,
                                height: 22,
                                decoration: const BoxDecoration(
                                  color: AppColors.success,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.check,
                                    size: 14, color: Colors.white),
                              ),
                              if (!isLast)
                                Expanded(
                                  child: Container(
                                    width: 2,
                                    color: AppColors.success.withAlpha(102),
                                    margin: const EdgeInsets.symmetric(
                                      vertical: AppSpacing.xs,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(width: AppSpacing.md + 2),
                          Expanded(
                            child: Padding(
                              padding: EdgeInsets.only(
                                bottom: isLast ? 0 : AppSpacing.xl,
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item['event'] ?? '',
                                    style: AppTypography.bodyMedium(
                                      color: p.textPrimary,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    item['time'] ?? '',
                                    style: AppTypography.caption(
                                      color: p.textSecondary,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              ),
            ),
            const SizedBox(height: AppSpacing.xxxl),
            EmployeePrimaryButton(
              label: 'Driver & Vehicle Details',
              icon: Icons.person_pin_rounded,
              onPressed: () => context.push(AppRoutes.tripDriverVehicle),
            ),
          ],
        );
      },
    );
  }
}
