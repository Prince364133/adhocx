import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../widgets/batch_04_illustrations.dart';
import '../../widgets/employee_primary_button.dart';
import '../../widgets/employee_secondary_button.dart';
import '../../services/mock_data_service.dart';

/// Screen 13: No Cab Available
class NoCabAvailableScreen extends StatefulWidget {
  const NoCabAvailableScreen({super.key});

  @override
  State<NoCabAvailableScreen> createState() => _NoCabAvailableScreenState();
}

class _NoCabAvailableScreenState extends State<NoCabAvailableScreen> {
  Map<String, dynamic>? _noCabData;
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
        _noCabData = assignment['no_cab_available'] as Map<String, dynamic>?;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = _noCabData?['title'] ?? 'No Cab Available';
    final message = _noCabData?['message'] ??
        "We couldn't assign a cab for your trip at the moment. Our team is working to find an alternate option. You'll be notified once assigned.";

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
                    const NoCabAvailableGraphic(),
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
                    const Spacer(),

                    // Primary Retry Button
                    EmployeePrimaryButton(
                      label: 'Retry',
                      icon: Icons.refresh_rounded,
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Checking cab availability...')),
                        );
                      },
                    ),
                    const SizedBox(height: 12),

                    // Secondary Contact Support Button
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
