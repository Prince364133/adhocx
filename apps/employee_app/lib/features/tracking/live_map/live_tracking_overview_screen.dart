import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/tracking_illustrations.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Live Tracking (Overview) backed by GET /corporate/me/trips/next & tracking.
class LiveTrackingOverviewScreen extends StatelessWidget {
  const LiveTrackingOverviewScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadLiveTripSnapshot(context),
      builder: (context, snapshot) {
        final p = EmployeePalette.of(context);
        final next = (snapshot['nextTrip'] as Map<String, dynamic>?) ?? const {};
        final tracking =
            (snapshot['tracking'] as Map<String, dynamic>?) ?? const {};
        final hasActiveTrip = next['hasActiveTrip'] == true;
        final driver = (tracking['driver'] ?? next['driver']) as Map?;
        final vehicle = (tracking['vehicle'] ?? next['vehicle']) as Map?;

        final etaMins = tracking['estimatedArrivalMinutes'];
        final etaLabel = etaMins != null ? '~ $etaMins min' : 'Updating';
        final status = (tracking['routeStatus'] ??
                next['routeStatus'] ??
                (hasActiveTrip ? 'In Progress' : 'No Active Trip'))
            .toString();
        final driverName = driver?['fullName']?.toString() ??
            driver?['name']?.toString() ??
            'Not yet assigned';
        final rating = driver?['rating']?.toString() ?? 'Verified';
        final plate = vehicle?['registrationNumber']?.toString() ??
            vehicle?['plateNumber']?.toString() ??
            'Pending';
        final model = vehicle?['model']?.toString() ??
            vehicle?['vehicleType']?.toString() ??
            '';
        final vehicleInfo = [plate, if (model.isNotEmpty) model].join(' • ');
        final title = EmployeeDataProvider.formatDirectionLabel(
          next['direction']?.toString(),
        );

        return Scaffold(
          backgroundColor: p.background,
          appBar: EmployeeAppBar(
            title: hasActiveTrip ? title : 'Live Tracking',
            onBack: () => context.canPop()
                ? context.pop()
                : context.go(AppRoutes.homeUpcomingPickup),
          ),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.pageHorizontal,
                vertical: AppSpacing.lg,
              ),
              child: !hasActiveTrip
                  ? AppCard(
                      padding: AppSpacing.paddingXl,
                      child: Column(
                        children: [
                          Icon(Icons.location_searching_rounded,
                              size: 40, color: p.textMuted),
                          const SizedBox(height: AppSpacing.md),
                          Text(
                            'No Active Trip to Track',
                            style: AppTypography.h4(color: p.textPrimary),
                          ),
                          const SizedBox(height: AppSpacing.xs),
                          Text(
                            next['message']?.toString() ??
                                'Live cab tracking activates once your scheduled commute is dispatched.',
                            textAlign: TextAlign.center,
                            style: AppTypography.small(color: p.textSecondary),
                          ),
                          const SizedBox(height: AppSpacing.lg),
                          EmployeeSecondaryButton(
                            label: 'View Schedule',
                            icon: Icons.calendar_month_outlined,
                            onPressed: () =>
                                context.go(AppRoutes.scheduleToday),
                          ),
                        ],
                      ),
                    )
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Center(
                          child: EmployeeStatusBadge.fromString(status),
                        ),
                        const SizedBox(height: AppSpacing.lg),
                        Semantics(
                          button: true,
                          label: 'Open full-screen live map',
                          child: GestureDetector(
                            onTap: () =>
                                context.push(AppRoutes.tripLiveMapFull),
                            child: VectorLiveMapCanvas(
                              height: 220,
                              etaBadge: 'ETA $etaLabel',
                              showControls: true,
                            ),
                          ),
                        ),
                        const SizedBox(height: AppSpacing.lg),
                        TripDriverRow(
                          name: driverName,
                          rating: rating,
                          vehicleNumber: vehicleInfo,
                        ),
                        const SizedBox(height: AppSpacing.xl),
                        EmployeePrimaryButton(
                          label: 'View Route & Stops',
                          icon: Icons.alt_route_rounded,
                          onPressed: () =>
                              context.push(AppRoutes.routeAndStops),
                        ),
                      ],
                    ),
            ),
          ),
          bottomNavigationBar: const EmployeeBottomNavBar(currentIndex: 2),
        );
      },
    );
  }
}
