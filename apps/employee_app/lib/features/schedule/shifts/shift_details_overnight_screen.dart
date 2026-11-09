import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/widgets/employee_app_bar.dart';

class ShiftDetailsOvernightScreen extends StatefulWidget {
  const ShiftDetailsOvernightScreen({super.key});

  @override
  State<ShiftDetailsOvernightScreen> createState() =>
      _ShiftDetailsOvernightScreenState();
}

class _ShiftDetailsOvernightScreenState
    extends State<ShiftDetailsOvernightScreen> {
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
        _shiftData =
            schedules['shift_details_overnight'] as Map<String, dynamic>?;
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

    final date = _shiftData?['date'] ?? 'Wed, 10 Dec - Thu, 11 Dec';
    final hours = _shiftData?['shiftHours'] ?? '10:00 PM - 6:00 AM';
    final office = _shiftData?['office'] ?? 'HITEC City Office';
    final rosterPickup = _shiftData?['rosterPickup'] as Map<String, dynamic>?;
    final rosterDrop = _shiftData?['rosterDrop'] as Map<String, dynamic>?;

    final pickupTime = rosterPickup?['time'] ?? '9:15 PM';
    final pickupLoc = rosterPickup?['location'] ?? 'Home (Miyapur)';
    final dropTime = rosterDrop?['time'] ?? '6:15 AM';
    final dropLoc = rosterDrop?['location'] ?? 'Home (Miyapur)';

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

              // Overnight Shift Status Pill
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFFF3E8FF),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFD8B4FE)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.nightlight_round,
                        size: 14, color: Color(0xFF7E22CE)),
                    const SizedBox(width: 6),
                    Text(
                      'Overnight Shift',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF7E22CE),
                      ),
                    ),
                  ],
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
                      color: Colors.black.withValues(alpha: 0.04),
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
                        const Icon(Icons.location_on,
                            color: AppColors.success, size: 22),
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
                        const Icon(Icons.location_on,
                            color: Color(0xFFD97706), size: 22),
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
        Icon(icon, size: 20, color: const Color(0xFF7E22CE)),
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
