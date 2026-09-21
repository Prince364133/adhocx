import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_service.dart';
import '../../services/driver_service.dart';
import '../../services/onboarding_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Screen 1: Personal Information screen bound to authoritative live backend data.
class PersonalInformationScreen extends StatefulWidget {
  const PersonalInformationScreen({super.key});

  @override
  State<PersonalInformationScreen> createState() => _PersonalInformationScreenState();
}

class _PersonalInformationScreenState extends State<PersonalInformationScreen> {
  Map<String, dynamic>? _profile;
  bool _isLoading = true;
  bool _isUploadingPhoto = false;
  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile({bool force = false}) async {
    try {
      final res = await DriverService.instance.getProfile(forceRefresh: force);
      if (res != null && mounted) {
        setState(() {
          _profile = Map<String, dynamic>.from(res is Map ? res : {});
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Error loading driver profile: $e');
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _pickAndUploadPhoto() async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.lg)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: AppSpacing.lg, horizontal: AppSpacing.md),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Upload Profile Photo',
                style: AppTypography.h3(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              ListTile(
                leading: const Icon(Icons.photo_camera_outlined, color: AppColors.primary),
                title: Text(
                  'Take a Photo',
                  style: TextStyle(
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  ),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  _capturePhoto(ImageSource.camera);
                },
              ),
              ListTile(
                leading: const Icon(Icons.photo_library_outlined, color: AppColors.primary),
                title: Text(
                  'Choose from Gallery',
                  style: TextStyle(
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  ),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  _capturePhoto(ImageSource.gallery);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _capturePhoto(ImageSource source) async {
    try {
      final XFile? image = await _picker.pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );
      if (image == null) return;

      setState(() => _isUploadingPhoto = true);
      final bytes = await image.readAsBytes();

      await DriverService.instance.uploadProfilePhoto(
        fileBytes: bytes,
        fileName: image.name.isNotEmpty ? image.name : 'profile_photo.jpg',
        mimeType: image.mimeType ?? 'image/jpeg',
      );

      Fluttertoast.showToast(
        msg: 'Profile photo uploaded successfully!',
        backgroundColor: AppColors.accentGreenDark,
      );

      await _loadProfile(force: true);
    } catch (e) {
      debugPrint('Error uploading photo: $e');
      Fluttertoast.showToast(
        msg: 'Failed to upload photo: $e',
        backgroundColor: Colors.redAccent,
      );
    } finally {
      if (mounted) {
        setState(() => _isUploadingPhoto = false);
      }
    }
  }

  Future<void> _navigateToEdit() async {
    await context.push(AppRoutes.editPersonalInfoScreen);
    if (mounted) {
      await _loadProfile(force: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final onboarding = context.watch<OnboardingProvider>();
    final authService = context.watch<AuthService>();
    final user = authService.currentUser;

    bool isFakeName(String? s) {
      if (s == null) return true;
      final l = s.trim().toLowerCase();
      return l.isEmpty || l == 'driver partner' || l == 'google partner' || l == 'google user' || l == 'apple user' || l == 'user';
    }

    bool isFakeEmail(String? s) {
      if (s == null) return true;
      final l = s.trim().toLowerCase();
      return l.isEmpty || l == 'user.google@gmail.com' || l == 'test@example.com' || l == '—';
    }

    // Real profile fields prioritized from backend response, with live session fallbacks
    final rawName = _profile?['fullName'] ?? onboarding.fullName;
    final name = (rawName != null && !isFakeName(rawName.toString()))
        ? rawName.toString().trim()
        : (user?.fullName != null && !isFakeName(user!.fullName) ? user.fullName! : 'Not provided');

    final rawPhone = _profile?['phone'] ?? onboarding.phoneNumber;
    final phone = (rawPhone != null && rawPhone.toString().trim().isNotEmpty)
        ? rawPhone.toString().trim()
        : (user?.phone?.isNotEmpty == true ? user!.phone! : '—');

    final rawEmail = _profile?['email'] ?? onboarding.email;
    final String? email = (rawEmail != null && !isFakeEmail(rawEmail.toString()))
        ? rawEmail.toString().trim()
        : (user?.email != null && !isFakeEmail(user!.email) ? user.email!.trim() : null);

    final rawDob = _profile?['dateOfBirth'];
    final dob = (rawDob != null && rawDob.toString().trim().isNotEmpty)
        ? rawDob.toString().trim()
        : (onboarding.dateOfBirth != null
            ? '${onboarding.dateOfBirth!.day}/${onboarding.dateOfBirth!.month}/${onboarding.dateOfBirth!.year}'
            : 'Not provided');

    final rawGender = _profile?['gender'];
    final gender = (rawGender != null && rawGender.toString().trim().isNotEmpty)
        ? rawGender.toString().trim()
        : (onboarding.gender.isNotEmpty ? onboarding.gender : 'Not specified');

    final rawAddress = _profile?['address'];
    final address = (rawAddress != null && rawAddress.toString().trim().isNotEmpty)
        ? rawAddress.toString().trim()
        : 'Not provided';

    final emergencyName = _profile?['emergencyContactName']?.toString().trim();
    final emergencyPhone = _profile?['emergencyContactPhone']?.toString().trim();
    final String emergencyContact;
    if (emergencyName != null && emergencyName.isNotEmpty) {
      if (emergencyPhone != null && emergencyPhone.isNotEmpty) {
        emergencyContact = '$emergencyName\n$emergencyPhone';
      } else {
        emergencyContact = emergencyName;
      }
    } else if (emergencyPhone != null && emergencyPhone.isNotEmpty) {
      emergencyContact = emergencyPhone;
    } else {
      emergencyContact = 'Not provided';
    }

    final driverId = _profile?['driverId']?.toString() ??
        (_profile?['id'] != null
            ? 'DRV${_profile!['id'].toString().replaceAll('-', '').substring(0, 6).toUpperCase()}'
            : (user?.id != null
                ? 'DRV${user!.id.replaceAll('-', '').substring(0, 6).toUpperCase()}'
                : 'DRV-PENDING'));

    final profilePhotoUrl = _profile?['profilePhotoUrl']?.toString() ?? user?.photoUrl;
    final verificationStatus = _profile?['verificationStatus']?.toString().toUpperCase() ?? user?.verificationStatus ?? 'PENDING';

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Column(
              children: [
                // ── App Header ───────────────────────────────────────────────
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.lg,
                    vertical: AppSpacing.md,
                  ),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                    border: Border(
                      bottom: BorderSide(
                        color: isDark ? AppColors.borderDark : AppColors.borderLight,
                      ),
                    ),
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () {
                          if (context.canPop()) {
                            context.pop();
                          } else {
                            context.go(AppRoutes.profileScreen);
                          }
                        },
                        icon: Icon(
                          Icons.arrow_back,
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Personal Information',
                          style: AppTypography.h3(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      TextButton(
                        onPressed: _navigateToEdit,
                        child: Text(
                          'Edit',
                          style: AppTypography.body(
                            color: isDark ? AppColors.primaryLight : AppColors.primary,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // ── Scrollable Body Content ──────────────────────────────────
                Expanded(
                  child: _isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : RefreshIndicator(
                          onRefresh: () => _loadProfile(force: true),
                          child: ListView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            padding: const EdgeInsets.all(AppSpacing.lg),
                            children: [
                              // ── Profile Hero Header Card ───────────────────────────
                              Container(
                                padding: const EdgeInsets.all(AppSpacing.xl),
                                decoration: BoxDecoration(
                                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                                  borderRadius: BorderRadius.circular(AppRadius.lg),
                                  border: Border.all(
                                    color: isDark ? AppColors.borderDark : AppColors.borderLight,
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    Stack(
                                      children: [
                                        GestureDetector(
                                          onTap: _isUploadingPhoto ? null : _pickAndUploadPhoto,
                                          child: CircleAvatar(
                                            radius: 36,
                                            backgroundColor: (isDark ? AppColors.primaryLight : AppColors.primary)
                                                .withValues(alpha: 0.2),
                                            child: _isUploadingPhoto
                                                ? const SizedBox(
                                                    width: 24,
                                                    height: 24,
                                                    child: CircularProgressIndicator(strokeWidth: 2.5),
                                                  )
                                                : (profilePhotoUrl != null && profilePhotoUrl.isNotEmpty)
                                                    ? ClipOval(
                                                        child: Image.network(
                                                          profilePhotoUrl,
                                                          width: 72,
                                                          height: 72,
                                                          fit: BoxFit.cover,
                                                          errorBuilder: (_, __, ___) => Text(
                                                            name.isNotEmpty ? name[0].toUpperCase() : 'D',
                                                            style: AppTypography.h1(
                                                              color: isDark ? AppColors.primaryLight : AppColors.primary,
                                                              fontWeight: FontWeight.bold,
                                                            ),
                                                          ),
                                                        ),
                                                      )
                                                    : Text(
                                                        name.isNotEmpty ? name[0].toUpperCase() : 'D',
                                                        style: AppTypography.h1(
                                                          color: isDark ? AppColors.primaryLight : AppColors.primary,
                                                          fontWeight: FontWeight.bold,
                                                        ),
                                                      ),
                                          ),
                                        ),
                                        Positioned(
                                          right: 0,
                                          bottom: 0,
                                          child: GestureDetector(
                                            onTap: _isUploadingPhoto ? null : _pickAndUploadPhoto,
                                            child: Container(
                                              padding: const EdgeInsets.all(5),
                                              decoration: BoxDecoration(
                                                color: isDark ? AppColors.primaryLight : AppColors.primary,
                                                shape: BoxShape.circle,
                                                boxShadow: [
                                                  BoxShadow(
                                                    color: Colors.black.withValues(alpha: 0.2),
                                                    blurRadius: 4,
                                                  ),
                                                ],
                                              ),
                                              child: Icon(
                                                Icons.camera_alt,
                                                size: 13,
                                                color: isDark ? AppColors.bgDark : Colors.white,
                                              ),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(width: AppSpacing.lg),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            children: [
                                              Flexible(
                                                child: Text(
                                                  name,
                                                  style: AppTypography.h3(
                                                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                              ),
                                              const SizedBox(width: 8),
                                              Container(
                                                padding: const EdgeInsets.symmetric(
                                                  horizontal: 8,
                                                  vertical: 2,
                                                ),
                                                decoration: BoxDecoration(
                                                  color: verificationStatus == 'VERIFIED'
                                                      ? AppColors.accentGreenDark.withValues(alpha: isDark ? 0.2 : 0.12)
                                                      : Colors.amber.withValues(alpha: isDark ? 0.2 : 0.12),
                                                  borderRadius: BorderRadius.circular(AppRadius.full),
                                                ),
                                                child: Text(
                                                  verificationStatus == 'VERIFIED'
                                                      ? 'Verified'
                                                      : (verificationStatus == 'UNDER_REVIEW' ? 'In Review' : 'Pending'),
                                                  style: AppTypography.caption(
                                                    color: verificationStatus == 'VERIFIED'
                                                        ? (isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark)
                                                        : Colors.amber.shade700,
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            'Driver ID: $driverId',
                                            style: AppTypography.caption(
                                              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                            ),
                                          ),
                                          const SizedBox(height: 6),
                                          Row(
                                            children: [
                                              Icon(
                                                Icons.phone_outlined,
                                                size: 14,
                                                color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                              ),
                                              const SizedBox(width: 6),
                                              Expanded(
                                                child: Text(
                                                  phone,
                                                  style: AppTypography.caption(
                                                    color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                                  ),
                                                  overflow: TextOverflow.ellipsis,
                                                ),
                                              ),
                                            ],
                                          ),
                                           if (email != null && email.isNotEmpty) ...[
                                             const SizedBox(height: 4),
                                             Row(
                                               children: [
                                                 Icon(
                                                   Icons.email_outlined,
                                                   size: 14,
                                                   color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                                 ),
                                                 const SizedBox(width: 6),
                                                 Expanded(
                                                   child: Text(
                                                     email,
                                                     style: AppTypography.caption(
                                                       color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                                     ),
                                                     overflow: TextOverflow.ellipsis,
                                                   ),
                                                 ),
                                               ],
                                             ),
                                           ],
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: AppSpacing.xl),

                              // ── Personal Details Section Title ─────────────────────
                              Text(
                                'Personal Details',
                                style: AppTypography.body(
                                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: AppSpacing.md),

                              // ── Details Container Card ─────────────────────────────
                              Container(
                                decoration: BoxDecoration(
                                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                                  borderRadius: BorderRadius.circular(AppRadius.lg),
                                  border: Border.all(
                                    color: isDark ? AppColors.borderDark : AppColors.borderLight,
                                  ),
                                ),
                                child: Column(
                                  children: [
                                    _buildDetailTile(
                                      icon: Icons.person_outline,
                                      label: 'Full Name',
                                      value: name,
                                      isDark: isDark,
                                      onTap: _navigateToEdit,
                                    ),
                                    Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
                                    _buildDetailTile(
                                      icon: Icons.cake_outlined,
                                      label: 'Date of Birth',
                                      value: dob,
                                      isDark: isDark,
                                      onTap: _navigateToEdit,
                                    ),
                                    Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
                                    _buildDetailTile(
                                      icon: Icons.alternate_email,
                                      label: 'Gender',
                                      value: gender,
                                      isDark: isDark,
                                      onTap: _navigateToEdit,
                                    ),
                                    Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
                                    _buildDetailTile(
                                      icon: Icons.location_on_outlined,
                                      label: 'Address',
                                      value: address,
                                      isDark: isDark,
                                      onTap: _navigateToEdit,
                                    ),
                                    Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
                                    _buildDetailTile(
                                      icon: Icons.emergency_outlined,
                                      label: 'Emergency Contact',
                                      value: emergencyContact,
                                      isDark: isDark,
                                      onTap: _navigateToEdit,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDetailTile({
    required IconData icon,
    required String label,
    required String value,
    required bool isDark,
    VoidCallback? onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.lg,
          vertical: AppSpacing.md,
        ),
        child: Row(
          children: [
            Icon(
              icon,
              size: 20,
              color: isDark ? AppColors.primaryLight : AppColors.primary,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: AppTypography.caption(
                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    value,
                    style: AppTypography.body(
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right,
              size: 18,
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            ),
          ],
        ),
      ),
    );
  }
}
