import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/schedule_illustrations.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/schedule_widgets.dart';

class ChangeRequestSubmittedScreen extends StatelessWidget {
  const ChangeRequestSubmittedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () async {
        final requests = await loadScheduleSection('change_requests');
        return requests?['pending'] as Map<String, dynamic>?;
      },
      builder: (context, data) {
        final p = EmployeePalette.of(context);

        return EmployeeCenteredLayout(
          appBar: const EmployeeAppBar(),
          illustration: const EmployeeEntrance(child: PaperPlaneSubmittedBadge()),
          title: 'Change Request\nSubmitted',
          message:
              "Your request to change pickup location has been received. You'll be notified once it's reviewed.",
          content: EmployeeEntrance(
            delay: const Duration(milliseconds: 100),
            child: TripInfoCard(
              items: [
                TripInfoItem(
                  icon: Icons.location_on_outlined,
                  label: 'New Pickup Location',
                  value: data['newLocation'] ?? 'Green Meadows, Kondapur',
                ),
                TripInfoItem(
                  icon: Icons.calendar_month_outlined,
                  label: 'For',
                  value: data['tripDate'] ?? 'Tue, 09 Dec 2026',
                ),
              ],
            ),
          ),
          actions: [
            EmployeeEntrance(
              delay: const Duration(milliseconds: 180),
              child: EmployeeSecondaryButton(
                label: 'View Request Status',
                textColor: p.accent,
                borderColor: p.accent,
                onPressed: () => context.push(AppRoutes.requestPending),
              ),
            ),
          ],
        );
      },
    );
  }
}
