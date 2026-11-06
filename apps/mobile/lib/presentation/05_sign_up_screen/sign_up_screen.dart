import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/utils/app_toast.dart';
import '../../core/utils/name_utils.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_provider.dart';
import '../../services/auth_service.dart';
import '../../services/onboarding_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../widgets/common/app_primary_button.dart';
import '../../widgets/common/app_social_auth_button.dart';
import '../../widgets/common/app_text_field.dart';

/// Screen 5: Create your account (Sign Up) with Mobile (+91), Email, and Google Auth.
class SignUpScreen extends StatefulWidget {
  const SignUpScreen({super.key});

  @override
  State<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends State<SignUpScreen> {
  static const String _termsUrl = 'https://www.adhocx.com/terms/';
  static const String _privacyUrl = 'https://www.adhocx.com/privacy/';

  late final TapGestureRecognizer _termsRecognizer;
  late final TapGestureRecognizer _privacyRecognizer;

  final _formKey = GlobalKey<FormState>();
  final _identifierController = TextEditingController();

  bool _isPhoneMode = true;
  bool _agreeToTerms = false;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _termsRecognizer = TapGestureRecognizer()..onTap = () => _launchWebUrl(_termsUrl);
    _privacyRecognizer = TapGestureRecognizer()..onTap = () => _launchWebUrl(_privacyUrl);
    _identifierController.addListener(_onIdentifierChanged);
  }

  void _onIdentifierChanged() {
    final text = _identifierController.text.trim();
    if (text.isEmpty) return;

    // Smart auto-detection: numbers turn to phone (+91), letters turn to email
    final startsWithDigitsOrPlus = RegExp(r'^(\+|[0-9])').hasMatch(text);
    final hasAlphaOrAt = RegExp(r'[a-zA-Z@]').hasMatch(text);

    if (startsWithDigitsOrPlus && !hasAlphaOrAt && !_isPhoneMode) {
      setState(() => _isPhoneMode = true);
    } else if (hasAlphaOrAt && _isPhoneMode) {
      setState(() => _isPhoneMode = false);
    }
  }

  @override
  void dispose() {
    _termsRecognizer.dispose();
    _privacyRecognizer.dispose();
    _identifierController.removeListener(_onIdentifierChanged);
    _identifierController.dispose();
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

  String _cleanIndianDigits(String raw) {
    String digits = raw.replaceAll(RegExp(r'[^0-9]'), '');
    if (digits.startsWith('91') && digits.length == 12) {
      digits = digits.substring(2);
    } else if (digits.startsWith('0') && digits.length == 11) {
      digits = digits.substring(1);
    }
    return digits;
  }

  String? _validateIdentifier(String? val) {
    if (val == null || val.trim().isEmpty) {
      return _isPhoneMode
          ? 'Please enter your 10-digit mobile number'
          : 'Please enter your email address';
    }
    final text = val.trim();
    if (_isPhoneMode) {
      final digits = _cleanIndianDigits(text);
      if (digits.length != 10 || !RegExp(r'^[6-9]\d{9}$').hasMatch(digits)) {
        return 'Please enter a valid 10-digit Indian mobile number';
      }
      return null;
    } else {
      final email = text.toLowerCase();
      final emailRegex = RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$');
      if (!emailRegex.hasMatch(email)) {
        return 'Please enter a valid email address';
      }
      return null;
    }
  }

  Future<void> _handleSignUp() async {
    final validationError = _validateIdentifier(_identifierController.text);
    if (validationError != null) {
      _formKey.currentState?.validate();
      AppToast.showError(validationError, context: context);
      return;
    }

    if (!_agreeToTerms) {
      AppToast.showWarning('Please accept the Terms & Conditions and Privacy Policy to proceed', context: context);
      return;
    }

    if (!_formKey.currentState!.validate()) {
      AppToast.showError('Please check the highlighted field', context: context);
      return;
    }

    setState(() => _isLoading = true);

    try {
      final authService = context.read<AuthService>();
      final onboarding = context.read<OnboardingProvider>();

      if (_isPhoneMode) {
        final digits = _cleanIndianDigits(_identifierController.text);
        final phoneE164 = '+91$digits';

        onboarding.setPersonalDetails(
          fullName: !isPlaceholderName(onboarding.fullName) ? onboarding.fullName : '',
          dateOfBirth: onboarding.dateOfBirth,
          gender: onboarding.gender,
          phone: phoneE164,
        );

        final res = await authService.requestOtp(
          phone: phoneE164,
          channel: 'SMS',
          role: onboarding.role,
          isRegister: true,
        );

        if (mounted) {
          final message = res is Map && res['message'] != null
              ? res['message']
              : 'SMS OTP sent to $phoneE164';
          AppToast.showSuccess(message, context: context);

          context.push(
            AppRoutes.loginOtpScreen,
            extra: {
              'phone': phoneE164,
              'role': onboarding.role,
              'isRegister': true,
            },
          );
        }
      } else {
        final targetEmail = _identifierController.text.trim().toLowerCase();

        onboarding.setPersonalDetails(
          fullName: !isPlaceholderName(onboarding.fullName) ? onboarding.fullName : '',
          dateOfBirth: onboarding.dateOfBirth,
          gender: onboarding.gender,
          email: targetEmail,
        );

        final res = await authService.requestOtp(
          email: targetEmail,
          channel: 'EMAIL',
          role: onboarding.role,
          isRegister: true,
        );

        if (mounted) {
          final message = res is Map && res['message'] != null
              ? res['message']
              : 'OTP sent to $targetEmail';
          AppToast.showSuccess(message, context: context);

          context.push(
            AppRoutes.loginOtpScreen,
            extra: {
              'email': targetEmail,
              'role': onboarding.role,
              'isRegister': true,
            },
          );
        }
      }
    } catch (e) {
      if (mounted) {
        AppToast.showError(e, context: context);
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleSocialAuth(SocialAuthType type) async {
    if (!_agreeToTerms) {
      AppToast.showWarning('Please accept the Terms & Conditions and Privacy Policy to proceed', context: context);
      return;
    }

    setState(() => _isLoading = true);

    try {
      final authService = context.read<AuthService>();
      final onboarding = context.read<OnboardingProvider>();

      final isGoogle = type == SocialAuthType.google;
      final result = isGoogle
          ? await authService.signInWithGoogle(role: onboarding.role)
          : await authService.signInWithApple(role: onboarding.role);

      final realSocialName = !isPlaceholderName(result.user.fullName) ? result.user.fullName! : '';
      onboarding.setPersonalDetails(
        fullName: realSocialName,
        dateOfBirth: onboarding.dateOfBirth,
        gender: onboarding.gender,
        email: result.user.email,
        phone: result.user.phone,
      );

      if (mounted) {
        context.read<AuthProvider>().setUser(result.user);
        AppToast.showSuccess(
          '${isGoogle ? "Google" : "Apple"} verified! Welcome ${result.user.fullName ?? ""}',
          context: context,
        );

        if (!result.user.hasPassword) {
          context.push(AppRoutes.setPasswordScreen);
        } else if (!result.user.isOnboarded) {
          context.push(AppRoutes.onboardingPersonalScreen);
        } else if (!result.user.isVerified) {
          context.go(AppRoutes.waitlistGateScreen);
        } else {
          context.go(result.user.isDriver ? AppRoutes.homeScreen : AppRoutes.userHomeScreen);
        }
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
    final onboarding = context.watch<OnboardingProvider>();
    final isDriver = onboarding.isDriver;

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
                          onPressed: () {
                            if (context.canPop()) {
                              context.pop();
                            } else {
                              context.go(AppRoutes.signInScreen);
                            }
                          },
                          icon: Icon(
                            Icons.arrow_back,
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          ),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.md),

                    // ── Title & Subtitle ─────────────────────────────────────
                    Text(
                      'Create your account',
                      style: AppTypography.h1(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      isDriver
                          ? 'Drive, earn & fulfill corporate fleet trips with AdhocX'
                          : 'Book outstation rides & bulk corporate travel with ease',
                      style: AppTypography.body(
                        color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    // ── Mode Switcher Pills: Mobile (+91) vs Email ───────────
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceElevatedDark : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: GestureDetector(
                              onTap: () {
                                setState(() {
                                  _isPhoneMode = true;
                                });
                              },
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 200),
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                decoration: BoxDecoration(
                                  color: _isPhoneMode
                                      ? (isDark ? AppColors.surfaceDark : Colors.white)
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(8),
                                  boxShadow: _isPhoneMode
                                      ? [
                                          BoxShadow(
                                            color: Colors.black.withValues(alpha: 0.06),
                                            blurRadius: 4,
                                            offset: const Offset(0, 1),
                                          )
                                        ]
                                      : null,
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Text('🇮🇳', style: TextStyle(fontSize: 14)),
                                    const SizedBox(width: 6),
                                    Text(
                                      'Mobile (+91)',
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: _isPhoneMode ? FontWeight.w700 : FontWeight.w500,
                                        color: _isPhoneMode
                                            ? (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight)
                                            : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          Expanded(
                            child: GestureDetector(
                              onTap: () {
                                setState(() {
                                  _isPhoneMode = false;
                                });
                              },
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 200),
                                padding: const EdgeInsets.symmetric(vertical: 8),
                                decoration: BoxDecoration(
                                  color: !_isPhoneMode
                                      ? (isDark ? AppColors.surfaceDark : Colors.white)
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(8),
                                  boxShadow: !_isPhoneMode
                                      ? [
                                          BoxShadow(
                                            color: Colors.black.withValues(alpha: 0.06),
                                            blurRadius: 4,
                                            offset: const Offset(0, 1),
                                          )
                                        ]
                                      : null,
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.email_outlined,
                                      size: 15,
                                      color: !_isPhoneMode
                                          ? (isDark ? AppColors.primaryLight : AppColors.primary)
                                          : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      'Email Address',
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: !_isPhoneMode ? FontWeight.w700 : FontWeight.w500,
                                        color: !_isPhoneMode
                                            ? (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight)
                                            : (isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    // ── Input Field: Smart Identifier (Phone +91 or Email) ───
                    AppTextField(
                      controller: _identifierController,
                      label: _isPhoneMode
                          ? 'Mobile Number (India) *'
                          : (isDriver ? 'Email Address *' : 'Corporate Email Address *'),
                      hintText: _isPhoneMode
                          ? '98765 43210'
                          : (isDriver ? 'name@example.com' : 'traveldesk@company.com'),
                      keyboardType: _isPhoneMode ? TextInputType.phone : TextInputType.emailAddress,
                      inputFormatters: _isPhoneMode
                          ? [
                              FilteringTextInputFormatter.allow(RegExp(r'[0-9\+\s\-]')),
                              LengthLimitingTextInputFormatter(14),
                            ]
                          : null,
                      prefixIcon: _isPhoneMode
                          ? Padding(
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
                            )
                          : Icon(
                              Icons.email_outlined,
                              size: 20,
                              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                            ),
                      validator: _validateIdentifier,
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    // ── Terms & Privacy Checkbox ─────────────────────────────
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SizedBox(
                          width: 24,
                          height: 24,
                          child: Checkbox(
                            value: _agreeToTerms,
                            onChanged: (val) => setState(() => _agreeToTerms = val ?? false),
                            activeColor: isDark ? AppColors.primaryLight : AppColors.primary,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(AppRadius.xs),
                            ),
                            side: BorderSide(
                              color: _agreeToTerms
                                  ? (isDriver ? (isDark ? AppColors.primaryLight : AppColors.primary) : (isDark ? AppColors.primaryLight : AppColors.primary))
                                  : (isDark ? AppColors.borderDark : AppColors.borderLight),
                              width: 1.5,
                            ),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: GestureDetector(
                            onTap: () => setState(() => _agreeToTerms = !_agreeToTerms),
                            behavior: HitTestBehavior.opaque,
                            child: Text.rich(
                              TextSpan(
                                text: 'I accept the ',
                                style: AppTypography.caption(
                                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                ).copyWith(height: 1.4),
                                children: [
                                  TextSpan(
                                    text: 'Terms & Conditions',
                                    recognizer: _termsRecognizer,
                                    style: TextStyle(
                                      color: isDark ? AppColors.primaryLight : AppColors.primary,
                                      fontWeight: FontWeight.bold,
                                      decoration: TextDecoration.underline,
                                      decorationColor: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.6),
                                    ),
                                  ),
                                  const TextSpan(text: ' and '),
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
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.xl),

                    // ── Primary Action: Continue with SMS or Email OTP ────────
                    AppPrimaryButton(
                      text: _isPhoneMode ? 'Continue with SMS OTP' : 'Continue with Email OTP',
                      isLoading: _isLoading,
                      onPressed: _handleSignUp,
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    // ── OR Divider ───────────────────────────────────────────
                    Row(
                      children: [
                        Expanded(child: Divider(color: isDark ? AppColors.borderDark : AppColors.borderLight)),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                          child: Text(
                            'OR',
                            style: AppTypography.caption(
                              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        Expanded(child: Divider(color: isDark ? AppColors.borderDark : AppColors.borderLight)),
                      ],
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    // ── Social Sign-Up (Google) ──────────────────────────────
                    AppSocialAuthButton(
                      type: SocialAuthType.google,
                      onPressed: () => _handleSocialAuth(SocialAuthType.google),
                    ),
                    const SizedBox(height: AppSpacing.xxl),

                    // ── Footer: Already have an account? Sign in ─────────────
                    Center(
                      child: GestureDetector(
                        onTap: () => context.push(AppRoutes.signInScreen),
                        child: Text.rich(
                          TextSpan(
                            text: 'Already have an account? ',
                            style: AppTypography.body(
                              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                            ),
                            children: [
                              TextSpan(
                                text: 'Sign in',
                                style: AppTypography.body(
                                  color: isDark ? AppColors.primaryLight : AppColors.primary,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: AppSpacing.lg),

                    // ── Role Switcher: Sign up as Business / Driver ─────────
                    Container(
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.primarySubtle.withValues(alpha: 0.6),
                        borderRadius: BorderRadius.circular(AppRadius.md),
                        border: Border.all(
                          color: isDark ? AppColors.borderDark : AppColors.primaryLight.withValues(alpha: 0.35),
                          width: 1,
                        ),
                      ),
                      child: Material(
                        color: Colors.transparent,
                        child: InkWell(
                          onTap: () {
                            final nextRole = isDriver ? 'VENDOR' : 'DRIVER';
                            onboarding.setRole(nextRole);
                            AppToast.showInfo(
                              isDriver
                                  ? 'Switched to Business Account registration'
                                  : 'Switched to Driver registration',
                              context: context,
                            );
                          },
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.md,
                              vertical: 14,
                            ),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.12),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(
                                    isDriver ? Icons.business_center_outlined : Icons.directions_car_outlined,
                                    size: 20,
                                    color: isDark ? AppColors.primaryLight : AppColors.primary,
                                  ),
                                ),
                                const SizedBox(width: AppSpacing.md),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        isDriver ? 'Registering as a Corporate Business?' : 'Registering as a Commercial Driver?',
                                        style: AppTypography.caption(
                                          color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        isDriver ? 'Switch to Business Account' : 'Switch to Driver',
                                        style: AppTypography.body(
                                          color: isDark ? AppColors.primaryLight : AppColors.primary,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Icon(
                                  Icons.arrow_forward_ios_rounded,
                                  size: 14,
                                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                ),
                              ],
                            ),
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
