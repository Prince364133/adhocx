import 'package:flutter/material.dart';
import 'package:adhocx_employee/features/schedule/widgets/schedule_widgets.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/safety_illustrations.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import '../widgets/incident_form.dart';

class LostPropertyScreen extends StatelessWidget {
  const LostPropertyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final data = maybeEmployeeData(context);
    final recentTrip = data?.tripsHistory.isNotEmpty == true
        ? data!.tripsHistory.first
        : (data?.hasActiveTrip == true ? data!.nextTrip : null);
    final tripTitle = recentTrip != null
        ? EmployeeDataProvider.formatDirectionLabel(
            recentTrip['direction']?.toString(),
          )
        : 'Recent Commute Trip';
    final tripSubtitle = recentTrip != null
        ? [
            EmployeeDataProvider.formatDisplayDate(
                recentTrip['shiftDate']?.toString()),
            EmployeeDataProvider.formatDisplayTime(
                recentTrip['shiftTime']?.toString()),
          ].where((s) => s.isNotEmpty).join(' • ')
        : formatScheduleDayLabel(DateTime.now());

    return IncidentFormScreen(
      title: 'Lost Property',
      header: const Center(child: LostPropertyBadge()),
      intro: 'Report a lost item from your trip.',
      ticketCategory: 'LOST_ITEM',
      ticketSubject: 'Lost Property Report',
      topFields: (context) => [
        const FormFieldLabel('Trip Details'),
        FormValueBox(
          icon: Icons.apartment_rounded,
          title: tripTitle,
          subtitle: tripSubtitle,
        ),
        const SizedBox(height: AppSpacing.xl),
      ],
      descriptionLabel: 'Item Details *',
      descriptionHint:
          'Describe your lost item (color, brand, distinguishing marks)…',
      mediaLabel: 'Upload Photo (Optional)',
      submitLabel: 'Submit Request',
      submittedMessage: 'Lost property ticket submitted. Support team alerted.',
    );
  }
}
