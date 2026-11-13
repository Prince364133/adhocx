import 'package:flutter/material.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';

class TripAssignedScreen extends StatelessWidget {
  const TripAssignedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => MockDataService.getTrip('assigned'),
      builder: (context, trip) {
        final driver = trip['driver'] as Map<String, dynamic>?;
        final vehicleColor = driver?['vehicleColor'] ?? 'White';
        final capacity = driver?['capacity'] ?? '7 Seater';

        return TripStageScaffold(
          title: "Today's Pickup",
          statusLabel: 'Assigned',
          statusVariant: BadgeVariant.approved,
          children: [
            TripDriverRow(
              name: driver?['name'] ?? 'Suresh R',
              rating: (driver?['rating'] ?? 4.8).toString(),
            ),
            const SizedBox(height: AppSpacing.md + 2),
            TripVehicleCard(
              model: driver?['vehicleModel'] ?? 'Maruti Ertiga',
              plate: driver?['vehicleNumber'] ?? 'TS09UB7845',
              details: '$vehicleColor • $capacity',
            ),
            const SizedBox(height: AppSpacing.xxl),
            const EmployeeStepTracker(currentStep: TripStep.assigned),
            const SizedBox(height: AppSpacing.xxl),
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
              ],
            ),
          ],
        );
      },
    );
  }
}
