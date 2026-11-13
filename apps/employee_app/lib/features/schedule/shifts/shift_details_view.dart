import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/schedule_widgets.dart';

/// Shared body of the Login / Overnight shift details screens.
class ShiftDetailsView extends StatelessWidget {
  final String sectionKey;
  final Widget badge;
  final Color accent;
  final Map<String, String> fallback;

  const ShiftDetailsView({
    super.key,
    required this.sectionKey,
    required this.badge,
    required this.accent,
    required this.fallback,
  });

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadScheduleSection(sectionKey),
      builder: (context, shift) {
        final p = EmployeePalette.of(context);
        final pickup = shift['rosterPickup'] as Map<String, dynamic>?;
        final drop = shift['rosterDrop'] as Map<String, dynamic>?;

        Widget infoRow(IconData icon, String text) => Row(
              children: [
                Icon(icon, size: 20, color: accent),
                const SizedBox(width: AppSpacing.md + 2),
                Expanded(
                  child: Text(
                    text,
                    style: AppTypography.bodyMedium(
                      color: p.textPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            );

        Widget leg(Color color, String title, String place) => Row(
              children: [
                Icon(Icons.location_on, color: color, size: 22),
                const SizedBox(width: AppSpacing.md + 2),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: AppTypography.bodyMedium(
                          color: p.textPrimary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(place,
                          style: AppTypography.caption(color: p.textSecondary)),
                    ],
                  ),
                ),
              ],
            );

        return Scaffold(
          backgroundColor: p.background,
          appBar: const EmployeeAppBar(),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.xxl,
                AppSpacing.sm,
                AppSpacing.xxl,
                AppSpacing.xxl,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Shift Details',
                    textAlign: TextAlign.center,
                    style: AppTypography.h2(color: p.textPrimary),
                  ),
                  const SizedBox(height: AppSpacing.md + 2),
                  Center(child: badge),
                  const SizedBox(height: AppSpacing.xxl),
                  AppCard(
                    padding: AppSpacing.paddingXl,
                    child: Column(
                      children: [
                        infoRow(Icons.calendar_month_outlined,
                            shift['date'] ?? fallback['date']!),
                        Divider(color: p.border, height: AppSpacing.xxl + 4),
                        infoRow(Icons.access_time_rounded,
                            shift['shiftHours'] ?? fallback['hours']!),
                        Divider(color: p.border, height: AppSpacing.xxl + 4),
                        infoRow(Icons.apartment_rounded,
                            shift['office'] ?? 'HITEC City Office'),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xxl + 4),
                  const EmployeeSectionHeader(
                    title: 'Transport (Roster)',
                    padding: EdgeInsets.zero,
                  ),
                  const SizedBox(height: AppSpacing.md + 2),
                  AppCard(
                    padding: AppSpacing.paddingXl,
                    backgroundColor: p.surfaceElevated,
                    child: Column(
                      children: [
                        leg(
                          AppColors.success,
                          'Pickup • ${pickup?['time'] ?? fallback['pickupTime']}',
                          pickup?['location'] ?? fallback['pickupLoc']!,
                        ),
                        Divider(color: p.border, height: AppSpacing.xxl + 4),
                        leg(
                          AppColors.warning,
                          'Drop • ${drop?['time'] ?? fallback['dropTime']}',
                          drop?['location'] ?? fallback['dropLoc']!,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
