import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import '../widgets/safety_widgets.dart';

/// SOS sent confirmation. Emergency response surface: fixed dark slate in
/// light and dark mode.
class SosAlertConfirmedScreen extends StatelessWidget {
  const SosAlertConfirmedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final onDark = Colors.white.withAlpha(179);

    Widget step(String title, String status,
        {bool done = false, bool active = false}) {
      final dot = done
          ? AppColors.success
          : active
              ? AppColors.accentBlue
              : Colors.white.withAlpha(61);
      return Row(
        children: [
          Container(
            width: 18,
            height: 18,
            decoration: BoxDecoration(color: dot, shape: BoxShape.circle),
            child: done
                ? const Icon(Icons.check, size: 12, color: Colors.white)
                : active
                    ? Center(
                        child: Container(
                          width: 6,
                          height: 6,
                          decoration: const BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                          ),
                        ),
                      )
                    : null,
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Text(
              title,
              style: AppTypography.small(
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Text(
            status,
            style: AppTypography.caption(
              color: done
                  ? AppColors.accentGreenLight
                  : active
                      ? AppColors.primaryLight
                      : Colors.white.withAlpha(97),
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      );
    }

    return TripDataBuilder(
      load: () => loadSafetySection('sos_alert'),
      builder: (context, data) => Scaffold(
        backgroundColor: AppColors.slate800,
        appBar: EmployeeAppBar(
          backgroundColor: Colors.transparent,
          foregroundColor: Colors.white,
          leading: IconButton(
            tooltip: 'Close',
            icon: Icon(Icons.close_rounded, color: onDark),
            onPressed: () => Navigator.of(context).maybePop(),
          ),
        ),
        body: SafeArea(
          child: Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.xxl,
                    vertical: AppSpacing.lg,
                  ),
                  child: Column(
                    children: [
                      Container(
                        width: 72,
                        height: 72,
                        decoration: const BoxDecoration(
                          color: AppColors.success,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.check_rounded,
                            color: Colors.white, size: 44),
                      ),
                      const SizedBox(height: AppSpacing.xl),
                      Text(
                        data['title'] ?? 'SOS Alert Sent',
                        style: AppTypography.h2(color: Colors.white),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        data['message'] ??
                            'Our safety team has been notified and is contacting you shortly.',
                        textAlign: TextAlign.center,
                        style: AppTypography.small(color: onDark),
                      ),
                      const SizedBox(height: AppSpacing.xxl),
                      Container(
                        width: double.infinity,
                        padding: AppSpacing.paddingLg,
                        decoration: BoxDecoration(
                          color: AppColors.error.withAlpha(51),
                          borderRadius: AppRadius.borderXxl,
                          border: Border.all(color: AppColors.error),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.headset_mic_rounded,
                                color: AppColors.errorContainer, size: 24),
                            const SizedBox(width: AppSpacing.md),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Live Assistance',
                                    style: AppTypography.small(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    data['liveAssistance'] ??
                                        'You will receive a call from our safety team in a few moments.',
                                    style: AppTypography.caption(color: onDark),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xxl),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(AppSpacing.lg + 2),
                        decoration: BoxDecoration(
                          color: AppColors.slate900,
                          borderRadius: AppRadius.borderXxl,
                          border: Border.all(color: Colors.white.withAlpha(26)),
                        ),
                        child: Column(
                          children: [
                            step('Alert Received', '9:41 AM', done: true),
                            Divider(
                                color: Colors.white.withAlpha(31),
                                height: AppSpacing.xl),
                            step('Team Assigned', 'In Progress', active: true),
                            Divider(
                                color: Colors.white.withAlpha(31),
                                height: AppSpacing.xl),
                            step('In Contact', 'Pending'),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.xxl,
                  AppSpacing.sm,
                  AppSpacing.xxl,
                  AppSpacing.lg,
                ),
                child: EmployeePrimaryButton(
                  label: 'Stay on This Screen (Incoming Call)',
                  backgroundColor: AppColors.accentBlue,
                  onPressed: () => context.push(AppRoutes.safetyTeamCall),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
