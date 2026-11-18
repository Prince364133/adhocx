import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/driver_illustrations.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import '../widgets/driver_widgets.dart';

/// No Cab Available screen.
class NoCabAvailableScreen extends StatelessWidget {
  const NoCabAvailableScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return EmployeeCenteredLayout(
      appBar: const EmployeeAppBar(),
      illustration: const NoCabAvailableGraphic(),
      illustrationGap: AppSpacing.xl,
      title: 'No Cab Available',
      message:
          "We couldn't assign a cab for your trip at the moment. Our team is working to find an alternate option. You'll be notified once assigned.",
      actions: [
        EmployeePrimaryButton(
          label: 'Retry',
          icon: Icons.refresh_rounded,
          onPressed: () async {
            final data = maybeEmployeeData(context);
            await data?.loadNextTrip(force: true);
            if (!context.mounted) return;
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Refreshed cab availability.')),
            );
          },
        ),
        const ContactSupportButton(),
      ],
    );
  }
}
