import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/widgets/batch_07_illustrations.dart';
import 'package:adhocx_employee/widgets/employee_bottom_nav_bar.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/routes/app_routes.dart';

/// Screen 1: Safety Center (Overview)
class SafetyCenterOverviewScreen extends StatefulWidget {
  const SafetyCenterOverviewScreen({super.key});

  @override
  State<SafetyCenterOverviewScreen> createState() =>
      _SafetyCenterOverviewScreenState();
}

class _SafetyCenterOverviewScreenState
    extends State<SafetyCenterOverviewScreen> {
  Map<String, dynamic>? _centerData;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final safety = await MockDataService.getSafetyData();
    if (mounted) {
      setState(() {
        _centerData = safety['center'] as Map<String, dynamic>?;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = _centerData?['title'] ?? 'Safety Center';
    final subtitle = _centerData?['subtitle'] ?? 'Your safety is our priority';
    final desc = _centerData?['description'] ??
        'Quick access to emergency, support and safety tools.';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded,
              size: 18, color: AppColors.textPrimary),
          onPressed: () => context.go(AppRoutes.homeUpcomingPickup),
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
                  children: [
                    const SizedBox(height: 8),
                    const SafetyCenterShieldBadge(),
                    const SizedBox(height: 16),
                    Text(
                      subtitle,
                      style: GoogleFonts.inter(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      desc,
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 24),

                    // SOS Emergency Alert Banner Tile (Red Accent)
                    InkWell(
                      onTap: () => context.push(AppRoutes.sosActivate),
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF2F2),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                              color: const Color(0xFFFCA5A5), width: 1.5),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: const BoxDecoration(
                                color: Color(0xFFDC2626),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                  Icons.notifications_active_rounded,
                                  color: Colors.white,
                                  size: 20),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'SOS — Emergency Help',
                                    style: GoogleFonts.inter(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w800,
                                      color: const Color(0xFFDC2626),
                                    ),
                                  ),
                                  Text(
                                    'Instant 24/7 security dispatch alert',
                                    style: GoogleFonts.inter(
                                      fontSize: 12,
                                      color: const Color(0xFF991B1B),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const Icon(Icons.chevron_right_rounded,
                                color: Color(0xFFDC2626)),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Safety Tools List
                    _buildToolTile(
                      icon: Icons.flag_outlined,
                      title: 'Report an Issue',
                      subtitle: 'Driver behavior, route deviation, delay',
                      onTap: () => context.push(AppRoutes.reportIncident),
                    ),
                    _buildToolTile(
                      icon: Icons.rate_review_outlined,
                      title: 'Raise a Complaint',
                      subtitle: 'File ticket with corporate transport desk',
                      onTap: () => context.push(AppRoutes.raiseComplaint),
                    ),
                    _buildToolTile(
                      icon: Icons.backpack_outlined,
                      title: 'Lost Property',
                      subtitle: 'Report items left inside the vehicle',
                      onTap: () => context.push(AppRoutes.lostProperty),
                    ),
                    _buildToolTile(
                      icon: Icons.headset_mic_outlined,
                      title: 'Get Help / Live Chat',
                      subtitle: 'Chat directly with AdhocX transport support',
                      onTap: () => context.push(AppRoutes.liveSupportChat),
                    ),
                    _buildToolTile(
                      icon: Icons.contact_phone_outlined,
                      title: 'Emergency Contacts',
                      subtitle: 'Company desk, security & local services',
                      onTap: () => context.push(AppRoutes.emergencyContacts),
                    ),
                    _buildToolTile(
                      icon: Icons.verified_user_outlined,
                      title: 'Safety Tips & Guidelines',
                      subtitle: 'Best practices for safe daily commute',
                      onTap: () => context.push(AppRoutes.safetyTipsGuidelines),
                    ),
                    _buildToolTile(
                      icon: Icons.confirmation_number_outlined,
                      title: 'My Support Requests',
                      subtitle: 'Track submitted issues and resolutions',
                      onTap: () => context.push(AppRoutes.myRequestsTickets),
                    ),
                  ],
                ),
              ),
            ),
      bottomNavigationBar: EmployeeBottomNavBar(
        currentIndex: -1,
        onTap: (index) {
          if (index == 0) context.push(AppRoutes.homeUpcomingPickup);
          if (index == 1) context.push(AppRoutes.scheduleToday);
          if (index == 2) context.push(AppRoutes.tripHistoryOverview);
          if (index == 3) context.push(AppRoutes.profileDetails);
        },
      ),
    );
  }

  Widget _buildToolTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: ListTile(
        onTap: onTap,
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: AppColors.primaryBlue, size: 20),
        ),
        title: Text(
          title,
          style: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: AppColors.textPrimary,
          ),
        ),
        subtitle: Text(
          subtitle,
          style: GoogleFonts.inter(
            fontSize: 12,
            color: AppColors.textSecondary,
          ),
        ),
        trailing: const Icon(Icons.chevron_right_rounded,
            size: 18, color: AppColors.textMuted),
      ),
    );
  }
}
