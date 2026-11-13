import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/illustrations/trip_illustrations.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';

class TripCancelledScreen extends StatelessWidget {
  const TripCancelledScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => MockDataService.getTrip('cancelled'),
      builder: (context, trip) {
        final p = EmployeePalette.of(context);

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
              subtitle: trip['message'] ??
                  'This trip has been cancelled as per your request.',
            ),
            const SizedBox(height: AppSpacing.xxxl),
            TripInfoCard(
              items: [
                TripInfoItem(
                  icon: Icons.location_on_outlined,
                  label: 'Pickup Point',
                  value: trip['pickupPoint'] ?? 'Home - Hitech City',
                ),
                TripInfoItem(
                  icon: Icons.access_time_rounded,
                  label: 'Scheduled Time',
                  value: trip['scheduledTime'] ?? '8:15 AM',
                ),
                TripInfoItem(
                  icon: Icons.cancel_outlined,
                  label: 'Cancelled At',
                  value: trip['cancelledAt'] ?? 'Today, 7:42 AM',
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
