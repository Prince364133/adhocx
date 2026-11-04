import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/widgets/batch_06_illustrations.dart';
import 'package:adhocx_employee/widgets/employee_primary_button.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/routes/app_routes.dart';

/// Screen 11: Safe Reach Confirmation
class SafeReachConfirmationScreen extends StatefulWidget {
  const SafeReachConfirmationScreen({super.key});

  @override
  State<SafeReachConfirmationScreen> createState() => _SafeReachConfirmationScreenState();
}

class _SafeReachConfirmationScreenState extends State<SafeReachConfirmationScreen> {
  Map<String, dynamic>? _safeReachData;
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
        _safeReachData = boarding['safe_reach'] as Map<String, dynamic>?;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = _safeReachData?['title'] ?? 'Did You Reach Safely?';
    final subtitle = _safeReachData?['subtitle'] ??
        "Please confirm that you've reached your destination safely.";
    final primaryOpt = _safeReachData?['primary'] ?? "Yes, I'm Safe";
    final secondaryOpt = _safeReachData?['secondary'] ?? 'I Need Help';

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
                    const SizedBox(height: 36),
                    const SafeReachShieldBadge(),
                    const SizedBox(height: 24),
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
                      subtitle,
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        color: AppColors.textSecondary,
                        height: 1.45,
                      ),
                    ),
                    const Spacer(),

                    // Primary Button: Yes, I'm Safe
                    EmployeePrimaryButton(
                      label: primaryOpt,
                      icon: Icons.shield_rounded,
                      onPressed: () => context.push(AppRoutes.postTripFeedback),
                    ),
                    const SizedBox(height: 16),

                    // Secondary Support Button: I Need Help
                    InkWell(
                      onTap: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Contacting AdhocX 24/7 Safety Command Center...')),
                        );
                      },
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.headset_mic_rounded, size: 18, color: AppColors.primaryBlue),
                          const SizedBox(width: 8),
                          Text(
                            secondaryOpt,
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primaryBlue,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Tertiary Skip Link
                    TextButton(
                      onPressed: () => context.go(AppRoutes.homeUpcomingPickup),
                      child: Text(
                        'Skip for Now',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textMuted,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
    );
  }
}



