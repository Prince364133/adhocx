import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
import '../../core/networking/api_client.dart';
import '../../core/utils/app_toast.dart';

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
  final TextEditingController _phoneController = TextEditingController();

  String _gender = 'Male';
  String? _phone;
  bool _isLoadingInitial = true;
  bool _isSaving = false;

  static const _months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  static bool _isFakeName(String? n) {
    if (n == null) return true;
    final lower = n.trim().toLowerCase();
    return lower.isEmpty ||
        lower == 'driver' ||
        lower == 'driver partner' ||
        lower == 'google partner' ||
        lower == 'google user' ||
        lower == 'apple user' ||
        lower == 'user' ||
        lower == 'partner name';
  }

  static bool _isFakeEmail(String? e) {
    if (e == null) return true;
    final lower = e.trim().toLowerCase();
    return lower.isEmpty ||
        lower == 'user.google@gmail.com' ||
        lower == 'test@example.com' ||
        lower == 'user@adhocx.com' ||
        lower == '—';
  }

  @override
  void initState() {
    super.initState();
    final user = AuthService.instance.currentUser;
    final onboarding = Provider.of<OnboardingProvider>(context, listen: false);

    final initialName = !_isFakeName(onboarding.fullName)
        ? onboarding.fullName
        : (!_isFakeName(user?.fullName) ? user!.fullName! : '');
    final initialEmail = !_isFakeEmail(onboarding.email)
        ? onboarding.email
        : (!_isFakeEmail(user?.email) ? user!.email! : '');

    final vendorProf = user?.vendorProfile;
    final initialDob = onboarding.dateOfBirth != null
        ? '${onboarding.dateOfBirth!.day} ${_months[onboarding.dateOfBirth!.month - 1]} ${onboarding.dateOfBirth!.year}'
        : (vendorProf?['dateOfBirth']?.toString() ?? vendorProf?['companyDetails']?['dateOfBirth']?.toString() ?? '');
    final vendorGender = vendorProf?['gender']?.toString() ?? vendorProf?['companyDetails']?['gender']?.toString() ?? '';
    final initialGender = onboarding.gender.isNotEmpty
        ? onboarding.gender
        : (vendorGender.isNotEmpty ? vendorGender : 'Male');
    final initialAddress = onboarding.address.isNotEmpty
        ? onboarding.address
        : (vendorProf?['address']?.toString() ?? vendorProf?['companyDetails']?['address']?.toString() ?? '');
    final initialEmergencyName = onboarding.emergencyContactName.isNotEmpty
        ? onboarding.emergencyContactName
        : (vendorProf?['emergencyContactName']?.toString() ?? vendorProf?['companyDetails']?['emergencyContactName']?.toString() ?? '');
    final initialEmergencyPhone = onboarding.emergencyContactPhone.isNotEmpty
        ? onboarding.emergencyContactPhone
        : (vendorProf?['emergencyContactPhone']?.toString() ?? vendorProf?['companyDetails']?['emergencyContactPhone']?.toString() ?? '');

    _phone = onboarding.phone.isNotEmpty
        ? onboarding.phone
        : (user?.phone?.isNotEmpty == true
            ? user!.phone
            : (user?.driverProfile?['phone']?.toString() ??
               vendorProf?['phone']?.toString() ??
               vendorProf?['companyDetails']?['phone']?.toString()));

    _nameController = TextEditingController(text: initialName);
    _emailController = TextEditingController(text: initialEmail);
    _dobController.text = initialDob;
    _addressController.text = initialAddress;
    _emergencyNameController.text = initialEmergencyName;
    _emergencyPhoneController.text = initialEmergencyPhone;
    _phoneController.text = (_phone != null && _phone != '—') ? _phone! : '';
    if (['Male', 'Female', 'Other'].contains(initialGender)) {
      _gender = initialGender;
    }

    _loadExistingProfile();
  }

  Future<void> _loadExistingProfile() async {
    try {
      final user = AuthService.instance.currentUser;
      final isVendor = user?.role == 'VENDOR' || user?.role == 'USER';
      dynamic profile;
      if (isVendor) {
        try {
          profile = await ApiClient.instance.get('/vendors/profile', force: true);
        } catch (_) {
          profile = user?.vendorProfile;
        }
      } else {
        try {
          profile = await DriverService.instance.getProfile(forceRefresh: true);
        } catch (_) {
          profile = user?.driverProfile;
        }
      }

      if (profile != null && mounted) {
        final p = Map<String, dynamic>.from(profile is Map ? profile : {});
        final onboarding = Provider.of<OnboardingProvider>(context, listen: false);

        setState(() {
          String clean10(dynamic v) {
            final s = (v ?? '').toString().replaceAll(RegExp(r'\D'), '');
            return s.length > 10 ? s.substring(s.length - 10) : s;
          }

          final serverPhone = p['phone']?.toString().trim();
          if (serverPhone != null && serverPhone.isNotEmpty && serverPhone != '—') {
            _phone = clean10(serverPhone);
          } else if (_phone == null || _phone!.isEmpty || _phone == '—') {
            final fallback = onboarding.phone.isNotEmpty
                ? onboarding.phone
                : (user?.phone?.isNotEmpty == true ? user!.phone : null);
            _phone = fallback != null ? clean10(fallback) : null;
          }
          if (_phone != null && _phone != '—') {
            _phoneController.text = _phone!;
          }

          if (_nameController.text.trim().isEmpty && p['fullName'] != null && !_isFakeName(p['fullName'].toString())) {
            _nameController.text = p['fullName'].toString().trim();
          }
          if (_emailController.text.trim().isEmpty && p['email'] != null && !_isFakeEmail(p['email'].toString())) {
            _emailController.text = p['email'].toString().trim();
          }
          if (p['dateOfBirth'] != null && p['dateOfBirth'].toString().trim().isNotEmpty) {
            _dobController.text = p['dateOfBirth'].toString().trim();
          }
          if (p['gender'] != null && ['Male', 'Female', 'Other'].contains(p['gender'])) {
            _gender = p['gender'].toString();
          }
          if (p['address'] != null && p['address'].toString().trim().isNotEmpty) {
            _addressController.text = p['address'].toString().trim();
          }
          if (p['emergencyContactName'] != null && p['emergencyContactName'].toString().trim().isNotEmpty) {
            _emergencyNameController.text = p['emergencyContactName'].toString().trim();
          }
          if (p['emergencyContactPhone'] != null && p['emergencyContactPhone'].toString().trim().isNotEmpty) {
            _emergencyPhoneController.text = clean10(p['emergencyContactPhone']);
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
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _selectDateOfBirth() async {
    DateTime initial = DateTime(1995, 1, 1);
    final currentText = _dobController.text.trim();
    if (currentText.isNotEmpty) {
      try {
        final parts = currentText.split(RegExp(r'[-/ ]'));
        if (parts.length == 3) {
          int? m = int.tryParse(parts[1]);
          if (m == null) {
            final idx = _months.indexWhere((mon) => mon.toLowerCase() == parts[1].toLowerCase());
            if (idx != -1) m = idx + 1;
          }
          final y = int.tryParse(parts[2]) ?? int.tryParse(parts[0]);
          final d = int.tryParse(parts[0]) ?? int.tryParse(parts[2]);
          if (y != null && m != null && d != null) {
            initial = DateTime(y, m, d);
          }
        }
      } catch (_) {}
    }

    final maxDate = DateTime.now().subtract(const Duration(days: 365 * 18));
    final minDate = DateTime(1940);
    if (initial.isAfter(maxDate)) initial = maxDate;
    if (initial.isBefore(minDate)) initial = minDate;

    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: minDate,
      lastDate: maxDate,
      helpText: 'Select Date of Birth (18+ only)',
    );

    if (picked != null) {
      setState(() {
        _dobController.text = '${picked.day} ${_months[picked.month - 1]} ${picked.year}';
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
      String? formatPhone(String raw) {
        final d = raw.replaceAll(RegExp(r'\D'), '');
        if (d.isEmpty) return null;
        return '+91$d';
      }

      final rawEnteredPhone = _phoneController.text.trim();
      final effectiveEnteredPhone = rawEnteredPhone.isNotEmpty
          ? formatPhone(rawEnteredPhone)
          : (_phone != null && _phone != '—' ? formatPhone(_phone!) : null);

      final enteredEmail = _emailController.text.trim().isNotEmpty
          ? _emailController.text.trim()
          : null;

      final rawEmergencyPhone = _emergencyPhoneController.text.trim();
      final effectiveEmergencyPhone = formatPhone(rawEmergencyPhone) ?? '';

      // 1. Immediately update local AuthService session so UI updates synchronously
      AuthService.instance.updateCurrentUser(
        fullName: name,
        phone: effectiveEnteredPhone,
        email: enteredEmail,
      );

      // 2. Authoritatively persist core User table record via PATCH /auth/profile
      try {
        await AuthService.instance.updateUserProfile(
          fullName: name,
          phone: effectiveEnteredPhone,
          email: enteredEmail,
        );
      } catch (authErr) {
        debugPrint('Auth profile sync warning: $authErr');
      }

      // 3. Update driver or vendor specific record
      final payload = {
        'fullName': name,
        if (enteredEmail != null) 'email': enteredEmail,
        if (effectiveEnteredPhone != null && effectiveEnteredPhone.isNotEmpty) 'phone': effectiveEnteredPhone,
        'dateOfBirth': _dobController.text.trim(),
        'gender': _gender,
        'address': _addressController.text.trim(),
        'emergencyContactName': _emergencyNameController.text.trim(),
        'emergencyContactPhone': effectiveEmergencyPhone,
      };

      final user = AuthService.instance.currentUser;
      final isVendor = user?.role == 'VENDOR' || user?.role == 'USER';

      if (isVendor) {
        await ApiClient.instance.patch('/vendors/profile', body: payload);
      } else {
        await DriverService.instance.updateProfile(payload);
      }

      if (mounted) {
        final onboarding = Provider.of<OnboardingProvider>(context, listen: false);
        onboarding.updatePersonalInfo(
          fullName: name,
          email: _emailController.text.trim(),
          phone: effectiveEnteredPhone,
          address: _addressController.text.trim(),
          emergencyContactName: _emergencyNameController.text.trim(),
          emergencyContactPhone: _emergencyPhoneController.text.trim(),
          gender: _gender,
        );

        await AuthService.instance.fetchCurrentUser(forceRefresh: true);

        if (!mounted) return;

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
      if (mounted) {
        AppToast.showError(e, context: context);
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final onboarding = Provider.of<OnboardingProvider>(context);
    final user = AuthService.instance.currentUser;
    final effectivePhone = (_phone != null && _phone!.trim().isNotEmpty && _phone != '—')
        ? _phone!
        : (user?.phone != null && user!.phone!.trim().isNotEmpty
            ? user.phone!
            : (user?.driverProfile?['phone']?.toString().isNotEmpty == true
                ? user!.driverProfile!['phone'].toString()
                : (user?.vendorProfile?['phone']?.toString().isNotEmpty == true
                    ? user!.vendorProfile!['phone'].toString()
                    : (onboarding.phone.isNotEmpty ? onboarding.phone : ''))));

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

                            // Phone Number (Verified or Editable if missing)
                            if (effectivePhone.isNotEmpty && effectivePhone != '—')
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
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
                                            effectivePhone,
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
                                ],
                              )
                            else
                              _buildTextField(
                                label: 'Phone Number',
                                controller: _phoneController,
                                icon: Icons.phone_outlined,
                                keyboardType: TextInputType.phone,
                                isDark: isDark,
                                hint: 'Enter your 10-digit mobile number',
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
    final isPhone = keyboardType == TextInputType.phone;
    Widget prefixWidget = Icon(
      icon,
      color: isDark ? AppColors.primaryLight : AppColors.primary,
      size: 20,
    );

    if (isPhone) {
      prefixWidget = Container(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
        margin: const EdgeInsets.only(right: AppSpacing.sm),
        decoration: BoxDecoration(
          border: Border(
            right: BorderSide(
              color: isDark ? AppColors.borderDark : AppColors.borderLight,
              width: 1.2,
            ),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.phone_iphone_rounded,
              size: 18,
              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
            ),
            const SizedBox(width: AppSpacing.xs),
            Text(
              '+91',
              style: AppTypography.body(
                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      );
    }

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
          inputFormatters: isPhone
              ? [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(10),
                ]
              : null,
          style: AppTypography.body(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
          ),
          decoration: InputDecoration(
            prefixIcon: prefixWidget,
            hintText: isPhone ? (hint ?? '98765 43210') : hint,
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
