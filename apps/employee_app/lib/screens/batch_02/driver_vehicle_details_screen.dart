import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../services/mock_data_service.dart';
import '../../widgets/employee_app_bar.dart';

class DriverVehicleDetailsScreen extends StatefulWidget {
  const DriverVehicleDetailsScreen({super.key});

  @override
  State<DriverVehicleDetailsScreen> createState() => _DriverVehicleDetailsScreenState();
}

class _DriverVehicleDetailsScreenState extends State<DriverVehicleDetailsScreen> {
  Map<String, dynamic>? _assignmentData;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadJsonData();
  }

  Future<void> _loadJsonData() async {
    final assignment = await MockDataService.getDriverAssignment();
    if (mounted) {
      setState(() {
        _assignmentData = assignment;
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

    final driver = _assignmentData?['driver'] as Map<String, dynamic>?;
    final driverName = driver?['name'] ?? 'Suresh R';
    final rating = (driver?['rating'] ?? 4.8).toString();
    final tripsCount = (driver?['tripsCompleted'] ?? 412).toString();

    final vehicle = _assignmentData?['vehicle'] as Map<String, dynamic>?;
    final model = vehicle?['model'] ?? 'Maruti Ertiga';
    final plate = vehicle?['plateNumber'] ?? 'TS09UB7845';
    final color = vehicle?['color'] ?? 'White';
    final seating = vehicle?['seating'] ?? '7 Seater';

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
                'Driver & Vehicle',
                style: GoogleFonts.inter(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),

              const SizedBox(height: 24),

              // Driver Profile Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
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
                      radius: 30,
                      backgroundColor: AppColors.primaryBlueLight,
                      child: const Icon(Icons.person, size: 36, color: AppColors.primaryBlue),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            driverName,
                            style: GoogleFonts.inter(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              const Icon(Icons.star_rounded, color: Color(0xFFF59E0B), size: 18),
                              const SizedBox(width: 4),
                              Text(
                                '$rating ($tripsCount trips)',
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.primaryBlueLight.withOpacity(0.4),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.phone, color: AppColors.primaryBlue, size: 22),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Vehicle Details Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.surfaceMuted,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  children: [
                    Container(
                      width: 120,
                      height: 70,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: const Icon(
                        Icons.directions_car_filled_rounded,
                        color: AppColors.primaryBlue,
                        size: 48,
                      ),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      model,
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Text(
                        plate,
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.0,
                          color: AppColors.primaryBlueDark,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '$color • $seating',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Compliance Verification Checklist
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
                    _buildCheckItem('Driver Verified', isVerified: true),
                    const Divider(color: AppColors.border, height: 24),
                    _buildCheckItem('Vehicle Verified', isVerified: true),
                    const Divider(color: AppColors.border, height: 24),
                    _buildCheckItem('Commercial Permit', isVerified: true),
                  ],
                ),
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCheckItem(String label, {required bool isVerified}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppColors.textPrimary,
          ),
        ),
        Container(
          padding: const EdgeInsets.all(4),
          decoration: const BoxDecoration(
            color: AppColors.successLight,
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.check, size: 16, color: AppColors.success),
        ),
      ],
    );
  }
}
