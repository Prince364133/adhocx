import 'package:flutter/material.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/trip_widgets.dart';

class TripPlanningScreen extends StatelessWidget {
  const TripPlanningScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => MockDataService.getTrip('planning'),
      builder: (context, trip) {
        final p = EmployeePalette.of(context);

        return TripStageScaffold(
          title: "Today's Pickup",
          statusLabel: 'Planning',
          statusVariant: BadgeVariant.pending,
          children: [
            Text(
              trip['message'] ??
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
                  value: trip['pickupPoint'] ?? 'Home - Hitech City',
                ),
                TripInfoItem(
                  icon: Icons.access_time_rounded,
                  label: 'Pickup Time',
                  value: trip['pickupTime'] ?? '8:15 AM',
                ),
                TripInfoItem(
                  icon: Icons.calendar_today_rounded,
                  label: 'Shift',
                  value: trip['shift'] ?? 'Login Shift (09:00 AM)',
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
