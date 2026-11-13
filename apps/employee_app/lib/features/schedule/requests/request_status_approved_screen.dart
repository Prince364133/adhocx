import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/schedule_illustrations.dart';
import '../widgets/schedule_widgets.dart';

class RequestStatusApprovedScreen extends StatelessWidget {
  const RequestStatusApprovedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () async {
        final requests = await loadScheduleSection('change_requests');
        return requests?['approved'] as Map<String, dynamic>?;
      },
      builder: (context, data) => EmployeeCenteredLayout(
        appBar: const EmployeeAppBar(),
        illustration: const RequestApprovedBadge(),
        title: 'Change Request\nApproved',
        message: data['message'] ??
            'Your pickup location has been updated for the selected trip.',
        content: TripInfoCard(
          items: [
            TripInfoItem(
              icon: Icons.location_on_outlined,
              label: 'New Pickup Location',
              value: data['newLocation'] ?? 'Green Meadows, Kondapur',
            ),
            TripInfoItem(
              icon: Icons.calendar_month_outlined,
              label: 'Trip Date',
              value: data['tripDate'] ?? 'Tue, 09 Dec 2026',
            ),
          ],
        ),
        actions: [
          EmployeePrimaryButton(
            label: 'View Updated Trip',
            onPressed: () => context.go(AppRoutes.homeUpcomingPickup),
          ),
        ],
      ),
    );
  }
}
