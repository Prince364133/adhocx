import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_service.dart';
import '../../services/driver_service.dart';
import '../../services/onboarding_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_primary_button.dart';

/// Screen 1: Edit Personal Information matching exact design guidelines and connected to live backend.
class EditPersonalInfoScreen extends StatefulWidget {
  const EditPersonalInfoScreen({super.key});

  @override
  State<EditPersonalInfoScreen> createState() => _EditPersonalInfoScreenState();
}

class _EditPersonalInfoScreenState extends State<EditPersonalInfoScreen> {
  late final TextEditingController _nameController;
  late final TextEditingController _emailController;
  final TextEditingController _dobController = TextEditingController();
  final TextEditingController _addressController = TextEditingController();
  final TextEditingController _emergencyNameController = TextEditingController();
  final TextEditingController _emergencyPhoneController = TextEditingController();

  String _gender = 'Male';
  bool _isLoadingInitial = true;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    final user = AuthService.instance.currentUser;
    final onboarding = Provider.of<OnboardingProvider>(context, listen: false);

    final initialName = onboarding.fullName.isNotEmpty
        ? onboarding.fullName
        : (user?.fullName?.isNotEmpty == true ? user!.fullName! : '');
    final initialEmail = onboarding.email.isNotEmpty
        ? onboarding.email
        : (user?.email?.isNotEmpty == true ? user!.email! : '');

    _nameController = TextEditingController(text: initialName);
    _emailController = TextEditingController(text: initialEmail);

    _loadExistingProfile();
  }

  Future<void> _loadExistingProfile() async {
    try {
      final profile = await DriverService.instance.getProfile();
      if (profile != null && mounted) {
        final p = Map<String, dynamic>.from(profile is Map ? profile : {});
        setState(() {
          if (p['fullName'] != null && p['fullName'].toString().trim().isNotEmpty) {
            _nameController.text = p['fullName'].toString().trim();
          }
          if (p['email'] != null && p['email'].toString().trim().isNotEmpty) {
            _emailController.text = p['email'].toString().trim();
          }
          if (p['dateOfBirth'] != null) {
            _dobController.text = p['dateOfBirth'].toString().trim();
          }
          if (p['gender'] != null && ['Male', 'Female', 'Other'].contains(p['gender'])) {
            _gender = p['gender'].toString();
          }
          if (p['address'] != null) {
            _addressController.text = p['address'].toString().trim();
          }
          if (p['emergencyContactName'] != null) {
            _emergencyNameController.text = p['emergencyContactName'].toString().trim();
          }
          if (p['emergencyContactPhone'] != null) {
            _emergencyPhoneController.text = p['emergencyContactPhone'].toString().trim();
          }
          _isLoadingInitial = false;
        });
      } else {
        if (mounted) setState(() => _isLoadingInitial = false);
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingInitial = false);
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _dobController.dispose();
    _addressController.dispose();
    _emergencyNameController.dispose();
    _emergencyPhoneController.dispose();
    super.dispose();
  }

  Future<void> _selectDateOfBirth() async {
    DateTime initial = DateTime(1995, 1, 1);
    final currentText = _dobController.text.trim();
    if (currentText.isNotEmpty) {
      try {
        final parts = currentText.split(RegExp(r'[-/ ]'));
        if (parts.length == 3) {
          final y = int.tryParse(parts[2]) ?? int.tryParse(parts[0]);
          final m = int.tryParse(parts[1]);
          final d = int.tryParse(parts[0]) ?? int.tryParse(parts[2]);
          if (y != null && m != null && d != null) {
            initial = DateTime(y, m, d);
          }
        }
      } catch (_) {}
    }

    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(1940),
      lastDate: DateTime.now().subtract(const Duration(days: 365 * 18)),
      helpText: 'Select Date of Birth (18+ only)',
    );

    if (picked != null) {
      final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      setState(() {
        _dobController.text = '${picked.day} ${months[picked.month - 1]} ${picked.year}';
      });
    }
  }

  Future<void> _handleSave() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      Fluttertoast.showToast(
        msg: 'Please enter your full name',
        backgroundColor: Colors.orange,
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      final payload = {
        'fullName': name,
        if (_emailController.text.trim().isNotEmpty) 'email': _emailController.text.trim(),
        'dateOfBirth': _dobController.text.trim(),
        'gender': _gender,
        'address': _addressController.text.trim(),
        'emergencyContactName': _emergencyNameController.text.trim(),
        'emergencyContactPhone': _emergencyPhoneController.text.trim(),
      };

      await DriverService.instance.updateProfile(payload);

      if (mounted) {
        final onboarding = Provider.of<OnboardingProvider>(context, listen: false);
        onboarding.updatePersonalInfo(
          fullName: name,
          email: _emailController.text.trim(),
        );

        Fluttertoast.showToast(
          msg: 'Personal information saved successfully!',
          backgroundColor: AppColors.accentGreenDark,
        );

        if (context.canPop()) {
          context.pop();
        } else {
          context.go(AppRoutes.personalInfoScreen);
        }
      }
    } catch (e) {
      debugPrint('Error saving profile: $e');
      Fluttertoast.showToast(
        msg: 'Failed to update profile: $e',
        backgroundColor: Colors.redAccent,
      );
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final user = AuthService.instance.currentUser;
    final phone = user?.phone ?? '+91 98765 43210';

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Column(
              children: [
                // ── App Header ───────────────────────────────────────────────
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.lg,
                    vertical: AppSpacing.md,
                  ),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                    border: Border(
                      bottom: BorderSide(
                        color: isDark ? AppColors.borderDark : AppColors.borderLight,
                      ),
                    ),
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () {
                          if (context.canPop()) {
                            context.pop();
                          } else {
                            context.go(AppRoutes.personalInfoScreen);
                          }
                        },
                        icon: Icon(
                          Icons.arrow_back,
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Edit Personal Info',
                          style: AppTypography.h3(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      TextButton(
                        onPressed: _isSaving ? null : _handleSave,
                        child: _isSaving
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : Text(
                                'Save',
                                style: AppTypography.body(
                                  color: isDark ? AppColors.primaryLight : AppColors.primary,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                      ),
                    ],
                  ),
                ),

                // ── Scrollable Form ──────────────────────────────────────────
                Expanded(
                  child: _isLoadingInitial
                      ? const Center(child: CircularProgressIndicator())
                      : ListView(
                          padding: const EdgeInsets.all(AppSpacing.lg),
                          children: [
                            _buildTextField(
                              label: 'Full Name',
                              controller: _nameController,
                              icon: Icons.person_outline,
                              isDark: isDark,
                              hint: 'Enter your full legal name',
                            ),
                            const SizedBox(height: AppSpacing.lg),

                            _buildTextField(
                              label: 'Email Address',
                              controller: _emailController,
                              icon: Icons.email_outlined,
                              keyboardType: TextInputType.emailAddress,
                              isDark: isDark,
                              hint: 'Enter your active email address',
                            ),
                            const SizedBox(height: AppSpacing.lg),

                            // Phone Number (Disabled / Verified)
                            Text(
                              'Phone Number (Verified)',
                              style: AppTypography.caption(
                                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Container(
                              padding: const EdgeInsets.all(AppSpacing.md),
                              decoration: BoxDecoration(
                                color: isDark ? AppColors.surfaceElevatedDark : AppColors.bgLight,
                                borderRadius: BorderRadius.circular(AppRadius.md),
                                border: Border.all(
                                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                                ),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    Icons.phone_outlined,
                                    size: 20,
                                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Text(
                                      phone,
                                      style: AppTypography.body(
                                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                      ),
                                    ),
                                  ),
                                  Icon(
                                    Icons.lock_outline,
                                    size: 16,
                                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: AppSpacing.lg),

                            Row(
                              children: [
                                Expanded(
                                  child: GestureDetector(
                                    onTap: _selectDateOfBirth,
                                    child: AbsorbPointer(
                                      child: _buildTextField(
                                        label: 'Date of Birth',
                                        controller: _dobController,
                                        icon: Icons.calendar_today_outlined,
                                        isDark: isDark,
                                        hint: 'DD MMM YYYY',
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: AppSpacing.md),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Gender',
                                        style: AppTypography.caption(
                                          color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 12),
                                        decoration: BoxDecoration(
                                          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                                          borderRadius: BorderRadius.circular(AppRadius.md),
                                          border: Border.all(
                                            color: isDark ? AppColors.borderDark : AppColors.borderLight,
                                          ),
                                        ),
                                        child: DropdownButtonHideUnderline(
                                          child: DropdownButton<String>(
                                            dropdownColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                                            value: _gender,
                                            isExpanded: true,
                                            items: ['Male', 'Female', 'Other']
                                                .map((g) => DropdownMenuItem(
                                                      value: g,
                                                      child: Text(
                                                        g,
                                                        style: TextStyle(
                                                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                                        ),
                                                      ),
                                                    ))
                                                .toList(),
                                            onChanged: (val) {
                                              if (val != null) setState(() => _gender = val);
                                            },
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: AppSpacing.lg),

                            _buildTextField(
                              label: 'Permanent Address',
                              controller: _addressController,
                              icon: Icons.home_outlined,
                              maxLines: 2,
                              isDark: isDark,
                              hint: 'Enter your residential address with PIN code',
                            ),
                            const SizedBox(height: AppSpacing.xl),

                            Text(
                              'Emergency Contact',
                              style: AppTypography.caption(
                                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: AppSpacing.md),

                            _buildTextField(
                              label: 'Contact Name & Relation',
                              controller: _emergencyNameController,
                              icon: Icons.person_outline,
                              isDark: isDark,
                              hint: 'e.g. Priya Sharma (Wife)',
                            ),
                            const SizedBox(height: AppSpacing.md),

                            _buildTextField(
                              label: 'Emergency Phone Number',
                              controller: _emergencyPhoneController,
                              icon: Icons.phone_outlined,
                              keyboardType: TextInputType.phone,
                              isDark: isDark,
                              hint: 'e.g. +91 98765 43210',
                            ),
                            const SizedBox(height: AppSpacing.xxl),

                            AppPrimaryButton(
                              text: _isSaving ? 'Saving Changes...' : 'Update Information',
                              onPressed: _isSaving ? null : _handleSave,
                            ),
                          ],
                        ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required String label,
    required TextEditingController controller,
    required IconData icon,
    required bool isDark,
    String? hint,
    TextInputType keyboardType = TextInputType.text,
    int maxLines = 1,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppTypography.caption(
            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          maxLines: maxLines,
          style: AppTypography.body(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
          ),
          decoration: InputDecoration(
            prefixIcon: Icon(
              icon,
              color: isDark ? AppColors.primaryLight : AppColors.primary,
              size: 20,
            ),
            hintText: hint,
            hintStyle: AppTypography.body(
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            ),
            filled: true,
            fillColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: BorderSide(
                color: isDark ? AppColors.borderDark : AppColors.borderLight,
              ),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: BorderSide(
                color: isDark ? AppColors.borderDark : AppColors.borderLight,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: BorderSide(
                color: isDark ? AppColors.primaryLight : AppColors.primary,
                width: 2,
              ),
            ),
          ),
        ),
      ],
    );
  }
}
