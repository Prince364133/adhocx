import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/safety_widgets.dart';

class EmergencyContactsScreen extends StatelessWidget {
  const EmergencyContactsScreen({super.key});

  static (IconData, Color) _style(String type) {
    switch (type) {
      case 'security':
        return (Icons.shield_rounded, AppColors.success);
      case 'police':
        return (Icons.local_police_rounded, AppColors.brandOrange);
      case 'medical':
        return (Icons.medical_services_rounded, AppColors.error);
      case 'fire':
        return (Icons.local_fire_department_rounded, AppColors.warning);
      case 'company':
        return (Icons.headset_mic_rounded, AppColors.primary);
      default:
        return (Icons.phone_in_talk_rounded, AppColors.primary);
    }
  }

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadSafetyList('emergency_contacts'),
      builder: (context, data) {
        final p = EmployeePalette.of(context);
        final contacts = (data['items'] as List<dynamic>?) ?? const [];

        return Scaffold(
          backgroundColor: p.background,
          appBar: const EmployeeAppBar(title: 'Emergency Contacts'),
          body: SafeArea(
            child: ListView.separated(
              padding: const EdgeInsets.all(AppSpacing.xl),
              itemCount: contacts.length,
              separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
              itemBuilder: (context, index) {
                final contact = contacts[index] as Map<String, dynamic>;
                final name = '${contact['name'] ?? ''}';
                final phone = '${contact['phone'] ?? ''}';
                final (icon, color) = _style('${contact['type'] ?? ''}');

                return AppCard(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.lg,
                    vertical: AppSpacing.md,
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.sm + 2),
                        decoration: BoxDecoration(
                          color: color.withAlpha(p.isDark ? 46 : 31),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(icon, color: color, size: 22),
                      ),
                      const SizedBox(width: AppSpacing.md + 2),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              name,
                              style: AppTypography.bodyMedium(
                                color: p.textPrimary,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              phone,
                              style: AppTypography.small(
                                color: p.textSecondary,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Was a "Dialing…" snackbar that never dialled.
                      IconButton(
                        tooltip: 'Call $name',
                        icon: Icon(Icons.call_rounded, color: p.accent),
                        onPressed: () => dialNumber(phone),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        );
      },
    );
  }
}
