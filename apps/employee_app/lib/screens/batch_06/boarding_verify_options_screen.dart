import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../widgets/employee_primary_button.dart';
import '../../widgets/employee_secondary_button.dart';
import '../../services/mock_data_service.dart';
import '../../routes/app_routes.dart';

/// Screen 1: Boarding - Verify Options
class BoardingVerifyOptionsScreen extends StatefulWidget {
  const BoardingVerifyOptionsScreen({super.key});

  @override
  State<BoardingVerifyOptionsScreen> createState() => _BoardingVerifyOptionsScreenState();
}

class _BoardingVerifyOptionsScreenState extends State<BoardingVerifyOptionsScreen> {
  Map<String, dynamic>? _options;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final boarding = await MockDataService.getBoardingData();
    if (mounted) {
      setState(() {
        _options = boarding['verification_options'] as Map<String, dynamic>?;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = _options?['title'] ?? 'Board Your Cab';
    final subtitle = _options?['subtitle'] ?? 'Verify your boarding with a 6-digit OTP from the driver.';
    final tripType = _options?['tripType'] ?? 'Login (Pickup)';
    final driverName = _options?['driverName'] ?? 'Suresh R';
    final vehicleNumber = _options?['vehicleNumber'] ?? 'TS09UB7845';

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
                    // Graphic container
                    Container(
                      width: double.infinity,
                      height: 180,
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: const [
                          Icon(Icons.directions_car_filled_rounded, size: 68, color: AppColors.primaryBlue),
                          SizedBox(height: 10),
                          Icon(Icons.qr_code_scanner_rounded, size: 32, color: AppColors.secondaryOrange),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    Text(
                      title,
                      style: GoogleFonts.inter(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      subtitle,
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        color: AppColors.textSecondary,
                        height: 1.45,
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Trip & Driver preview card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: AppColors.primaryBlueLight.withOpacity(0.5),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.directions_car_rounded, color: AppColors.primaryBlue, size: 22),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Trip: $tripType',
                                  style: GoogleFonts.inter(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Driver: $driverName • $vehicleNumber',
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    const Spacer(),

                    // Primary Button: Enter OTP
                    EmployeePrimaryButton(
                      label: 'Enter OTP',
                      icon: Icons.pin_rounded,
                      onPressed: () => context.push(AppRoutes.boardingOtpInput),
                    ),
                    const SizedBox(height: 12),

                    // Secondary Button: Scan QR Code
                    EmployeeSecondaryButton(
                      label: 'Scan QR Code',
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

