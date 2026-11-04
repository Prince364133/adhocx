import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../services/mock_data_service.dart';
import '../../theme/app_colors.dart';

/// Screen 12: About AdhocX Screen (Batch 08)
/// Displays app version, branding, company info, updates check, licenses and contact links.
class AboutAdhocxScreen extends StatefulWidget {
  const AboutAdhocxScreen({super.key});

  @override
  State<AboutAdhocxScreen> createState() => _AboutAdhocxScreenState();
}

class _AboutAdhocxScreenState extends State<AboutAdhocxScreen> {
  Map<String, dynamic>? _aboutData;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final data = await MockDataService.getHistoryProfileData();
    if (mounted) {
      setState(() {
        _aboutData = data['about'] as Map<String, dynamic>? ?? {
          'appName': 'AdhocX',
          'tagline': 'Employee Transportation',
          'version': 'Version 2.1.0',
          'description':
              'AdhocX is a corporate employee transportation platform that ensures safe, reliable and hassle-free commute for employees.',
          'company': 'Estemporaneo Technologies Private Limited',
          'supportEmail': 'support@adhocx.com',
          'supportPhone': '+91 98765 43210',
        };
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: Colors.white,
        body: Center(child: CircularProgressIndicator(color: AppColors.primary)),
      );
    }

    final appName = _aboutData?['appName'] ?? 'AdhocX';
    final tagline = _aboutData?['tagline'] ?? 'Employee Transportation';
    final version = _aboutData?['version'] ?? 'Version 2.1.0';
    final description = _aboutData?['description'] ??
        'AdhocX is a corporate employee transportation platform that ensures safe, reliable and hassle-free commute for employees.';
    final company = _aboutData?['company'] ?? 'Estemporaneo Technologies Private Limited';

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: AppColors.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'About AdhocX',
          style: GoogleFonts.inter(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        child: Column(
          children: [
            const SizedBox(height: 12),
            // Brand Icon Badge
            Center(
              child: Container(
                width: 76,
                height: 76,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.2), width: 2),
                ),
                child: const Center(
                  child: Icon(Icons.airport_shuttle_rounded, size: 40, color: AppColors.primary),
                ),
              ),
            ),
            const SizedBox(height: 16),
            // Brand Name: Adhoc in #5728B2, X in #FF5F09
            Center(
              child: RichText(
                text: TextSpan(
                  children: [
                    TextSpan(
                      text: 'Adhoc',
                      style: GoogleFonts.inter(
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF5728B2),
                        letterSpacing: -0.5,
                      ),
                    ),
                    TextSpan(
                      text: 'X',
                      style: GoogleFonts.inter(
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFFFF5F09),
                        letterSpacing: -0.5,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              tagline,
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 8),
            // Version Badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Text(
                version,
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary,
                ),
              ),
            ),
            const SizedBox(height: 24),
            // Description Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Text(
                description,
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  fontSize: 14,
                  height: 1.5,
                  fontWeight: FontWeight.w400,
                  color: AppColors.textSecondary,
                ),
              ),
            ),
            const SizedBox(height: 28),
            // Action Menu Options
            _buildActionItem(
              icon: Icons.system_update_alt_rounded,
              title: 'Check for Updates',
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      'You are using the latest version ($version).',
                      style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500),
                    ),
                    backgroundColor: AppColors.success,
                    behavior: SnackBarBehavior.floating,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                );
              },
            ),
            const SizedBox(height: 12),
            _buildActionItem(
              icon: Icons.description_outlined,
              title: 'Open Source Licenses',
              onTap: () {
                showLicensePage(
                  context: context,
                  applicationName: '$appName $tagline',
                  applicationVersion: version,
                  applicationLegalese: '© 2026 $company',
                );
              },
            ),
            const SizedBox(height: 12),
            _buildActionItem(
              icon: Icons.headset_mic_outlined,
              title: 'Contact Us',
              onTap: () => Navigator.of(context).pushNamed('/safety/overview'),
            ),
            const SizedBox(height: 48),
            // Legal / Copyright Footer
            Text(
              '© 2026 $company',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w400,
                color: AppColors.textMuted,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'All rights reserved.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w400,
                color: AppColors.textMuted,
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildActionItem({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 20, color: AppColors.textPrimary),
        ),
        title: Text(
          title,
          style: GoogleFonts.inter(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
        onTap: onTap,
      ),
    );
  }
}

