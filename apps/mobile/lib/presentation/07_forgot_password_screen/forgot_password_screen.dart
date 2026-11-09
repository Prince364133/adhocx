import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/utils/app_toast.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_primary_button.dart';
import '../../widgets/common/app_text_field.dart';

/// Screen 7: Forgot Password? (Step 1) with Indian Mobile Number (+91) & SMS OTP.
class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  String _cleanIndianDigits(String raw) {
    String digits = raw.replaceAll(RegExp(r'[^0-9]'), '');
    if (digits.startsWith('91') && digits.length == 12) {
      digits = digits.substring(2);
    } else if (digits.startsWith('0') && digits.length == 11) {
      digits = digits.substring(1);
    }
    return digits;
  }

  String? _validatePhone(String? val) {
    if (val == null || val.trim().isEmpty) {
      return 'Please enter your registered 10-digit mobile number';
    }
    final digits = _cleanIndianDigits(val.trim());
    if (digits.length != 10 || !RegExp(r'^[6-9]\d{9}$').hasMatch(digits)) {
      return 'Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)';
    }
    return null;
  }

  Future<void> _handleSendOtp() async {
    final phoneError = _validatePhone(_phoneController.text);
    if (phoneError != null) {
      _formKey.currentState?.validate();
      AppToast.showError(phoneError, context: context);
      return;
    }

    if (!_formKey.currentState!.validate()) {
      AppToast.showError('Please enter a valid mobile number', context: context);
      return;
    }

    setState(() => _isLoading = true);

    try {
      final authService = context.read<AuthService>();
      final digits = _cleanIndianDigits(_phoneController.text);
      final phoneE164 = '+91$digits';

      final res = await authService.requestOtp(
        phone: phoneE164,
        channel: 'SMS',
        isRegister: false,
      );

      if (mounted) {
        final message = res is Map && res['message'] != null
            ? res['message']
            : 'Password reset SMS OTP sent to $phoneE164';
        AppToast.showSuccess(message, context: context);

        context.push(
          AppRoutes.forgotPasswordOtpScreen,
          extra: {'phone': phoneE164},
        );
      }
    } catch (e) {
      if (mounted) {
        AppToast.showError(e, context: context);
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.xxl,
              vertical: AppSpacing.lg,
            ),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // ── Top Navigation Bar ───────────────────────────────────
                    Row(
                      children: [
                        IconButton(
                          onPressed: () => context.pop(),
                          icon: Icon(
                            Icons.arrow_back,
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          ),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    // ── Title & Subtitle ─────────────────────────────────────
                    Text(
                      'Forgot Password?',
                      style: AppTypography.h1(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      'Enter your registered 10-digit mobile number to receive an SMS OTP',
                      style: AppTypography.body(
                        color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xxl),

                    // ── Phone Field ──────────────────────────────────────────
                    AppTextField(
                      controller: _phoneController,
                      label: 'Mobile Number (India) *',
                      hintText: '98765 43210',
                      keyboardType: TextInputType.phone,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                        LengthLimitingTextInputFormatter(10),
                      ],
                      prefixIcon: Padding(
                        padding: const EdgeInsets.only(left: 12, right: 8),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Text('🇮🇳', style: TextStyle(fontSize: 16)),
                            const SizedBox(width: 5),
                            Text(
                              '+91',
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 14,
                                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Container(
                              height: 18,
                              width: 1,
                              color: isDark ? AppColors.borderDark : AppColors.borderLight,
                            ),
                          ],
                        ),
                      ),
                      validator: _validatePhone,
                    ),
                    const SizedBox(height: AppSpacing.xxl),

                    // ── Primary Action ───────────────────────────────────────
                    AppPrimaryButton(
                      text: 'Send SMS OTP',
                      isLoading: _isLoading,
                      onPressed: _handleSendOtp,
                    ),
                    const SizedBox(height: AppSpacing.xxxl),

                    // ── Footer: Back to Sign in ──────────────────────────────
                    Center(
                      child: GestureDetector(
                        onTap: () => context.push(AppRoutes.signInScreen),
                        child: Text(
                          'Back to Sign in',
                          style: AppTypography.body(
                            color: isDark ? AppColors.primaryLight : AppColors.primary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
