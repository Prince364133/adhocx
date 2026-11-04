import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../services/mock_data_service.dart';
import '../../widgets/employee_app_bar.dart';
import '../../widgets/employee_primary_button.dart';
import '../../widgets/batch_02_illustrations.dart';
import '../../routes/app_routes.dart';

class TripCompletedScreen extends StatefulWidget {
  const TripCompletedScreen({super.key});

  @override
  State<TripCompletedScreen> createState() => _TripCompletedScreenState();
}

class _TripCompletedScreenState extends State<TripCompletedScreen> {
  Map<String, dynamic>? _tripData;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadJsonData();
  }

  Future<void> _loadJsonData() async {
    final trip = await MockDataService.getTrip('completed');
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

    final destination = _tripData?['destination'] ?? 'HITEC City Office';
    final dropTime = _tripData?['dropTime'] ?? '9:02 AM';
    final duration = _tripData?['duration'] ?? '47 min';

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
                "Today's Trip",
                style: GoogleFonts.inter(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 12),

              // Completed Status Pill
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.successLight,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.successBorder),
                ),
                child: Text(
                  'Completed',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.success,
                  ),
                ),
              ),

              const SizedBox(height: 28),

              // Completed Checkmark Badge
              const TripCompletedBadge(),

              const SizedBox(height: 24),

              Text(
                'Trip Completed!',
                style: GoogleFonts.inter(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),

              const SizedBox(height: 6),

              Text(
                'You have reached your destination.',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  color: AppColors.textSecondary,
                ),
              ),

              const SizedBox(height: 32),

              // Summary Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
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
                child: Column(
                  children: [
                    _buildRow(
                      icon: Icons.apartment_rounded,
                      label: 'Office',
                      value: destination,
                    ),
                    const Divider(color: AppColors.border, height: 28),
                    _buildRow(
                      icon: Icons.access_time_rounded,
                      label: 'Drop Time',
                      value: dropTime,
                    ),
                    const Divider(color: AppColors.border, height: 28),
                    _buildRow(
                      icon: Icons.timer_outlined,
                      label: 'Trip Duration',
                      value: duration,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 36),

              // Primary "Provide Feedback" Button
              EmployeePrimaryButton(
                label: 'Provide Feedback',
                icon: Icons.star_border_rounded,
                onPressed: () => context.push(AppRoutes.tripDetails),
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRow({required IconData icon, required String label, required String value}) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppColors.textMuted),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: GoogleFonts.inter(fontSize: 11, color: AppColors.textMuted),
              ),
              const SizedBox(height: 2),
              Text(
                value,
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
    );
  }
}
