import 'package:flutter/material.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'shift_details_view.dart';

class ShiftDetailsOvernightScreen extends StatelessWidget {
  const ShiftDetailsOvernightScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ShiftDetailsView(
      sectionKey: 'shift_details_overnight',
      accent: AppColors.accentPurple,
      badge: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md + 2,
          vertical: AppSpacing.xs + 2,
        ),
        decoration: BoxDecoration(
          color: AppColors.accentPurple.withAlpha(31),
          borderRadius: AppRadius.borderPill,
          border: Border.all(color: AppColors.accentPurple.withAlpha(90)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.nightlight_round,
                size: 14, color: AppColors.accentPurple),
            const SizedBox(width: AppSpacing.xs + 2),
            Text(
              'Overnight Shift',
              style: AppTypography.caption(
                color: AppColors.accentPurple,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
      fallback: const {
        'date': 'Wed, 10 Dec - Thu, 11 Dec',
        'hours': '10:00 PM - 6:00 AM',
        'pickupTime': '9:15 PM',
        'pickupLoc': 'Home (Miyapur)',
        'dropTime': '6:15 AM',
        'dropLoc': 'Home (Miyapur)',
      },
    );
  }
}
