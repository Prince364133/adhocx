import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';

/// Screen: Settings Overview
/// Uses design system components: EmployeeAppBar.
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
      appBar: const EmployeeAppBar(
        title: 'Settings',
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
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.02),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                children: [
                  _buildSettingTile(
                    icon: Icons.tune_rounded,
                    title: 'App Preferences',
                    onTap: () {},
                  ),
                  const Divider(height: 1, color: AppColors.borderSubtle),
                  _buildSettingTile(
                    icon: Icons.notifications_outlined,
                    title: 'Notifications',
                    onTap: () => context.push(AppRoutes.notificationPreferences),
                  ),
                  const Divider(height: 1, color: AppColors.borderSubtle),
                  _buildSettingTile(
                    icon: Icons.language_rounded,
                    title: 'Language',
                    trailingText: 'English',
                    onTap: () => context.push(AppRoutes.selectLanguage),
                  ),
                  const Divider(height: 1, color: AppColors.borderSubtle),
                  _buildSettingTile(
                    icon: Icons.location_on_outlined,
                    title: 'Location Access',
                    trailingText: 'Always',
                    onTap: () {},
                  ),
                  const Divider(height: 1, color: AppColors.borderSubtle),
                  ListTile(
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: const BoxDecoration(
                        color: AppColors.primaryBlueSoft,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.fingerprint_rounded, color: AppColors.primaryBlue, size: 20),
                    ),
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
                  const Divider(height: 1, color: AppColors.borderSubtle),
                  _buildSettingTile(
                    icon: Icons.shield_outlined,
                    title: 'Data & Privacy',
                    onTap: () => context.push(AppRoutes.privacyData),
                  ),
                  const Divider(height: 1, color: AppColors.borderSubtle),
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
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: const BoxDecoration(
          color: AppColors.primaryBlueSoft,
          shape: BoxShape.circle,
        ),
        child: Icon(icon, color: AppColors.primaryBlue, size: 20),
      ),
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

