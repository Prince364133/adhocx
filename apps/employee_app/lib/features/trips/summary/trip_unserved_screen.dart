import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/illustrations/trip_illustrations.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';

class TripUnservedScreen extends StatelessWidget {
  const TripUnservedScreen({super.key});

  static const _helpline = '+91 78935 45818';

  Future<void> _callHelpline() async {
    final uri = Uri.parse('tel:${_helpline.replaceAll(' ', '')}');
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  void _showSupportSheet(BuildContext context) {
    AppBottomSheet.show<void>(
      context: context,
      title: '24/7 Corporate Transport Desk',
      child: Builder(
        builder: (sheetContext) {
          final p = EmployeePalette.of(sheetContext);
          return Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Our operations desk has been automatically notified and is coordinating with standby backup fleets.',
                style: AppTypography.small(color: p.textSecondary),
              ),
              const SizedBox(height: AppSpacing.lg),
              AppCard(
                padding: EdgeInsets.zero,
                // Own Material so the ListTile ripple shows on the card.
                child: Material(
                  color: Colors.transparent,
                  child: ListTile(
                  onTap: _callHelpline,
                  leading: Icon(Icons.phone_in_talk_rounded, color: p.accent),
                  title: Text(
                    'Emergency Transport Helpline',
                    style: AppTypography.bodyMedium(
                      color: p.textPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  subtitle: Text(
                    _helpline,
                    style: AppTypography.small(color: p.accent),
                  ),
                  trailing: Icon(Icons.call_rounded, color: p.accent),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => MockDataService.getTrip('unserved'),
      builder: (context, trip) {
        final p = EmployeePalette.of(context);

        return TripStageScaffold(
          title: "Today's Pickup",
          statusLabel: 'Unserved',
          statusVariant: BadgeVariant.delayed,
          children: [
            const SizedBox(height: AppSpacing.xxl),
            const TripUnservedBadge(),
            const SizedBox(height: AppSpacing.xxl),
            TripHeadline(
              title: 'Trip Not Served',
              subtitle: trip['message'] ??
                  "We couldn't allocate a cab for this trip. Please contact support if you need assistance.",
            ),
            const SizedBox(height: AppSpacing.xxxl + AppSpacing.lg),
            EmployeeSecondaryButton(
              label: 'Contact Support',
              icon: Icons.headset_mic_outlined,
              textColor: p.accent,
              borderColor: p.accent,
              onPressed: () => _showSupportSheet(context),
            ),
            const SizedBox(height: AppSpacing.md),
            EmployeeSecondaryButton(
              label: 'View Schedule',
              icon: Icons.calendar_month_outlined,
              onPressed: () => context.go(AppRoutes.scheduleToday),
            ),
          ],
        );
      },
    );
  }
}
