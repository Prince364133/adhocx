import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/driver_illustrations.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import '../widgets/driver_widgets.dart';

/// Screen 13: No Cab Available
class NoCabAvailableScreen extends StatelessWidget {
  const NoCabAvailableScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadAssignmentSection('no_cab_available'),
      builder: (context, data) => EmployeeCenteredLayout(
        appBar: const EmployeeAppBar(),
        illustration: const NoCabAvailableGraphic(),
        illustrationGap: AppSpacing.xl,
        title: data['title'] ?? 'No Cab Available',
        message: data['message'] ??
            "We couldn't assign a cab for your trip at the moment. Our team is working to find an alternate option. You'll be notified once assigned.",
        actions: [
          EmployeePrimaryButton(
            label: 'Retry',
            icon: Icons.refresh_rounded,
            onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Checking cab availability...')),
            ),
          ),
          const ContactSupportButton(),
        ],
      ),
    );
  }
}
