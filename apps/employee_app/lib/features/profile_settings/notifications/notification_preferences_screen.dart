import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

class NotificationPreferencesScreen extends StatefulWidget {
  const NotificationPreferencesScreen({super.key});

  @override
  State<NotificationPreferencesScreen> createState() =>
      _NotificationPreferencesScreenState();
}

class _NotificationPreferencesScreenState
    extends State<NotificationPreferencesScreen> {
  bool _tripUpdates = true;
  bool _scheduleChanges = true;
  bool _supportComplaints = true;
  bool _promotional = false;

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

    Widget toggle(String title, String subtitle, bool value,
        ValueChanged<bool>? onChanged) {
      return SwitchListTile.adaptive(
        title: Text(
          title,
          style: AppTypography.bodyMedium(
            color: p.textPrimary,
            fontWeight: FontWeight.w700,
          ),
        ),
        subtitle: Text(subtitle,
            style: AppTypography.caption(color: p.textSecondary)),
        value: value,
        onChanged: onChanged,
      );
    }

    return Scaffold(
      backgroundColor: p.background,
      appBar: const EmployeeAppBar(title: 'Notification Preferences'),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.xl),
          children: [
            AppCard(
              padding: EdgeInsets.zero,
              child: Material(
                color: Colors.transparent,
                child: Column(
                  children: [
                    toggle('Trip Updates', 'Cab assignment, ETA, status',
                        _tripUpdates, (v) => setState(() => _tripUpdates = v)),
                    Divider(height: 1, color: p.border),
                    toggle('Schedule Changes', 'Time, route or shift updates',
                        _scheduleChanges,
                        (v) => setState(() => _scheduleChanges = v)),
                    Divider(height: 1, color: p.border),
                    toggle('Support & Complaints',
                        'Ticket updates and resolutions', _supportComplaints,
                        (v) => setState(() => _supportComplaints = v)),
                    Divider(height: 1, color: p.border),
                    // Emergency alerts can't be silenced.
                    toggle('Safety & SOS',
                        'Always on — emergency and safety alerts', true, null),
                    Divider(height: 1, color: p.border),
                    toggle('Promotional Updates',
                        'New features and announcements', _promotional,
                        (v) => setState(() => _promotional = v)),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
