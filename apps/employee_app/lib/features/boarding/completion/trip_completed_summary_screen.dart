import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/features/boarding/completion/driver_rating_prompt_service.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/boarding_illustrations.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Trip Completed Summary backed by live trip data.
class TripCompletedSummaryScreen extends StatefulWidget {
  final Map<String, dynamic>? tripData;

  const TripCompletedSummaryScreen({super.key, this.tripData});

  @override
  State<TripCompletedSummaryScreen> createState() =>
      _TripCompletedSummaryScreenState();
}

class _TripCompletedSummaryScreenState
    extends State<TripCompletedSummaryScreen> {
  bool _checkingForRating = false;
  bool _checkedForRating = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkCompletedTripAndPrompt();
    });
  }

  Future<void> _checkCompletedTripAndPrompt() async {
    if (!mounted || _checkingForRating || _checkedForRating) return;

    _checkingForRating = true;
    try {
      await DriverRatingPromptService.checkAndPrompt(
        context,
        tripData: widget.tripData,
      );
      if (!mounted) return;
      _checkedForRating = true;
    } catch (error) {
      if (!mounted) return;
      _checkedForRating = false;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Unable to check completed trip rating: $error'),
          action: SnackBarAction(
            label: 'Retry',
            onPressed: _checkCompletedTripAndPrompt,
          ),
        ),
      );
    } finally {
      _checkingForRating = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () async => widget.tripData ?? await loadLiveLatestTrip(context),
      builder: (context, data) {
        final p = EmployeePalette.of(context);
        final tripType = EmployeeDataProvider.formatDirectionLabel(
          data['direction']?.toString(),
        );
        final pickupTime = EmployeeDataProvider.formatDisplayTime(
          data['plannedEta']?.toString() ?? data['shiftTime']?.toString(),
        );
        final dropTime = EmployeeDataProvider.formatDisplayTime(
          data['actualDepartureTime']?.toString() ??
              data['actualArrivalTime']?.toString(),
        );
        final shiftDate = EmployeeDataProvider.formatDisplayDate(
          data['shiftDate']?.toString(),
        );
        final destination = data['destinationAddress']?.toString() ??
            (data['officeDestination'] is Map
                ? (data['officeDestination'] as Map)['name']?.toString()
                : null) ??
            'Destination';

        final metrics = <(String, String)>[
          ('Trip Type', tripType),
          ('Shift Date', shiftDate.isNotEmpty ? shiftDate : 'Today'),
          ('Pickup Time', pickupTime.isNotEmpty ? pickupTime : 'Completed'),
          ('Drop Time', dropTime.isNotEmpty ? dropTime : 'Completed'),
          ('Destination', destination),
        ];

        return EmployeeCenteredLayout(
          appBar: const EmployeeAppBar(),
          illustration: const BoardingSuccessBadge(),
          illustrationGap: AppSpacing.xl,
          title: 'Trip Completed!',
          message: 'Your trip has been completed successfully.',
          content: AppCard(
            width: double.infinity,
            child: Column(
              children: [
                for (final (i, (label, value)) in metrics.indexed) ...[
                  if (i > 0) Divider(color: p.border, height: AppSpacing.xl),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          label,
                          style: AppTypography.small(
                            color: p.textSecondary,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      Flexible(
                        child: Text(
                          value,
                          textAlign: TextAlign.end,
                          style: AppTypography.bodyMedium(
                            color: p.textPrimary,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          actions: [
            EmployeePrimaryButton(
              label: 'Continue',
              onPressed: () => context.push(
                AppRoutes.safeReachConfirmation,
                extra: widget.tripData ?? data,
              ),
            ),
          ],
        );
      },
    );
  }
}
