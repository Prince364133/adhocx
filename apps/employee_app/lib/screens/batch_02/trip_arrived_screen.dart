import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../services/mock_data_service.dart';
import '../../widgets/employee_app_bar.dart';
import '../../widgets/employee_primary_button.dart';
import '../../widgets/batch_02_illustrations.dart';
import '../../widgets/trip_step_tracker.dart';
import '../../routes/app_routes.dart';

class TripArrivedScreen extends StatefulWidget {
  const TripArrivedScreen({super.key});

  @override
  State<TripArrivedScreen> createState() => _TripArrivedScreenState();
}

class _TripArrivedScreenState extends State<TripArrivedScreen> {
  Map<String, dynamic>? _tripData;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadJsonData();
  }

  Future<void> _loadJsonData() async {
    final trip = await MockDataService.getTrip('arrived');
    if (mounted) {
      setState(() {
        _tripData = trip;
        _isLoading = false;
      });
    }
  }

  void _showBoardingOtpDialog(String otp) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'Boarding Verification OTP',
                style: GoogleFonts.inter(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Share this code with your driver upon boarding',
                style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary),
              ),
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                decoration: BoxDecoration(
                  color: AppColors.primaryBlueLight.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.primaryBlueLight),
                ),
                child: Text(
                  otp,
                  style: GoogleFonts.inter(
                    fontSize: 32,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 8,
                    color: AppColors.primaryBlueDark,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              EmployeePrimaryButton(
                label: 'Confirm Boarding',
                onPressed: () {
                  Navigator.pop(ctx);
                  context.push(AppRoutes.tripBoarded);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: AppColors.primaryBlue)),
      );
    }

    final message = _tripData?['message'] ?? 'Your cab has arrived! Please board now.';
    final otp = _tripData?['boardingOtp'] ?? '583271';
    final driver = _tripData?['driver'] as Map<String, dynamic>?;
    final driverName = driver?['name'] ?? 'Suresh R';
    final rating = (driver?['rating'] ?? 4.8).toString();

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: const EmployeeAppBar(),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Text(
                "Today's Pickup",
                style: GoogleFonts.inter(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 12),

              // Arrived Status Pill
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.successLight,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.successBorder),
                ),
                child: Text(
                  'Arrived',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.success,
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // Car Arrived Illustration
              const CarArrivedIllustration(),

              const SizedBox(height: 20),

              Text(
                'Your cab has arrived!',
                style: GoogleFonts.inter(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Please board now.',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textSecondary,
                ),
              ),

              const SizedBox(height: 24),

              // Driver Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.04),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 20,
                      backgroundColor: AppColors.primaryBlueLight,
                      child: const Icon(Icons.person, color: AppColors.primaryBlue, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        driverName,
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                    Row(
                      children: [
                        const Icon(Icons.star_rounded, color: Color(0xFFF59E0B), size: 16),
                        const SizedBox(width: 4),
                        Text(
                          rating,
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(width: 16),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.primaryBlueLight.withOpacity(0.4),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.phone, color: AppColors.primaryBlue, size: 18),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Step Tracker: Arrived is active
              const TripStepTracker(currentStep: TripStep.arrived),

              const SizedBox(height: 32),

              // Primary "View Boarding OTP" Button
              EmployeePrimaryButton(
                label: 'View Boarding OTP',
                icon: Icons.qr_code_rounded,
                onPressed: () => _showBoardingOtpDialog(otp),
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}

