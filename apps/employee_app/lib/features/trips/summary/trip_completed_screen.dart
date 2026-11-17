import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/features/boarding/completion/driver_rating_prompt_service.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/illustrations/trip_illustrations.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';

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
      load: () => MockDataService.getTrip('completed'),
      builder: (context, trip) {
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
                  label: 'Office',
                  value: trip['destination'] ?? 'HITEC City Office',
                ),
                TripInfoItem(
                  icon: Icons.access_time_rounded,
                  label: 'Drop Time',
                  value: trip['dropTime'] ?? '9:02 AM',
                ),
                TripInfoItem(
                  icon: Icons.timer_outlined,
                  label: 'Trip Duration',
                  value: trip['duration'] ?? '47 min',
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xxxl + 4),
            EmployeePrimaryButton(
              label: 'Provide Feedback',
              icon: Icons.star_border_rounded,
              onPressed: () => context.push(AppRoutes.tripDetails),
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
