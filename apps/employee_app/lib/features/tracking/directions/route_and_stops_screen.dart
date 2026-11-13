import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Screen 8: Route & Stops
class RouteAndStopsScreen extends StatelessWidget {
  const RouteAndStopsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () async => {
        'stops': (await MockDataService.getLiveTracking())['routeAndStops'],
      },
      builder: (context, data) {
        final p = EmployeePalette.of(context);
        final stops = (data['stops'] as List<dynamic>?) ?? const [];

        return Scaffold(
          backgroundColor: p.background,
          appBar: const EmployeeAppBar(title: 'Trip Route'),
          body: SafeArea(
            child: Column(
              children: [
                // Scrolls so long routes never overflow the screen.
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(AppSpacing.xl),
                    child: AppCard(
                      width: double.infinity,
                      padding: AppSpacing.paddingXl,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Active Passenger Manifest',
                            style: AppTypography.h4(
                              color: p.textPrimary,
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: AppSpacing.xl),
                          for (var i = 0; i < stops.length; i++)
                            _StopRow(
                              stop: stops[i] as Map<String, dynamic>,
                              isLast: i == stops.length - 1,
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.xl,
                    0,
                    AppSpacing.xl,
                    AppSpacing.lg,
                  ),
                  child: EmployeePrimaryButton(
                    label: 'View on Map',
                    icon: Icons.map_rounded,
                    onPressed: () => context.push(AppRoutes.tripLiveMapFull),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _StopRow extends StatelessWidget {
  final Map<String, dynamic> stop;
  final bool isLast;

  const _StopRow({required this.stop, required this.isLast});

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    final isDrop = stop['isDrop'] == true;
    final time = stop['time'] ?? '';

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              Container(
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  color: isDrop ? AppColors.brandOrange : AppColors.success,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isDrop ? Icons.business_rounded : Icons.check,
                  size: 13,
                  color: Colors.white,
                ),
              ),
              if (!isLast)
                Expanded(child: Container(width: 2, color: p.borderSubtle)),
            ],
          ),
          const SizedBox(width: AppSpacing.md + 2),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : AppSpacing.xxl),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    stop['name'] ?? '',
                    style: AppTypography.bodyMedium(
                      color: p.textPrimary,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    isDrop
                        ? 'ETA $time'
                        : '$time • ${stop['status'] ?? ''} (${stop['location'] ?? ''})',
                    style: AppTypography.caption(color: p.textSecondary),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
