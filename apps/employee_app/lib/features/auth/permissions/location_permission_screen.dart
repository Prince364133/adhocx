import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/illustrations/auth_illustrations.dart';
import 'package:adhocx_employee/state/employee_permission_provider.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

class LocationPermissionScreen extends StatelessWidget {
  const LocationPermissionScreen({super.key});

  Future<void> _handleAllow(BuildContext context) async {
    final permissionProvider = context.read<EmployeePermissionProvider>();
    await permissionProvider.requestLocationPermission();
    if (context.mounted) {
      context.push(AppRoutes.permissionNotification);
    }
  }

  void _handleSkip(BuildContext context) {
    context.read<EmployeePermissionProvider>().skipLocation();
    context.push(AppRoutes.permissionNotification);
  }

  @override
  Widget build(BuildContext context) {
    final permissionProvider = context.watch<EmployeePermissionProvider>();
    final p = EmployeePalette.of(context);

    return EmployeeCenteredLayout(
      appBar: const EmployeeAppBar(),
      illustration: PermissionBadge(
        icon: Icons.location_on_rounded,
        iconColor: p.accent,
        backgroundColor: p.accentTint,
      ),
      title: 'Allow Location Access',
      message:
          'We use your location to show pickup updates, trip tracking and estimated arrival time.',
      actions: [
        EmployeePrimaryButton(
          label: 'Allow Location',
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
