import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/trip_illustrations.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

class TripCancelledScreen extends StatelessWidget {
  const TripCancelledScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () async {
        final data = maybeEmployeeData(context);
        if (data == null) return const {};
        final history = await data.loadTripsHistory(limit: 20);
        return history.firstWhere(
          (t) =>
              (t['status'] ?? t['routeStatus'] ?? '').toString().toUpperCase() ==
              'CANCELLED',
          orElse: () => history.isNotEmpty ? history.first : const {},
        );
      },
      builder: (context, trip) {
        final p = EmployeePalette.of(context);
        final pickupPoint = trip['pickupAddress']?.toString() ?? 'Pickup point';
        final scheduledTime = EmployeeDataProvider.formatDisplayTime(
          trip['plannedEta']?.toString() ?? trip['shiftTime']?.toString(),
        );
        final reason = trip['noShowReason']?.toString() ??
            'This trip has been cancelled as per your request.';

        return TripStageScaffold(
          title: "Today's Pickup",
          statusLabel: 'Cancelled',
          statusVariant: BadgeVariant.cancelled,
          children: [
            const SizedBox(height: AppSpacing.sm),
            const TripCancelledBadge(),
            const SizedBox(height: AppSpacing.xxl),
            TripHeadline(
              title: 'Trip Cancelled',
              subtitle: reason,
            ),
            const SizedBox(height: AppSpacing.xxxl),
            TripInfoCard(
              items: [
                TripInfoItem(
                  icon: Icons.location_on_outlined,
                  label: 'Pickup Point',
                  value: pickupPoint,
                ),
                TripInfoItem(
                  icon: Icons.access_time_rounded,
                  label: 'Scheduled Time',
                  value: scheduledTime.isNotEmpty ? scheduledTime : 'Cancelled',
                ),
                const TripInfoItem(
                  icon: Icons.cancel_outlined,
                  label: 'Status',
                  value: 'Cancelled',
                  valueColor: AppColors.error,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xxxl + 4),
            EmployeeSecondaryButton(
              label: 'Back to Home',
              textColor: p.accent,
              borderColor: p.accent,
              onPressed: () => context.go(AppRoutes.homeUpcomingPickup),
            ),
          ],
        );
      },
    );
  }
}
