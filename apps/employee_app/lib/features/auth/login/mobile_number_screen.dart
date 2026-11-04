import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/widgets/employee_app_bar.dart';
import 'package:adhocx_employee/widgets/employee_primary_button.dart';
import 'package:adhocx_employee/state/employee_auth_provider.dart';
import 'package:adhocx_employee/routes/app_routes.dart';

class MobileNumberScreen extends StatefulWidget {
  const MobileNumberScreen({super.key});

  @override
  State<MobileNumberScreen> createState() => _MobileNumberScreenState();
}

class _MobileNumberScreenState extends State<MobileNumberScreen> {
  String _phoneNumber = '';
  final TextEditingController _phoneController = TextEditingController();

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  void _onKeypadTap(String value) {
    if (_phoneNumber.length < 10) {
      setState(() {
        _phoneNumber += value;
        _phoneController.text = _phoneNumber;
      });
    }
  }

  void _onKeypadBackspace() {
    if (_phoneNumber.isNotEmpty) {
      setState(() {
        _phoneNumber = _phoneNumber.substring(0, _phoneNumber.length - 1);
        _phoneController.text = _phoneNumber;
      });
    }
  }

  Future<void> _handleSendOtp() async {
    if (_phoneNumber.length < 10) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a valid 10-digit mobile number.'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    final authProvider = context.read<EmployeeAuthProvider>();
    final success = await authProvider.sendOtp('+91 $_phoneNumber');

    if (mounted && success) {
      context.push(AppRoutes.otpVerify);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<EmployeeAuthProvider>();

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: const EmployeeAppBar(),
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
                      "We'll send a one-time password (OTP) to verify your number.",
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textSecondary,
                        height: 1.45,
                      ),
                    ),
                    const SizedBox(height: 32),

                    // Phone input field with +91 country prefix
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: _phoneNumber.isNotEmpty ? AppColors.primaryBlue : AppColors.border,
                          width: _phoneNumber.isNotEmpty ? 2.0 : 1.5,
                        ),
                      ),
                      child: Row(
                        children: [
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                '+91',
                                style: GoogleFonts.inter(
                                  fontSize: 16,
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
                            margin: const EdgeInsets.symmetric(horizontal: 12),
                          ),
                          Expanded(
                            child: Text(
                              _phoneNumber.isEmpty ? '98765 43210' : _phoneNumber,
                              style: GoogleFonts.inter(
                                fontSize: 16,
                                fontWeight: _phoneNumber.isEmpty ? FontWeight.w400 : FontWeight.w700,
                                color: _phoneNumber.isEmpty ? AppColors.textMuted : AppColors.textPrimary,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ),
                          if (_phoneNumber.isNotEmpty)
                            GestureDetector(
                              onTap: () {
                                setState(() {
                                  _phoneNumber = '';
                                  _phoneController.clear();
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
                      label: 'Send OTP',
                      isLoading: authProvider.isLoading,
                      onPressed: _phoneNumber.length >= 10 ? _handleSendOtp : null,
                    ),
                  ],
                ),
              ),
            ),

            // In-app numeric dialpad matching Screen 4 of the mockup
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



