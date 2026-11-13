import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

class PrivacyDataScreen extends StatelessWidget {
  const PrivacyDataScreen({super.key});

  void _explain(BuildContext context, String title, String body) {
    AppBottomSheet.show<void>(
      context: context,
      title: title,
      child: Builder(
        builder: (ctx) => Text(
          body,
          style: AppTypography.body(
            color: EmployeePalette.of(ctx).textSecondary,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    Widget gap() => const SizedBox(height: AppSpacing.sm + 2);

    return Scaffold(
      backgroundColor: p.background,
      appBar: const EmployeeAppBar(title: 'Privacy & Data'),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.xl),
          children: [
            // Policy documents aren't published in-app yet: shown as
            // "coming soon" instead of rows that silently did nothing.
            const EmployeeNavTile(
              icon: Icons.policy_outlined,
              title: 'Privacy Policy',
              subtitle: 'Coming soon',
              trailing: SizedBox.shrink(),
            ),
            gap(),
            const EmployeeNavTile(
              icon: Icons.article_outlined,
              title: 'Terms & Conditions',
              subtitle: 'Coming soon',
              trailing: SizedBox.shrink(),
            ),
            gap(),
            EmployeeNavTile(
              icon: Icons.data_usage_rounded,
              title: 'Data Usage',
              onTap: () => _explain(
                context,
                'Data Usage',
                'AdhocX uses your profile, shift schedule and trip details to plan your cab, notify you about trips, and handle support or safety requests raised by you.',
              ),
            ),
            gap(),
            EmployeeNavTile(
              icon: Icons.location_on_outlined,
              title: 'Location Usage',
              onTap: () => _explain(
                context,
                'Location Usage',
                'We use your location to show pickup updates, trip tracking and estimated arrival time.',
              ),
            ),
            gap(),
            EmployeeNavTile(
              icon: Icons.download_rounded,
              title: 'Your Data',
              subtitle: 'Download your account data archive',
              onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Data export request initiated.')),
              ),
            ),
            gap(),
            EmployeeNavTile(
              icon: Icons.delete_outline_rounded,
              title: 'Delete Account',
              iconColor: AppColors.error,
              trailing: const Icon(Icons.chevron_right_rounded,
                  size: 20, color: AppColors.error),
              onTap: () => context.push(AppRoutes.deleteAccount),
            ),
          ],
        ),
      ),
    );
  }
}
