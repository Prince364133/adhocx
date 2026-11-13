import 'package:flutter/material.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/tracking_illustrations.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Screen 7: Trip Progress (On Trip)
class TripProgressOnTripScreen extends StatelessWidget {
  const TripProgressOnTripScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () async =>
          (await MockDataService.getLiveTracking())['tripProgress']
              as Map<String, dynamic>?,
      builder: (context, data) {
        final p = EmployeePalette.of(context);
        final eta = data['eta'] ?? '18 min';
        final distance = data['distance'] ?? '7.6 km';

        return Scaffold(
          backgroundColor: p.background,
          appBar: EmployeeAppBar(title: data['title'] ?? 'Trip in Progress'),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.xl,
                vertical: AppSpacing.lg,
              ),
              child: Column(
                children: [
                  VectorLiveMapCanvas(
                    height: 240,
                    etaBadge: 'ETA $eta',
                    showControls: true,
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  AppCard(
                    width: double.infinity,
                    padding: AppSpacing.paddingXl,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          data['headline'] ?? 'En Route to Office',
                          style: AppTypography.h3(
                            color: p.textPrimary,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xs),
                        Text(
                          'ETA $eta • $distance',
                          style: AppTypography.bodyMedium(
                            color: p.accent,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: AppSpacing.xxl),
                        const EmployeeStepTracker(
                          currentStep: 2,
                          labels: ['Pickup', 'Boarded', 'In Progress', 'Drop'],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
