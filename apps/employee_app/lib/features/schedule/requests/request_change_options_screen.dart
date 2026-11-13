import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

class RequestChangeOptionsScreen extends StatefulWidget {
  const RequestChangeOptionsScreen({super.key});

  /// The change types offered; the chosen one is passed to the details
  /// screen as the route `extra` (it was previously ignored).
  static const options = [
    'Change Pickup Location',
    'Change Pickup Time',
    'Change Drop Location',
    'Change Drop Time',
  ];

  @override
  State<RequestChangeOptionsScreen> createState() =>
      _RequestChangeOptionsScreenState();
}

class _RequestChangeOptionsScreenState
    extends State<RequestChangeOptionsScreen> {
  int _selected = 0;

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    const options = RequestChangeOptionsScreen.options;

    return Scaffold(
      backgroundColor: p.background,
      appBar: const EmployeeAppBar(),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.xxl,
                  vertical: AppSpacing.sm,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Request Change',
                      textAlign: TextAlign.center,
                      style: AppTypography.h2(color: p.textPrimary),
                    ),
                    const SizedBox(height: AppSpacing.xxxl),
                    Text(
                      'What do you want to change?',
                      style: AppTypography.h4(
                        color: p.textPrimary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg + 2),
                    for (var i = 0; i < options.length; i++)
                      EmployeeEntrance(
                        delay: Duration(milliseconds: 60 * i),
                        child: Padding(
                          padding: const EdgeInsets.only(bottom: AppSpacing.md),
                          child: _OptionCard(
                            label: options[i],
                            selected: _selected == i,
                            onTap: () => setState(() => _selected = i),
                          ),
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
                label: 'Continue',
                onPressed: () => context.push(
                  AppRoutes.changeDetails,
                  extra: options[_selected],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OptionCard extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _OptionCard({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

    return Semantics(
      inMutuallyExclusiveGroup: true,
      checked: selected,
      button: true,
      label: label,
      excludeSemantics: true,
      child: Material(
        color: selected ? p.accentTint : p.surface,
        shape: RoundedRectangleBorder(
          borderRadius: AppRadius.borderLg,
          side: BorderSide(
            color: selected ? p.accent : p.border,
            width: selected ? 2 : 1.2,
          ),
        ),
        child: InkWell(
          onTap: onTap,
          borderRadius: AppRadius.borderLg,
          child: Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.lg,
              vertical: AppSpacing.md + 2,
            ),
            child: Row(
              children: [
                Icon(
                  selected ? Icons.radio_button_checked : Icons.radio_button_off,
                  color: selected ? p.accent : p.textMuted,
                  size: 22,
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Text(
                    label,
                    style: AppTypography.bodyMedium(
                      color: selected ? p.accent : p.textPrimary,
                      fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
