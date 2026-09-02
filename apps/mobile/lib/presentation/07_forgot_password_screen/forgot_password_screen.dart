import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_phone_field.dart';
import '../../widgets/common/app_primary_button.dart';

/// Screen 7: Forgot Password? (Step 1) matching exact design mockup.
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

  Future<void> _handleSendOtp() async {
    if (!_formKey.currentState!.validate()) return;

    final rawPhone = _phoneController.text.trim().replaceAll(RegExp(r'\D'), '');
    final fullPhone = '+91$rawPhone';

    setState(() => _isLoading = true);

    try {
      final authService = context.read<AuthService>();
      final res = await authService.requestOtp(
        phone: fullPhone,
        role: 'DRIVER',
        isRegister: false,
      );

      if (mounted) {
        Fluttertoast.showToast(
          msg: res['message'] ?? 'Password reset OTP sent to $fullPhone',
          backgroundColor: AppColors.primaryDark,
          textColor: Colors.white,
        );

        context.push(
          AppRoutes.forgotPasswordOtpScreen,
          extra: {'phone': fullPhone},
        );
      }
    } catch (e) {
      if (mounted) {
        Fluttertoast.showToast(
          msg: e.toString().replaceFirst('Exception: ', ''),
          backgroundColor: AppColors.error,
          textColor: Colors.white,
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
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
                          icon: const Icon(
                            Icons.arrow_back,
                            color: AppColors.textPrimaryLight,
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
                        color: AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      'Enter your registered mobile number',
                      style: AppTypography.body(
                        color: AppColors.textSecondaryLight,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xxl),

                    // ── Phone Field ──────────────────────────────────────────
                    AppPhoneField(
                      controller: _phoneController,
                      label: 'Mobile Number',
                      hintText: '98765 43210',
                      validator: (val) {
                        final digits = (val ?? '').replaceAll(RegExp(r'\D'), '');
                        if (digits.length != 10) {
                          return 'Enter a valid 10-digit mobile number';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: AppSpacing.xxl),

                    // ── Primary Action ───────────────────────────────────────
                    AppPrimaryButton(
                      text: 'Send OTP',
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
                            color: AppColors.primary,
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
