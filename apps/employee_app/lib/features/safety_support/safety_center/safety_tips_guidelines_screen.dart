import 'package:flutter/material.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/components/trip/trip_widgets.dart';
import 'package:adhocx_employee/shared/illustrations/safety_illustrations.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';
import '../widgets/safety_widgets.dart';

class SafetyTipsGuidelinesScreen extends StatelessWidget {
  const SafetyTipsGuidelinesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return TripDataBuilder(
      load: () => loadSafetyList('safety_tips'),
      builder: (context, data) {
        final p = EmployeePalette.of(context);
        final tips = (data['items'] as List<dynamic>?) ?? const [];

        return Scaffold(
          backgroundColor: p.background,
          appBar: const EmployeeAppBar(title: 'Safety Tips'),
          body: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.xxl,
                vertical: AppSpacing.xl,
              ),
              child: Column(
                children: [
                  const SizedBox(height: AppSpacing.md),
                  const SafetyCenterShieldBadge(),
                  const SizedBox(height: AppSpacing.xl),
                  Text(
                    'Travel Safely with AdhocX',
                    textAlign: TextAlign.center,
                    style: AppTypography.h2(color: p.textPrimary, fontSize: 20),
                  ),
                  const SizedBox(height: AppSpacing.xxl + 4),
                  AppCard(
                    width: double.infinity,
                    padding: AppSpacing.paddingXl,
                    child: Column(
                      children: [
                        for (var i = 0; i < tips.length; i++) ...[
                          if (i > 0)
                            Divider(color: p.border, height: AppSpacing.xxl),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(Icons.check_circle_rounded,
                                  color: AppColors.success, size: 20),
                              const SizedBox(width: AppSpacing.md + 2),
                              Expanded(
                                child: Text(
                                  '${tips[i]}',
                                  style: AppTypography.bodyMedium(
                                    color: p.textPrimary,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
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
