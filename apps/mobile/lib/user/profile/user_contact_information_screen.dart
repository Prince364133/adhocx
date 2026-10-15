import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../services/auth_service.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';

class UserContactInformationScreen extends StatefulWidget {
  const UserContactInformationScreen({super.key});

  @override
  State<UserContactInformationScreen> createState() => _UserContactInformationScreenState();
}

class _UserContactInformationScreenState extends State<UserContactInformationScreen> {
  bool _isLoading = true;
  bool _isSaving = false;

  final _formKey = GlobalKey<FormState>();

  final TextEditingController _spocNameController = TextEditingController();
  final TextEditingController _designationController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();

  final TextEditingController _billingEmailController = TextEditingController();
  final TextEditingController _altPhoneController = TextEditingController();

  final TextEditingController _emergencyNameController = TextEditingController();
  final TextEditingController _emergencyPhoneController = TextEditingController();

  final TextEditingController _branchNameController = TextEditingController();
  final TextEditingController _operationalAddressController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadContactData();
  }

  @override
  void dispose() {
    _spocNameController.dispose();
    _designationController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _billingEmailController.dispose();
    _altPhoneController.dispose();
    _emergencyNameController.dispose();
    _emergencyPhoneController.dispose();
    _branchNameController.dispose();
    _operationalAddressController.dispose();
    super.dispose();
  }

  Future<void> _loadContactData() async {
    try {
      final user = AuthService.instance.currentUser;
      final vendorMap = user?.vendorProfile ?? {};

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
          _spocNameController.text = (merged['fullName'] ?? user?.fullName ?? '').toString();
          _designationController.text = (merged['spocDesignation'] ?? '').toString();
          _phoneController.text = (merged['phone'] ?? user?.phone ?? '').toString();
          _emailController.text = (user?.email ?? merged['email'] ?? '').toString();

          _billingEmailController.text = (merged['alternateEmail'] ?? '').toString();
          _altPhoneController.text = (merged['alternatePhone'] ?? '').toString();

          _emergencyNameController.text = (merged['emergencyContactName'] ?? '').toString();
          _emergencyPhoneController.text = (merged['emergencyContactPhone'] ?? '').toString();

          _branchNameController.text = (merged['operationalCampus'] ?? '').toString();
          _operationalAddressController.text = (merged['address'] ?? '').toString();

          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) {
      Fluttertoast.showToast(msg: 'Please check and fill the required contact details');
      return;
    }

    setState(() => _isSaving = true);

    try {
      final payload = {
        'fullName': _spocNameController.text.trim(),
        'spocDesignation': _designationController.text.trim(),
        'phone': _phoneController.text.trim(),
        'alternateEmail': _billingEmailController.text.trim(),
        'alternatePhone': _altPhoneController.text.trim(),
        'emergencyContactName': _emergencyNameController.text.trim(),
        'emergencyContactPhone': _emergencyPhoneController.text.trim(),
        'operationalCampus': _branchNameController.text.trim(),
      };

      await UserService.instance.updateVendorProfile(payload);

      if (mounted) {
        Fluttertoast.showToast(
          msg: 'Contact information updated successfully',
          backgroundColor: AppColors.success,
          textColor: Colors.white,
        );
        setState(() => _isSaving = false);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSaving = false);
        Fluttertoast.showToast(
          msg: 'Failed to update contact information: $e',
          backgroundColor: AppColors.error,
          textColor: Colors.white,
        );
      }
    }
  }

  Future<void> _callHelpline(String phone) async {
    final uri = Uri.parse('tel:${phone.replaceAll(' ', '')}');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      Fluttertoast.showToast(msg: 'Unable to open dialer: $phone');
    }
  }

  Future<void> _emailSupport(String email) async {
    final uri = Uri.parse('mailto:$email?subject=AdhocX%20Corporate%20Account%20Inquiry');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      Fluttertoast.showToast(msg: 'Unable to open mail client: $email');
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

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
          'Contact Information',
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
                      // Header Card
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
                          border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 56,
                              height: 56,
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.15),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.contact_phone_rounded, size: 28, color: AppColors.primary),
                            ),
                            const SizedBox(width: AppSpacing.md),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _spocNameController.text.isNotEmpty ? _spocNameController.text : 'Primary Contact',
                                    style: AppTypography.h3(
                                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    _designationController.text.isNotEmpty
                                        ? _designationController.text
                                        : 'Corporate Account SPOC',
                                    style: AppTypography.caption(
                                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    _phoneController.text.isNotEmpty ? _phoneController.text : '—',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: AppSpacing.lg),

                      // SECTION 1: Primary Corporate Booker (SPOC)
                      _buildSectionHeader('Primary Authorized Contact (SPOC)', isDark),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: _cardBoxDecoration(isDark),
                        child: Column(
                          children: [
                            _buildTextField(
                              controller: _spocNameController,
                              label: 'Full Name *',
                              hint: 'e.g. Prince Gupta',
                              icon: Icons.person_outline,
                              isDark: isDark,
                              validator: (val) => val == null || val.trim().isEmpty ? 'Name is required' : null,
                            ),
                            const SizedBox(height: AppSpacing.md),
                            _buildTextField(
                              controller: _designationController,
                              label: 'Official Designation / Department',
                              hint: 'e.g. Corporate Travel Manager / Facilities Admin',
                              icon: Icons.badge_outlined,
                              isDark: isDark,
                            ),
                            const SizedBox(height: AppSpacing.md),
                            _buildTextField(
                              controller: _phoneController,
                              label: 'Official Mobile Number *',
                              hint: '+91 98765 43210',
                              icon: Icons.phone_android_outlined,
                              isDark: isDark,
                              keyboardType: TextInputType.phone,
                              validator: (val) => val == null || val.trim().isEmpty ? 'Phone is required' : null,
                            ),
                            const SizedBox(height: AppSpacing.md),
                            _buildTextField(
                              controller: _emailController,
                              label: 'Primary Work Email Address',
                              hint: 'user@company.com',
                              icon: Icons.email_outlined,
                              isDark: isDark,
                              keyboardType: TextInputType.emailAddress,
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: AppSpacing.lg),

                      // SECTION 2: Billing & Accounts Escalation Desk
                      _buildSectionHeader('Billing & Accounts Contact', isDark),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: _cardBoxDecoration(isDark),
                        child: Column(
                          children: [
                            _buildTextField(
                              controller: _billingEmailController,
                              label: 'Finance / Invoicing Email (CC for Tax Invoices)',
                              hint: 'accounts@yourcompany.com',
                              icon: Icons.receipt_outlined,
                              isDark: isDark,
                              keyboardType: TextInputType.emailAddress,
                              helperText: 'Monthly GST tax invoices and ride ledgers will be emailed here',
                            ),
                            const SizedBox(height: AppSpacing.md),
                            _buildTextField(
                              controller: _altPhoneController,
                              label: 'Alternate Travel Desk Contact Number',
                              hint: '+91 91234 56789',
                              icon: Icons.phone_outlined,
                              isDark: isDark,
                              keyboardType: TextInputType.phone,
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: AppSpacing.lg),

                      // SECTION 3: 24/7 Night & Emergency Transit Contact
                      _buildSectionHeader('24/7 Emergency Escalation Desk', isDark),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: _cardBoxDecoration(isDark),
                        child: Column(
                          children: [
                            _buildTextField(
                              controller: _emergencyNameController,
                              label: 'Emergency Transit Coordinator Name',
                              hint: 'e.g. Night Shift Admin Coordinator',
                              icon: Icons.security_outlined,
                              isDark: isDark,
                            ),
                            const SizedBox(height: AppSpacing.md),
                            _buildTextField(
                              controller: _emergencyPhoneController,
                              label: '24/7 Emergency Helpline Number',
                              hint: '+91 99887 76655',
                              icon: Icons.phone_in_talk_outlined,
                              isDark: isDark,
                              keyboardType: TextInputType.phone,
                              helperText: 'Direct line used during critical roadside emergencies or route assistance',
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: AppSpacing.lg),

                      // SECTION 4: Operational Campus & Branch
                      _buildSectionHeader('Corporate Operational Campus', isDark),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: _cardBoxDecoration(isDark),
                        child: Column(
                          children: [
                            _buildTextField(
                              controller: _branchNameController,
                              label: 'Branch / Campus Identifier',
                              hint: 'e.g. Building 14, Mindspace SEZ',
                              icon: Icons.business_outlined,
                              isDark: isDark,
                            ),
                            const SizedBox(height: AppSpacing.md),
                            _buildTextField(
                              controller: _operationalAddressController,
                              label: 'Campus Pickup Gate & Instructions',
                              hint: 'Gate 2 Main Entrance, Security Escort Checkpoint',
                              icon: Icons.place_outlined,
                              maxLines: 2,
                              isDark: isDark,
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: AppSpacing.lg),

                      // SECTION 5: AdhocX Corporate Priority Support Card
                      _buildSectionHeader('AdhocX Priority Enterprise Concierge', isDark),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.surfaceDark : Colors.white,
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                        ),
                        child: Column(
                          children: [
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary.withValues(alpha: 0.12),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(Icons.support_agent_rounded, color: AppColors.primary, size: 26),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Dedicated Account Concierge',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 14,
                                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                        ),
                                      ),
                                      Text(
                                        '24/7 active ride dispatch & billing escalations',
                                        style: AppTypography.caption(
                                          color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const Divider(height: 24),
                            Row(
                              children: [
                                Expanded(
                                  child: OutlinedButton.icon(
                                    onPressed: () => _callHelpline('+917893545818'),
                                    icon: const Icon(Icons.call, size: 16, color: AppColors.primary),
                                    label: const Text('+91 7893545818', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: AppColors.primary,
                                      side: const BorderSide(color: AppColors.primary),
                                      padding: const EdgeInsets.symmetric(vertical: 10),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: OutlinedButton.icon(
                                    onPressed: () => _emailSupport('support@adhocx.com'),
                                    icon: const Icon(Icons.email, size: 16, color: AppColors.primary),
                                    label: const Text('Email Desk', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: AppColors.primary,
                                      side: const BorderSide(color: AppColors.primary),
                                      padding: const EdgeInsets.symmetric(vertical: 10),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: AppSpacing.xl),

                      // Save Contact Information Button
                      AppPrimaryButton(
                        text: _isSaving ? 'Updating Contacts...' : 'Save Contact Information',
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
}
