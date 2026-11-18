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

/// Details for the change chosen on the previous screen (route `extra`,
/// e.g. "Change Drop Time"); submits via rescheduleRequest or support ticket API.
class ChangeRequestDetailsScreen extends StatefulWidget {
  final String? changeType;

  const ChangeRequestDetailsScreen({super.key, this.changeType});

  @override
  State<ChangeRequestDetailsScreen> createState() =>
      _ChangeRequestDetailsScreenState();
}

class _ChangeRequestDetailsScreenState
    extends State<ChangeRequestDetailsScreen> {
  final TextEditingController _valueController = TextEditingController();
  final TextEditingController _reasonController = TextEditingController();
  bool _submitting = false;
  bool _prefilled = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadInitial());
  }

  Future<void> _loadInitial() async {
    EmployeeDataProvider? data;
    try {
      data = context.read<EmployeeDataProvider>();
    } catch (_) {
      data = null;
    }
    if (data == null) return;
    await Future.wait([data.loadProfile(), data.loadSchedule()]);
    if (!mounted || _prefilled) return;
    final changeType = _resolveChangeType(context);
    final isTime = changeType.endsWith('Time');
    if (isTime) {
      final firstItem =
          data.scheduleItems.isNotEmpty ? data.scheduleItems.first : null;
      _valueController.text = firstItem?['shiftTime']?.toString() ?? '';
    } else {
      final pickupLoc = data.profile?['defaultPickupLocation'];
      if (pickupLoc is Map && pickupLoc['addressText'] != null) {
        _valueController.text = pickupLoc['addressText'].toString();
      }
    }
    _prefilled = true;
    setState(() {});
  }

  @override
  void dispose() {
    _valueController.dispose();
    _reasonController.dispose();
    super.dispose();
  }

  String _resolveChangeType(BuildContext context) {
    if (widget.changeType != null) return widget.changeType!;
    try {
      final extra = GoRouterState.of(context).extra;
      if (extra is String && extra.isNotEmpty) return extra;
    } catch (_) {}
    return 'Change Pickup Location';
  }

  Future<void> _submit(String changeType) async {
    final newValue = _valueController.text.trim();
    final reason = _reasonController.text.trim();
    if (newValue.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter the requested change value.'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    EmployeeDataProvider? data;
    try {
      data = context.read<EmployeeDataProvider>();
    } catch (_) {
      data = null;
    }

    setState(() => _submitting = true);
    String tripDateLabel = formatScheduleDayLabel(DateTime.now());
    try {
      if (data != null) {
        final isTime = changeType.endsWith('Time');
        final isPickupLocation =
            !isTime && changeType.toLowerCase().contains('pickup');

        if (isTime) {
          final modifiable =
              data.scheduleItems.cast<Map<String, dynamic>?>().firstWhere(
                    (i) =>
                        i != null &&
                        i['canReschedule'] == true &&
                        i['requestId'] != null,
                    orElse: () => null,
                  );
          if (modifiable != null) {
            final shiftDate = modifiable['date']?.toString();
            tripDateLabel = EmployeeDataProvider.formatDisplayDate(shiftDate);
            await data.rescheduleRequest(
              modifiable['requestId'].toString(),
              {
                'action': 'RESCHEDULE',
                'newShiftTime': newValue,
                if (shiftDate != null && shiftDate.isNotEmpty)
                  'newShiftDate': shiftDate,
                if (reason.isNotEmpty) 'reason': reason,
              },
            );
          } else {
            await data.repository.createTicket(
              category: 'ROUTE_ISSUE',
              subject: changeType,
              description:
                  'Requested $changeType: $newValue${reason.isNotEmpty ? '\nReason: $reason' : ''}',
            );
          }
        } else if (isPickupLocation) {
          await data.updateProfile(homeAddress: newValue);
          if (reason.isNotEmpty) {
            try {
              await data.repository.createTicket(
                category: 'ROUTE_ISSUE',
                subject: changeType,
                description:
                    'Updated default pickup address to: $newValue\nReason: $reason',
              );
            } catch (_) {}
          }
        } else {
          await data.repository.createTicket(
            category: 'ROUTE_ISSUE',
            subject: changeType,
            description:
                'Requested $changeType: $newValue${reason.isNotEmpty ? '\nReason: $reason' : ''}',
          );
        }
      }
      if (!mounted) return;
      context.pushReplacement(
        AppRoutes.changeSubmitted,
        extra: <String, dynamic>{
          'requestType': changeType,
          'newValue': newValue,
          'reason': reason,
          'tripDate': tripDateLabel,
        },
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceFirst('Exception: ', '')),
          backgroundColor: AppColors.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);
    final changeType = _resolveChangeType(context);
    final isTime = changeType.endsWith('Time');
    final fieldLabel = changeType.replaceFirst('Change ', 'New ');

    OutlineInputBorder border(Color color, [double width = 1]) =>
        OutlineInputBorder(
          borderRadius: AppRadius.borderXl,
          borderSide: BorderSide(color: color, width: width),
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
                changeType,
                textAlign: TextAlign.center,
                style: AppTypography.h2(color: p.textPrimary, fontSize: 20),
              ),
              const SizedBox(height: AppSpacing.xxl + 4),
              Text(
                fieldLabel,
                style: AppTypography.bodyMedium(
                  color: p.textPrimary,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: AppSpacing.sm + 2),
              TextField(
                controller: _valueController,
                style: AppTypography.body(color: p.textPrimary),
                cursorColor: p.accent,
                decoration: InputDecoration(
                  prefixIcon: Icon(
                    isTime
                        ? Icons.access_time_rounded
                        : Icons.location_on_rounded,
                    color: p.accent,
                    size: 20,
                  ),
                  hintText: isTime
                      ? 'e.g. 09:00 or 18:30'
                      : 'Enter new pickup or drop address',
                  hintStyle: AppTypography.body(color: p.textMuted),
                  filled: true,
                  fillColor: p.surfaceElevated,
                  enabledBorder: border(p.border),
                  focusedBorder: border(p.accent, 1.5),
                ),
              ),
              const SizedBox(height: AppSpacing.xxl + 4),
              Text(
                'Reason (Optional)',
                style: AppTypography.bodyMedium(
                  color: p.textPrimary,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: AppSpacing.sm + 2),
              TextField(
                controller: _reasonController,
                maxLines: 4,
                maxLength: 200,
                textCapitalization: TextCapitalization.sentences,
                style: AppTypography.body(color: p.textPrimary),
                cursorColor: p.accent,
                decoration: InputDecoration(
                  hintText: 'e.g. Temporary change due to schedule update',
                  hintStyle: AppTypography.body(color: p.textMuted),
                  counterStyle: AppTypography.micro(color: p.textMuted),
                  filled: true,
                  fillColor: p.surfaceElevated,
                  enabledBorder: border(p.border),
                  focusedBorder: border(p.accent, 1.5),
                ),
              ),
              const SizedBox(height: AppSpacing.xxxl),
              EmployeeEntrance(
                delay: const Duration(milliseconds: 120),
                child: EmployeePrimaryButton(
                  label: 'Submit Request',
                  isLoading: _submitting,
                  onPressed: _submitting ? null : () => _submit(changeType),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
