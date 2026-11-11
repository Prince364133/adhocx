import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/widgets/employee_app_bar.dart';
import 'package:adhocx_employee/widgets/employee_secondary_button.dart';
import 'package:adhocx_employee/widgets/batch_03_illustrations.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/feedback/employee_entrance.dart';

class RequestStatusPendingScreen extends StatefulWidget {
  const RequestStatusPendingScreen({super.key});

  @override
  State<RequestStatusPendingScreen> createState() =>
      _RequestStatusPendingScreenState();
}

class _RequestStatusPendingScreenState
    extends State<RequestStatusPendingScreen> {
  Map<String, dynamic>? _pendingData;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadJsonData();
  }

  Future<void> _loadJsonData() async {
    final schedules = await MockDataService.getSchedules();
    final changeRequests =
        schedules['change_requests'] as Map<String, dynamic>?;
    if (mounted) {
      setState(() {
        _pendingData = changeRequests?['pending'] as Map<String, dynamic>?;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(
            child: CircularProgressIndicator(color: AppColors.primaryBlue)),
      );
    }

    final message = _pendingData?['message'] ??
        'Your change request is under review by your transport team.';
    final requestType =
        _pendingData?['requestType'] ?? 'Change Pickup Location';
    final newLocation =
        _pendingData?['newLocation'] ?? 'Green Meadows, Kondapur';
    final tripDate = _pendingData?['tripDate'] ?? 'Tue, 09 Dec 2026';

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
                'Request Status',
                style: GoogleFonts.inter(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),

              const SizedBox(height: 24),

              // Pending Approval Badge Box
              EmployeeEntrance(
                child: Container(
                  width: double.infinity,
                  padding:
                      const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFFBEB),
                    borderRadius: BorderRadius.circular(20),
                    border:
                        Border.all(color: const Color(0xFFFDE68A), width: 1.5),
                  ),
                  child: Column(
                    children: [
                      const PendingClockBadge(),
                      const SizedBox(height: 14),
                      Text(
                        'Pending Approval',
                        style: GoogleFonts.inter(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFFB45309),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        message,
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          color: const Color(0xFF92400E),
                          height: 1.45,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 28),

              // Request Details Card
              EmployeeEntrance(
                delay: const Duration(milliseconds: 100),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      _buildRow(
                        icon: Icons.edit_note_rounded,
                        label: 'Request Type',
                        value: requestType,
                      ),
                      const Divider(color: AppColors.border, height: 28),
                      _buildRow(
                        icon: Icons.location_on_outlined,
                        label: 'New Location',
                        value: newLocation,
                      ),
                      const Divider(color: AppColors.border, height: 28),
                      _buildRow(
                        icon: Icons.calendar_month_outlined,
                        label: 'Trip Date',
                        value: tripDate,
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 36),

              // View Approved State Link
              EmployeeSecondaryButton(
                label: 'Simulate Approval Result →',
                textColor: AppColors.success,
                borderColor: AppColors.successBorder,
                onPressed: () => context.push(AppRoutes.requestApproved),
              ),

              const SizedBox(height: 12),

              // View Rejected State Link
              EmployeeSecondaryButton(
                label: 'Simulate Rejection Result →',
                textColor: AppColors.error,
                borderColor: AppColors.errorBorder,
                onPressed: () => context.push(AppRoutes.requestRejected),
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRow(
      {required IconData icon, required String label, required String value}) {
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
                style:
                    GoogleFonts.inter(fontSize: 11, color: AppColors.textMuted),
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
