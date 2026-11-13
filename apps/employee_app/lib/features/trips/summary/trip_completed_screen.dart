import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/illustrations/trip_illustrations.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import '../widgets/trip_widgets.dart';

class TripCompletedScreen extends StatelessWidget {
  const TripCompletedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => MockDataService.getTrip('completed'),
      builder: (context, trip) {
        return TripStageScaffold(
          title: "Today's Trip",
          statusLabel: 'Completed',
          statusVariant: BadgeVariant.completed,
          children: [
            const SizedBox(height: AppSpacing.sm),
            const TripCompletedBadge(),
            const SizedBox(height: AppSpacing.xxl),
            const TripHeadline(
              title: 'Trip Completed!',
              subtitle: 'You have reached your destination.',
            ),
            const SizedBox(height: AppSpacing.xxxl),
            TripInfoCard(
              items: [
                TripInfoItem(
                  icon: Icons.apartment_rounded,
                  label: 'Office',
                  value: trip['destination'] ?? 'HITEC City Office',
                ),
                TripInfoItem(
                  icon: Icons.access_time_rounded,
                  label: 'Drop Time',
                  value: trip['dropTime'] ?? '9:02 AM',
                ),
                TripInfoItem(
                  icon: Icons.timer_outlined,
                  label: 'Trip Duration',
                  value: trip['duration'] ?? '47 min',
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xxxl + 4),
            EmployeePrimaryButton(
              label: 'Provide Feedback',
              icon: Icons.star_border_rounded,
              // Post-trip rating form (was wrongly the trip timeline).
              onPressed: () => context.push(AppRoutes.postTripFeedback),
            ),
            const SizedBox(height: AppSpacing.md),
            EmployeeTextLink(
              label: 'View Trip Details',
              onPressed: () => context.push(AppRoutes.tripDetails),
            ),
          ],
        );
      },
    );
  }
}
