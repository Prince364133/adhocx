import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../services/mock_data_service.dart';
import '../../widgets/employee_app_bar.dart';
import '../../widgets/employee_secondary_button.dart';
import '../../widgets/batch_02_illustrations.dart';
import '../../routes/app_routes.dart';

class TripCancelledScreen extends StatefulWidget {
  const TripCancelledScreen({super.key});

  @override
  State<TripCancelledScreen> createState() => _TripCancelledScreenState();
}

class _TripCancelledScreenState extends State<TripCancelledScreen> {
  Map<String, dynamic>? _tripData;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadJsonData();
  }

  Future<void> _loadJsonData() async {
    final trip = await MockDataService.getTrip('cancelled');
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

    final message = _tripData?['message'] ?? 'Your this trip has been cancelled as per your request.';
    final pickupPoint = _tripData?['pickupPoint'] ?? 'Home - Hitech City';
    final scheduledTime = _tripData?['scheduledTime'] ?? '8:15 AM';
    final cancelledAt = _tripData?['cancelledAt'] ?? 'Today, 7:42 AM';

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

              // Cancelled Status Pill
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.errorLight,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.errorBorder),
                ),
                child: Text(
                  'Cancelled',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.error,
                  ),
                ),
              ),

              const SizedBox(height: 28),

              // Cancelled Cross Badge
              const TripCancelledBadge(),

              const SizedBox(height: 24),

              Text(
                'Trip Cancelled',
                style: GoogleFonts.inter(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),

              const SizedBox(height: 6),

              Text(
                message,
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  fontSize: 14,
                  color: AppColors.textSecondary,
                  height: 1.45,
                ),
              ),

              const SizedBox(height: 32),

              // Cancelled Details Card
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
                      icon: Icons.location_on_outlined,
                      label: 'Pickup Point',
                      value: pickupPoint,
                    ),
                    const Divider(color: AppColors.border, height: 28),
                    _buildRow(
                      icon: Icons.access_time_rounded,
                      label: 'Scheduled Time',
                      value: scheduledTime,
                    ),
                    const Divider(color: AppColors.border, height: 28),
                    _buildRow(
                      icon: Icons.cancel_outlined,
                      label: 'Cancelled At',
                      value: cancelledAt,
                      valueColor: AppColors.error,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 36),

              // Back to Home Button
              EmployeeSecondaryButton(
                label: 'Back to Home',
                textColor: AppColors.primaryBlue,
                borderColor: AppColors.primaryBlue,
                onPressed: () => context.go(AppRoutes.homeUpcomingPickup),
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRow({
    required IconData icon,
    required String label,
    required String value,
    Color? valueColor,
  }) {
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
                  color: valueColor ?? AppColors.textPrimary,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
