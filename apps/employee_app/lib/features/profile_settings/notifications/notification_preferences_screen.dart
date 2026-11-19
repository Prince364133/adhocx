import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

class NotificationPreferencesScreen extends StatefulWidget {
  const NotificationPreferencesScreen({super.key});

  static const String keyTripUpdates = 'adhocx_notif_trip_updates';
  static const String keyScheduleChanges = 'adhocx_notif_schedule_changes';
  static const String keySupportComplaints = 'adhocx_notif_support_complaints';
  static const String keyPromotional = 'adhocx_notif_promotional';

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
  void initState() {
    super.initState();
    _loadPreferences();
  }

  Future<void> _loadPreferences() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (!mounted) return;
      setState(() {
        _tripUpdates =
            prefs.getBool(NotificationPreferencesScreen.keyTripUpdates) ?? true;
        _scheduleChanges =
            prefs.getBool(NotificationPreferencesScreen.keyScheduleChanges) ??
                true;
        _supportComplaints =
            prefs.getBool(NotificationPreferencesScreen.keySupportComplaints) ??
                true;
        _promotional =
            prefs.getBool(NotificationPreferencesScreen.keyPromotional) ??
                false;
      });
    } catch (_) {}
  }

  Future<void> _updatePreference(String key, bool value) async {
    setState(() {
      switch (key) {
        case NotificationPreferencesScreen.keyTripUpdates:
          _tripUpdates = value;
          break;
        case NotificationPreferencesScreen.keyScheduleChanges:
          _scheduleChanges = value;
          break;
        case NotificationPreferencesScreen.keySupportComplaints:
          _supportComplaints = value;
          break;
        case NotificationPreferencesScreen.keyPromotional:
          _promotional = value;
          break;
      }
    });

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(key, value);
    } catch (_) {}

    if (!mounted) return;
    final data = maybeEmployeeData(context);
    if (data != null) {
      try {
        await data.repository.updateNotificationPreferences({
          'tripUpdates': _tripUpdates,
          'scheduleChanges': _scheduleChanges,
          'supportComplaints': _supportComplaints,
          'safetySos': true,
          'promotional': _promotional,
        });
      } catch (_) {
        // Local preferences remain persisted even if backend sync fails.
      }
    }
  }

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
                    toggle(
                      'Trip Updates',
                      'Cab assignment, ETA, status',
                      _tripUpdates,
                      (v) => _updatePreference(
                        NotificationPreferencesScreen.keyTripUpdates,
                        v,
                      ),
                    ),
                    Divider(height: 1, color: p.border),
                    toggle(
                      'Schedule Changes',
                      'Time, route or shift updates',
                      _scheduleChanges,
                      (v) => _updatePreference(
                        NotificationPreferencesScreen.keyScheduleChanges,
                        v,
                      ),
                    ),
                    Divider(height: 1, color: p.border),
                    toggle(
                      'Support & Complaints',
                      'Ticket updates and resolutions',
                      _supportComplaints,
                      (v) => _updatePreference(
                        NotificationPreferencesScreen.keySupportComplaints,
                        v,
                      ),
                    ),
                    Divider(height: 1, color: p.border),
                    // Emergency alerts can't be silenced.
                    toggle('Safety & SOS',
                        'Always on — emergency and safety alerts', true, null),
                    Divider(height: 1, color: p.border),
                    toggle(
                      'Promotional Updates',
                      'New features and announcements',
                      _promotional,
                      (v) => _updatePreference(
                        NotificationPreferencesScreen.keyPromotional,
                        v,
                      ),
                    ),
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
