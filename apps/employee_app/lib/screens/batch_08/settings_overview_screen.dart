import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../routes/app_routes.dart';

/// Screen 8: Settings
class SettingsOverviewScreen extends StatefulWidget {
  const SettingsOverviewScreen({super.key});

  @override
  State<SettingsOverviewScreen> createState() => _SettingsOverviewScreenState();
}

class _SettingsOverviewScreenState extends State<SettingsOverviewScreen> {
  bool _biometricLogin = true;

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
          'Settings',
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
                  _buildSettingTile(
                    icon: Icons.tune_rounded,
                    title: 'App Preferences',
                    onTap: () {},
                  ),
                  const Divider(height: 1),
                  _buildSettingTile(
                    icon: Icons.notifications_outlined,
                    title: 'Notifications',
                    onTap: () => context.push(AppRoutes.notificationPreferences),
                  ),
                  const Divider(height: 1),
                  _buildSettingTile(
                    icon: Icons.language_rounded,
                    title: 'Language',
                    trailingText: 'English',
                    onTap: () => context.push(AppRoutes.selectLanguage),
                  ),
                  const Divider(height: 1),
                  _buildSettingTile(
                    icon: Icons.location_on_outlined,
                    title: 'Location Access',
                    trailingText: 'Always',
                    onTap: () {},
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.fingerprint_rounded, color: AppColors.primaryBlue),
                    title: Text(
                      'Biometric Login',
                      style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                    ),
                    trailing: Switch.adaptive(
                      value: _biometricLogin,
                      activeColor: AppColors.primaryBlue,
                      onChanged: (val) => setState(() => _biometricLogin = val),
                    ),
                  ),
                  const Divider(height: 1),
                  _buildSettingTile(
                    icon: Icons.shield_outlined,
                    title: 'Data & Privacy',
                    onTap: () => context.push(AppRoutes.privacyData),
                  ),
                  const Divider(height: 1),
                  _buildSettingTile(
                    icon: Icons.info_outline_rounded,
                    title: 'About AdhocX',
                    trailingText: 'v2.1.0',
                    onTap: () => context.push(AppRoutes.aboutAdhocx),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSettingTile({
    required IconData icon,
    required String title,
    String? trailingText,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: Icon(icon, color: AppColors.primaryBlue, size: 22),
      title: Text(
        title,
        style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (trailingText != null)
            Text(
              trailingText,
              style: GoogleFonts.inter(fontSize: 13, color: AppColors.textMuted),
            ),
          const SizedBox(width: 6),
          const Icon(Icons.chevron_right_rounded, size: 18, color: AppColors.textMuted),
        ],
      ),
      onTap: onTap,
    );
  }
}
