import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_colors.dart';
import '../../widgets/employee_bottom_nav_bar.dart';
import '../../services/mock_data_service.dart';
import '../../routes/app_routes.dart';

/// Screen 6: Profile (My Details)
class ProfileMyDetailsScreen extends StatefulWidget {
  const ProfileMyDetailsScreen({super.key});

  @override
  State<ProfileMyDetailsScreen> createState() => _ProfileMyDetailsScreenState();
}

class _ProfileMyDetailsScreenState extends State<ProfileMyDetailsScreen> {
  Map<String, dynamic>? _profile;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    final hp = await MockDataService.getHistoryProfileData();
    if (mounted) {
      setState(() {
        _profile = hp['profile'] as Map<String, dynamic>?;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = _profile?['fullName'] ?? 'Ravi Kumar';
    final empId = _profile?['employeeId'] ?? 'EMP001245';
    final org = _profile?['organization'] ?? 'HITEC Technologies';
    final email = _profile?['email'] ?? 'ravi.kumar@hitec.com';
    final phone = _profile?['phone'] ?? '+91 98765 43210';
    final address = _profile?['address'] ?? 'Kondapur, Hyderabad';

    return Scaffold(
      backgroundColor: AppColors.background,
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              top: false,
              child: SingleChildScrollView(
                child: Column(
                  children: [
                    // Top Blue Header Banner
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.only(top: 50, bottom: 30),
                      decoration: const BoxDecoration(
                        gradient: AppColors.primaryGradient,
                        borderRadius: BorderRadius.only(
                          bottomLeft: Radius.circular(30),
                          bottomRight: Radius.circular(30),
                        ),
                      ),
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              IconButton(
                                icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 18),
                                onPressed: () => context.go(AppRoutes.homeUpcomingPickup),
                              ),
                              Text(
                                'Profile',
                                style: GoogleFonts.inter(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                ),
                              ),
                              IconButton(
                                icon: const Icon(Icons.settings_outlined, color: Colors.white),
                                onPressed: () => context.push(AppRoutes.settingsOverview),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),

                          // Avatar with edit button
                          GestureDetector(
                            onTap: () => context.push(AppRoutes.editProfile),
                            child: Stack(
                              alignment: Alignment.bottomRight,
                              children: [
                                CircleAvatar(
                                  radius: 46,
                                  backgroundColor: Colors.white.withOpacity(0.2),
                                  child: const Icon(Icons.person, size: 56, color: Colors.white),
                                ),
                                Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: const BoxDecoration(
                                    color: AppColors.secondaryOrange,
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Icon(Icons.edit_rounded, size: 14, color: Colors.white),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 14),

                          Text(
                            name,
                            style: GoogleFonts.inter(
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: Text(
                              empId,
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Details Card
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Column(
                          children: [
                            _buildInfoRow(Icons.apartment_rounded, 'Organization', org),
                            const Divider(height: 24),
                            _buildInfoRow(Icons.email_outlined, 'Email', email),
                            const Divider(height: 24),
                            _buildInfoRow(Icons.phone_outlined, 'Phone Number', phone),
                            const Divider(height: 24),
                            _buildInfoRow(Icons.location_on_outlined, 'Address', address),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 20),

                    // Quick Settings Menu
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Column(
                          children: [
                            ListTile(
                              leading: const Icon(Icons.edit_outlined, color: AppColors.primaryBlue),
                              title: Text('Edit Profile', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600)),
                              trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
                              onTap: () => context.push(AppRoutes.editProfile),
                            ),
                            const Divider(height: 1),
                            ListTile(
                              leading: const Icon(Icons.settings_outlined, color: AppColors.primaryBlue),
                              title: Text('App Settings', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600)),
                              trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
                              onTap: () => context.push(AppRoutes.settingsOverview),
                            ),
                            const Divider(height: 1),
                            ListTile(
                              leading: const Icon(Icons.logout_rounded, color: Color(0xFFDC2626)),
                              title: Text('Sign Out', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: const Color(0xFFDC2626))),
                              trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
                              onTap: () => context.push(AppRoutes.logoutConfirm),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 30),
                  ],
                ),
              ),
            ),
      bottomNavigationBar: EmployeeBottomNavBar(
        currentIndex: 4, // Profile Tab Active
        onTap: (index) {
          if (index == 0) context.push(AppRoutes.homeUpcomingPickup);
          if (index == 1) context.push(AppRoutes.scheduleToday);
          if (index == 2) context.push(AppRoutes.tripHistoryOverview);
          if (index == 3) context.push(AppRoutes.safetyCenterOverview);
        },
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppColors.primaryBlue),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: GoogleFonts.inter(fontSize: 11, color: AppColors.textMuted)),
              const SizedBox(height: 2),
              Text(value, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
            ],
          ),
        ),
      ],
    );
  }
}
