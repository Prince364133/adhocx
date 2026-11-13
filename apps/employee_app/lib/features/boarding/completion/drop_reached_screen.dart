import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/boarding_widgets.dart';

/// Screen 9: Drop Reached / Reached Destination
class DropReachedScreen extends StatelessWidget {
  const DropReachedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadBoardingSection('destination_reached'),
      builder: (context, data) {
        final p = EmployeePalette.of(context);

        return EmployeeCenteredLayout(
          appBar: const EmployeeAppBar(),
          illustrationGap: AppSpacing.xxl,
          illustration: Container(
            width: 150,
            height: 100,
            decoration: BoxDecoration(
              color: p.accentTint,
              borderRadius: AppRadius.borderXxl,
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                Icon(Icons.apartment_rounded, size: 64, color: p.accent),
                const Positioned(
                  right: 28,
                  top: 10,
                  child: Icon(Icons.location_on_rounded,
                      size: 28, color: AppColors.brandOrange),
                ),
              ],
            ),
          ),
          title: data['title'] ?? 'Reached Destination',
          message:
              data['subtitle'] ?? 'You have arrived at your drop location.',
          content: AppCard(
            width: double.infinity,
            child: Column(
              children: [
                Row(
                  children: [
                    Icon(Icons.location_on_rounded, color: p.accent, size: 22),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Text(
                        data['location'] ?? 'HITEC City Office',
                        style: AppTypography.h4(
                          color: p.textPrimary,
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
                Divider(color: p.border, height: AppSpacing.xxl),
                TripMetricRow(
                  icon: Icons.access_time_rounded,
                  label: 'Arrived at',
                  value: data['arrivedAt'] ?? '9:02 AM',
                ),
              ],
            ),
          ),
          actions: [
            EmployeePrimaryButton(
              label: 'Confirm Drop',
              icon: Icons.check_circle_outline_rounded,
              onPressed: () => context.push(AppRoutes.tripCompletedSummary),
            ),
          ],
        );
      },
    );
  }
}
