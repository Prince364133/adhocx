import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/schedule_illustrations.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/schedule_widgets.dart';

class ChangeRequestSubmittedScreen extends StatelessWidget {
  final Map<String, dynamic>? request;

  const ChangeRequestSubmittedScreen({super.key, this.request});

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    final requestType =
        request?['requestType']?.toString() ?? 'Change Pickup Location';
    final newValue = request?['newValue']?.toString() ??
        request?['newLocation']?.toString() ??
        'Updated details submitted';
    final tripDate = request?['tripDate']?.toString() ??
        formatScheduleDayLabel(DateTime.now());
    final changeDescription =
        requestType.replaceFirst('Change ', '').toLowerCase();

    return EmployeeCenteredLayout(
      appBar: const EmployeeAppBar(),
      illustration:
          const EmployeeEntrance(child: PaperPlaneSubmittedBadge()),
      title: 'Change Request\nSubmitted',
      message:
          "Your request to change $changeDescription has been received. "
          "You'll be notified once it's reviewed.",
      content: EmployeeEntrance(
        delay: const Duration(milliseconds: 100),
        child: TripInfoCard(
          items: [
            TripInfoItem(
              icon: Icons.location_on_outlined,
              label: requestType.replaceFirst('Change ', 'New '),
              value: newValue,
            ),
            TripInfoItem(
              icon: Icons.calendar_month_outlined,
              label: 'For',
              value: tripDate,
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
            onPressed: () => context.push(
              AppRoutes.requestPending,
              extra: request,
            ),
          ),
        ),
      ],
    );
  }
}
