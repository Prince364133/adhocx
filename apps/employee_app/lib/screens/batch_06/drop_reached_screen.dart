import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../widgets/employee_primary_button.dart';
import '../../services/mock_data_service.dart';
import '../../routes/app_routes.dart';

/// Screen 9: Drop Reached / Reached Destination
class DropReachedScreen extends StatefulWidget {
  const DropReachedScreen({super.key});

  @override
  State<DropReachedScreen> createState() => _DropReachedScreenState();
}

class _DropReachedScreenState extends State<DropReachedScreen> {
  Map<String, dynamic>? _destinationData;
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
        _destinationData = boarding['destination_reached'] as Map<String, dynamic>?;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = _destinationData?['title'] ?? 'Reached Destination';
    final subtitle = _destinationData?['subtitle'] ?? 'You have arrived at your drop location.';
    final location = _destinationData?['location'] ?? 'HITEC City Office';
    final arrivedAt = _destinationData?['arrivedAt'] ?? '9:02 AM';

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
                    const SizedBox(height: 20),

                    // Building & Pin Graphic
                    Container(
                      width: 150,
                      height: 100,
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: Stack(
                        alignment: Alignment.center,
                        children: const [
                          Icon(
                            Icons.apartment_rounded,
                            size: 64,
                            color: AppColors.primaryBlue,
                          ),
                          Positioned(
                            right: 28,
                            top: 10,
                            child: Icon(Icons.location_on_rounded, size: 28, color: AppColors.secondaryOrange),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

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
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 32),

                    // Destination Card
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
                          Row(
                            children: [
                              const Icon(Icons.location_on_rounded, color: AppColors.primaryBlue, size: 22),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  location,
                                  style: GoogleFonts.inter(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const Divider(height: 24),
                          Row(
                            children: [
                              const Icon(Icons.access_time_rounded, color: AppColors.textSecondary, size: 20),
                              const SizedBox(width: 12),
                              Text(
                                'Arrived at',
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  color: AppColors.textSecondary,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const Spacer(),
                              Text(
                                arrivedAt,
                                style: GoogleFonts.inter(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const Spacer(),

                    EmployeePrimaryButton(
                      label: 'Confirm Drop',
                      icon: Icons.check_circle_outline_rounded,
                      onPressed: () => context.push(AppRoutes.tripCompletedSummary),
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
    );
  }
}

