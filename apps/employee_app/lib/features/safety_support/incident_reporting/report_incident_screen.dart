import 'package:flutter/material.dart';
import 'package:adhocx_employee/features/schedule/widgets/schedule_widgets.dart';
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

  String get _apiCategory {
    switch (_type) {
      case 'Route Deviation':
        return 'ROUTE_ISSUE';
      case 'Driver Misconduct':
        return 'DRIVER_BEHAVIOR';
      case 'Vehicle Breakdown':
        return 'VEHICLE_CONDITION';
      case 'Late Arrival':
        return 'CAB_DELAY';
      case 'Unsafe Driving':
        return 'SAFETY_CONCERN';
      default:
        return 'OTHER';
    }
  }

  @override
  Widget build(BuildContext context) {
    final todayLabel = formatScheduleDayLabel(DateTime.now());
    return IncidentFormScreen(
      title: 'Report an Incident',
      intro: 'Tell us what happened during your trip.',
      ticketCategory: _apiCategory,
      ticketSubject: 'Incident: $_type',
      ticketPriority: _type == 'Unsafe Driving' ? 'HIGH' : 'MEDIUM',
      topFields: (context) => [
        const FormFieldLabel('Incident Type *'),
        FormSelectField(
          value: _type,
          options: _types,
          onChanged: (v) => setState(() => _type = v),
        ),
        const SizedBox(height: AppSpacing.xl),
        const FormFieldLabel('Incident Date'),
        FormValueBox(
          icon: Icons.calendar_today_rounded,
          title: todayLabel,
        ),
        const SizedBox(height: AppSpacing.xl),
      ],
      descriptionLabel: 'Description *',
      descriptionHint: 'Describe what happened during your trip...',
      mediaIcons: const [
        Icons.image_outlined,
        Icons.play_circle_outline_rounded,
      ],
      submitLabel: 'Submit Report',
      submittedMessage: 'Incident reported successfully. Ticket created.',
    );
  }
}
