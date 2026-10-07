import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import '../../services/auth_service.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';

class UserCompanyInformationScreen extends StatefulWidget {
  const UserCompanyInformationScreen({super.key});

  @override
  State<UserCompanyInformationScreen> createState() => _UserCompanyInformationScreenState();
}

class _UserCompanyInformationScreenState extends State<UserCompanyInformationScreen> {
  bool _isLoading = true;
  bool _isSaving = false;
  bool _isBillingSame = true;

  final _formKey = GlobalKey<FormState>();

  final TextEditingController _orgNameController = TextEditingController();
  final TextEditingController _brandNameController = TextEditingController();
  final TextEditingController _websiteController = TextEditingController();
  final TextEditingController _gstController = TextEditingController();
  final TextEditingController _panController = TextEditingController();
  final TextEditingController _addressController = TextEditingController();
  final TextEditingController _cityController = TextEditingController();
  final TextEditingController _stateController = TextEditingController();
  final TextEditingController _pincodeController = TextEditingController();
  final TextEditingController _billingAddressController = TextEditingController();
  final TextEditingController _spocNameController = TextEditingController();
  final TextEditingController _spocDesignationController = TextEditingController();

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
    _loadCompanyData();
  }

  @override
  void dispose() {
    _orgNameController.dispose();
    _brandNameController.dispose();
    _websiteController.dispose();
    _gstController.dispose();
    _panController.dispose();
    _addressController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _pincodeController.dispose();
    _billingAddressController.dispose();
    _spocNameController.dispose();
    _spocDesignationController.dispose();
    super.dispose();
  }

  Future<void> _loadCompanyData() async {
    try {
      final user = AuthService.instance.currentUser;
      final vendorMap = user?.vendorProfile ?? {};

      // Try fetching live profile from server
      Map<String, dynamic> liveData = {};
      try {
        final res = await UserService.instance.getVendorProfile(forceRefresh: true);
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
          _orgNameController.text = (merged['organizationName'] ?? user?.fullName ?? '').toString();
          _brandNameController.text = (merged['brandName'] ?? '').toString();
          _websiteController.text = (merged['website'] ?? '').toString();
          _gstController.text = (merged['gstNumber'] ?? '').toString();
          _panController.text = (merged['panNumber'] ?? '').toString();
          _addressController.text = (merged['address'] ?? '').toString();
          _cityController.text = (merged['city'] ?? 'Gurugram').toString();
          _stateController.text = (merged['state'] ?? 'Haryana').toString();
          _pincodeController.text = (merged['pincode'] ?? '').toString();
          _billingAddressController.text = (merged['billingAddress'] ?? '').toString();
          _spocNameController.text = (merged['fullName'] ?? user?.fullName ?? '').toString();
          _spocDesignationController.text = (merged['spocDesignation'] ?? 'Corporate Travel Desk').toString();

          if (merged['businessType'] != null && _businessTypes.contains(merged['businessType'])) {
            _selectedBusinessType = merged['businessType'].toString();
          }
          if (merged['monthlyTrips'] != null && _monthlyTripOptions.contains(merged['monthlyTrips'])) {
            _selectedMonthlyTrips = merged['monthlyTrips'].toString();
          }

          _isBillingSame = merged['isBillingAddressSame'] != false;
          _verificationStatus = (merged['verificationStatus'] ?? 'PENDING').toString().toUpperCase();
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) {
      Fluttertoast.showToast(msg: 'Please check and fill the required company details');
      return;
    }

    setState(() => _isSaving = true);

    try {
      final orgName = _orgNameController.text.trim();
      final spocName = _spocNameController.text.trim().isNotEmpty
          ? _spocNameController.text.trim()
          : (AuthService.instance.currentUser?.fullName ?? 'Business Booker');

      final effectiveBillingAddress = _isBillingSame
          ? _addressController.text.trim()
          : _billingAddressController.text.trim();

      final payload = {
        'organizationName': orgName,
        'fullName': spocName,
        'gstNumber': _gstController.text.trim().toUpperCase(),
        'address': _addressController.text.trim(),
        'brandName': _brandNameController.text.trim(),
        'businessType': _selectedBusinessType,
        'website': _websiteController.text.trim(),
        'panNumber': _panController.text.trim().toUpperCase(),
        'city': _cityController.text.trim(),
        'state': _stateController.text.trim(),
        'pincode': _pincodeController.text.trim(),
        'billingAddress': effectiveBillingAddress,
        'isBillingAddressSame': _isBillingSame,
        'monthlyTrips': _selectedMonthlyTrips,
        'spocDesignation': _spocDesignationController.text.trim(),
      };

      await UserService.instance.updateVendorProfile(payload);

      if (mounted) {
        Fluttertoast.showToast(
          msg: 'Company information updated successfully',
          backgroundColor: AppColors.success,
          textColor: Colors.white,
        );
        setState(() {
          _isSaving = false;
          _verificationStatus = 'UNDER_REVIEW';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSaving = false);
        Fluttertoast.showToast(
          msg: 'Failed to update company information: $e',
          backgroundColor: AppColors.error,
          textColor: Colors.white,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final isVerified = _verificationStatus == 'VERIFIED';
    final isUnderReview = _verificationStatus == 'UNDER_REVIEW';

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        elevation: 0,
        leading: IconButton(
          onPressed: () => context.pop(),
          icon: Icon(Icons.arrow_back, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
        ),
        title: Text(
          'Company Information',
          style: AppTypography.h3(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Corporate Identity Header Card
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(AppSpacing.lg),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: isDark
                                ? [AppColors.surfaceDark, const Color(0xFF1E293B)]
                                : [AppColors.primary.withValues(alpha: 0.08), Colors.white],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(
                            color: isDark ? AppColors.borderDark : AppColors.borderLight,
                          ),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 60,
                              height: 60,
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.15),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.business_rounded, size: 32, color: AppColors.primary),
                            ),
                            const SizedBox(width: AppSpacing.md),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _orgNameController.text.isNotEmpty
                                        ? _orgNameController.text
                                        : 'Corporate Account',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: AppTypography.h3(
                                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    _selectedBusinessType,
                                    style: AppTypography.caption(
                                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Row(
                                    children: [
                                      Icon(
                                        isVerified
                                            ? Icons.verified
                                            : (isUnderReview ? Icons.schedule : Icons.verified_outlined),
                                        size: 14,
                                        color: isVerified
                                            ? AppColors.success
                                            : (isUnderReview ? AppColors.warning : AppColors.primary),
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        isVerified
                                            ? 'Verified Corporate Client'
                                            : (isUnderReview ? 'Profile Under Review' : 'Corporate Account'),
                                        style: TextStyle(
                                          color: isVerified
                                              ? AppColors.success
                                              : (isUnderReview ? AppColors.warning : AppColors.primary),
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

                      const SizedBox(height: AppSpacing.lg),

                      // SECTION 1: Company Legal Identity
                      _buildSectionHeader('Company Identity & Business Profile', isDark),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: _cardBoxDecoration(isDark),
                        child: Column(
                          children: [
                            _buildTextField(
                              controller: _orgNameController,
                              label: 'Registered Company / Legal Name *',
                              hint: 'e.g. Acme Technologies Private Limited',
                              icon: Icons.apartment_rounded,
                              isDark: isDark,
                              validator: (val) {
                                if (val == null || val.trim().isEmpty) {
                                  return 'Company name is required';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: AppSpacing.md),
                            _buildTextField(
                              controller: _brandNameController,
                              label: 'Trade / Brand Name (Optional)',
                              hint: 'e.g. Acme Mobility',
                              icon: Icons.storefront_outlined,
                              isDark: isDark,
                            ),
                            const SizedBox(height: AppSpacing.md),
                            _buildDropdown(
                              label: 'Business Industry / Sector',
                              value: _selectedBusinessType,
                              items: _businessTypes,
                              onChanged: (val) => setState(() => _selectedBusinessType = val!),
                              isDark: isDark,
                            ),
                            const SizedBox(height: AppSpacing.md),
                            _buildTextField(
                              controller: _websiteController,
                              label: 'Official Website / Domain',
                              hint: 'https://www.yourcompany.com',
                              icon: Icons.language_outlined,
                              isDark: isDark,
                              keyboardType: TextInputType.url,
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: AppSpacing.lg),

                      // SECTION 2: Statutory Tax & Compliance Information
                      _buildSectionHeader('Tax & Statutory Registration', isDark),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: _cardBoxDecoration(isDark),
                        child: Column(
                          children: [
                            _buildTextField(
                              controller: _gstController,
                              label: 'GSTIN (GST Number)',
                              hint: 'e.g. 36AAACH1234F1Z5',
                              icon: Icons.receipt_long_outlined,
                              isDark: isDark,
                              textCapitalization: TextCapitalization.characters,
                              helperText: 'Required for corporate GST input tax credit on invoices',
                            ),
                            const SizedBox(height: AppSpacing.md),
                            _buildTextField(
                              controller: _panController,
                              label: 'Corporate PAN Number',
                              hint: 'e.g. AAACH1234F',
                              icon: Icons.badge_outlined,
                              isDark: isDark,
                              textCapitalization: TextCapitalization.characters,
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: AppSpacing.lg),

                      // SECTION 3: Office Address & Billing Location
                      _buildSectionHeader('Current Business Office Address', isDark),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: _cardBoxDecoration(isDark),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _buildTextField(
                              controller: _addressController,
                              label: 'Registered Office / Campus Address *',
                              hint: 'Building / Tower, Plot No, Tech Park, Street Address',
                              icon: Icons.location_on_outlined,
                              maxLines: 2,
                              isDark: isDark,
                              validator: (val) {
                                if (val == null || val.trim().isEmpty) {
                                  return 'Office address is required';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: AppSpacing.md),
                            Row(
                              children: [
                                Expanded(
                                  flex: 3,
                                  child: _buildTextField(
                                    controller: _cityController,
                                    label: 'City *',
                                    hint: 'e.g. Gurugram',
                                    icon: Icons.location_city_outlined,
                                    isDark: isDark,
                                    validator: (val) => val == null || val.isEmpty ? 'Required' : null,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  flex: 3,
                                  child: _buildTextField(
                                    controller: _stateController,
                                    label: 'State *',
                                    hint: 'e.g. Haryana',
                                    icon: Icons.map_outlined,
                                    isDark: isDark,
                                    validator: (val) => val == null || val.isEmpty ? 'Required' : null,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: AppSpacing.md),
                            _buildTextField(
                              controller: _pincodeController,
                              label: 'PIN Code',
                              hint: 'e.g. 122002',
                              icon: Icons.pin_drop_outlined,
                              keyboardType: TextInputType.number,
                              isDark: isDark,
                            ),
                            const SizedBox(height: AppSpacing.md),
                            SwitchListTile(
                              contentPadding: EdgeInsets.zero,
                              title: Text(
                                'Billing address is same as registered office',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                ),
                              ),
                              value: _isBillingSame,
                              onChanged: (val) => setState(() => _isBillingSame = val),
                              activeThumbColor: AppColors.primary,
                            ),
                            if (!_isBillingSame) ...[
                              const SizedBox(height: 8),
                              _buildTextField(
                                controller: _billingAddressController,
                                label: 'Official Invoicing Address',
                                hint: 'Specific address for corporate billing statements & GST invoices',
                                icon: Icons.description_outlined,
                                maxLines: 2,
                                isDark: isDark,
                              ),
                            ],
                          ],
                        ),
                      ),

                      const SizedBox(height: AppSpacing.lg),

                      // SECTION 4: Fleet & Booking Requirements Profile
                      _buildSectionHeader('Fleet & Booking Scale', isDark),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: _cardBoxDecoration(isDark),
                        child: Column(
                          children: [
                            _buildDropdown(
                              label: 'Estimated Monthly Ride Requirements',
                              value: _selectedMonthlyTrips,
                              items: _monthlyTripOptions,
                              onChanged: (val) => setState(() => _selectedMonthlyTrips = val!),
                              isDark: isDark,
                            ),
                            const SizedBox(height: AppSpacing.md),
                            _buildTextField(
                              controller: _spocNameController,
                              label: 'Corporate Booker / SPOC Name',
                              hint: 'Authorized contact person',
                              icon: Icons.person_outline,
                              isDark: isDark,
                            ),
                            const SizedBox(height: AppSpacing.md),
                            _buildTextField(
                              controller: _spocDesignationController,
                              label: 'Designation / Department',
                              hint: 'e.g. Corporate Travel Desk, Facilities Lead',
                              icon: Icons.work_outline,
                              isDark: isDark,
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: AppSpacing.xl),

                      // Save Changes Button
                      AppPrimaryButton(
                        text: _isSaving ? 'Saving Company Profile...' : 'Save Company Information',
                        onPressed: _isSaving ? null : _handleSave,
                      ),
                      const SizedBox(height: AppSpacing.xxl),
                    ],
                  ),
                ),
              ),
      ),
    );
  }

  BoxDecoration _cardBoxDecoration(bool isDark) {
    return BoxDecoration(
      color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
      borderRadius: BorderRadius.circular(AppRadius.lg),
      border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
    );
  }

  Widget _buildSectionHeader(String title, bool isDark) {
    return Text(
      title,
      style: AppTypography.caption(
        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
        fontWeight: FontWeight.bold,
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    required bool isDark,
    int maxLines = 1,
    TextInputType keyboardType = TextInputType.text,
    TextCapitalization textCapitalization = TextCapitalization.none,
    String? helperText,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
          ),
        ),
        const SizedBox(height: 4),
        TextFormField(
          controller: controller,
          maxLines: maxLines,
          keyboardType: keyboardType,
          textCapitalization: textCapitalization,
          validator: validator,
          style: TextStyle(
            fontSize: 13,
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
          ),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(
              fontSize: 12,
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            ),
            helperText: helperText,
            helperStyle: const TextStyle(fontSize: 10, color: AppColors.slate400),
            prefixIcon: Icon(icon, size: 20, color: AppColors.primary),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            filled: true,
            fillColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: BorderSide(color: isDark ? AppColors.borderDark : AppColors.borderLight),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: BorderSide(color: isDark ? AppColors.borderDark : AppColors.borderLight),
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
    required ValueChanged<String?> onChanged,
    required bool isDark,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
          ),
        ),
        const SizedBox(height: 4),
        DropdownButtonFormField<String>(
          initialValue: items.contains(value) ? value : items.first,
          items: items
              .map((it) => DropdownMenuItem(
                    value: it,
                    child: Text(it, style: const TextStyle(fontSize: 12)),
                  ))
              .toList(),
          onChanged: onChanged,
          dropdownColor: isDark ? AppColors.surfaceDark : Colors.white,
          style: TextStyle(
            fontSize: 12,
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
          ),
          decoration: InputDecoration(
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            filled: true,
            fillColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: BorderSide(color: isDark ? AppColors.borderDark : AppColors.borderLight),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(AppRadius.md),
              borderSide: BorderSide(color: isDark ? AppColors.borderDark : AppColors.borderLight),
            ),
          ),
        ),
      ],
    );
  }
}
