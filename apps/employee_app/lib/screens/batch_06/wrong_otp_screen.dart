import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../widgets/batch_06_illustrations.dart';
import '../../widgets/employee_primary_button.dart';
import '../../widgets/employee_secondary_button.dart';
import '../../services/mock_data_service.dart';
import '../../routes/app_routes.dart';

/// Screen 6: Wrong OTP / Invalid OTP State
class WrongOtpScreen extends StatefulWidget {
  const WrongOtpScreen({super.key});

  @override
  State<WrongOtpScreen> createState() => _WrongOtpScreenState();
}

class _WrongOtpScreenState extends State<WrongOtpScreen> {
  Map<String, dynamic>? _errorData;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final boarding = await MockDataService.getBoardingData();
    if (mounted) {
      final errors = boarding['error_states'] as Map<String, dynamic>?;
      setState(() {
        _errorData = errors?['invalid_otp'] as Map<String, dynamic>?;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = _errorData?['title'] ?? 'Invalid OTP';
    final message = _errorData?['message'] ??
        'The OTP you entered is incorrect. Please check and try again.';
    final digits = ['5', '8', '3', '2', '7', '']; // 6th digit missing / error

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: AppColors.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                child: Column(
                  children: [
                    const SizedBox(height: 16),
                    const InvalidOtpBadge(),
                    const SizedBox(height: 24),
                    Text(
                      title,
                      style: GoogleFonts.inter(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      message,
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        color: AppColors.textSecondary,
                        height: 1.45,
                      ),
                    ),
                    const SizedBox(height: 36),

                    // OTP input with error outline on last block
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(6, (index) {
                        final isErrorBox = index == 5;
                        return Container(
                          margin: const EdgeInsets.symmetric(horizontal: 5),
                          width: 44,
                          height: 52,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isErrorBox ? AppColors.error : AppColors.border,
                              width: isErrorBox ? 2.0 : 1.2,
                            ),
                          ),
                          child: Center(
                            child: Text(
                              digits[index],
                              style: GoogleFonts.inter(
                                fontSize: 20,
                                fontWeight: FontWeight.w800,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ),
                        );
                      }),
                    ),

                    const Spacer(),

                    EmployeePrimaryButton(
                      label: 'Try Again',
                      icon: Icons.refresh_rounded,
                      onPressed: () => context.push(AppRoutes.boardingOtpInput),
                    ),
                    const SizedBox(height: 12),

                    EmployeeSecondaryButton(
                      label: 'Scan QR Instead',
                      icon: Icons.qr_code_scanner_rounded,
                      textColor: AppColors.primaryBlue,
                      borderColor: AppColors.primaryBlue,
                      onPressed: () => context.push(AppRoutes.scanBoardingQr),
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
    );
  }
}
