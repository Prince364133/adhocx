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
              child: _buildSettingTile(
                icon: Icons.language_rounded,
                title: 'Language',
                trailingText: 'Change',
                onTap: () => context.push(AppRoutes.selectLanguage),
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
        style: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary),
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (trailingText != null)
            Text(
              trailingText,
              style:
                  GoogleFonts.inter(fontSize: 13, color: AppColors.textMuted),
            ),
          const SizedBox(width: 6),
          const Icon(Icons.chevron_right_rounded,
              size: 18, color: AppColors.textMuted),
        ],
      ),
      onTap: onTap,
    );
  }
}
