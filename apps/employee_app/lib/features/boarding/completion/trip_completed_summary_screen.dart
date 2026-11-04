import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/widgets/batch_06_illustrations.dart';
import 'package:adhocx_employee/widgets/employee_primary_button.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/routes/app_routes.dart';

/// Screen 10: Trip Completed
class TripCompletedSummaryScreen extends StatefulWidget {
  const TripCompletedSummaryScreen({super.key});

  @override
  State<TripCompletedSummaryScreen> createState() => _TripCompletedSummaryScreenState();
}

class _TripCompletedSummaryScreenState extends State<TripCompletedSummaryScreen> {
  Map<String, dynamic>? _completedData;
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
        _completedData = boarding['trip_completed'] as Map<String, dynamic>?;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = _completedData?['title'] ?? 'Trip Completed!';
    final subtitle = _completedData?['subtitle'] ?? 'Your trip has been completed successfully.';
    final tripType = _completedData?['tripType'] ?? 'Login (Pickup)';
    final pickupTime = _completedData?['pickupTime'] ?? '8:15 AM';
    final dropTime = _completedData?['dropTime'] ?? '9:02 AM';
    final duration = _completedData?['duration'] ?? '47 min';
    final distance = _completedData?['distance'] ?? '12.4 km';

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
                    const BoardingSuccessBadge(),
                    const SizedBox(height: 20),
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
                      ),
                    ),
                    const SizedBox(height: 28),

                    // Metrics Card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        children: [
                          _buildMetricRow('Trip Type', tripType),
                          const Divider(height: 20),
                          _buildMetricRow('Pickup Time', pickupTime),
                          const Divider(height: 20),
                          _buildMetricRow('Drop Time', dropTime),
                          const Divider(height: 20),
                          _buildMetricRow('Duration', duration),
                          const Divider(height: 20),
                          _buildMetricRow('Distance', distance),
                        ],
                      ),
                    ),

                    const Spacer(),

                    EmployeePrimaryButton(
                      label: 'View Trip Details',
                      onPressed: () => context.push(AppRoutes.safeReachConfirmation),
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildMetricRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: AppColors.textSecondary,
          ),
        ),
        Text(
          value,
          style: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
      ],
    );
  }
}



