import 'package:flutter/material.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import '../widgets/incident_form.dart';

class RaiseComplaintScreen extends StatefulWidget {
  const RaiseComplaintScreen({super.key});

  @override
  State<RaiseComplaintScreen> createState() => _RaiseComplaintScreenState();
}

class _RaiseComplaintScreenState extends State<RaiseComplaintScreen> {
  static const _categories = [
    'Driver Behavior',
    'AC / Vehicle Cleanliness',
    'Rash Driving',
    'Billing / Roster Issue',
    'Safety Escort Missing',
    'Other Concern',
  ];
  String _category = _categories.first;

  @override
  Widget build(BuildContext context) {
    return IncidentFormScreen(
      title: 'Raise a Complaint',
      topFields: (context) => [
        const FormFieldLabel('Complaint Category *'),
        FormSelectField(
          value: _category,
          options: _categories,
          onChanged: (v) => setState(() => _category = v),
        ),
        const SizedBox(height: AppSpacing.xl),
        const FormFieldLabel('Trip (Optional)'),
        const FormValueBox(
          icon: Icons.directions_car_filled_rounded,
          title: 'Login (Pickup)',
          subtitle: 'Tue, 09 Dec, 8:15 AM',
        ),
        const SizedBox(height: AppSpacing.xl),
      ],
      descriptionLabel: 'Details *',
      descriptionHint: 'e.g. Driver was rude during pickup.',
      submitLabel: 'Submit Complaint',
      submittedMessage: 'Complaint submitted to Transport Manager.',
    );
  }
}
