import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/widgets/batch_05_illustrations.dart';
import 'package:adhocx_employee/widgets/batch_07_illustrations.dart';

/// Screen 2: Trip Details
class TripHistoryDetailsScreen extends StatelessWidget {
  const TripHistoryDetailsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded,
              size: 18, color: AppColors.textPrimary),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          'Trip Details',
          style: GoogleFonts.inter(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            children: [
              // Map preview
              const VectorLiveMapCanvas(height: 180),
              const SizedBox(height: 16),

              // Trip Header Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Login Trip',
                          style: GoogleFonts.inter(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textPrimary),
                        ),
                        const TicketStatusPill(status: 'Completed'),
                      ],
                    ),
                    Text(
                      'Tue, 09 Dec 2026',
                      style: GoogleFonts.inter(
                          fontSize: 12, color: AppColors.textMuted),
                    ),
                    const Divider(height: 24),
                    _buildRoutePoint(
                      icon: Icons.my_location_rounded,
                      color: AppColors.success,
                      title: 'Pickup',
                      location: 'Home (Kondapur)',
                      time: '8:15 AM',
                    ),
                    const SizedBox(height: 16),
                    _buildRoutePoint(
                      icon: Icons.location_on_rounded,
                      color: AppColors.secondaryOrange,
                      title: 'Drop',
                      location: 'HITEC City Office',
                      time: '9:02 AM',
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Driver & Vehicle Card
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
                        CircleAvatar(
                          radius: 22,
                          backgroundColor:
                              AppColors.primaryBlueLight.withValues(alpha: 0.5),
                          child: const Icon(Icons.person,
                              color: AppColors.primaryBlue, size: 24),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Suresh R',
                                style: GoogleFonts.inter(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.textPrimary),
                              ),
                              Row(
                                children: [
                                  const Icon(Icons.star_rounded,
                                      size: 15, color: Color(0xFFF59E0B)),
                                  const SizedBox(width: 4),
                                  Text('4.8',
                                      style: GoogleFonts.inter(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                          color: AppColors.textSecondary)),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 24),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.directions_car_filled_rounded,
                              color: AppColors.primaryBlue, size: 20),
                        ),
                        const SizedBox(width: 12),
                        Text(
                          'Maruti Ertiga  TS09UB7845',
                          style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textPrimary),
                        ),
                      ],
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

  Widget _buildRoutePoint({
    required IconData icon,
    required Color color,
    required String title,
    required String location,
    required String time,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: color, size: 20),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textMuted),
              ),
              Text(
                location,
                style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary),
              ),
            ],
          ),
        ),
        Text(
          time,
          style: GoogleFonts.inter(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.textSecondary),
        ),
      ],
    );
  }
}
