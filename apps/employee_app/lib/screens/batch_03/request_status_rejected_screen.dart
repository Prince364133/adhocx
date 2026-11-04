import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../services/mock_data_service.dart';
import '../../widgets/employee_app_bar.dart';
import '../../widgets/employee_primary_button.dart';
import '../../widgets/batch_03_illustrations.dart';
import '../../routes/app_routes.dart';

class RequestStatusRejectedScreen extends StatefulWidget {
  const RequestStatusRejectedScreen({super.key});

  @override
  State<RequestStatusRejectedScreen> createState() => _RequestStatusRejectedScreenState();
}

class _RequestStatusRejectedScreenState extends State<RequestStatusRejectedScreen> {
  Map<String, dynamic>? _rejectedData;
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
        _rejectedData = changeRequests?['rejected'] as Map<String, dynamic>?;
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

    final message = _rejectedData?['message'] ??
        'Your change request was not approved as it is outside the allowed policy.';
    final reason = _rejectedData?['reason'] ??
        'Request is after the cutoff time (6:00 PM, 08 Dec 2026).';

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

              // Rejected Cross Badge
              const RequestRejectedBadge(),

              const SizedBox(height: 32),

              Text(
                'Change Request\nRejected',
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

              // Reason Card (Light Red Fill)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFFECACA)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Reason',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppColors.error,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      reason,
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: const Color(0xFF991B1B),
                        height: 1.45,
                      ),
                    ),
                  ],
                ),
              ),

              const Spacer(),

              // Primary "OK" Button
              EmployeePrimaryButton(
                label: 'OK',
                onPressed: () => context.go(AppRoutes.scheduleDaily),
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
