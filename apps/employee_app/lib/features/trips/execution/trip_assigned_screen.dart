import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';

class TripAssignedScreen extends StatelessWidget {
  const TripAssignedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadLiveTripSnapshot(context),
      builder: (context, snapshot) {
        final next = (snapshot['nextTrip'] as Map<String, dynamic>?) ?? const {};
        final tracking =
            (snapshot['tracking'] as Map<String, dynamic>?) ?? const {};
        final driver = (tracking['driver'] ?? next['driver']) as Map?;
        final vehicle = (tracking['vehicle'] ?? next['vehicle']) as Map?;

        final driverName = driver?['fullName']?.toString() ??
            driver?['name']?.toString() ??
            'Not yet assigned';
        final driverRating = driver?['rating']?.toString() ?? 'Verified';
        final model = vehicle?['model']?.toString() ??
            vehicle?['vehicleType']?.toString() ??
            'Pending assignment';
        final plate = vehicle?['registrationNumber']?.toString() ??
            vehicle?['plateNumber']?.toString() ??
            'Pending';
        final detailsParts = [
          if (vehicle?['color'] != null &&
              vehicle!['color'].toString().isNotEmpty)
            vehicle['color'].toString(),
          if (vehicle?['category'] != null &&
              vehicle!['category'].toString().isNotEmpty)
            vehicle['category'].toString(),
          if (vehicle?['vehicleType'] != null &&
              vehicle!['vehicleType'].toString().isNotEmpty)
            vehicle['vehicleType'].toString(),
        ];
        final pickupLoc = next['pickupLocation'] is Map
            ? (next['pickupLocation'] as Map)['addressText']?.toString()
            : null;
        final pickupTime = EmployeeDataProvider.formatDisplayTime(
          next['plannedEta']?.toString() ?? next['shiftTime']?.toString(),
        );

        return TripStageScaffold(
          title: "Today's Pickup",
          statusLabel: 'Assigned',
          statusVariant: BadgeVariant.approved,
          children: [
            TripDriverRow(
              name: driverName,
              rating: driverRating,
            ),
            const SizedBox(height: AppSpacing.md + 2),
            TripVehicleCard(
              model: model,
              plate: plate,
              details: detailsParts.isNotEmpty
                  ? detailsParts.join(' • ')
                  : 'Corporate Cab',
            ),
            const SizedBox(height: AppSpacing.xxl),
            const EmployeeStepTracker(currentStep: TripStep.assigned),
            const SizedBox(height: AppSpacing.xxl),
            TripInfoCard(
              items: [
                TripInfoItem(
                  icon: Icons.location_on_outlined,
                  label: 'Pickup Point',
                  value: pickupLoc?.isNotEmpty == true
                      ? pickupLoc!
                      : 'Not yet assigned',
                ),
                TripInfoItem(
                  icon: Icons.access_time_rounded,
                  label: 'Pickup Time',
                  value: pickupTime.isNotEmpty ? pickupTime : 'Pending',
                ),
              ],
            ),
          ],
        );
      },
    );
  }
}
