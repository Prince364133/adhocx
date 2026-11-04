import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../widgets/batch_04_illustrations.dart';
import '../../widgets/employee_secondary_button.dart';
import '../../services/mock_data_service.dart';

/// Screen 10: Vehicle Issue
class VehicleIssueScreen extends StatefulWidget {
  const VehicleIssueScreen({super.key});

  @override
  State<VehicleIssueScreen> createState() => _VehicleIssueScreenState();
}

class _VehicleIssueScreenState extends State<VehicleIssueScreen> {
  Map<String, dynamic>? _issueData;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final assignment = await MockDataService.getDriverAssignment();
    if (mounted) {
      setState(() {
        _issueData = assignment['vehicle_issue'] as Map<String, dynamic>?;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = _issueData?['title'] ?? 'Vehicle Issue';
    final message = _issueData?['message'] ??
        "The assigned cab has a vehicle issue. We're arranging an alternate cab for your trip.";
    final expectedIn = _issueData?['expectedUpdateIn'] ?? '~ 5 min';

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
                    const VehicleIssueBadge(),
                    const SizedBox(height: 20),
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
                    const SizedBox(height: 32),

                    // Expected Update Card
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFFBEB),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFFDE68A)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.access_time_filled_rounded, size: 20, color: Color(0xFFD97706)),
                          const SizedBox(width: 10),
                          Text(
                            'Expected Update in $expectedIn',
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFFB45309),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const Spacer(),

                    EmployeeSecondaryButton(
                      label: 'Contact Support',
                      icon: Icons.headset_mic_rounded,
                      textColor: AppColors.primaryBlue,
                      borderColor: AppColors.primaryBlue,
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Connecting to Transport Desk support...')),
                        );
                      },
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
    );
  }
}

