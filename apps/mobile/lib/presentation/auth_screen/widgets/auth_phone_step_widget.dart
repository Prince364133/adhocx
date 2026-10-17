import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/utils/app_toast.dart';
import '../../../services/auth_service.dart';
import '../../../theme/app_colors.dart';
import '../../../theme/app_radius.dart';
import '../../../theme/app_spacing.dart';
import '../../../theme/app_typography.dart';
import '../../../widgets/common/app_card.dart';
import '../../../widgets/common/app_phone_field.dart';
import '../../../widgets/common/app_primary_button.dart';
import '../../../widgets/common/app_segmented_control.dart';
import '../../../widgets/common/app_text_field.dart';

typedef OnOtpRequestedCallback = void Function({
  required String phone,
  required String role,
  required bool isRegister,
  String? fullName,
  String? companyName,
});

/// Step 1: Role, Mode (Sign In / Register), and Phone Number Input.
class AuthPhoneStepWidget extends StatefulWidget {
  final String initialRole;
  final OnOtpRequestedCallback onOtpRequested;
  final ValueChanged<String> onRoleChanged;

  const AuthPhoneStepWidget({
    super.key,
    required this.initialRole,
    required this.onOtpRequested,
    required this.onRoleChanged,
  });

  @override
  State<AuthPhoneStepWidget> createState() => _AuthPhoneStepWidgetState();
}

class _AuthPhoneStepWidgetState extends State<AuthPhoneStepWidget> {
  static const String _termsUrl = 'https://www.adhocx.com/terms/';
  static const String _privacyUrl = 'https://www.adhocx.com/privacy/';

  late final TapGestureRecognizer _termsRecognizer;
  late final TapGestureRecognizer _privacyRecognizer;

  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  final _nameController = TextEditingController();
  final _companyController = TextEditingController();

  late String _role; // 'DRIVER' or 'VENDOR'
  bool _isRegister = false;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _role = widget.initialRole;
    _termsRecognizer = TapGestureRecognizer()..onTap = () => _launchWebUrl(_termsUrl);
    _privacyRecognizer = TapGestureRecognizer()..onTap = () => _launchWebUrl(_privacyUrl);
  }

  @override
  void dispose() {
    _termsRecognizer.dispose();
    _privacyRecognizer.dispose();
    _phoneController.dispose();
    _nameController.dispose();
    _companyController.dispose();
    super.dispose();
  }

  Future<void> _launchWebUrl(String url) async {
    try {
      final uri = Uri.parse(url);
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched && mounted) {
        AppToast.showError('Could not open $url', context: context);
      }
    } catch (e) {
      if (mounted) {
        AppToast.showError('Error opening link: $e', context: context);
      }
    }
  }

  void _onModeChanged(bool isRegister) {
    setState(() {
      _isRegister = isRegister;
      _errorMessage = null;
    });
  }

  void _onRoleChanged(String newRole) {
    setState(() {
      _role = newRole;
      _errorMessage = null;
    });
    widget.onRoleChanged(newRole);
  }

  Future<void> _handleRequestOtp() async {
    if (!_formKey.currentState!.validate()) return;

    final rawPhone = _phoneController.text.trim();
    final formattedPhone = rawPhone.startsWith('+') ? rawPhone : '+91$rawPhone';

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await AuthService.instance.requestOtp(phone: formattedPhone);

      if (!mounted) return;
      setState(() => _isLoading = false);
      AppToast.showSuccess('Verification code sent to $formattedPhone', context: context);

      widget.onOtpRequested(
        phone: formattedPhone,
        role: _role,
        isRegister: _isRegister,
        fullName: _nameController.text.trim().isNotEmpty
            ? _nameController.text.trim()
            : null,
        companyName: _companyController.text.trim().isNotEmpty
            ? _companyController.text.trim()
            : null,
      );
    } catch (e) {
      if (!mounted) return;
      final cleanMsg = AppToast.cleanErrorMessage(e);
      setState(() {
        _isLoading = false;
        _errorMessage = cleanMsg;
      });
      AppToast.showError(cleanMsg, context: context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDriver = _role == 'DRIVER';
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ── Sign In vs Register Tabs ────────────────────────────────────
          AppSegmentedControl<bool>(
            items: const [
              SegmentItem(value: false, label: 'Sign In', icon: Icons.login_rounded),
              SegmentItem(value: true, label: 'Register', icon: Icons.person_add_rounded),
            ],
            selectedValue: _isRegister,
            onValueChanged: _onModeChanged,
            activeColor: isDriver
                ? (isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark)
                : (isDark ? AppColors.primaryLight : AppColors.primary),
          ),
          const SizedBox(height: AppSpacing.lg),

          // ── Driver vs Vendor Role Selector ──────────────────────────────
          AppCard(
            padding: AppSpacing.paddingMd,
            backgroundColor: isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceLight,
            borderColor: isDark ? AppColors.borderDark : AppColors.borderLight,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Account Role',
                  style: AppTypography.label(
                    color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                AppSegmentedControl<String>(
                  items: const [
                    SegmentItem(
                      value: 'DRIVER',
                      label: 'Driver',
                      icon: Icons.local_taxi_rounded,
                    ),
                    SegmentItem(
                      value: 'VENDOR',
                      label: 'User / Booker',
                      icon: Icons.person_rounded,
                    ),
                  ],
                  selectedValue: _role,
                  onValueChanged: _onRoleChanged,
                  activeColor: isDriver
                      ? (isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark)
                      : (isDark ? AppColors.primaryLight : AppColors.primary),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.lg),

          // ── Registration Extra Fields ───────────────────────────────────
          if (_isRegister) ...[
            AppTextField(
              controller: _nameController,
              label: 'Full Name (Optional)',
              hintText: isDriver ? 'e.g. Ramesh Kumar' : 'e.g. Sarah Jenkins',
              prefixIcon: Icon(
                Icons.person_outline_rounded,
                color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                size: 20,
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            if (!isDriver) ...[
              AppTextField(
                controller: _companyController,
                label: 'Company / Organization Name (Optional)',
                hintText: 'e.g. Horizon Logistics Pvt Ltd',
                prefixIcon: Icon(
                  Icons.business_outlined,
                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                  size: 20,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
            ],
          ],

          // ── Phone Field ─────────────────────────────────────────────────
          AppPhoneField(
            controller: _phoneController,
            label: 'Mobile Number',
            enabled: !_isLoading,
          ),
          const SizedBox(height: AppSpacing.md),

          // ── Error Banner ────────────────────────────────────────────────
          if (_errorMessage != null) ...[
            Container(
              padding: AppSpacing.paddingMd,
              decoration: BoxDecoration(
                color: AppColors.errorContainer,
                borderRadius: AppRadius.borderMd,
                border: Border.all(
                  color: AppColors.error.withAlpha(90),
                  width: 1,
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.error_outline_rounded,
                    color: AppColors.errorText,
                    size: 18,
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      _errorMessage!,
                      style: AppTypography.small(color: AppColors.errorText),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),
          ],

          // ── Primary Action Button ───────────────────────────────────────
          AppPrimaryButton(
            text: _isRegister ? 'Register with OTP →' : 'Send Login OTP →',
            onPressed: _handleRequestOtp,
            isLoading: _isLoading,
            variant: isDriver
                ? AppButtonVariant.accentGreen
                : AppButtonVariant.primary,
          ),
          const SizedBox(height: AppSpacing.lg),

          // ── Terms & Privacy Footer ──────────────────────────────────────
          Center(
            child: Text.rich(
              TextSpan(
                text: 'By continuing, you agree to the AdhocX ',
                style: AppTypography.caption(
                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                ).copyWith(height: 1.4),
                children: [
                  TextSpan(
                    text: 'Terms of Service',
                    recognizer: _termsRecognizer,
                    style: TextStyle(
                      color: isDark ? AppColors.primaryLight : AppColors.primary,
                      fontWeight: FontWeight.bold,
                      decoration: TextDecoration.underline,
                      decorationColor: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.6),
                    ),
                  ),
                  const TextSpan(text: ' & '),
                  TextSpan(
                    text: 'Privacy Policy',
                    recognizer: _privacyRecognizer,
                    style: TextStyle(
                      color: isDark ? AppColors.primaryLight : AppColors.primary,
                      fontWeight: FontWeight.bold,
                      decoration: TextDecoration.underline,
                      decorationColor: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.6),
                    ),
                  ),
                ],
              ),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }
}
