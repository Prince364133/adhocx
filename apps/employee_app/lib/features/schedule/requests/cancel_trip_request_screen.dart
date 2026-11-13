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
import '../widgets/schedule_widgets.dart';

class CancelTripRequestScreen extends StatefulWidget {
  const CancelTripRequestScreen({super.key});

  @override
  State<CancelTripRequestScreen> createState() =>
      _CancelTripRequestScreenState();
}

class _CancelTripRequestScreenState extends State<CancelTripRequestScreen> {
  static const _reasons = [
    'Work from home',
    'Personal emergency',
    'Shift rescheduled',
    'Taking private transport',
    'Other reason',
  ];

  late final Future<Map<String, dynamic>?> _today = loadScheduleSection('today');
  String _selectedReason = _reasons.first;
  // Empty: the old pre-filled note looked like something the user typed.
  final TextEditingController _notesController = TextEditingController();

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  /// Cancelling is destructive, so confirm first (Driver confirmation pattern).
  void _confirmCancel() {
    AppBottomSheet.show<void>(
      context: context,
      title: 'Cancel this trip?',
      child: Builder(
        builder: (sheetContext) => EmployeeConfirmationSheet(
          title: 'Your cab will be released',
          description:
              'Reason: $_selectedReason. You can schedule transport again from My Schedule.',
          confirmLabel: 'Yes, Cancel Trip',
          cancelLabel: 'Keep Trip',
          onConfirm: () {
            Navigator.pop(sheetContext);
            context.push(AppRoutes.tripCancelled);
          },
          onCancel: () => Navigator.pop(sheetContext),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Map<String, dynamic>?>(
      future: _today,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const EmployeeLoadingScaffold(appBar: EmployeeAppBar());
        }
        final p = EmployeePalette.of(context);
        final today = snapshot.data ?? const {};
        final drop = today['drop'] as Map<String, dynamic>?;

        OutlineInputBorder border(Color color, [double width = 1]) =>
            OutlineInputBorder(
              borderRadius: AppRadius.borderXl,
              borderSide: BorderSide(color: color, width: width),
            );

        Text label(String text) => Text(
              text,
              style: AppTypography.small(
                color: p.textPrimary,
                fontWeight: FontWeight.w700,
              ),
            );

        return Scaffold(
          backgroundColor: p.background,
          appBar: const EmployeeAppBar(),
          body: SafeArea(
            child: SingleChildScrollView(
              keyboardDismissBehavior:
                  ScrollViewKeyboardDismissBehavior.onDrag,
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
                    'Cancel Trip',
                    textAlign: TextAlign.center,
                    style: AppTypography.h2(color: p.textPrimary),
                  ),
                  const SizedBox(height: AppSpacing.xxl),
                  AppCard(
                    backgroundColor: AppColors.warningContainer,
                    borderColor: AppColors.warning.withAlpha(90),
                    child: ScheduleLegRow(
                      isDrop: true,
                      time: drop?['time'] ?? '6:30 PM',
                      route: today['date'] ?? 'Tue, 09 Dec 2026',
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xxl + 4),
                  label('Reason for cancellation *'),
                  const SizedBox(height: AppSpacing.sm),
                  DropdownButtonFormField<String>(
                    initialValue: _selectedReason,
                    isExpanded: true,
                    dropdownColor: p.surface,
                    icon: Icon(Icons.keyboard_arrow_down_rounded,
                        color: p.textSecondary),
                    style: AppTypography.bodyMedium(color: p.textPrimary),
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: p.surfaceElevated,
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.lg,
                        vertical: AppSpacing.md,
                      ),
                      enabledBorder: border(p.border),
                      focusedBorder: border(p.accent, 1.5),
                    ),
                    items: [
                      for (final r in _reasons)
                        DropdownMenuItem(value: r, child: Text(r)),
                    ],
                    onChanged: (val) {
                      if (val != null) setState(() => _selectedReason = val);
                    },
                  ),
                  const SizedBox(height: AppSpacing.xxl),
                  label('Additional details (Optional)'),
                  const SizedBox(height: AppSpacing.sm),
                  TextField(
                    controller: _notesController,
                    maxLines: 4,
                    maxLength: 200,
                    textCapitalization: TextCapitalization.sentences,
                    style: AppTypography.body(color: p.textPrimary),
                    cursorColor: p.accent,
                    decoration: InputDecoration(
                      hintText: "e.g. I'll be working from home tomorrow.",
                      hintStyle: AppTypography.body(color: p.textMuted),
                      counterStyle: AppTypography.micro(color: p.textMuted),
                      filled: true,
                      fillColor: p.surfaceElevated,
                      enabledBorder: border(p.border),
                      focusedBorder: border(p.accent, 1.5),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xxxl),
                  EmployeeDangerButton(
                    label: 'Cancel Trip',
                    onPressed: _confirmCancel,
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
