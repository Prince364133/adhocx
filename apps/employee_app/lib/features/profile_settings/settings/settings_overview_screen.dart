import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import 'package:adhocx_employee/theme/theme_provider.dart';

/// Settings: appearance (light / dark / system, same as the Driver app) and
/// language.
class SettingsOverviewScreen extends StatelessWidget {
  const SettingsOverviewScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    final themeProvider = context.watch<ThemeProvider>();

    return Scaffold(
      backgroundColor: p.background,
      appBar: const EmployeeAppBar(title: 'Settings'),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.xl),
          children: [
            const EmployeeSectionHeader(
              title: 'Appearance',
              padding: EdgeInsets.zero,
            ),
            const SizedBox(height: AppSpacing.sm),
            AppSegmentedControl<ThemeMode>(
              items: const [
                SegmentItem(
                  value: ThemeMode.light,
                  label: 'Light',
                  icon: Icons.light_mode_outlined,
                ),
                SegmentItem(
                  value: ThemeMode.dark,
                  label: 'Dark',
                  icon: Icons.dark_mode_outlined,
                ),
                SegmentItem(
                  value: ThemeMode.system,
                  label: 'System',
                  icon: Icons.settings_suggest_outlined,
                ),
              ],
              selectedValue: themeProvider.themeMode,
              onValueChanged: themeProvider.setThemeMode,
            ),
            if (!ThemeProvider.darkModeReady) ...[
              const SizedBox(height: AppSpacing.sm),
              Text(
                'Dark mode is being finalised and will apply in an upcoming update.',
                style: AppTypography.caption(color: p.textMuted),
              ),
            ],
            const SizedBox(height: AppSpacing.xxl),
            const EmployeeSectionHeader(
              title: 'General',
              padding: EdgeInsets.zero,
            ),
            const SizedBox(height: AppSpacing.sm),
            EmployeeNavTile(
              icon: Icons.language_rounded,
              title: 'Language',
              subtitle: 'Change app language',
              onTap: () => context.push(AppRoutes.selectLanguage),
            ),
          ],
        ),
      ),
    );
  }
}
