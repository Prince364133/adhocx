import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/tracking_illustrations.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Screen 1: Live Tracking (Overview)
class LiveTrackingOverviewScreen extends StatelessWidget {
  const LiveTrackingOverviewScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () async =>
          (await MockDataService.getLiveTracking())['overview']
              as Map<String, dynamic>?,
      builder: (context, data) {
        final p = EmployeePalette.of(context);
        final eta = data['eta'] ?? '~ 6 min';
        final driver = data['driver'] as Map<String, dynamic>?;
        final plate = driver?['plateNumber'] ?? 'TS09UB7845';
        final model = driver?['model'] ?? 'Maruti Ertiga';

        return Scaffold(
          backgroundColor: p.background,
          appBar: EmployeeAppBar(
            title: data['title'] ?? "Today's Pickup",
            onBack: () => context.canPop()
                ? context.pop()
                : context.go(AppRoutes.homeUpcomingPickup),
          ),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.xl,
                vertical: AppSpacing.lg,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: EmployeeStatusBadge.fromString(
                      data['status'] ?? 'In Progress',
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  Semantics(
                    button: true,
                    label: 'Open full-screen live map',
                    child: GestureDetector(
                      onTap: () => context.push(AppRoutes.tripLiveMapFull),
                      child: VectorLiveMapCanvas(
                        height: 220,
                        etaBadge: 'ETA $eta',
                        showControls: true,
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  TripDriverRow(
                    name: driver?['name'] ?? 'Suresh R',
                    rating: '${(driver?['rating'] ?? 4.8).toDouble()}',
                    vehicleNumber:
                        '$plate • $model • ${driver?['capacity'] ?? '7 Seater'}',
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  EmployeePrimaryButton(
                    label: 'View Trip Details',
                    icon: Icons.alt_route_rounded,
                    onPressed: () => context.push(AppRoutes.routeAndStops),
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
