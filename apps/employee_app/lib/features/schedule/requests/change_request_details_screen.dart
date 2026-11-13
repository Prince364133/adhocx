import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Details for the change chosen on the previous screen (route `extra`,
/// e.g. "Change Drop Time"); defaults to "Change Pickup Location".
class ChangeRequestDetailsScreen extends StatefulWidget {
  final String? changeType;

  const ChangeRequestDetailsScreen({super.key, this.changeType});

  @override
  State<ChangeRequestDetailsScreen> createState() =>
      _ChangeRequestDetailsScreenState();
}

class _ChangeRequestDetailsScreenState
    extends State<ChangeRequestDetailsScreen> {
  // Empty: the old pre-filled "home renovation" text looked like user input.
  final TextEditingController _reasonController = TextEditingController();
  String _address = 'Flat 402, Green Meadows, Kondapur, Hyderabad';
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadJsonData();
  }

  Future<void> _loadJsonData() async {
    final profile = await MockDataService.getEmployeeProfile();
    if (mounted) {
      setState(() {
        _address = profile['homeAddress'] ?? _address;
        _isLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  String _resolveChangeType(BuildContext context) {
    if (widget.changeType != null) return widget.changeType!;
    try {
      final extra = GoRouterState.of(context).extra;
      if (extra is String && extra.isNotEmpty) return extra;
    } catch (_) {
      // Not under GoRouter (e.g. widget tests) — fall through.
    }
    return 'Change Pickup Location';
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const EmployeeLoadingScaffold(appBar: EmployeeAppBar());
    }
    final p = EmployeePalette.of(context);
    final changeType = _resolveChangeType(context);
    final isTime = changeType.endsWith('Time');
    final fieldLabel = changeType.replaceFirst('Change ', 'New ');
    final currentValue = isTime
        ? (changeType.contains('Drop') ? '6:30 PM' : '8:15 AM')
        : _address;

    return Scaffold(
      backgroundColor: p.background,
      appBar: const EmployeeAppBar(),
      body: SafeArea(
        child: SingleChildScrollView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
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
              EmployeeEntrance(
                child: AppCard(
                  child: Row(
                    children: [
                      Icon(
                        isTime
                            ? Icons.access_time_rounded
                            : Icons.location_on_rounded,
                        color: p.accent,
                        size: 22,
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Text(
                          currentValue,
                          style: AppTypography.small(
                            color: p.textPrimary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Icon(Icons.chevron_right_rounded,
                          color: p.textMuted, size: 22),
                    ],
                  ),
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
                  hintText: 'e.g. Temporary change due to home renovation',
                  hintStyle: AppTypography.body(color: p.textMuted),
                  counterStyle: AppTypography.micro(color: p.textMuted),
                  filled: true,
                  fillColor: p.surfaceElevated,
                  enabledBorder: OutlineInputBorder(
                    borderRadius: AppRadius.borderXl,
                    borderSide: BorderSide(color: p.border),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: AppRadius.borderXl,
                    borderSide: BorderSide(color: p.accent, width: 1.5),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.xxxl),
              EmployeeEntrance(
                delay: const Duration(milliseconds: 120),
                child: EmployeePrimaryButton(
                  label: 'Submit Request',
                  onPressed: () => context.push(AppRoutes.changeSubmitted),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
