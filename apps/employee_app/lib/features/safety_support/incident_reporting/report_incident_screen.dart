import 'package:flutter/material.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import '../widgets/incident_form.dart';

class ReportIncidentScreen extends StatefulWidget {
  const ReportIncidentScreen({super.key});

  @override
  State<ReportIncidentScreen> createState() => _ReportIncidentScreenState();
}

class _ReportIncidentScreenState extends State<ReportIncidentScreen> {
  static const _types = [
    'Unsafe Driving',
    'Route Deviation',
    'Driver Misconduct',
    'Vehicle Breakdown',
    'Late Arrival',
    'Other Issue',
  ];
  String _type = _types.first;

  @override
  Widget build(BuildContext context) {
    return IncidentFormScreen(
      title: 'Report an Incident',
      intro: 'Tell us what happened during your trip.',
      topFields: (context) => [
        const FormFieldLabel('Incident Type *'),
        FormSelectField(
          value: _type,
          options: _types,
          onChanged: (v) => setState(() => _type = v),
        ),
        const SizedBox(height: AppSpacing.xl),
        const FormFieldLabel('When did it happen? *'),
        const FormValueBox(
          icon: Icons.calendar_today_rounded,
          title: 'Tue, 09 Dec 2026',
        ),
        const SizedBox(height: AppSpacing.xl),
      ],
      descriptionLabel: 'Description *',
      descriptionHint: 'e.g. Driver was overspeeding on the main road.',
      mediaIcons: const [
        Icons.image_outlined,
        Icons.play_circle_outline_rounded,
      ],
      submitLabel: 'Submit Report',
      submittedMessage: 'Incident reported successfully. Ticket created.',
    );
  }
}
