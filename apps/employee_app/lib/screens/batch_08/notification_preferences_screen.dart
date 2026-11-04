import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';

/// Screen 10: Notification Preferences
class NotificationPreferencesScreen extends StatefulWidget {
  const NotificationPreferencesScreen({super.key});

  @override
  State<NotificationPreferencesScreen> createState() => _NotificationPreferencesScreenState();
}

class _NotificationPreferencesScreenState extends State<NotificationPreferencesScreen> {
  bool _tripUpdates = true;
  bool _scheduleChanges = true;
  bool _supportComplaints = true;
  bool _safetySos = true;
  bool _promotional = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: AppColors.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Notification Preferences',
          style: GoogleFonts.inter(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
          children: [
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: [
                  _buildToggleTile(
                    title: 'Trip Updates',
                    subtitle: 'Cab assignment, ETA, status',
                    value: _tripUpdates,
                    onChanged: (val) => setState(() => _tripUpdates = val),
                  ),
                  const Divider(height: 1),
                  _buildToggleTile(
                    title: 'Schedule Changes',
                    subtitle: 'Time, route or shift updates',
                    value: _scheduleChanges,
                    onChanged: (val) => setState(() => _scheduleChanges = val),
                  ),
                  const Divider(height: 1),
                  _buildToggleTile(
                    title: 'Support & Complaints',
                    subtitle: 'Ticket updates and resolutions',
                    value: _supportComplaints,
                    onChanged: (val) => setState(() => _supportComplaints = val),
                  ),
                  const Divider(height: 1),
                  _buildToggleTile(
                    title: 'Safety & SOS',
                    subtitle: 'Emergency and safety alerts',
                    value: _safetySos,
                    onChanged: (val) => setState(() => _safetySos = val),
                  ),
                  const Divider(height: 1),
                  _buildToggleTile(
                    title: 'Promotional Updates',
                    subtitle: 'New features and announcements',
                    value: _promotional,
                    onChanged: (val) => setState(() => _promotional = val),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildToggleTile({
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return SwitchListTile.adaptive(
      title: Text(
        title,
        style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
      ),
      subtitle: Text(
        subtitle,
        style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary),
      ),
      value: value,
      activeColor: AppColors.primaryBlue,
      onChanged: onChanged,
    );
  }
}

