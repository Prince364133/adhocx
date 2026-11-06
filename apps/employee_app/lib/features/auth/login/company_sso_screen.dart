import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/widgets/employee_app_bar.dart';
import 'package:adhocx_employee/widgets/employee_primary_button.dart';
import 'package:adhocx_employee/widgets/illustration_widgets.dart';
import 'package:adhocx_employee/state/employee_auth_provider.dart';
import 'package:adhocx_employee/models/auth_state.dart';
import 'package:adhocx_employee/routes/app_routes.dart';

class CompanySsoScreen extends StatefulWidget {
  const CompanySsoScreen({super.key});

  @override
  State<CompanySsoScreen> createState() => _CompanySsoScreenState();
}

class _CompanySsoScreenState extends State<CompanySsoScreen> {
  final TextEditingController _inputController = TextEditingController();
  bool _isPhoneMode = false;
  bool _isValid = false;

  @override
  void initState() {
    super.initState();
    _inputController.addListener(_onInputChanged);
  }

  void _onInputChanged() {
    final text = _inputController.text.trim();
    if (text.isEmpty) {
      if (_isValid) setState(() => _isValid = false);
      return;
    }

    // Smart Auto-Detection:
    // If user starts with or enters digits -> switch to Mobile (+91)
    // If user enters alphabets or '@' -> switch to Corporate Email
    final startsWithDigitsOrPlus = RegExp(r'^(\+|[0-9])').hasMatch(text);
    final hasAlphaOrAt = RegExp(r'[a-zA-Z@]').hasMatch(text);

    if (startsWithDigitsOrPlus && !hasAlphaOrAt && !_isPhoneMode) {
      setState(() => _isPhoneMode = true);
    } else if (hasAlphaOrAt && _isPhoneMode) {
      setState(() => _isPhoneMode = false);
    }

    final valid = _isPhoneMode
        ? _cleanIndianDigits(text).length == 10
        : (text.contains('@') && text.contains('.') && text.length > 5);

    if (valid != _isValid) {
      setState(() => _isValid = valid);
    }
  }

  @override
  void dispose() {
    _inputController.removeListener(_onInputChanged);
    _inputController.dispose();
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

  Future<void> _handleSubmit() async {
    final text = _inputController.text.trim();
    final authProvider = context.read<EmployeeAuthProvider>();

    if (_isPhoneMode) {
      final digits = _cleanIndianDigits(text);
      if (digits.length != 10 || !RegExp(r'^[6-9]\d{9}$').hasMatch(digits)) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please enter a valid 10-digit Indian mobile number.'),
            backgroundColor: AppColors.error,
          ),
        );
        return;
      }

      final success = await authProvider.sendOtp('+91 $digits');
      if (mounted && success) {
        context.push(AppRoutes.otpVerify);
      }
    } else {
      if (!text.contains('@') || !text.contains('.')) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please enter a valid company email address.'),
            backgroundColor: AppColors.error,
          ),
        );
        return;
      }

      final result = await authProvider.authenticateWithSso(text);

      if (!mounted) return;

      if (result == AuthStatus.authenticated) {
        context.go(AppRoutes.employeeVerified);
      } else if (result == AuthStatus.notEligible) {
        context.go(AppRoutes.transportUnavailable);
      } else if (result == AuthStatus.otpSent) {
        context.push(AppRoutes.otpVerify);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(authProvider.errorMessage ?? 'SSO authentication failed.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<EmployeeAuthProvider>();
    final rawText = _inputController.text.trim();

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: const EmployeeAppBar(),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 12),
              // SSO Shield Badge
              const CompanySsoBadge(),

              const SizedBox(height: 28),

              Text(
                _isPhoneMode ? 'Sign In with\nIndian Mobile (+91)' : 'Continue with\nCompany SSO',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                  letterSpacing: -0.4,
                  height: 1.25,
                ),
              ),

              const SizedBox(height: 8),

              Text(
                _isPhoneMode
                    ? "Enter your 10-digit Indian phone number to receive an SMS OTP."
                    : 'Use your company email or mobile number to sign in.',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w400,
                  color: AppColors.textSecondary,
                ),
              ),

              const SizedBox(height: 24),

              // Mode Switcher Pills
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
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
                            color: !_isPhoneMode ? Colors.white : Colors.transparent,
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
                                color: !_isPhoneMode ? AppColors.primaryBlue : AppColors.textMuted,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Company Email',
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  fontWeight: !_isPhoneMode ? FontWeight.w700 : FontWeight.w500,
                                  color: !_isPhoneMode ? AppColors.textPrimary : AppColors.textMuted,
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
                            _isPhoneMode = true;
                          });
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(
                            color: _isPhoneMode ? Colors.white : Colors.transparent,
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
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  fontWeight: _isPhoneMode ? FontWeight.w700 : FontWeight.w500,
                                  color: _isPhoneMode ? AppColors.textPrimary : AppColors.textMuted,
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

              const SizedBox(height: 24),

              // Smart Identifier TextField
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: rawText.isNotEmpty ? AppColors.primaryBlue : AppColors.border,
                    width: rawText.isNotEmpty ? 2.0 : 1.5,
                  ),
                ),
                child: Row(
                  children: [
                    if (_isPhoneMode) ...[
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Text('🇮🇳', style: TextStyle(fontSize: 16)),
                          const SizedBox(width: 5),
                          Text(
                            '+91',
                            style: GoogleFonts.inter(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Icon(
                            Icons.keyboard_arrow_down_rounded,
                            size: 18,
                            color: AppColors.textMuted,
                          ),
                        ],
                      ),
                      Container(
                        height: 24,
                        width: 1,
                        color: AppColors.border,
                        margin: const EdgeInsets.symmetric(horizontal: 10),
                      ),
                    ] else ...[
                      const Icon(
                        Icons.alternate_email_rounded,
                        size: 19,
                        color: AppColors.primaryBlue,
                      ),
                      Container(
                        height: 24,
                        width: 1,
                        color: AppColors.border,
                        margin: const EdgeInsets.symmetric(horizontal: 10),
                      ),
                    ],
                    Expanded(
                      child: TextField(
                        controller: _inputController,
                        keyboardType: _isPhoneMode ? TextInputType.phone : TextInputType.emailAddress,
                        inputFormatters: _isPhoneMode
                            ? [
                                FilteringTextInputFormatter.allow(RegExp(r'[0-9\+\s\-]')),
                                LengthLimitingTextInputFormatter(14),
                              ]
                            : null,
                        style: GoogleFonts.inter(
                          fontSize: 15,
                          fontWeight: FontWeight.w500,
                          color: AppColors.textPrimary,
                        ),
                        decoration: InputDecoration(
                          hintText: _isPhoneMode ? '98765 43210' : 'you@company.com',
                          hintStyle: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w400,
                            color: AppColors.textMuted,
                          ),
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),
                    if (rawText.isNotEmpty)
                      GestureDetector(
                        onTap: () => setState(() => _inputController.clear()),
                        child: const Icon(
                          Icons.cancel,
                          size: 18,
                          color: AppColors.textMuted,
                        ),
                      ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Continue Button
              EmployeePrimaryButton(
                label: _isPhoneMode ? 'Send SMS OTP' : 'Continue with SSO',
                isLoading: authProvider.isLoading,
                onPressed: _isValid ? _handleSubmit : null,
              ),

              const SizedBox(height: 24),

              // Quick route directly to mobile number
              TextButton(
                onPressed: () => context.push(AppRoutes.mobileNumber),
                child: Text(
                  'Switch to Dialpad Sign In',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primaryBlue,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}




