import 'package:flutter/material.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Loads one section of the mock `boarding_completion` data.
Future<Map<String, dynamic>?> loadBoardingSection(String key) async =>
    (await MockDataService.getBoardingData())[key] as Map<String, dynamic>?;

/// Loads one entry of `boarding_completion.error_states`.
Future<Map<String, dynamic>?> loadBoardingError(String key) async {
  final errors = await loadBoardingSection('error_states');
  return errors?[key] as Map<String, dynamic>?;
}

/// Trip + driver preview card ("Trip: Login (Pickup) / Driver: Suresh R").
class BoardingTripPreviewCard extends StatelessWidget {
  final String tripType;
  final String driverLine;

  const BoardingTripPreviewCard({
    super.key,
    required this.tripType,
    required this.driverLine,
  });

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

    return AppCard(
      width: double.infinity,
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.sm + 2),
            decoration: BoxDecoration(
              color: p.accentTint,
              borderRadius: AppRadius.borderLg,
            ),
            child: Icon(Icons.directions_car_rounded, color: p.accent, size: 22),
          ),
          const SizedBox(width: AppSpacing.md + 2),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Trip: $tripType',
                  style: AppTypography.bodyMedium(
                    color: p.textPrimary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(driverLine,
                    style: AppTypography.caption(color: p.textSecondary)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// One row of a boarding progress timeline (Picked up → Boarded → In progress).
class BoardingTimelineRow extends StatelessWidget {
  final String title;
  final String time;
  final bool isDone;

  const BoardingTimelineRow({
    super.key,
    required this.title,
    required this.time,
    required this.isDone,
  });

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

    return Row(
      children: [
        Container(
          width: 20,
          height: 20,
          decoration: BoxDecoration(
            color: isDone ? AppColors.success : AppColors.primary,
            shape: BoxShape.circle,
          ),
          child: Icon(
            isDone ? Icons.check : Icons.directions_car_filled_rounded,
            size: 12,
            color: Colors.white,
          ),
        ),
        const SizedBox(width: AppSpacing.md + 2),
        Expanded(
          child: Text(
            title,
            style: AppTypography.bodyMedium(
              color: p.textPrimary,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        const SizedBox(width: AppSpacing.sm),
        Flexible(
          child: Text(
            time,
            textAlign: TextAlign.end,
            style: AppTypography.small(
              color: isDone ? p.textSecondary : p.accent,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ],
    );
  }
}
