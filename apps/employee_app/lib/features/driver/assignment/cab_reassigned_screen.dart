import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/driver_illustrations.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import '../widgets/driver_widgets.dart';

/// Screen 6: Cab Reassignment
class CabReassignedScreen extends StatelessWidget {
  const CabReassignedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadAssignmentSection('reassigned_cab'),
      builder: (context, data) => EmployeeCenteredLayout(
        appBar: const EmployeeAppBar(),
        illustration: const CabReassignedBadge(),
        illustrationGap: AppSpacing.xl,
        title: 'Cab Reassigned',
        message: 'Your trip has been assigned to a new driver.',
        content: Column(
          children: [
            TripDriverRow(
              name: data['driverName'] ?? 'Amit Kumar',
              rating: '${(data['driverRating'] ?? 4.7).toDouble()}',
            ),
            const SizedBox(height: AppSpacing.md),
            TripVehicleCard(
              model: data['vehicleModel'] ?? 'Swift Dzire',
              plate: data['plateNumber'] ?? 'TS10UC9281',
              details:
                  '${data['vehicleColor'] ?? 'Silver'} • ${data['capacity'] ?? '5 Seater'}',
            ),
          ],
        ),
        actions: [
          EmployeePrimaryButton(
            label: 'View Trip Details',
            onPressed: () => context.push(AppRoutes.cabAssignedOverview),
          ),
        ],
      ),
    );
  }
}
