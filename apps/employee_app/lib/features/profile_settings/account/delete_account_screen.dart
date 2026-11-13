import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/shared/illustrations/profile_illustrations.dart';
import 'package:adhocx_employee/state/employee_auth_provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Permanent deletion confirmation with a safety checkbox.
class DeleteAccountScreen extends StatefulWidget {
  const DeleteAccountScreen({super.key});

  @override
  State<DeleteAccountScreen> createState() => _DeleteAccountScreenState();
}

class _DeleteAccountScreenState extends State<DeleteAccountScreen> {
  bool _confirmed = false;
  bool _isDeleting = false;

  Future<void> _handleDeleteAccount() async {
    if (!_confirmed) return;
    setState(() => _isDeleting = true);
    await context.read<EmployeeAuthProvider>().signOut();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Your account and associated data have been deleted.'),
        backgroundColor: AppColors.error,
      ),
    );
    // Was Navigator.pushNamedAndRemoveUntil('/welcome'), which throws under
    // GoRouter (no named Navigator routes). go() also clears the stack.
    context.go(AppRoutes.welcome);
  }

  @override
  Widget build(BuildContext context) {
    final p = EmployeePalette.of(context);

    return EmployeeCenteredLayout(
      appBar: const EmployeeAppBar(),
      illustration: const Center(child: DeleteAccountDangerBadge()),
      illustrationGap: AppSpacing.xxl,
      title: 'Delete Account',
      message:
          'This will permanently delete your account, trip history, preferences and all related data. This action cannot be undone.',
      actions: [
        Material(
          color: _confirmed ? AppColors.errorContainer : p.surfaceElevated,
          shape: RoundedRectangleBorder(
            borderRadius: AppRadius.borderXl,
            side: BorderSide(
              color: _confirmed ? AppColors.error.withAlpha(110) : p.border,
            ),
          ),
          child: CheckboxListTile(
            value: _confirmed,
            onChanged: (v) => setState(() => _confirmed = v ?? false),
            controlAffinity: ListTileControlAffinity.leading,
            activeColor: AppColors.error,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.sm,
            ),
            title: Text(
              'I understand and want to delete my account.',
              style: AppTypography.small(
                color: _confirmed ? AppColors.errorText : p.textPrimary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ),
        EmployeeDangerButton(
          label: 'Delete Account',
          isLoading: _isDeleting,
          onPressed: _confirmed ? _handleDeleteAccount : null,
        ),
      ],
    );
  }
}
