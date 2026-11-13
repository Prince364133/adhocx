import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/illustrations/auth_illustrations.dart';
import 'package:adhocx_employee/state/employee_permission_provider.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

class NotificationPermissionScreen extends StatelessWidget {
  const NotificationPermissionScreen({super.key});

  Future<void> _handleAllow(BuildContext context) async {
    final permissionProvider = context.read<EmployeePermissionProvider>();
    await permissionProvider.requestNotificationPermission();
    if (context.mounted) {
      context.push(AppRoutes.onboardingSchedule);
    }
  }

  void _handleSkip(BuildContext context) {
    context.read<EmployeePermissionProvider>().skipNotifications();
    context.push(AppRoutes.onboardingSchedule);
  }

  @override
  Widget build(BuildContext context) {
    final permissionProvider = context.watch<EmployeePermissionProvider>();
    final p = EmployeePalette.of(context);

    return EmployeeCenteredLayout(
      appBar: const EmployeeAppBar(),
      illustration: PermissionBadge(
        icon: Icons.notifications_active_rounded,
        iconColor: p.accent,
        backgroundColor: p.accentTint,
      ),
      title: 'Enable Notifications',
      message:
          'Get trip updates, driver arrival alerts, shift changes and important safety notifications.',
      actions: [
        EmployeePrimaryButton(
          label: 'Allow Notifications',
          isLoading: permissionProvider.isLoading,
          onPressed: () => _handleAllow(context),
        ),
        EmployeeTextLink(
          label: 'Not Now',
          emphasised: false,
          onPressed: () => _handleSkip(context),
        ),
      ],
    );
  }
}
