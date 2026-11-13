import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Screen 9: Request Details & Tracking
class RequestDetailsTrackingScreen extends StatelessWidget {
  const RequestDetailsTrackingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

    Widget meta(String label, String value) => Row(
          children: [
            Text(label, style: AppTypography.caption(color: p.textMuted)),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Text(
                value,
                textAlign: TextAlign.end,
                style: AppTypography.small(
                  color: p.textPrimary,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        );

    return Scaffold(
      backgroundColor: p.background,
      appBar: const EmployeeAppBar(title: 'Request Details'),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.xl,
            vertical: AppSpacing.lg,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(AppSpacing.sm),
                          decoration: BoxDecoration(
                            color: p.accentTint,
                            borderRadius: AppRadius.borderLg,
                          ),
                          child: Icon(Icons.flag_rounded,
                              color: p.accent, size: 20),
                        ),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(
                          child: Text(
                            'Unsafe Driving',
                            style: AppTypography.h4(
                              color: p.textPrimary,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        EmployeeStatusBadge.fromString('In Progress'),
                      ],
                    ),
                    Divider(color: p.border, height: AppSpacing.xxl),
                    meta('Request ID', 'ADH-784512'),
                    const SizedBox(height: AppSpacing.sm),
                    meta('Created On', '09 Dec 2026, 10:20 AM'),
                    const SizedBox(height: AppSpacing.sm),
                    meta('Trip', 'Login (Pickup) - 8:15 AM'),
                    Divider(color: p.border, height: AppSpacing.xxl),
                    Text(
                      'Description',
                      style: AppTypography.caption(
                        color: p.textMuted,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      'Driver was overspeeding on the main road.',
                      style: AppTypography.body(color: p.textPrimary),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              TripSectionCard(
                title: 'Ticket Progress',
                child: TripTimeline(
                  dotSize: 18,
                  entries: [
                    const TripTimelineEntry(
                      dotColor: AppColors.success,
                      dotChild: Icon(Icons.check, size: 12, color: Colors.white),
                      title: 'Request Received',
                      subtitle: '09 Dec, 10:20 AM',
                    ),
                    TripTimelineEntry(
                      dotColor: AppColors.primary,
                      dotChild: Container(
                        width: 6,
                        height: 6,
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                        ),
                      ),
                      title: 'Under Review',
                      emphasise: true,
                      subtitle: 'Our team is reviewing your request.',
                    ),
                    TripTimelineEntry(
                      dotColor: p.border,
                      title: 'Resolution Update',
                      subtitle: "You'll be notified once it's resolved.",
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.xxl),
              // DEMO ONLY: preview the resolved state; remove before release.
              EmployeeTextLink(
                label: 'Preview Resolved State',
                onPressed: () => context.push(AppRoutes.requestResolved),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
