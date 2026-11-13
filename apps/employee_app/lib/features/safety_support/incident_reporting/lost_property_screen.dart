import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/illustrations/safety_illustrations.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import '../widgets/incident_form.dart';

class LostPropertyScreen extends StatelessWidget {
  const LostPropertyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return IncidentFormScreen(
      title: 'Lost Property',
      header: const Center(child: LostPropertyBadge()),
      intro: 'Report a lost item from your trip.',
      topFields: (context) => const [
        FormFieldLabel('Trip Details *'),
        FormValueBox(
          icon: Icons.apartment_rounded,
          title: 'Office Drop',
          subtitle: 'Tue, 09 Dec, 6:30 PM',
        ),
        SizedBox(height: AppSpacing.xl),
      ],
      descriptionLabel: 'Item Details *',
      descriptionHint:
          'Describe your lost item (color, brand, distinguishing marks)…',
      mediaLabel: 'Upload Photo (Optional)',
      submitLabel: 'Submit Request',
      submittedMessage: 'Lost property ticket submitted. Cab driver alerted.',
    );
  }
}
