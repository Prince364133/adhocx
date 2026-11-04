import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../services/mock_data_service.dart';
import '../../widgets/employee_primary_button.dart';
import '../../widgets/employee_secondary_button.dart';
import '../../widgets/employee_bottom_nav_bar.dart';
import '../../routes/app_routes.dart';

class HomeUpcomingPickupScreen extends StatefulWidget {
  const HomeUpcomingPickupScreen({super.key});

  @override
  State<HomeUpcomingPickupScreen> createState() => _HomeUpcomingPickupScreenState();
}

class _HomeUpcomingPickupScreenState extends State<HomeUpcomingPickupScreen> {
  Map<String, dynamic>? _profile;
  Map<String, dynamic>? _trip;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadJsonData();
  }

  Future<void> _loadJsonData() async {
    final profile = await MockDataService.getEmployeeProfile();
    final trip = await MockDataService.getTrip('upcoming_pickup');
    if (mounted) {
      setState(() {
        _profile = profile;
        _trip = trip;
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

    final name = _profile?['name'] ?? 'Ravi Kumar';
    final tripType = _trip?['type'] ?? 'Office Pickup (Login)';
    final date = _trip?['date'] ?? 'Today, 09 Dec 2026';
    final time = _trip?['time'] ?? '8:15 AM';
    final driver = _trip?['driver'] as Map<String, dynamic>?;
    final driverName = driver?['name'] ?? 'Suresh R';
    final vehicleNumber = driver?['vehicleNumber'] ?? 'TS09UB7845';

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header: Greeting + Notification Bell with Badge
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Good Morning,',
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '$name 👋',
                        style: GoogleFonts.inter(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                  Stack(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          border: Border.all(color: AppColors.border),
                        ),
                        child: const Icon(
                          Icons.notifications_none_rounded,
                          color: AppColors.textPrimary,
                          size: 22,
                        ),
                      ),
                      Positioned(
                        right: 4,
                        top: 4,
                        child: Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: AppColors.secondaryOrange,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              const SizedBox(height: 24),

              // Blue Hero Card (Next Trip: Office Pickup)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primaryBlue.withOpacity(0.24),
                      blurRadius: 18,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            'Next Trip',
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                        ),
                        Text(
                          date,
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: Colors.white.withOpacity(0.9),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Text(
                      tripType,
                      style: GoogleFonts.inter(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        const Icon(
                          Icons.directions_car_filled_rounded,
                          color: Colors.white,
                          size: 24,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Pickup at ',
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            color: Colors.white.withOpacity(0.85),
                          ),
                        ),
                        Text(
                          time,
                          style: GoogleFonts.inter(
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Cab Assigned Driver Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
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
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 22,
                      backgroundColor: AppColors.primaryBlueLight,
                      child: const Icon(Icons.person, color: AppColors.primaryBlue),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  color: AppColors.success,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Cab Assigned',
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.success,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Driver: $driverName • $vehicleNumber',
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.primaryBlueLight.withOpacity(0.4),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.phone, color: AppColors.primaryBlue, size: 20),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Track Trip Button
              EmployeePrimaryButton(
                label: 'Track Trip',
                icon: Icons.navigation_rounded,
                onPressed: () => context.push(AppRoutes.tripAssigned),
              ),

              const SizedBox(height: 14),

              // Action buttons: Request Change & Cancel Trip
              Row(
                children: [
                  Expanded(
                    child: EmployeeSecondaryButton(
                      label: 'Request Change',
                      icon: Icons.edit_calendar_rounded,
                      onPressed: () => context.push(AppRoutes.tripPlanning),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: EmployeeSecondaryButton(
                      label: 'Cancel Trip',
                      icon: Icons.cancel_outlined,
                      textColor: AppColors.error,
                      borderColor: AppColors.errorBorder,
                      onPressed: () => context.push(AppRoutes.tripCancelled),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
      bottomNavigationBar: const EmployeeBottomNavBar(currentIndex: 0),
    );
  }
}
