import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/tracking_illustrations.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

class TripHistoryDetailsScreen extends StatelessWidget {
  const TripHistoryDetailsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

    Widget routePoint(IconData icon, Color color, String title,
            String location, String time) =>
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: AppTypography.caption(color: p.textMuted)),
                  Text(
                    location,
                    style: AppTypography.bodyMedium(
                      color: p.textPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            Text(
              time,
              style: AppTypography.small(
                color: p.textSecondary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        );

    return Scaffold(
      backgroundColor: p.background,
      appBar: const EmployeeAppBar(title: 'Trip Details'),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.xl,
            vertical: AppSpacing.lg,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const VectorLiveMapCanvas(height: 180),
              const SizedBox(height: AppSpacing.lg),
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Login Trip',
                            style: AppTypography.h4(
                              color: p.textPrimary,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        EmployeeStatusBadge.fromString('Completed'),
                      ],
                    ),
                    Text('Tue, 09 Dec 2026',
                        style: AppTypography.caption(color: p.textMuted)),
                    Divider(color: p.border, height: AppSpacing.xxl),
                    routePoint(Icons.my_location_rounded, AppColors.success,
                        'Pickup', 'Home (Kondapur)', '8:15 AM'),
                    const SizedBox(height: AppSpacing.lg),
                    routePoint(Icons.location_on_rounded, AppColors.brandOrange,
                        'Drop', 'HITEC City Office', '9:02 AM'),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              const TripDriverRow(
                name: 'Suresh R',
                rating: '4.8',
                avatarRadius: 22,
              ),
              const SizedBox(height: AppSpacing.md),
              const TripVehicleCard(
                model: 'Maruti Ertiga',
                plate: 'TS09UB7845',
                details: 'White • 7 Seater',
              ),
            ],
          ),
        ),
      ),
    );
  }
}
