import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'shift_details_view.dart';

class ShiftDetailsLoginScreen extends StatelessWidget {
  const ShiftDetailsLoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const ShiftDetailsView(
      sectionKey: 'shift_details_standard',
      accent: AppColors.primary,
      preferLogout: false,
      badge: EmployeeStatusBadge(
        label: 'Login Shift',
        variant: BadgeVariant.approved,
      ),
    );
  }
}
