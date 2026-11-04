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

class TripBoardedScreen extends StatefulWidget {
  const TripBoardedScreen({super.key});

  @override
  State<TripBoardedScreen> createState() => _TripBoardedScreenState();
}

class _TripBoardedScreenState extends State<TripBoardedScreen> {
  Map<String, dynamic>? _tripData;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadJsonData();
  }

  Future<void> _loadJsonData() async {
    final trip = await MockDataService.getTrip('boarded');
    if (mounted) {
      setState(() {
        _tripData = trip;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: AppColors.primaryBlue)),
      );
    }

    final message = _tripData?['message'] ?? "You're on board! Trip is in progress to your office.";
    final drop = _tripData?['drop'] ?? 'HITEC City Office';

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

              // Boarded Status Pill
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.successLight,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.successBorder),
                ),
                child: Text(
                  'Boarded',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.success,
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // Boarded Seat Graphic
              const BoardedSeatIllustration(),

              const SizedBox(height: 24),

              Text(
                "You're on board!",
                style: GoogleFonts.inter(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Trip is in progress to your office.',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textSecondary,
                ),
              ),

              const SizedBox(height: 28),

              // Step Tracker: Boarded is active
              const TripStepTracker(currentStep: TripStep.boarded),

              const SizedBox(height: 28),

              // Drop Office Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surfaceMuted,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.apartment_rounded,
                        color: AppColors.primaryBlue,
                        size: 22,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Drop at',
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              color: AppColors.textMuted,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          Text(
                            drop,
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 36),

              // Primary "Live Tracking" Button
              EmployeePrimaryButton(
                label: 'Live Tracking',
                icon: Icons.navigation_rounded,
                onPressed: () => context.push(AppRoutes.tripInProgress),
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
