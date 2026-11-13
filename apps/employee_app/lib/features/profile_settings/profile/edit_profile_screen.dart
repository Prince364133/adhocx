import 'package:flutter/material.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/shared/components/components.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/theme/app_radius.dart';
import 'package:adhocx_employee/theme/app_spacing.dart';
import 'package:adhocx_employee/theme/app_typography.dart';
import 'package:adhocx_employee/theme/employee_palette.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _name = TextEditingController(text: 'Ravi Kumar');
  final _phone = TextEditingController(text: '+91 98765 43210');
  final _email = TextEditingController(text: 'ravi.kumar@hitec.com');
  final _address = TextEditingController(text: 'Kondapur, Hyderabad');
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    final hp = await MockDataService.getHistoryProfileData();
    if (!mounted) return;
    final profile = hp['profile'] as Map<String, dynamic>?;
    if (profile != null) {
      _name.text = profile['fullName'] ?? _name.text;
      _phone.text = profile['phone'] ?? _phone.text;
      _email.text = profile['email'] ?? _email.text;
      _address.text = profile['address'] ?? _address.text;
    }
    setState(() => _isLoading = false);
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
            horizontal: AppSpacing.xxl,
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
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                          content: Text('Profile updated successfully.')),
                    );
                    Navigator.of(context).maybePop();
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
