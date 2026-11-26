import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/state/employee_auth_provider.dart';
import 'package:adhocx_employee/state/employee_data_provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

/// Edit Profile wired to GET /corporate/me and PATCH /corporate/me.
class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _email = TextEditingController();
  final _address = TextEditingController();
  bool _isLoading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadProfile());
  }

  Future<void> _loadProfile() async {
    EmployeeDataProvider? data;
    EmployeeAuthProvider? auth;
    try {
      data = context.read<EmployeeDataProvider>();
    } catch (_) {}
    try {
      auth = context.read<EmployeeAuthProvider>();
    } catch (_) {}

    final profile = data != null ? await data.loadProfile() : null;
    if (!mounted) return;
    final user = auth?.currentUser;

    _name.text = profile?['fullName']?.toString() ?? user?.fullName ?? '';
    _phone.text = profile?['phoneNumber']?.toString() ?? user?.phone ?? '';
    _email.text = profile?['email']?.toString() ?? user?.email ?? '';
    final loc = profile?['defaultPickupLocation'];
    _address.text = loc is Map ? (loc['addressText']?.toString() ?? '') : '';

    setState(() => _isLoading = false);
  }

  Future<void> _saveProfile() async {
    final fullName = _name.text.trim();
    final email = _email.text.trim();
    final homeAddress = _address.text.trim();

    if (fullName.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter your full name.'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    setState(() => _saving = true);
    try {
      EmployeeDataProvider? data;
      EmployeeAuthProvider? auth;
      try {
        data = context.read<EmployeeDataProvider>();
      } catch (_) {}
      try {
        auth = context.read<EmployeeAuthProvider>();
      } catch (_) {}

      if (data != null) {
        final updated = await data.updateProfile(
          fullName: fullName,
          email: email.isNotEmpty ? email : null,
          homeAddress: homeAddress.isNotEmpty ? homeAddress : null,
        );
        if (auth != null && auth.currentUser != null) {
          auth.updateCurrentUser(
            auth.currentUser!.copyWith(
              fullName: updated['fullName']?.toString() ?? fullName,
              email: updated['email']?.toString() ?? email,
            ),
          );
        }
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Profile updated successfully.'),
          backgroundColor: AppColors.success,
        ),
      );
      Navigator.of(context).maybePop();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Unable to update profile: ${e.toString().replaceFirst('Exception: ', '')}',
          ),
          backgroundColor: AppColors.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _email.dispose();
    _address.dispose();
    super.dispose();
  }

  Widget _field(
    String label,
    TextEditingController controller, {
    bool locked = false,
    TextInputType? keyboardType,
    List<String>? autofill,
    TextCapitalization capitalization = TextCapitalization.none,
  }) {
    final p = EmployeePalette.of(context);
    OutlineInputBorder border(Color c, [double w = 1.2]) => OutlineInputBorder(
          borderRadius: AppRadius.borderMd,
          borderSide: BorderSide(color: c, width: w),
        );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppTypography.caption(
            color: p.textSecondary,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: AppSpacing.xs),
        TextField(
          controller: controller,
          enabled: !locked,
          keyboardType: keyboardType,
          autofillHints: autofill,
          textCapitalization: capitalization,
          cursorColor: p.accent,
          style: AppTypography.body(
            color: locked ? p.textSecondary : p.textPrimary,
          ),
          decoration: InputDecoration(
            filled: true,
            fillColor: locked ? p.surfaceElevated : p.surface,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.lg,
              vertical: AppSpacing.md,
            ),
            suffixIcon: locked
                ? Icon(Icons.lock_outline_rounded, size: 18, color: p.textMuted)
                : null,
            enabledBorder: border(p.border),
            disabledBorder: border(p.border),
            focusedBorder: border(p.accent, 1.8),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const EmployeeLoadingScaffold(
        appBar: EmployeeAppBar(title: 'Edit Profile'),
        skeletonLayout: SkeletonLayout.form,
      );
    }
    final p = EmployeePalette.of(context);

    return Scaffold(
      backgroundColor: p.background,
      appBar: const EmployeeAppBar(title: 'Edit Profile'),
      body: SafeArea(
        child: SingleChildScrollView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.pageHorizontal,
            vertical: AppSpacing.xl,
          ),
          child: AutofillGroup(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Stack(
                    alignment: Alignment.bottomRight,
                    children: [
                      CircleAvatar(
                        radius: 46,
                        backgroundColor: p.accentTint,
                        child: Icon(Icons.person, size: 54, color: p.accent),
                      ),
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.xs + 2),
                        decoration: const BoxDecoration(
                          color: AppColors.primary,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.camera_alt_rounded,
                            size: 14, color: Colors.white),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.xxl + 4),
                _field('Full Name', _name,
                    autofill: const [AutofillHints.name],
                    capitalization: TextCapitalization.words),
                const SizedBox(height: AppSpacing.lg + 2),
                _field('Phone Number', _phone, locked: true),
                const SizedBox(height: AppSpacing.lg + 2),
                _field('Email', _email,
                    keyboardType: TextInputType.emailAddress,
                    autofill: const [AutofillHints.email]),
                const SizedBox(height: AppSpacing.lg + 2),
                _field('Address', _address,
                    keyboardType: TextInputType.streetAddress,
                    autofill: const [AutofillHints.fullStreetAddress],
                    capitalization: TextCapitalization.words),
                const SizedBox(height: AppSpacing.xxxl + AppSpacing.sm),
                EmployeePrimaryButton(
                  label: 'Save Changes',
                  isLoading: _saving,
                  onPressed: _saving ? null : _saveProfile,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
