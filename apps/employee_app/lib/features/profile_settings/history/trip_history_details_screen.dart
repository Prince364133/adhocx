import 'package:flutter/material.dart';
import 'package:adhocx_employee/features/boarding/completion/driver_safety_rating_sheet.dart';
import 'package:adhocx_employee/features/trips/summary/driver_rating_trip.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/tracking_illustrations.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

class TripHistoryDetailsScreen extends StatefulWidget {
  final DriverRatingTrip? trip;

  const TripHistoryDetailsScreen({super.key, this.trip});

  @override
  State<TripHistoryDetailsScreen> createState() =>
      _TripHistoryDetailsScreenState();
}

class _TripHistoryDetailsScreenState extends State<TripHistoryDetailsScreen> {
  bool _submitted = false;

  Future<void> _rateDriver() async {
    final trip = widget.trip;
    if (trip == null || !trip.canRate) return;

    final submitted = await showDriverSafetyRatingSheet(context, trip);
    if (!mounted || submitted != true) return;

    setState(() => _submitted = true);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Thank you! Your driver rating has been submitted.'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    final trip = widget.trip;

    if (trip == null) {
      return Scaffold(
        backgroundColor: p.background,
        appBar: const EmployeeAppBar(title: 'Trip Details'),
        body: const SafeArea(
          child: EmployeeEmptyState(
            icon: Icons.directions_car_outlined,
            title: 'No Trip Selected',
            description: 'Select a trip from your Trip History to view details.',
          ),
        ),
      );
    }

    final pickup = trip.pickupAddress.isNotEmpty
        ? trip.pickupAddress
        : 'Pickup point unavailable';
    final destination = trip.destinationAddress.isNotEmpty
        ? trip.destinationAddress
        : 'Destination unavailable';
    final hasVehicle =
        trip.vehicleModel.isNotEmpty || trip.vehiclePlate.isNotEmpty;

    Widget routePoint(IconData icon, Color color, String label, String location,
            String time) =>
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: AppTypography.caption(color: p.textMuted)),
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
            horizontal: AppSpacing.pageHorizontal,
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
                            trip.title,
                            style: AppTypography.h4(
                              color: p.textPrimary,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        EmployeeStatusBadge.fromString(trip.displayStatus),
                      ],
                    ),
                    Text(trip.displayDate,
                        style: AppTypography.caption(color: p.textMuted)),
                    Divider(color: p.border, height: AppSpacing.xxl),
                    routePoint(
                      Icons.my_location_rounded,
                      AppColors.success,
                      'Pickup',
                      pickup,
                      trip.shiftTime,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    routePoint(
                      Icons.location_on_rounded,
                      AppColors.brandOrange,
                      'Drop',
                      destination,
                      '—',
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              if (trip.driverName.isNotEmpty)
                TripDriverRow(
                  name: trip.driverName,
                  rating: trip.driverRating?.toStringAsFixed(1) ?? '—',
                  vehicleNumber:
                      trip.vehiclePlate.isEmpty ? null : trip.vehiclePlate,
                  avatarRadius: 22,
                ),
              if (hasVehicle) ...[
                const SizedBox(height: AppSpacing.md),
                TripVehicleCard(
                  model: trip.vehicleModel.isEmpty
                      ? 'Vehicle model unavailable'
                      : trip.vehicleModel,
                  plate: trip.vehiclePlate.isEmpty
                      ? 'Plate unavailable'
                      : trip.vehiclePlate,
                  details: '',
                ),
              ],
              if (trip.canRate && !_submitted) ...[
                const SizedBox(height: AppSpacing.lg),
                EmployeePrimaryButton(
                  label: 'Rate Driver',
                  icon: Icons.star_rounded,
                  onPressed: _rateDriver,
                ),
              ] else if (trip.hasFeedback || _submitted) ...[
                const SizedBox(height: AppSpacing.lg),
                AppCard(
                  child: Text(
                    'Your rating has been submitted'
                    '${trip.feedbackRating == null ? '.' : ': ${trip.feedbackRating} stars.'}',
                    style: AppTypography.bodyMedium(
                      color: p.textSecondary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
