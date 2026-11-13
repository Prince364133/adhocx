import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/widgets/employee_bottom_nav_bar.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';
import 'package:adhocx_employee/routes/app_routes.dart';
import 'package:adhocx_employee/shared/components/feedback/employee_entrance.dart';

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
                    EmployeeEntrance(
                      child: Container(
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
                                  icon: const Icon(
                                      Icons.arrow_back_ios_new_rounded,
                                      color: Colors.white,
                                      size: 18),
                                  onPressed: () =>
                                      context.go(AppRoutes.homeUpcomingPickup),
                                ),
                                Text(
                                  'Profile',
                                  style: GoogleFonts.inter(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.white,
                                  ),
                                ),
                                const SizedBox(width: 48),
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
                                    backgroundColor:
                                        Colors.white.withValues(alpha: 0.2),
                                    child: const Icon(Icons.person,
                                        size: 56, color: Colors.white),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.all(6),
                                    decoration: const BoxDecoration(
                                      color: AppColors.secondaryOrange,
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(Icons.edit_rounded,
                                        size: 14, color: Colors.white),
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
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.2),
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
                    ),

                    const SizedBox(height: 24),

                    // Details Card
                    EmployeeEntrance(
                      delay: const Duration(milliseconds: 100),
                      child: Padding(
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
                              _buildInfoRow(
                                  Icons.apartment_rounded, 'Organization', org),
                              const Divider(height: 24),
                              _buildInfoRow(
                                  Icons.email_outlined, 'Email', email),
                              const Divider(height: 24),
                              _buildInfoRow(
                                  Icons.phone_outlined, 'Phone Number', phone),
                              const Divider(height: 24),
                              _buildInfoRow(Icons.location_on_outlined,
                                  'Address', address),
                            ],
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 20),

                    EmployeeEntrance(
                      delay: const Duration(milliseconds: 180),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Column(
                            children: [
                              _buildProfileAction(
                                icon: Icons.edit_outlined,
                                title: 'Edit Profile',
                                onTap: () =>
                                    context.push(AppRoutes.editProfile),
                              ),
                              const Divider(height: 1),
                              _buildProfileAction(
                                icon: Icons.language_rounded,
                                title: 'Language',
                                onTap: () =>
                                    context.push(AppRoutes.settingsLanguage),
                              ),
                              const Divider(height: 1),
                              _buildProfileAction(
                                icon: Icons.headset_mic_outlined,
                                title: 'Support',
                                onTap: () => context
                                    .push(AppRoutes.safetyReportIncident),
                              ),
                              const Divider(height: 1),
                              _buildProfileAction(
                                icon: Icons.logout_rounded,
                                title: 'Sign Out',
                                iconColor: AppColors.error,
                                titleColor: AppColors.error,
                                onTap: () =>
                                    context.push(AppRoutes.logoutConfirm),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 30),
                  ],
                ),
              ),
            ),
      bottomNavigationBar: EmployeeBottomNavBar(currentIndex: 3),
    );
  }

  Widget _buildProfileAction({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
    Color iconColor = AppColors.primaryBlue,
    Color titleColor = AppColors.textPrimary,
  }) {
    return ListTile(
      leading: Icon(icon, color: iconColor),
      title: Text(
        title,
        style: GoogleFonts.inter(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: titleColor,
        ),
      ),
      trailing:
          const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
      onTap: onTap,
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
              Text(label,
                  style: GoogleFonts.inter(
                      fontSize: 11, color: AppColors.textMuted)),
              const SizedBox(height: 2),
              Text(value,
                  style: GoogleFonts.inter(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary)),
            ],
          ),
        ),
      ],
    );
  }
}
