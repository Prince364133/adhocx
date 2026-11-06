import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:adhocx_employee/theme/app_colors.dart';
import 'package:adhocx_employee/widgets/employee_primary_button.dart';
import 'package:adhocx_employee/services/mock_data_service.dart';

/// Screen 7: Edit Profile
class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final TextEditingController _nameController =
      TextEditingController(text: 'Ravi Kumar');
  final TextEditingController _phoneController =
      TextEditingController(text: '+91 98765 43210');
  final TextEditingController _emailController =
      TextEditingController(text: 'ravi.kumar@hitec.com');
  final TextEditingController _addressController =
      TextEditingController(text: 'Kondapur, Hyderabad');
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    final hp = await MockDataService.getHistoryProfileData();
    if (mounted) {
      final p = hp['profile'] as Map<String, dynamic>?;
      if (p != null) {
        _nameController.text = p['fullName'] ?? 'Ravi Kumar';
        _phoneController.text = p['phone'] ?? '+91 98765 43210';
        _emailController.text = p['email'] ?? 'ravi.kumar@hitec.com';
        _addressController.text = p['address'] ?? 'Kondapur, Hyderabad';
      }
      setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _addressController.dispose();
    super.dispose();
  }

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
          'Edit Profile',
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
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                child: Column(
                  children: [
                    // Avatar with Camera Badge
                    Center(
                      child: Stack(
                        alignment: Alignment.bottomRight,
                        children: [
                          const CircleAvatar(
                            radius: 46,
                            backgroundColor: AppColors.primaryBlueLight,
                            child: Icon(Icons.person,
                                size: 54, color: AppColors.primaryBlue),
                          ),
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: const BoxDecoration(
                              color: AppColors.primaryBlue,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.camera_alt_rounded,
                                size: 14, color: Colors.white),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 28),

                    _buildTextField('Full Name', _nameController),
                    const SizedBox(height: 18),
                    _buildTextField('Phone Number', _phoneController,
                        isLocked: true),
                    const SizedBox(height: 18),
                    _buildTextField('Email', _emailController),
                    const SizedBox(height: 18),
                    _buildTextField('Address', _addressController),

                    const SizedBox(height: 40),

                    EmployeePrimaryButton(
                      label: 'Save Changes',
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                              content: Text('Profile updated successfully.')),
                        );
                        Navigator.of(context).pop();
                      },
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildTextField(String label, TextEditingController controller,
      {bool isLocked = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary),
        ),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: isLocked ? const Color(0xFFF8FAFC) : Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.border),
          ),
          child: TextField(
            controller: controller,
            enabled: !isLocked,
            decoration: InputDecoration(
              border: InputBorder.none,
              suffixIcon: isLocked
                  ? const Icon(Icons.lock_outline_rounded,
                      size: 18, color: AppColors.textMuted)
                  : null,
            ),
            style: GoogleFonts.inter(
                fontSize: 14,
                color:
                    isLocked ? AppColors.textSecondary : AppColors.textPrimary),
          ),
        ),
      ],
    );
  }
}
