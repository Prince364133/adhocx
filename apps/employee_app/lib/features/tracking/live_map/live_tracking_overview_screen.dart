import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/widgets/batch_05_illustrations.dart';
import 'package:adhocx_employee/widgets/employee_primary_button.dart';
import 'package:adhocx_employee/widgets/employee_bottom_nav_bar.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/routes/app_routes.dart';

/// Screen 1: Live Tracking (Overview)
class LiveTrackingOverviewScreen extends StatefulWidget {
  const LiveTrackingOverviewScreen({super.key});

  @override
  State<LiveTrackingOverviewScreen> createState() =>
      _LiveTrackingOverviewScreenState();
}

class _LiveTrackingOverviewScreenState
    extends State<LiveTrackingOverviewScreen> {
  Map<String, dynamic>? _overview;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final tracking = await MockDataService.getLiveTracking();
    if (mounted) {
      setState(() {
        _overview = tracking['overview'] as Map<String, dynamic>?;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = _overview?['title'] ?? "Today's Pickup";
    final status = _overview?['status'] ?? 'In Progress';
    final eta = _overview?['eta'] ?? '~ 6 min';
    final driver = _overview?['driver'] as Map<String, dynamic>?;
    final driverName = driver?['name'] ?? 'Suresh R';
    final driverRating = (driver?['rating'] ?? 4.8).toDouble();
    final vehicleModel = driver?['model'] ?? 'Maruti Ertiga';
    final plateNumber = driver?['plateNumber'] ?? 'TS09UB7845';
    final capacity = driver?['capacity'] ?? '7 Seater';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded,
              size: 18, color: AppColors.textPrimary),
          onPressed: () => Navigator.of(context).canPop()
              ? Navigator.of(context).pop()
              : context.go(AppRoutes.homeUpcomingPickup),
        ),
        title: Text(
          title,
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
                padding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Status Badge
                    Center(
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 5),
                        decoration: BoxDecoration(
                          color: AppColors.successLight,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppColors.successBorder),
                        ),
                        child: Text(
                          status,
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: AppColors.success,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Map View Container (Clickable to full map)
                    GestureDetector(
                      onTap: () => context.push(AppRoutes.tripLiveMapFull),
                      child: VectorLiveMapCanvas(
                        height: 220,
                        etaBadge: 'ETA $eta',
                        showControls: true,
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Driver & Vehicle Card
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Row(
                        children: [
                          const CircleAvatar(
                            radius: 24,
                            backgroundColor: AppColors.primaryBlueLight,
                            child: Icon(Icons.person,
                                color: AppColors.primaryBlue, size: 28),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      driverName,
                                      style: GoogleFonts.inter(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    const Icon(Icons.star_rounded,
                                        size: 15, color: Color(0xFFF59E0B)),
                                    Text(
                                      '$driverRating',
                                      style: GoogleFonts.inter(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.textSecondary,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '$plateNumber • $vehicleModel',
                                  style: GoogleFonts.inter(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.primaryBlue,
                                  ),
                                ),
                                Text(
                                  capacity,
                                  style: GoogleFonts.inter(
                                    fontSize: 11,
                                    color: AppColors.textMuted,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.phone_in_talk_rounded,
                                color: AppColors.primaryBlue),
                            onPressed: () =>
                                context.push(AppRoutes.contactDriverSheet),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // View Trip Details Button
                    EmployeePrimaryButton(
                      label: 'View Trip Details',
                      icon: Icons.alt_route_rounded,
                      onPressed: () => context.push(AppRoutes.routeAndStops),
                    ),
                  ],
                ),
              ),
            ),
      bottomNavigationBar: EmployeeBottomNavBar(
        currentIndex: 2,
        onTap: (index) {
          if (index == 0) context.push(AppRoutes.homeUpcomingPickup);
          if (index == 1) context.push(AppRoutes.scheduleToday);
        },
      ),
    );
  }
}
