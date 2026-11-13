import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';

class TripDetailsCompletedScreen extends StatelessWidget {
  const TripDetailsCompletedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => MockDataService.getTrip('completed'),
      builder: (context, trip) {
        final p = EmployeePalette.of(context);
        final type = trip['type'] ?? 'Login (Pickup)';
        final date = trip['date'] ?? '09 Dec 2026';
        final timeline = (trip['timeline'] as List<dynamic>?) ?? const [];

        return TripStageScaffold(
          title: 'Trip Details',
          statusLabel: 'Completed',
          statusVariant: BadgeVariant.completed,
          alignStart: true,
          children: [
            Text(
              '$type • $date',
              style: AppTypography.h4(
                color: p.textPrimary,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: AppSpacing.xl),
            AppCard(
              padding: AppSpacing.paddingXl,
              child: Column(
                children: List.generate(timeline.length, (index) {
                  final item = timeline[index] as Map<String, dynamic>;
                  final isLast = index == timeline.length - 1;

                  return EmployeeEntrance(
                    delay: Duration(milliseconds: (index * 55).clamp(0, 330)),
                    child: IntrinsicHeight(
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Column(
                            children: [
                              Container(
                                width: 22,
                                height: 22,
                                decoration: const BoxDecoration(
                                  color: AppColors.success,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.check,
                                    size: 14, color: Colors.white),
                              ),
                              if (!isLast)
                                Expanded(
                                  child: Container(
                                    width: 2,
                                    color: AppColors.success.withAlpha(102),
                                    margin: const EdgeInsets.symmetric(
                                      vertical: AppSpacing.xs,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(width: AppSpacing.md + 2),
                          Expanded(
                            child: Padding(
                              padding: EdgeInsets.only(
                                bottom: isLast ? 0 : AppSpacing.xl,
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item['event'] ?? '',
                                    style: AppTypography.bodyMedium(
                                      color: p.textPrimary,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    item['time'] ?? '',
                                    style: AppTypography.caption(
                                      color: p.textSecondary,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              ),
            ),
            const SizedBox(height: AppSpacing.xxxl),
            EmployeePrimaryButton(
              label: 'Driver & Vehicle Details',
              icon: Icons.person_pin_rounded,
              onPressed: () => context.push(AppRoutes.tripDriverVehicle),
            ),
          ],
        );
      },
    );
  }
}
