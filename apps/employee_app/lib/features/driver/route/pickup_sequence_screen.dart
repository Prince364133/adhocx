import 'package:flutter/material.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Screen 12: Pickup Sequence / Route
class PickupSequenceScreen extends StatelessWidget {
  const PickupSequenceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () async => {
        'stops':
            (await MockDataService.getDriverAssignment())['pickup_sequence'],
      },
      builder: (context, data) {
        final p = EmployeePalette.of(context);
        final stops = (data['stops'] as List<dynamic>?) ?? const [];

        return Scaffold(
          backgroundColor: p.background,
          appBar: const EmployeeAppBar(title: 'Trip Route (Pickup)'),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(AppSpacing.xl),
              child: TripSectionCard(
                title: 'Pickup & Drop Stops',
                description:
                    'Estimated pickup order calculated for optimal commute efficiency.',
                child: TripTimeline(
                  entries: [
                    for (var i = 0; i < stops.length; i++)
                      () {
                        final stop = stops[i] as Map<String, dynamic>;
                        final isCurrent = stop['isCurrent'] == true;
                        final isDrop = stop['isDrop'] == true;
                        return TripTimelineEntry(
                          dotColor: isCurrent
                              ? AppColors.primary
                              : isDrop
                                  ? AppColors.brandOrange
                                  : p.border,
                          dotChild: isDrop
                              ? const Icon(Icons.business_rounded,
                                  size: 12, color: Colors.white)
                              : isCurrent
                                  ? const Icon(Icons.person,
                                      size: 12, color: Colors.white)
                                  : Text(
                                      '${i + 1}',
                                      style: AppTypography.micro(
                                        color: p.textSecondary,
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                          title: '${stop['name'] ?? ''}',
                          emphasise: isCurrent,
                          titleTrailing: isCurrent
                              ? const EmployeeStatusBadge(
                                  label: 'Current Pickup',
                                  variant: BadgeVariant.inProgress,
                                )
                              : isDrop
                                  ? const EmployeeStatusBadge(
                                      label: 'Office Drop',
                                      variant: BadgeVariant.pending,
                                    )
                                  : null,
                          subtitle:
                              '${stop['time'] ?? ''} • ${stop['location'] ?? ''}',
                        );
                      }(),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
