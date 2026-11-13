import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import 'package:adhocx_employee/widgets/employee_brand_logo.dart';

class AboutAdhocxScreen extends StatelessWidget {
  const AboutAdhocxScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () async => (await MockDataService.getHistoryProfileData())['about']
          as Map<String, dynamic>?,
      builder: (context, about) {
        final p = EmployeePalette.of(context);
        final appName = about['appName'] ?? 'AdhocX';
        final tagline = about['tagline'] ?? 'Employee Transportation';
        final version = about['version'] ?? 'Version 2.1.0';
        final company =
            about['company'] ?? 'Estemporaneo Technologies Private Limited';

        return Scaffold(
          backgroundColor: p.background,
          appBar: const EmployeeAppBar(title: 'About AdhocX'),
          body: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.xl,
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
                EmployeeBrandLogo(fontSize: 28, subtitle: tagline),
                const SizedBox(height: AppSpacing.sm),
                Center(child: EmployeeStatusBadge(label: version)),
                const SizedBox(height: AppSpacing.xxl),
                AppCard(
                  backgroundColor: p.surfaceElevated,
                  child: Text(
                    about['description'] ??
                        'AdhocX is a corporate employee transportation platform that ensures safe, reliable and hassle-free commute for employees.',
                    textAlign: TextAlign.center,
                    style: AppTypography.body(color: p.textSecondary),
                  ),
                ),
                const SizedBox(height: AppSpacing.xxl + 4),
                EmployeeNavTile(
                  icon: Icons.system_update_alt_rounded,
                  title: 'Check for Updates',
                  onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('You are using the latest version ($version).'),
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
                    applicationName: '$appName $tagline',
                    applicationVersion: version,
                    applicationLegalese: '© 2026 $company',
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                EmployeeNavTile(
                  icon: Icons.headset_mic_outlined,
                  title: 'Contact Us',
                  // Was Navigator.pushNamed('/safety/overview'), which throws
                  // under GoRouter.
                  onTap: () => context.push(AppRoutes.safetyOverview),
                ),
                const SizedBox(height: AppSpacing.huge),
                Text(
                  '© 2026 $company',
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
      },
    );
  }
}
