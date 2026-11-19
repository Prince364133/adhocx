import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/driver_illustrations.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';

/// Cab Reassignment screen backed by live nextTrip + tracking APIs.
class CabReassignedScreen extends StatelessWidget {
  const CabReassignedScreen({super.key});

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
        final rating = driver?['rating']?.toString() ?? 'Verified';
        final model = vehicle?['model']?.toString() ??
            vehicle?['vehicleType']?.toString() ??
            'Vehicle pending';
        final plate = vehicle?['registrationNumber']?.toString() ??
            vehicle?['plateNumber']?.toString() ??
            'Pending';

        return EmployeeCenteredLayout(
          appBar: const EmployeeAppBar(),
          illustration: const CabReassignedBadge(),
          illustrationGap: AppSpacing.xl,
          title: 'Cab Reassigned',
          message: 'Your trip has been assigned to a new driver.',
          content: Column(
            children: [
              TripDriverRow(
                name: driverName,
                rating: rating,
              ),
              const SizedBox(height: AppSpacing.md),
              TripVehicleCard(
                model: model,
                plate: plate,
                details: vehicle?['category']?.toString() ?? 'Corporate Cab',
              ),
            ],
          ),
          actions: [
            EmployeePrimaryButton(
              label: 'View Trip Details',
              onPressed: () => context.push(AppRoutes.cabAssignedOverview),
            ),
          ],
        );
      },
    );
  }
}
