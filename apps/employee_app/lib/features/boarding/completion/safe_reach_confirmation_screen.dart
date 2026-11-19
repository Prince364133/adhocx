import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/boarding_illustrations.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';

/// Safe Reach Confirmation wired to real POST /corporate/me/trips/:stopId/safe-reach.
class SafeReachConfirmationScreen extends StatefulWidget {
  const SafeReachConfirmationScreen({super.key});

  @override
  State<SafeReachConfirmationScreen> createState() =>
      _SafeReachConfirmationScreenState();
}

class _SafeReachConfirmationScreenState
    extends State<SafeReachConfirmationScreen> {
  bool _submitting = false;

  Future<String?> _resolveStopId() async {
    try {
      final extra = GoRouterState.of(context).extra;
      if (extra is Map && extra['stopId'] != null) {
        return extra['stopId'].toString();
      }
      if (extra is String && extra.isNotEmpty) return extra;
    } catch (_) {}

    final data = maybeEmployeeData(context);
    if (data == null) return null;
    if (data.activeStopId != null && data.activeStopId!.isNotEmpty) {
      return data.activeStopId;
    }
    final latest = await loadLiveLatestTrip(context);
    return latest['stopId']?.toString();
  }

  Future<void> _confirmSafeReach() async {
    setState(() => _submitting = true);
    final data = maybeEmployeeData(context);
    final stopId = await _resolveStopId();
    if (!mounted) return;

    try {
      if (data != null && stopId != null && stopId.isNotEmpty) {
        await data.repository.submitSafeReach(stopId, confirmed: true);
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
              'Safe arrival confirmed with AdhocX Command Center. Thank you!'),
          backgroundColor: AppColors.success,
        ),
      );
      context.push(
        AppRoutes.postTripFeedback,
        extra: stopId != null ? {'stopId': stopId} : null,
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Unable to confirm safe reach: ${e.toString().replaceFirst('Exception: ', '')}',
          ),
          backgroundColor: AppColors.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return EmployeeCenteredLayout(
      appBar: const EmployeeAppBar(),
      illustration: const SafeReachShieldBadge(),
      illustrationGap: AppSpacing.xxl,
      title: 'Did You Reach Safely?',
      message:
          "Please confirm that you've reached your destination safely.",
      actions: [
        EmployeePrimaryButton(
          label: "Yes, I'm Safe",
          icon: Icons.shield_rounded,
          isLoading: _submitting,
          onPressed: _submitting ? null : _confirmSafeReach,
        ),
        EmployeeSecondaryButton(
          label: 'I Need Help',
          icon: Icons.sos_rounded,
          textColor: AppColors.error,
          borderColor: AppColors.error.withAlpha(110),
          onPressed: () => context.push(AppRoutes.safetySos),
        ),
        EmployeeTextLink(
          label: 'Skip for Now',
          emphasised: false,
          onPressed: () => context.go(AppRoutes.homeUpcomingPickup),
        ),
      ],
    );
  }
}
