import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/widgets/employee_app_bar.dart';
import 'package:adhocx_employee/widgets/employee_secondary_button.dart';
import 'package:adhocx_employee/widgets/batch_02_illustrations.dart';
import 'package:adhocx_employee/routes/app_routes.dart';

class TripUnservedScreen extends StatefulWidget {
  const TripUnservedScreen({super.key});

  @override
  State<TripUnservedScreen> createState() => _TripUnservedScreenState();
}

class _TripUnservedScreenState extends State<TripUnservedScreen> {
  Map<String, dynamic>? _tripData;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadJsonData();
  }

  Future<void> _loadJsonData() async {
    final trip = await MockDataService.getTrip('unserved');
    if (mounted) {
      setState(() {
        _tripData = trip;
        _isLoading = false;
      });
    }
  }

  void _showSupportBottomSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                '24/7 Corporate Transport Desk',
                style: GoogleFonts.inter(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Our operations desk has been automatically notified and is coordinating with standby backup fleets.',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary, height: 1.5),
              ),
              const SizedBox(height: 24),
              ListTile(
                leading: const Icon(Icons.phone_in_talk_rounded, color: AppColors.primaryBlue),
                title: Text('Emergency Transport Helpline', style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14)),
                subtitle: Text('+91 78935 45818', style: GoogleFonts.inter(fontSize: 13, color: AppColors.primaryBlueDark)),
                onTap: () => Navigator.pop(ctx),
              ),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: AppColors.primaryBlue)),
      );
    }

    final message = _tripData?['message'] ??
        "We couldn't allocate a cab for this trip. Please contact support if you need assistance.";

    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: const EmployeeAppBar(),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Text(
                "Today's Pickup",
                style: GoogleFonts.inter(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 12),

              // Unserved Status Pill
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFFDE68A)),
                ),
                child: Text(
                  'Unserved',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFFD97706),
                  ),
                ),
              ),

              const Spacer(),

              // Warning Graphic
              const TripUnservedBadge(),

              const SizedBox(height: 24),

              Text(
                'Trip Not Served',
                style: GoogleFonts.inter(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),

              const SizedBox(height: 8),

              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  message,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    color: AppColors.textSecondary,
                    height: 1.45,
                  ),
                ),
              ),

              const Spacer(),

              // Primary "Contact Support" Button
              EmployeeSecondaryButton(
                label: 'Contact Support',
                icon: Icons.headset_mic_outlined,
                textColor: AppColors.primaryBlue,
                borderColor: AppColors.primaryBlue,
                onPressed: _showSupportBottomSheet,
              ),

              const SizedBox(height: 12),

              // "View Schedule" Button
              EmployeeSecondaryButton(
                label: 'View Schedule',
                icon: Icons.calendar_month_outlined,
                onPressed: () => context.go(AppRoutes.homeUpcomingPickup),
              ),

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}



