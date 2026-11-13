import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/illustrations/schedule_illustrations.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

class ScheduleNoTripsScreen extends StatelessWidget {
  const ScheduleNoTripsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

    return EmployeeCenteredLayout(
      appBar: const EmployeeAppBar(),
      illustration: const CalendarNoTripsBadge(),
      title: 'No Scheduled Trips',
      message: "You don't have any transport scheduled for this date.",
      actions: [
        EmployeeSecondaryButton(
          label: 'Go to Calendar',
          icon: Icons.calendar_month_outlined,
          textColor: p.accent,
          borderColor: p.accent,
          onPressed: () => context.go(AppRoutes.scheduleMonthly),
        ),
      ],
    );
  }
}
