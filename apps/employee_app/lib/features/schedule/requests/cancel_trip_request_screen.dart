import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
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

  String _selectedReason = _reasons.first;
  final TextEditingController _notesController = TextEditingController();
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      try {
        final data = context.read<EmployeeDataProvider>();
        data.loadNextTrip();
        data.loadSchedule();
      } catch (_) {}
    });
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  String? _resolveStopId(BuildContext context, EmployeeDataProvider? data) {
    try {
      final extra = GoRouterState.of(context).extra;
      if (extra is Map && extra['stopId'] != null) {
        return extra['stopId'].toString();
      }
      if (extra is String && extra.isNotEmpty) return extra;
    } catch (_) {}
    if (data?.hasActiveTrip == true && data?.activeStopId != null) {
      return data!.activeStopId;
    }
    for (final item in data?.scheduleItems ?? const []) {
      if (item['stopId'] != null && item['canCancel'] != false) {
        return item['stopId'].toString();
      }
    }
    return null;
  }

  Future<void> _submitCancellation(String? stopId) async {
    EmployeeDataProvider? data;
    try {
      data = context.read<EmployeeDataProvider>();
    } catch (_) {
      data = null;
    }

    final notes = _notesController.text.trim();
    final fullReason =
        notes.isNotEmpty ? '$_selectedReason — $notes' : _selectedReason;

    if (stopId == null || stopId.isEmpty || data == null) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No cancellable upcoming trip found.'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      await data.cancelStop(stopId, reason: fullReason);
      if (!mounted) return;
      context.push(AppRoutes.tripCancelled);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            e.toString().replaceFirst('Exception: ', ''),
          ),
          backgroundColor: AppColors.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _confirmCancel(String? stopId) {
    AppBottomSheet.show<void>(
      context: context,
      title: 'Cancel this trip?',
      child: Builder(
        builder: (sheetContext) => EmployeeConfirmationSheet(
          title: 'Your cab will be released',
          description:
              'Reason: $_selectedReason. You can view updated rides in My Schedule.',
          confirmLabel: 'Yes, Cancel Trip',
          cancelLabel: 'Keep Trip',
          onConfirm: () {
            Navigator.pop(sheetContext);
            _submitCancellation(stopId);
          },
          onCancel: () => Navigator.pop(sheetContext),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    EmployeeDataProvider? data;
    try {
      data = context.watch<EmployeeDataProvider>();
    } catch (_) {}

    final stopId = _resolveStopId(context, data);
    final nextTrip = data?.hasActiveTrip == true ? data!.nextTrip : null;
    final dir = (nextTrip?['direction'] ?? '').toString().toUpperCase();
    final isDrop = dir == 'LOGOUT' || dir == 'DROP';
    final displayTime = EmployeeDataProvider.formatDisplayTime(
      nextTrip?['plannedEta']?.toString() ??
          nextTrip?['shiftTime']?.toString(),
    );
    final displayDate = nextTrip?['shiftDate'] != null
        ? EmployeeDataProvider.formatDisplayDate(
            nextTrip!['shiftDate'].toString(),
          )
        : formatScheduleDayLabel(DateTime.now());

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
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.pageHorizontal,
            AppSpacing.sm,
            AppSpacing.pageHorizontal,
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
                  isDrop: isDrop,
                  time: displayTime.isNotEmpty ? displayTime : 'Upcoming',
                  route: displayDate,
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
                isLoading: _submitting,
                onPressed: _submitting ? null : () => _confirmCancel(stopId),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
