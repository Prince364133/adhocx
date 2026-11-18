import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import 'package:adhocx_employee/widgets/employee_brand_logo.dart';

class AboutAdhocxScreen extends StatelessWidget {
  const AboutAdhocxScreen({super.key});

  static const String _appName = 'AdhocX';
  static const String _tagline = 'Employee Transportation';
  static const String _version = 'Version 1.0.0';
  static const String _company = 'AdhocX Mobility Pvt. Ltd.';
  static const String _description =
      'AdhocX is a corporate employee transportation platform that ensures safe, reliable and hassle-free daily commutes for employees.';

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    final year = DateTime.now().year;

    return Scaffold(
      backgroundColor: p.background,
      appBar: const EmployeeAppBar(title: 'About AdhocX'),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.pageHorizontal,
          vertical: AppSpacing.xxl,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 76,
                height: 76,
                decoration: BoxDecoration(
                  color: p.accentTint,
                  shape: BoxShape.circle,
                  border: Border.all(color: p.accent.withAlpha(51), width: 2),
                ),
                child: Icon(Icons.airport_shuttle_rounded,
                    size: 40, color: p.accent),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            const EmployeeBrandLogo(fontSize: 28, subtitle: _tagline),
            const SizedBox(height: AppSpacing.sm),
            const Center(child: EmployeeStatusBadge(label: _version)),
            const SizedBox(height: AppSpacing.xxl),
            AppCard(
              backgroundColor: p.surfaceElevated,
              child: Text(
                _description,
                textAlign: TextAlign.center,
                style: AppTypography.body(color: p.textSecondary),
              ),
            ),
            const SizedBox(height: AppSpacing.xxl + 4),
            EmployeeNavTile(
              icon: Icons.system_update_alt_rounded,
              title: 'Check for Updates',
              onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('You are using the latest version ($_version).'),
                  backgroundColor: AppColors.success,
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            EmployeeNavTile(
              icon: Icons.description_outlined,
              title: 'Open Source Licenses',
              onTap: () => showLicensePage(
                context: context,
                applicationName: '$_appName $_tagline',
                applicationVersion: _version,
                applicationLegalese: '© $year $_company',
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            EmployeeNavTile(
              icon: Icons.headset_mic_outlined,
              title: 'Contact Us',
              onTap: () => context.push(AppRoutes.safetyOverview),
            ),
            const SizedBox(height: AppSpacing.huge),
            Text(
              '© $year $_company',
              textAlign: TextAlign.center,
              style: AppTypography.caption(color: p.textMuted),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              'All rights reserved.',
              textAlign: TextAlign.center,
              style: AppTypography.caption(color: p.textMuted),
            ),
          ],
        ),
      ),
    );
  }
}
