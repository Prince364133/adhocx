import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../routes/app_routes.dart';

/// Screen 11: Privacy & Data
class PrivacyDataScreen extends StatelessWidget {
  const PrivacyDataScreen({super.key});

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
          'Privacy & Data',
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
                  _buildItem(
                    icon: Icons.policy_outlined,
                    title: 'Privacy Policy',
                    onTap: () {},
                  ),
                  const Divider(height: 1),
                  _buildItem(
                    icon: Icons.article_outlined,
                    title: 'Terms & Conditions',
                    onTap: () {},
                  ),
                  const Divider(height: 1),
                  _buildItem(
                    icon: Icons.data_usage_rounded,
                    title: 'Data Usage',
                    onTap: () {},
                  ),
                  const Divider(height: 1),
                  _buildItem(
                    icon: Icons.location_on_outlined,
                    title: 'Location Usage',
                    onTap: () {},
                  ),
                  const Divider(height: 1),
                  _buildItem(
                    icon: Icons.download_rounded,
                    title: 'Your Data',
                    subtitle: 'Download your account data archive',
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Data export request initiated.')),
                      );
                    },
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.delete_outline_rounded, color: Color(0xFFDC2626)),
                    title: Text(
                      'Delete Account',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFFDC2626),
                      ),
                    ),
                    trailing: const Icon(Icons.chevron_right_rounded, size: 18, color: Color(0xFFDC2626)),
                    onTap: () => context.push(AppRoutes.deleteAccount),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildItem({
    required IconData icon,
    required String title,
    String? subtitle,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: Icon(icon, color: AppColors.primaryBlue, size: 22),
      title: Text(
        title,
        style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
      ),
      subtitle: subtitle != null
          ? Text(subtitle, style: GoogleFonts.inter(fontSize: 12, color: AppColors.textMuted))
          : null,
      trailing: const Icon(Icons.chevron_right_rounded, size: 18, color: AppColors.textMuted),
      onTap: onTap,
    );
  }
}

