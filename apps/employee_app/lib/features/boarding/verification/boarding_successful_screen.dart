import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/boarding_illustrations.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/boarding_widgets.dart';

/// Screen 5: Boarding Successful
class BoardingSuccessfulScreen extends StatelessWidget {
  const BoardingSuccessfulScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadBoardingSection('boarding_confirmed'),
      builder: (context, data) {
        final p = EmployeePalette.of(context);

        return EmployeeCenteredLayout(
          illustration: const BoardingSuccessBadge(),
          illustrationGap: AppSpacing.xxl,
          title: data['title'] ?? 'Boarding Confirmed!',
          message: data['subtitle'] ?? "You're now on board.",
          content: AppCard(
            width: double.infinity,
            padding: AppSpacing.paddingXl,
            child: Column(
              children: [
                BoardingTimelineRow(
                  title: 'Picked Up',
                  time: data['pickedUp'] ?? '8:15 AM',
                  isDone: true,
                ),
                Divider(color: p.border, height: AppSpacing.xxl),
                BoardingTimelineRow(
                  title: 'Boarded',
                  time: data['boarded'] ?? '8:17 AM',
                  isDone: true,
                ),
                Divider(color: p.border, height: AppSpacing.xxl),
                BoardingTimelineRow(
                  title: 'In Progress',
                  time: data['inProgress'] ?? 'On the way to office',
                  isDone: false,
                ),
              ],
            ),
          ),
          actions: [
            EmployeePrimaryButton(
              label: 'Track Trip',
              icon: Icons.my_location_rounded,
              onPressed: () => context.push(AppRoutes.tripInProgressEnRoute),
            ),
          ],
        );
      },
    );
  }
}
