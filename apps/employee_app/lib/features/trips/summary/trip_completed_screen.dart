import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/features/boarding/completion/driver_rating_prompt_service.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/trip_illustrations.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';

class TripCompletedScreen extends StatefulWidget {
  final Map<String, dynamic>? tripData;

  const TripCompletedScreen({super.key, this.tripData});

  @override
  State<TripCompletedScreen> createState() => _TripCompletedScreenState();
}

class _TripCompletedScreenState extends State<TripCompletedScreen> {
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
      setState(() => _checkedForRating = true);
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
      builder: (context, trip) {
        final destination = trip['destinationAddress']?.toString() ??
            (trip['officeDestination'] is Map
                ? (trip['officeDestination'] as Map)['name']?.toString()
                : null) ??
            'Destination';
        final dropTime = EmployeeDataProvider.formatDisplayTime(
          trip['actualDepartureTime']?.toString() ??
              trip['actualArrivalTime']?.toString() ??
              trip['plannedEta']?.toString() ??
              trip['shiftTime']?.toString(),
        );
        final shiftDate = EmployeeDataProvider.formatDisplayDate(
          trip['shiftDate']?.toString(),
        );

        return TripStageScaffold(
          title: "Today's Trip",
          statusLabel: 'Completed',
          statusVariant: BadgeVariant.completed,
          children: [
            const SizedBox(height: AppSpacing.sm),
            const TripCompletedBadge(),
            const SizedBox(height: AppSpacing.xxl),
            const TripHeadline(
              title: 'Trip Completed!',
              subtitle: 'You have reached your destination.',
            ),
            const SizedBox(height: AppSpacing.xxxl),
            TripInfoCard(
              items: [
                TripInfoItem(
                  icon: Icons.apartment_rounded,
                  label: 'Destination',
                  value: destination,
                ),
                TripInfoItem(
                  icon: Icons.access_time_rounded,
                  label: 'Drop Time',
                  value: dropTime.isNotEmpty ? dropTime : 'Completed',
                ),
                TripInfoItem(
                  icon: Icons.calendar_today_outlined,
                  label: 'Shift Date',
                  value: shiftDate.isNotEmpty ? shiftDate : 'Today',
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xxxl + 4),
            EmployeePrimaryButton(
              label: 'Provide Feedback',
              icon: Icons.star_border_rounded,
              onPressed: () => context.push(AppRoutes.postTripFeedback),
            ),
            const SizedBox(height: AppSpacing.md),
            EmployeeTextLink(
              label: 'View Trip Details',
              onPressed: () => context.push(AppRoutes.tripDetails),
            ),
          ],
        );
      },
    );
  }
}
