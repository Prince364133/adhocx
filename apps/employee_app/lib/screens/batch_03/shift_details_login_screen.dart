import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../services/mock_data_service.dart';
import '../../widgets/employee_app_bar.dart';

class ShiftDetailsLoginScreen extends StatefulWidget {
  const ShiftDetailsLoginScreen({super.key});

  @override
  State<ShiftDetailsLoginScreen> createState() => _ShiftDetailsLoginScreenState();
}

class _ShiftDetailsLoginScreenState extends State<ShiftDetailsLoginScreen> {
  Map<String, dynamic>? _shiftData;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadJsonData();
  }

  Future<void> _loadJsonData() async {
    final schedules = await MockDataService.getSchedules();
    if (mounted) {
      setState(() {
        _shiftData = schedules['shift_details_standard'] as Map<String, dynamic>?;
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

    final date = _shiftData?['date'] ?? 'Tue, 09 Dec 2026';
    final hours = _shiftData?['shiftHours'] ?? '9:00 AM - 6:00 PM';
    final office = _shiftData?['office'] ?? 'HITEC City Office';
    final rosterPickup = _shiftData?['rosterPickup'] as Map<String, dynamic>?;
    final rosterDrop = _shiftData?['rosterDrop'] as Map<String, dynamic>?;

    final pickupTime = rosterPickup?['time'] ?? '8:15 AM';
    final pickupLoc = rosterPickup?['location'] ?? 'Home (Kondapur)';
    final dropTime = rosterDrop?['time'] ?? '6:30 PM';
    final dropLoc = rosterDrop?['location'] ?? 'HITEC City Office';

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
                'Shift Details',
                style: GoogleFonts.inter(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),

              const SizedBox(height: 14),

              // Login Shift Status Pill
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.successLight,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.successBorder),
                ),
                child: Text(
                  'Login Shift',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.success,
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // Shift Overview Card
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
                    _buildRow(Icons.calendar_month_outlined, date),
                    const Divider(color: AppColors.border, height: 28),
                    _buildRow(Icons.access_time_rounded, hours),
                    const Divider(color: AppColors.border, height: 28),
                    _buildRow(Icons.apartment_rounded, office),
                  ],
                ),
              ),

              const SizedBox(height: 28),

              // Transport (Roster) Section
              Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Transport (Roster)',
                  style: GoogleFonts.inter(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),

              const SizedBox(height: 14),

              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.surfaceMuted,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.location_on, color: AppColors.success, size: 22),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Pickup • $pickupTime',
                                style: GoogleFonts.inter(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              Text(
                                pickupLoc,
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const Divider(color: AppColors.border, height: 28),
                    Row(
                      children: [
                        const Icon(Icons.location_on, color: Color(0xFFD97706), size: 22),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Drop • $dropTime',
                                style: GoogleFonts.inter(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              Text(
                                dropLoc,
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  color: AppColors.textSecondary,
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

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRow(IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppColors.primaryBlue),
        const SizedBox(width: 14),
        Expanded(
          child: Text(
            text,
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),
        ),
      ],
    );
  }
}
