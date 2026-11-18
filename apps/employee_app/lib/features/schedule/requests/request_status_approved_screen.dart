import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/schedule_illustrations.dart';
import '../widgets/schedule_widgets.dart';

class RequestStatusApprovedScreen extends StatelessWidget {
  final Map<String, dynamic>? request;

  const RequestStatusApprovedScreen({super.key, this.request});

  @override
  Widget build(BuildContext context) {
    Map<String, dynamic>? extra;
    try {
      final raw = GoRouterState.of(context).extra;
      if (raw is Map) extra = Map<String, dynamic>.from(raw);
    } catch (_) {}
    final data = request ?? extra ?? const <String, dynamic>{};

    return EmployeeCenteredLayout(
      appBar: const EmployeeAppBar(),
      illustration: const RequestApprovedBadge(),
      title: 'Change Request\nApproved',
      message: data['message']?.toString() ??
          'Your schedule change request has been approved for the selected trip.',
      content: TripInfoCard(
        items: [
          TripInfoItem(
            icon: Icons.location_on_outlined,
            label: 'Updated Details',
            value: data['newLocation']?.toString() ??
                data['newValue']?.toString() ??
                'Applied to upcoming schedule',
          ),
          TripInfoItem(
            icon: Icons.calendar_month_outlined,
            label: 'Trip Date',
            value: data['tripDate']?.toString() ??
                formatScheduleDayLabel(DateTime.now()),
          ),
        ],
      ),
      actions: [
        EmployeePrimaryButton(
          label: 'View Updated Trip',
          onPressed: () => context.go(AppRoutes.homeUpcomingPickup),
        ),
      ],
    );
  }
}
