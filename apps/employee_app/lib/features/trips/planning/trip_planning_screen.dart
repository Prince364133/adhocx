import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

class TripPlanningScreen extends StatelessWidget {
  const TripPlanningScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () async {
        final data = maybeEmployeeData(context);
        if (data == null) return const {};
        final next = await data.loadNextTrip();
        if (next != null && next['hasActiveTrip'] == true) return next;
        await data.loadSchedule();
        return data.scheduleItems.isNotEmpty
            ? data.scheduleItems.first
            : const {};
      },
      builder: (context, trip) {
        final p = EmployeePalette.of(context);
        final pickupLoc = trip['pickupLocation'] is Map
            ? (trip['pickupLocation'] as Map)['addressText']?.toString()
            : trip['pickupAddress']?.toString();
        final pickupTime = EmployeeDataProvider.formatDisplayTime(
          trip['plannedEta']?.toString() ??
              trip['pickupTime']?.toString() ??
              trip['shiftTime']?.toString(),
        );
        final direction = EmployeeDataProvider.formatDirectionLabel(
          trip['direction']?.toString(),
        );
        final shiftTime = EmployeeDataProvider.formatDisplayTime(
          trip['shiftTime']?.toString(),
        );

        return TripStageScaffold(
          title: "Today's Pickup",
          statusLabel: 'Planning',
          statusVariant: BadgeVariant.pending,
          children: [
            Text(
              trip['message']?.toString() ??
                  'We are planning your trip. Your cab will be assigned soon.',
              textAlign: TextAlign.center,
              style: AppTypography.body(color: p.textSecondary),
            ),
            const SizedBox(height: AppSpacing.xxl + 4),
            const EmployeeStepTracker(currentStep: TripStep.planning),
            const SizedBox(height: AppSpacing.xxxl),
            TripInfoCard(
              items: [
                TripInfoItem(
                  icon: Icons.location_on_outlined,
                  label: 'Pickup Point',
                  value: pickupLoc?.isNotEmpty == true
                      ? pickupLoc!
                      : 'Pending assignment',
                ),
                TripInfoItem(
                  icon: Icons.access_time_rounded,
                  label: 'Pickup Time',
                  value: pickupTime.isNotEmpty ? pickupTime : 'To be confirmed',
                ),
                TripInfoItem(
                  icon: Icons.calendar_today_rounded,
                  label: 'Shift',
                  value: shiftTime.isNotEmpty
                      ? '$direction ($shiftTime)'
                      : direction,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xxl + 4),
            const TripInfoNote(
              text: "You'll be notified once a cab is assigned.",
            ),
          ],
        );
      },
    );
  }
}
