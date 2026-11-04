import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../services/mock_data_service.dart';

/// Screen 4: Vehicle Details
class VehicleDetailsScreen extends StatefulWidget {
  const VehicleDetailsScreen({super.key});

  @override
  State<VehicleDetailsScreen> createState() => _VehicleDetailsScreenState();
}

class _VehicleDetailsScreenState extends State<VehicleDetailsScreen> {
  Map<String, dynamic>? _vehicle;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadVehicle();
  }

  Future<void> _loadVehicle() async {
    final assignment = await MockDataService.getDriverAssignment();
    if (mounted) {
      setState(() {
        _vehicle = assignment['vehicle'] as Map<String, dynamic>?;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final model = _vehicle?['model'] ?? 'Maruti Ertiga';
    final plateNumber = _vehicle?['plateNumber'] ?? 'TS09UB7845';
    final color = _vehicle?['color'] ?? 'White';
    final seating = _vehicle?['seating'] ?? '7 Seater';
    final fuel = _vehicle?['fuel'] ?? 'CNG';
    final rc = _vehicle?['registrationRc'] ?? 'Verified';
    final insurance = _vehicle?['insurance'] ?? 'Valid';
    final permit = _vehicle?['fitnessPermit'] ?? 'Valid';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: AppColors.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Vehicle Details',
          style: GoogleFonts.inter(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        centerTitle: true,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                child: Column(
                  children: [
                    // Vehicle Illustration Graphic
                    Container(
                      width: double.infinity,
                      height: 160,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(18),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEFF6FF),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.directions_car_filled_rounded,
                              size: 64,
                              color: AppColors.primaryBlue,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Verified Commercial Fleet',
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              color: AppColors.textMuted,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),

                    // Model Name
                    Text(
                      model,
                      style: GoogleFonts.inter(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Plate Number Tag
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF3C7),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFF59E0B), width: 1.5),
                      ),
                      child: Text(
                        plateNumber,
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF92400E),
                          letterSpacing: 1.0,
                        ),
                      ),
                    ),

                    const SizedBox(height: 18),

                    // 3 Specs Pills
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _buildSpecPill(Icons.palette_outlined, '$color Color'),
                        const SizedBox(width: 8),
                        _buildSpecPill(Icons.airline_seat_recline_normal_rounded, seating),
                        const SizedBox(width: 8),
                        _buildSpecPill(Icons.local_gas_station_rounded, '$fuel Fuel'),
                      ],
                    ),

                    const SizedBox(height: 28),

                    // Legal & Safety Verification Card
                    Container(
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        children: [
                          _buildVerificationRow(
                            title: 'Registration (RC)',
                            status: rc,
                          ),
                          const Divider(height: 24),
                          _buildVerificationRow(
                            title: 'Insurance',
                            status: insurance,
                          ),
                          const Divider(height: 24),
                          _buildVerificationRow(
                            title: 'Fitness / Permit',
                            status: permit,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildSpecPill(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AppColors.textSecondary),
          const SizedBox(width: 4),
          Text(
            text,
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVerificationRow({required String title, required String status}) {
    return Row(
      children: [
        const Icon(Icons.check_circle_rounded, size: 20, color: AppColors.success),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            title,
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
        ),
        Text(
          status,
          style: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: AppColors.success,
          ),
        ),
      ],
    );
  }
}
