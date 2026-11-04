import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../services/mock_data_service.dart';
import '../../widgets/employee_app_bar.dart';
import '../../widgets/employee_primary_button.dart';
import '../../widgets/batch_03_illustrations.dart';
import '../../routes/app_routes.dart';

class RequestStatusApprovedScreen extends StatefulWidget {
  const RequestStatusApprovedScreen({super.key});

  @override
  State<RequestStatusApprovedScreen> createState() => _RequestStatusApprovedScreenState();
}

class _RequestStatusApprovedScreenState extends State<RequestStatusApprovedScreen> {
  Map<String, dynamic>? _approvedData;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadJsonData();
  }

  Future<void> _loadJsonData() async {
    final schedules = await MockDataService.getSchedules();
    final changeRequests = schedules['change_requests'] as Map<String, dynamic>?;
    if (mounted) {
      setState(() {
        _approvedData = changeRequests?['approved'] as Map<String, dynamic>?;
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

    final message = _approvedData?['message'] ??
        'Your pickup location has been updated for the selected trip.';
    final newLocation = _approvedData?['newLocation'] ?? 'Green Meadows, Kondapur';
    final tripDate = _approvedData?['tripDate'] ?? 'Tue, 09 Dec 2026';

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: const EmployeeAppBar(),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const Spacer(),

              // Approved Checkmark Badge
              const RequestApprovedBadge(),

              const SizedBox(height: 32),

              Text(
                'Change Request\nApproved',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                  letterSpacing: -0.4,
                  height: 1.25,
                ),
              ),

              const SizedBox(height: 12),

              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  message,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    color: AppColors.textSecondary,
                    height: 1.5,
                  ),
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
                    Row(
                      children: [
                        const Icon(Icons.location_on_outlined, color: AppColors.success, size: 20),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'New Pickup Location',
                                style: GoogleFonts.inter(fontSize: 11, color: AppColors.textMuted),
                              ),
                              Text(
                                newLocation,
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
                    const Divider(color: AppColors.border, height: 24),
                    Row(
                      children: [
                        const Icon(Icons.calendar_month_outlined, color: AppColors.primaryBlue, size: 20),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Trip Date',
                                style: GoogleFonts.inter(fontSize: 11, color: AppColors.textMuted),
                              ),
                              Text(
                                tripDate,
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
                  ],
                ),
              ),

              const Spacer(),

              // "View Updated Trip" Primary Button
              EmployeePrimaryButton(
                label: 'View Updated Trip',
                onPressed: () => context.go(AppRoutes.homeUpcomingPickup),
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}

