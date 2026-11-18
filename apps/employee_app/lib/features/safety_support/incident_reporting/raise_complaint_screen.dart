import 'package:flutter/material.dart';
import 'package:adhocx_employee/features/schedule/widgets/schedule_widgets.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
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

  String get _apiCategory {
    switch (_category) {
      case 'Driver Behavior':
        return 'DRIVER_BEHAVIOR';
      case 'AC / Vehicle Cleanliness':
        return 'VEHICLE_CONDITION';
      case 'Rash Driving':
      case 'Safety Escort Missing':
        return 'SAFETY_CONCERN';
      case 'Billing / Roster Issue':
        return 'BILLING';
      default:
        return 'OTHER';
    }
  }

  @override
  Widget build(BuildContext context) {
    final data = maybeEmployeeData(context);
    final nextTrip = data?.hasActiveTrip == true ? data!.nextTrip : null;
    final tripTitle = nextTrip != null
        ? EmployeeDataProvider.formatDirectionLabel(
            nextTrip['direction']?.toString(),
          )
        : 'Current Commute Roster';
    final tripSubtitle = nextTrip != null
        ? [
            EmployeeDataProvider.formatDisplayDate(
                nextTrip['shiftDate']?.toString()),
            EmployeeDataProvider.formatDisplayTime(
                nextTrip['plannedEta']?.toString() ??
                    nextTrip['shiftTime']?.toString()),
          ].where((s) => s.isNotEmpty).join(' • ')
        : formatScheduleDayLabel(DateTime.now());

    return IncidentFormScreen(
      title: 'Raise a Complaint',
      ticketCategory: _apiCategory,
      ticketSubject: 'Complaint: $_category',
      topFields: (context) => [
        const FormFieldLabel('Complaint Category *'),
        FormSelectField(
          value: _category,
          options: _categories,
          onChanged: (v) => setState(() => _category = v),
        ),
        const SizedBox(height: AppSpacing.xl),
        const FormFieldLabel('Related Trip'),
        FormValueBox(
          icon: Icons.directions_car_filled_rounded,
          title: tripTitle,
          subtitle: tripSubtitle,
        ),
        const SizedBox(height: AppSpacing.xl),
      ],
      descriptionLabel: 'Details *',
      descriptionHint: 'Share details of your concern...',
      submitLabel: 'Submit Complaint',
      submittedMessage: 'Complaint submitted to Transport Manager.',
    );
  }
}
