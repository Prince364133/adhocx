import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/features/boarding/completion/driver_rating_prompt_service.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/boarding_illustrations.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/boarding_widgets.dart';

/// Screen 10: Trip Completed
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
      load: () => loadBoardingSection('trip_completed'),
      builder: (context, data) {
        final p = EmployeePalette.of(context);
        final metrics = <(String, String)>[
          ('Trip Type', data['tripType'] ?? 'Login (Pickup)'),
          ('Pickup Time', data['pickupTime'] ?? '8:15 AM'),
          ('Drop Time', data['dropTime'] ?? '9:02 AM'),
          ('Duration', data['duration'] ?? '47 min'),
          ('Distance', data['distance'] ?? '12.4 km'),
        ];

        return EmployeeCenteredLayout(
          appBar: const EmployeeAppBar(),
          illustration: const BoardingSuccessBadge(),
          illustrationGap: AppSpacing.xl,
          title: data['title'] ?? 'Trip Completed!',
          message:
              data['subtitle'] ?? 'Your trip has been completed successfully.',
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
                      Text(
                        value,
                        style: AppTypography.bodyMedium(
                          color: p.textPrimary,
                          fontWeight: FontWeight.w700,
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
              // Leads to the safe-reach check (was mislabelled
              // "View Trip Details").
              label: 'Continue',
              onPressed: () => context.push(
                AppRoutes.safeReachConfirmation,
                extra: widget.tripData,
              ),
            ),
          ],
        );
      },
    );
  }
}
