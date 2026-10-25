import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import '../../services/auth_service.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';
import '../../core/utils/app_toast.dart';
import '../../core/utils/name_utils.dart';

/// Screen for viewing and editing corporate client / vendor organization and contact information.
/// Merges previous Company Information and Contact Information into a single streamlined view.
class UserOrganizationInformationScreen extends StatefulWidget {
  const UserOrganizationInformationScreen({super.key});

  @override
  State<UserOrganizationInformationScreen> createState() =>
      _UserOrganizationInformationScreenState();
}

class _UserOrganizationInformationScreenState
    extends State<UserOrganizationInformationScreen> {
  bool _isLoading = true;
  bool _isSaving = false;

  final _formKey = GlobalKey<FormState>();

  // 1. User / Contact Controllers
  final TextEditingController _fullNameController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _altPhoneController = TextEditingController();
  final TextEditingController _emergencyPhoneController = TextEditingController();

  // 2. Company / Organization Controllers
  final TextEditingController _orgNameController = TextEditingController();
  final TextEditingController _locationController = TextEditingController();

  String _selectedBusinessType = 'IT & Technology Services';
  final List<String> _businessTypes = [
    'IT & Technology Services',
    'BPO / Call Center & KPO',
    'Consulting & Professional Services',
    'Manufacturing & Engineering',
    'Healthcare & Pharmaceuticals',
    'Banking, Financial Services & Insurance',
    'Logistics & Supply Chain',
    'Travel & Corporate Hospitality',
    'Other Corporate Enterprise',
  ];

  String _selectedMonthlyTrips = '50 - 200 trips / month';
  final List<String> _monthlyTripOptions = [
    '10 - 50 trips / month',
    '50 - 200 trips / month',
    '200 - 500 trips / month',
    '500+ trips / month (Enterprise Fleet)',
  ];

  String _verificationStatus = 'PENDING';

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _altPhoneController.dispose();
    _emergencyPhoneController.dispose();
    _orgNameController.dispose();
    _locationController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    try {
      final user = AuthService.instance.currentUser;
      final vendorMap = user?.vendorProfile ?? {};

      Map<String, dynamic> liveData = {};
      try {
        final res =
            await UserService.instance.getVendorProfile(forceRefresh: true);
        if (res is Map) {
          liveData = Map<String, dynamic>.from(res);
        }
      } catch (_) {}

      final merged = {
        ...vendorMap,
        ...liveData,
      };

      if (mounted) {
        setState(() {
          String clean10(dynamic raw) {
            if (raw == null) return '';
            final digits = raw.toString().replaceAll(RegExp(r'\D'), '');
            if (digits.length > 10 && digits.startsWith('91')) {
              return digits.substring(digits.length - 10);
            }
            return digits.length > 10 ? digits.substring(0, 10) : digits;
          }

          // Contact Details
          final rawContactName = (merged['fullName'] ?? user?.fullName ?? '').toString();
          _fullNameController.text = !isPlaceholderName(rawContactName) ? rawContactName : '';
          _phoneController.text =
              clean10(merged['phone'] ?? user?.phone ?? '');
          _emailController.text =
              (user?.email ?? merged['email'] ?? merged['billingEmail'] ?? '')
                  .toString();
          _altPhoneController.text =
              clean10(merged['alternatePhone'] ?? '');
          _emergencyPhoneController.text =
              clean10(merged['emergencyContactPhone'] ?? '');

          // Organization Details
          final rawOrgName = (merged['organizationName'] ??
                  merged['companyName'] ??
                  user?.fullName ??
                  '').toString();
          _orgNameController.text = !isPlaceholderName(rawOrgName) ? rawOrgName : '';

          final existingAddress = (merged['address'] ?? '').toString();
          final existingCity = (merged['city'] ?? '').toString();
          if (existingAddress.isNotEmpty) {
            _locationController.text = existingAddress;
          } else if (existingCity.isNotEmpty) {
            _locationController.text = existingCity;
          }

          if (merged['businessType'] != null &&
              _businessTypes.contains(merged['businessType'])) {
            _selectedBusinessType = merged['businessType'].toString();
          }
          if (merged['monthlyTrips'] != null &&
              _monthlyTripOptions.contains(merged['monthlyTrips'])) {
            _selectedMonthlyTrips = merged['monthlyTrips'].toString();
          }

          _verificationStatus = (merged['verificationStatus'] ?? 'PENDING')
              .toString()
              .toUpperCase();
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) {
      Fluttertoast.showToast(
          msg: 'Please check and fill the required information');
      return;
    }

    setState(() => _isSaving = true);

    try {
      String formatPhone(String raw) {
        final digits = raw.replaceAll(RegExp(r'\D'), '');
        if (digits.isEmpty) return '';
        final last10 = digits.length > 10 ? digits.substring(digits.length - 10) : digits;
        return '+91$last10';
      }

      final fullName = _fullNameController.text.trim();
      final phone = formatPhone(_phoneController.text.trim());
      final email = _emailController.text.trim();
      final altPhone = formatPhone(_altPhoneController.text.trim());
      final emergencyPhone = formatPhone(_emergencyPhoneController.text.trim());
      final orgName = _orgNameController.text.trim();
      final location = _locationController.text.trim();

      final payload = {
        'fullName': fullName,
        'phone': phone,
        'email': email,
        'billingEmail': email,
        'alternatePhone': altPhone,
        'emergencyContactPhone': emergencyPhone,
        'organizationName': orgName,
        'address': location,
        'city': location,
        'businessType': _selectedBusinessType,
        'monthlyTrips': _selectedMonthlyTrips,
      };

      await UserService.instance.updateVendorProfile(payload);

      // Keep Auth session updated
      AuthService.instance.updateCurrentUser(
        fullName: fullName.isNotEmpty ? fullName : null,
        phone: phone.isNotEmpty ? phone : null,
        email: email.isNotEmpty ? email : null,
      );
      try {
        await AuthService.instance.updateUserProfile(
          fullName: fullName.isNotEmpty ? fullName : null,
          phone: phone.isNotEmpty ? phone : null,
        );
      } catch (_) {}

      if (mounted) {
        Fluttertoast.showToast(
          msg: 'Organization details updated successfully',
          backgroundColor: AppColors.success,
          textColor: Colors.white,
        );
        setState(() => _isSaving = false);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSaving = false);
        AppToast.showError(e, context: context);
      }
    }
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hintText,
    required IconData prefixIcon,
    TextInputType keyboardType = TextInputType.text,
    bool isRequired = false,
    String? Function(String?)? validator,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isPhone = keyboardType == TextInputType.phone;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppTypography.caption(
            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 6),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          inputFormatters: isPhone
              ? [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(10),
                ]
              : null,
          style: AppTypography.body(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
          ),
          validator: validator ??
              (isRequired
                  ? (val) {
                      if (val == null || val.trim().isEmpty) {
                        return 'This field is required';
                      }
                      if (isPhone &&
                          val.trim().replaceAll(RegExp(r'\D'), '').length != 10) {
                        return 'Enter a valid 10-digit mobile number';
                      }
                      return null;
                    }
                  : (isPhone
                      ? (val) {
                          if (val != null &&
                              val.trim().isNotEmpty &&
                              val.trim().replaceAll(RegExp(r'\D'), '').length != 10) {
                            return 'Enter a valid 10-digit mobile number';
                          }
                          return null;
                        }
                      : null)),
          decoration: InputDecoration(
            hintText: isPhone && (hintText.isEmpty || hintText.contains('+91'))
                ? '98765 43210'
                : hintText,
            hintStyle: AppTypography.body(
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            ),
            prefixIcon: isPhone
                ? Padding(
                    padding: const EdgeInsets.only(left: 12, right: 8),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(prefixIcon,
                            color: isDark ? AppColors.primaryLight : AppColors.primary,
                            size: 20),
                        const SizedBox(width: 8),
                        Text(
                          '+91',
                          style: AppTypography.body(
                            color: isDark
                                ? AppColors.textPrimaryDark
                                : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          width: 1,
                          height: 18,
                          color: isDark ? AppColors.borderDark : AppColors.borderLight,
                        ),
                      ],
                    ),
                  )
                : Icon(prefixIcon,
                    color: isDark ? AppColors.primaryLight : AppColors.primary,
                    size: 20),
            filled: true,
            fillColor: isDark ? AppColors.bgDark : AppColors.bgLight,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: BorderSide(
                  color: isDark ? AppColors.borderDark : AppColors.borderLight),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: BorderSide(
                  color: isDark ? AppColors.borderDark : AppColors.borderLight),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDropdown({
    required String label,
    required String value,
    required List<String> items,
    required IconData prefixIcon,
    required void Function(String?) onChanged,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppTypography.caption(
            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(
            color: isDark ? AppColors.bgDark : AppColors.bgLight,
            borderRadius: BorderRadius.circular(AppRadius.md),
            border: Border.all(
                color: isDark ? AppColors.borderDark : AppColors.borderLight),
          ),
          child: Row(
            children: [
              Icon(prefixIcon,
                  color: isDark ? AppColors.primaryLight : AppColors.primary,
                  size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: value,
                    isExpanded: true,
                    dropdownColor:
                        isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                    icon: const Icon(Icons.arrow_drop_down),
                    items: items.map((opt) {
                      return DropdownMenuItem<String>(
                        value: opt,
                        child: Text(
                          opt,
                          style: AppTypography.body(
                            color: isDark
                                ? AppColors.textPrimaryDark
                                : AppColors.textPrimaryLight,
                          ),
                        ),
                      );
                    }).toList(),
                    onChanged: onChanged,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isVerified =
        _verificationStatus == 'APPROVED' || _verificationStatus == 'VERIFIED';

    final displayName = _fullNameController.text.isNotEmpty
        ? _fullNameController.text
        : (_orgNameController.text.isNotEmpty
            ? _orgNameController.text
            : 'Corporate Partner');

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        elevation: 0,
        leading: IconButton(
          onPressed: () => context.pop(),
          icon: Icon(Icons.arrow_back,
              color: isDark
                  ? AppColors.textPrimaryDark
                  : AppColors.textPrimaryLight),
        ),
        title: Text(
          'Organization Information',
          style: AppTypography.h3(
            color:
                isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // ── Top Header Profile Badge Card ──
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: isDark
                                ? [
                                    AppColors.surfaceDark,
                                    AppColors.surfaceDark.withValues(alpha: 0.8),
                                  ]
                                : [
                                    AppColors.primary.withValues(alpha: 0.08),
                                    AppColors.primaryLight.withValues(alpha: 0.04),
                                  ],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(
                            color: isDark
                                ? AppColors.borderDark
                                : AppColors.primary.withValues(alpha: 0.15),
                          ),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 52,
                              height: 52,
                              decoration: BoxDecoration(
                                color: isDark
                                    ? AppColors.primary.withValues(alpha: 0.25)
                                    : AppColors.primary.withValues(alpha: 0.15),
                                borderRadius:
                                    BorderRadius.circular(AppRadius.md),
                              ),
                              child: const Center(
                                child: Icon(Icons.corporate_fare_rounded,
                                    color: AppColors.primary, size: 28),
                              ),
                            ),
                            const SizedBox(width: AppSpacing.md),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    displayName,
                                    style: AppTypography.h3(
                                      color: isDark
                                          ? AppColors.textPrimaryDark
                                          : AppColors.textPrimaryLight,
                                      fontWeight: FontWeight.bold,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    _orgNameController.text.isNotEmpty
                                        ? _orgNameController.text
                                        : _selectedBusinessType,
                                    style: AppTypography.caption(
                                      color: isDark
                                          ? AppColors.textMutedDark
                                          : AppColors.textMutedLight,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 6),
                                  Row(
                                    children: [
                                      Icon(
                                        isVerified
                                            ? Icons.check_circle_rounded
                                            : Icons.pending_actions_rounded,
                                        size: 14,
                                        color: isVerified
                                            ? AppColors.success
                                            : AppColors.warning,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        isVerified
                                            ? 'Verified Corporate Client'
                                            : 'Application Pending Review',
                                        style: TextStyle(
                                          color: isVerified
                                              ? AppColors.success
                                              : AppColors.warning,
                                          fontSize: 11,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: AppSpacing.xl),

                      // ── SECTION 1: User & Contact Information ──
                      Text(
                        'User & Contact Information',
                        style: AppTypography.caption(
                          color: isDark
                              ? AppColors.textMutedDark
                              : AppColors.textMutedLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),

                      Container(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: BoxDecoration(
                          color: isDark
                              ? AppColors.surfaceDark
                              : AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(
                              color: isDark
                                  ? AppColors.borderDark
                                  : AppColors.borderLight),
                        ),
                        child: Column(
                          children: [
                            // Full Name
                            _buildTextField(
                              controller: _fullNameController,
                              label: 'Full Name *',
                              hintText: 'Enter your name as the app user',
                              prefixIcon: Icons.person_outline,
                              isRequired: true,
                              validator: (val) {
                                if (val == null || val.trim().length < 2) {
                                  return 'Please enter your full name';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: AppSpacing.md),

                            // Official Mobile Number
                            _buildTextField(
                              controller: _phoneController,
                              label: 'Official Mobile Number *',
                              hintText: '98765 43210',
                              prefixIcon: Icons.phone_outlined,
                              keyboardType: TextInputType.phone,
                              isRequired: true,
                              validator: (val) {
                                final p = val?.trim() ?? '';
                                final d = p.replaceAll(RegExp(r'\D'), '');
                                if (d.length != 10) {
                                  return 'Enter a valid 10-digit mobile number';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: AppSpacing.md),

                            // Official Email Address
                            _buildTextField(
                              controller: _emailController,
                              label: 'Official Email Address *',
                              hintText: 'e.g. yourname@company.com',
                              prefixIcon: Icons.email_outlined,
                              keyboardType: TextInputType.emailAddress,
                              isRequired: true,
                              validator: (val) {
                                final e = val?.trim().toLowerCase() ?? '';
                                if (e.isEmpty ||
                                    !e.contains('@') ||
                                    !e.contains('.')) {
                                  return 'Enter a valid official email address';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: AppSpacing.md),

                            // Alternative Contact Number
                            _buildTextField(
                              controller: _altPhoneController,
                              label: 'Alternative Contact Number (Optional)',
                              hintText: '98765 43210',
                              prefixIcon: Icons.phone_iphone_outlined,
                              keyboardType: TextInputType.phone,
                              isRequired: false,
                            ),
                            const SizedBox(height: AppSpacing.md),

                            // Emergency Helpline Number
                            _buildTextField(
                              controller: _emergencyPhoneController,
                              label: 'Emergency Helpline Number (Optional)',
                              hintText: '98765 43210',
                              prefixIcon: Icons.support_agent_outlined,
                              keyboardType: TextInputType.phone,
                              isRequired: false,
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: AppSpacing.xl),

                      // ── SECTION 2: Organization & Business Details ──
                      Text(
                        'Company & Organization Details',
                        style: AppTypography.caption(
                          color: isDark
                              ? AppColors.textMutedDark
                              : AppColors.textMutedLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),

                      Container(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: BoxDecoration(
                          color: isDark
                              ? AppColors.surfaceDark
                              : AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(
                              color: isDark
                                  ? AppColors.borderDark
                                  : AppColors.borderLight),
                        ),
                        child: Column(
                          children: [
                            // Company Name / Branch Name
                            _buildTextField(
                              controller: _orgNameController,
                              label: 'Company Name / Branch Name *',
                              hintText:
                                  'e.g. Acme Mobility / Gurugram Branch',
                              prefixIcon: Icons.business_outlined,
                              isRequired: true,
                              validator: (val) {
                                if (val == null || val.trim().length < 2) {
                                  return 'Enter company name or branch name';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: AppSpacing.md),

                            // Company Location / Address
                            _buildTextField(
                              controller: _locationController,
                              label: 'Company Location / City / Address *',
                              hintText:
                                  'e.g. Cyber City, Phase 2, Gurugram',
                              prefixIcon: Icons.location_on_outlined,
                              isRequired: true,
                              validator: (val) {
                                if (val == null || val.trim().length < 2) {
                                  return 'Enter company location or city';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: AppSpacing.md),

                            // Business Industry / Sector
                            _buildDropdown(
                              label: 'Business Industry / Sector *',
                              value: _selectedBusinessType,
                              items: _businessTypes,
                              prefixIcon: Icons.category_outlined,
                              onChanged: (val) {
                                if (val != null) {
                                  setState(() => _selectedBusinessType = val);
                                }
                              },
                            ),
                            const SizedBox(height: AppSpacing.md),

                            // Estimated Monthly Ride Requirements
                            _buildDropdown(
                              label: 'Estimated Monthly Ride Requirements *',
                              value: _selectedMonthlyTrips,
                              items: _monthlyTripOptions,
                              prefixIcon: Icons.local_taxi_outlined,
                              onChanged: (val) {
                                if (val != null) {
                                  setState(() => _selectedMonthlyTrips = val);
                                }
                              },
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: AppSpacing.xl),

                      // ── Save Action Button ──
                      AppPrimaryButton(
                        text: 'SAVE ORGANIZATION DETAILS',
                        isLoading: _isSaving,
                        onPressed: _isSaving ? null : _handleSave,
                      ),
                      const SizedBox(height: AppSpacing.xl),
                    ],
                  ),
                ),
              ),
            ),
    );
  }
}
