import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/widgets/employee_app_bar.dart';
import 'package:adhocx_employee/widgets/employee_primary_button.dart';
import 'package:adhocx_employee/state/employee_auth_provider.dart';
import 'package:adhocx_employee/routes/app_routes.dart';

/// Screen: Enter Indian Mobile Number (+91) for Corporate Commuter Authentication.
/// Email and Google auth completely removed as per SMS phone authentication mandate.
class MobileNumberScreen extends StatefulWidget {
  const MobileNumberScreen({super.key});

  @override
  State<MobileNumberScreen> createState() => _MobileNumberScreenState();
}

class _MobileNumberScreenState extends State<MobileNumberScreen> {
  final TextEditingController _inputController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _inputController.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _inputController.dispose();
    super.dispose();
  }

  void _onKeypadTap(String value) {
    final currentDigits = _cleanIndianDigits(_inputController.text);
    if (currentDigits.length < 10) {
      final newText = currentDigits + value;
      _inputController.text = newText;
      _inputController.selection = TextSelection.fromPosition(
        TextPosition(offset: newText.length),
      );
    }
  }

  void _onKeypadBackspace() {
    if (_inputController.text.isNotEmpty) {
      final newText =
          _inputController.text.substring(0, _inputController.text.length - 1);
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
    final digits = _cleanIndianDigits(text);

    if (digits.length != 10 || !RegExp(r'^[6-9]\d{9}$').hasMatch(digits)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
              'Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    final success = await authProvider.sendOtp('+91 $digits');
    if (mounted && success) {
      context.push(AppRoutes.otpVerify);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<EmployeeAuthProvider>();
    final rawText = _inputController.text.trim();
    final isReady = _cleanIndianDigits(rawText).length == 10;

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
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Enter Mobile Number',
                      style: GoogleFonts.inter(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                        letterSpacing: -0.4,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      "We'll send a 6-digit SMS OTP to verify your Indian mobile number via MSG91.",
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textSecondary,
                        height: 1.45,
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Phone Input Field (+91 India)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: rawText.isNotEmpty
                              ? AppColors.primaryBlue
                              : AppColors.border,
                          width: rawText.isNotEmpty ? 2.0 : 1.5,
                        ),
                      ),
                      child: Row(
                        children: [
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Text('🇮🇳',
                                  style: TextStyle(fontSize: 16)),
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
                          Expanded(
                            child: Theme(
                              data: Theme.of(context).copyWith(
                                inputDecorationTheme:
                                    const InputDecorationTheme(
                                  filled: false,
                                  border: InputBorder.none,
                                  enabledBorder: InputBorder.none,
                                  focusedBorder: InputBorder.none,
                                  disabledBorder: InputBorder.none,
                                  errorBorder: InputBorder.none,
                                  focusedErrorBorder: InputBorder.none,
                                ),
                              ),
                              child: TextField(
                                controller: _inputController,
                                keyboardType: TextInputType.phone,
                                inputFormatters: [
                                  FilteringTextInputFormatter.digitsOnly,
                                  LengthLimitingTextInputFormatter(10),
                                ],
                                style: GoogleFonts.inter(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textPrimary,
                                  letterSpacing: 0.6,
                                ),
                                decoration: InputDecoration(
                                  hintText: '98765 43210',
                                  hintStyle: GoogleFonts.inter(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w400,
                                    color: AppColors.textMuted,
                                    letterSpacing: 0,
                                  ),
                                  filled: false,
                                  border: InputBorder.none,
                                  enabledBorder: InputBorder.none,
                                  focusedBorder: InputBorder.none,
                                  disabledBorder: InputBorder.none,
                                  errorBorder: InputBorder.none,
                                  focusedErrorBorder: InputBorder.none,
                                  isDense: true,
                                  contentPadding: const EdgeInsets.symmetric(
                                    vertical: 12,
                                  ),
                                ),
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
                          const Icon(Icons.error_outline,
                              size: 16, color: AppColors.error),
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

                    // "Send SMS OTP" Full-width Pill Button
                    EmployeePrimaryButton(
                      label: 'Send SMS OTP',
                      isLoading: authProvider.isLoading,
                      onPressed: isReady ? _handleSendOtp : null,
                    ),

                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),

            // In-app dialpad for convenient mobile number entry
            _buildCustomNumericDialpad(),
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
