import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/widgets/employee_app_bar.dart';
import 'package:adhocx_employee/widgets/employee_primary_button.dart';
import 'package:adhocx_employee/state/employee_auth_provider.dart';
import 'package:adhocx_employee/models/auth_state.dart';
import 'package:adhocx_employee/routes/app_routes.dart';

class MobileNumberScreen extends StatefulWidget {
  const MobileNumberScreen({super.key});

  @override
  State<MobileNumberScreen> createState() => _MobileNumberScreenState();
}

class _MobileNumberScreenState extends State<MobileNumberScreen> {
  final TextEditingController _inputController = TextEditingController();
  bool _isPhoneMode = true;

  @override
  void initState() {
    super.initState();
    _inputController.addListener(_onInputChanged);
  }

  void _onInputChanged() {
    final text = _inputController.text.trim();
    if (text.isEmpty) return;

    // Smart Auto-Detection:
    // If user starts with or enters digits -> switch to Mobile Number (+91)
    // If user enters alphabets or '@' -> switch to Corporate Email
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
    _inputController.removeListener(_onInputChanged);
    _inputController.dispose();
    super.dispose();
  }

  void _onKeypadTap(String value) {
    if (_isPhoneMode) {
      final currentDigits = _cleanIndianDigits(_inputController.text);
      if (currentDigits.length < 10) {
        final newText = currentDigits + value;
        _inputController.text = newText;
        _inputController.selection = TextSelection.fromPosition(
          TextPosition(offset: newText.length),
        );
      }
    } else {
      final newText = _inputController.text + value;
      _inputController.text = newText;
      _inputController.selection = TextSelection.fromPosition(
        TextPosition(offset: newText.length),
      );
    }
  }

  void _onKeypadBackspace() {
    if (_inputController.text.isNotEmpty) {
      final newText = _inputController.text.substring(0, _inputController.text.length - 1);
      _inputController.text = newText;
      _inputController.selection = TextSelection.fromPosition(
        TextPosition(offset: newText.length),
      );
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

  Future<void> _handleSendOtp() async {
    final text = _inputController.text.trim();
    final authProvider = context.read<EmployeeAuthProvider>();

    if (_isPhoneMode) {
      final digits = _cleanIndianDigits(text);
      if (digits.length != 10 || !RegExp(r'^[6-9]\d{9}$').hasMatch(digits)) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).'),
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
      final email = text.toLowerCase();
      final emailRegex = RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$');
      if (!emailRegex.hasMatch(email)) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please enter a valid corporate email address (e.g. name@company.com).'),
            backgroundColor: AppColors.error,
          ),
        );
        return;
      }

      final success = await authProvider.sendOtp(email);
      if (mounted && success) {
        context.push(AppRoutes.otpVerify);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<EmployeeAuthProvider>();
    final rawText = _inputController.text.trim();
    final isReady = _isPhoneMode
        ? _cleanIndianDigits(rawText).length == 10
        : RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$').hasMatch(rawText);

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: EmployeeAppBar(
        onBack: () {
          if (context.canPop()) {
            context.pop();
          } else {
            context.go(AppRoutes.welcome);
          }
        },
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _isPhoneMode ? 'Enter Mobile Number' : 'Enter Corporate Email',
                      style: GoogleFonts.inter(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                        letterSpacing: -0.4,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _isPhoneMode
                          ? "We'll send a 6-digit SMS OTP to verify your Indian mobile number via MSG91."
                          : "We'll send a one-time verification code to your corporate email.",
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textSecondary,
                        height: 1.45,
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Quick Mode Switcher Pills: Mobile (+91) vs Email
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
                                      'Corporate Email',
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
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Smart Input Field
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
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textPrimary,
                                letterSpacing: _isPhoneMode ? 0.6 : 0,
                              ),
                              decoration: InputDecoration(
                                hintText: _isPhoneMode ? '98765 43210' : 'name@company.com',
                                hintStyle: GoogleFonts.inter(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w400,
                                  color: AppColors.textMuted,
                                  letterSpacing: 0,
                                ),
                                border: InputBorder.none,
                                isDense: true,
                                contentPadding: const EdgeInsets.symmetric(vertical: 12),
                              ),
                            ),
                          ),
                          if (rawText.isNotEmpty)
                            GestureDetector(
                              onTap: () {
                                setState(() {
                                  _inputController.clear();
                                });
                              },
                              child: const Icon(
                                Icons.cancel,
                                size: 18,
                                color: AppColors.textMuted,
                              ),
                            ),
                        ],
                      ),
                    ),

                    if (authProvider.errorMessage != null) ...[
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          const Icon(Icons.error_outline, size: 16, color: AppColors.error),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              authProvider.errorMessage!,
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                color: AppColors.error,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],

                    const SizedBox(height: 24),

                    // "Send OTP" Full-width Pill Button
                    EmployeePrimaryButton(
                      label: _isPhoneMode ? 'Send SMS OTP' : 'Send Email OTP',
                      isLoading: authProvider.isLoading,
                      onPressed: isReady ? _handleSendOtp : null,
                    ),

                    const SizedBox(height: 16),

                    // 1-Click Instant Demo Commuter Access
                    Center(
                      child: TextButton.icon(
                        onPressed: authProvider.isLoading
                            ? null
                            : () async {
                                final res = await authProvider.loginWithPassword(
                                  identifier: 'ravi.kumar@hitec.com',
                                  password: 'Admin@AdhocX2026!',
                                );
                                if (context.mounted && res == AuthStatus.authenticated) {
                                  context.go(AppRoutes.employeeVerified);
                                }
                              },
                        icon: const Icon(Icons.bolt, size: 16, color: AppColors.primaryBlue),
                        label: Text(
                          '1-Click Demo Commuter (Ravi Kumar - EMP10204)',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primaryBlue,
                          ),
                        ),
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          backgroundColor: const Color(0xFFEFF6FF),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // In-app dialpad when in phone mode
            if (_isPhoneMode) _buildCustomNumericDialpad(),
          ],
        ),
      ),
    );
  }

  Widget _buildCustomNumericDialpad() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      decoration: const BoxDecoration(
        color: AppColors.surfaceMuted,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildDialpadRow(['1', '2', '3']),
          _buildDialpadRow(['4', '5', '6']),
          _buildDialpadRow(['7', '8', '9']),
          _buildDialpadRow(['', '0', 'backspace']),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  Widget _buildDialpadRow(List<String> keys) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: keys.map((key) {
          if (key.isEmpty) {
            return const SizedBox(width: 72, height: 48);
          }
          if (key == 'backspace') {
            return SizedBox(
              width: 72,
              height: 48,
              child: IconButton(
                onPressed: _onKeypadBackspace,
                icon: const Icon(
                  Icons.backspace_outlined,
                  color: AppColors.textPrimary,
                  size: 22,
                ),
              ),
            );
          }
          return SizedBox(
            width: 72,
            height: 48,
            child: TextButton(
              onPressed: () => _onKeypadTap(key),
              style: TextButton.styleFrom(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: Text(
                key,
                style: GoogleFonts.inter(
                  fontSize: 22,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}
