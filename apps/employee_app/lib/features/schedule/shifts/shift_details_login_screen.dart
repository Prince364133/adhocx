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
      badge: EmployeeStatusBadge(
        label: 'Login Shift',
        variant: BadgeVariant.approved,
      ),
      fallback: {
        'date': 'Tue, 09 Dec 2026',
        'hours': '9:00 AM - 6:00 PM',
        'pickupTime': '8:15 AM',
        'pickupLoc': 'Home (Kondapur)',
        'dropTime': '6:30 PM',
        'dropLoc': 'HITEC City Office',
      },
    );
  }
}
