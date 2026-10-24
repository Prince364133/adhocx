import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/networking/api_client.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_service.dart';
import '../../services/driver_service.dart';
import '../../services/language_service.dart';
import '../../services/onboarding_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Screen: Personal Information and Account Status screen bound to live backend data.
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

  static const _months = [
    '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

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

  String _formatDate(String? isoDate) {
    if (isoDate == null || isoDate.isEmpty) return '—';
    try {
      final dt = DateTime.parse(isoDate).toLocal();
      final day = dt.day.toString().padLeft(2, '0');
      final month = (dt.month >= 1 && dt.month <= 12) ? _months[dt.month] : '';
      return '$day $month ${dt.year}';
    } catch (_) {
      return isoDate;
    }
  }

  /// Converts relative, base64, localhost, or CDN image paths into fully-qualified URLs.
  static String resolveDocumentUrl(String? rawUrl) {
    if (rawUrl == null || rawUrl.trim().isEmpty) return '';
    final trimmed = rawUrl.trim();

    if (trimmed.startsWith('data:image')) {
      return trimmed;
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      if (trimmed.contains('localhost') || trimmed.contains('127.0.0.1')) {
        return trimmed.replaceAll(
          RegExp(r'http://(localhost|127\.0\.0\.1)(:\d+)?'),
          'https://api.adhocx.com',
        );
      }
      return trimmed;
    }

    final cleanPath = trimmed.startsWith('/') ? trimmed : '/$trimmed';
    final apiBase = ApiClient.instance.baseUrl.replaceAll('/api/v1', '');
    return '$apiBase$cleanPath';
  }

  Widget _buildAvatarImage(String url, String name, bool isDark) {
    if (url.isEmpty) {
      return Text(
        name.isNotEmpty ? name[0].toUpperCase() : 'D',
        style: AppTypography.h1(
          color: isDark ? AppColors.primaryLight : AppColors.primary,
          fontWeight: FontWeight.bold,
        ),
      );
    }

    if (url.startsWith('data:image')) {
      try {
        final commaIdx = url.indexOf(',');
        final base64String = commaIdx != -1 ? url.substring(commaIdx + 1) : url;
        final bytes = base64Decode(base64String.replaceAll(RegExp(r'\s+'), ''));
        return ClipOval(
          child: Image.memory(
            bytes,
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
        );
      } catch (_) {
        return Text(
          name.isNotEmpty ? name[0].toUpperCase() : 'D',
          style: AppTypography.h1(
            color: isDark ? AppColors.primaryLight : AppColors.primary,
            fontWeight: FontWeight.bold,
          ),
        );
      }
    }

    return ClipOval(
      child: Image.network(
        url,
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
    );
  }

  Widget _buildSectionCard({
    required bool isDark,
    required String title,
    required IconData icon,
    required List<Widget> children,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(AppSpacing.lg, AppSpacing.md, AppSpacing.lg, AppSpacing.xs),
            child: Row(
              children: [
                Icon(
                  icon,
                  size: 18,
                  color: isDark ? AppColors.primaryLight : AppColors.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: AppTypography.caption(
                    color: isDark ? AppColors.primaryLight : AppColors.primary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 4),
          ...children,
        ],
      ),
    );
  }

  Future<void> _pickAndUploadPhoto() async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showModalBottomSheet(
      context: context,
      useRootNavigator: true,
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
                context.tr('Upload Profile Photo'),
                style: AppTypography.h3(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              ListTile(
                leading: const Icon(Icons.photo_camera_outlined, color: AppColors.primary),
                title: Text(
                  context.tr('Take a Photo'),
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
                  context.tr('Choose from Gallery'),
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

      final res = await DriverService.instance.uploadProfilePhoto(
        fileBytes: bytes,
        fileName: image.name.isNotEmpty ? image.name : 'profile_photo.jpg',
        mimeType: image.mimeType ?? 'image/jpeg',
      );

      final uploadedUrl = (res is Map && res['url'] != null)
          ? res['url'].toString()
          : (res is Map && res['data'] is Map && res['data']['url'] != null)
              ? res['data']['url'].toString()
              : null;

      if (!mounted) return;
      if (uploadedUrl != null && uploadedUrl.isNotEmpty) {
        setState(() {
          if (_profile != null) {
            _profile!['profilePhotoUrl'] = uploadedUrl;
          } else {
            _profile = {'profilePhotoUrl': uploadedUrl};
          }
        });
        AuthService.instance.updateCurrentUserProfilePhoto(uploadedUrl);
      }

      Fluttertoast.showToast(
        msg: context.tr('Profile photo uploaded successfully!'),
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
      try {
        await AuthService.instance.fetchCurrentUser(forceRefresh: true);
      } catch (_) {}
      if (mounted) setState(() {});
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
      return l.isEmpty || l == 'driver' || l == 'driver partner' || l == 'google partner' || l == 'google user' || l == 'apple user' || l == 'user';
    }

    bool isFakeEmail(String? s) {
      if (s == null) return true;
      final l = s.trim().toLowerCase();
      return l.isEmpty || l == 'user.google@gmail.com' || l == 'test@example.com' || l == '—';
    }

    // Profile field fallbacks
    final rawName = _profile?['fullName'] ?? onboarding.fullName;
    final name = (rawName != null && !isFakeName(rawName.toString()))
        ? rawName.toString().trim()
        : (user?.fullName != null && !isFakeName(user!.fullName) ? user.fullName! : context.tr('Not provided'));

    final rawPhone = (_profile?['phone'] != null && _profile!['phone'].toString().trim().isNotEmpty && _profile!['phone'] != '—')
        ? _profile!['phone'].toString().trim()
        : (user?.phone != null && user!.phone!.trim().isNotEmpty && user.phone != '—'
            ? user.phone!.trim()
            : (user?.driverProfile?['phone'] != null && user!.driverProfile!['phone'].toString().trim().isNotEmpty
                ? user.driverProfile!['phone'].toString().trim()
                : (onboarding.phone.isNotEmpty ? onboarding.phone : (onboarding.phoneNumber.isNotEmpty ? onboarding.phoneNumber : '—'))));
    final phone = rawPhone;

    final rawEmail = _profile?['email'] ?? onboarding.email;
    final String? email = (rawEmail != null && !isFakeEmail(rawEmail.toString()))
        ? rawEmail.toString().trim()
        : (user?.email != null && !isFakeEmail(user!.email) ? user.email!.trim() : null);

    final driverId = _profile?['driverId']?.toString() ??
        (_profile?['id'] != null
            ? 'DRV${_profile!['id'].toString().replaceAll('-', '').substring(0, 6).toUpperCase()}'
            : (user?.id != null
                ? 'DRV${user!.id.replaceAll('-', '').substring(0, 6).toUpperCase()}'
                : 'DRV-PENDING'));

    final driverProf = user?.driverProfile;
    final kycDocs = (_profile?['kycDocuments'] is Map ? _profile!['kycDocuments'] as Map : null) ??
        (driverProf?['kycDocuments'] is Map ? driverProf!['kycDocuments'] as Map : null);

    final rawPhoto = _profile?['profilePhotoUrl']?.toString() ??
        kycDocs?['profilePhotoUrl']?.toString() ??
        user?.photoUrl ??
        driverProf?['profilePhotoUrl']?.toString() ??
        (onboarding.profilePhotoUrl != null && onboarding.profilePhotoUrl!.isNotEmpty ? onboarding.profilePhotoUrl : null) ??
        (onboarding.selfieUrl != null && onboarding.selfieUrl!.isNotEmpty ? onboarding.selfieUrl : null);

    final profilePhotoUrl = resolveDocumentUrl(rawPhoto);

    final rawVerification = (_profile?['verificationStatus'] ?? user?.driverProfile?['verificationStatus'] ?? 'PENDING').toString().toUpperCase();
    final isVerified = rawVerification == 'VERIFIED' || rawVerification == 'APPROVED';
    final verificationStatus = rawVerification == 'VERIFIED' ? context.tr('VERIFIED') : (rawVerification == 'UNDER_REVIEW' ? context.tr('UNDER_REVIEW') : context.tr('PENDING'));
    final createdAt = _formatDate((_profile?['createdAt'] ?? user?.driverProfile?['createdAt'])?.toString());
    final totalTrips = (_profile?['totalTrips'] ?? _profile?['total_trips'] ?? 0).toString();
    final averageRating = (_profile?['averageRating'] ?? _profile?['rating'] ?? '5.0').toString();

    // Onboarding Payload: Personal Details
    final rawDob = _profile?['dateOfBirth'] ?? kycDocs?['dateOfBirth'] ?? driverProf?['dateOfBirth'];
    final dob = (rawDob != null && rawDob.toString().trim().isNotEmpty)
        ? rawDob.toString().trim()
        : (onboarding.dateOfBirth != null
            ? '${onboarding.dateOfBirth!.day.toString().padLeft(2, '0')}/${onboarding.dateOfBirth!.month.toString().padLeft(2, '0')}/${onboarding.dateOfBirth!.year}'
            : '—');

    final rawGender = _profile?['gender'] ?? kycDocs?['gender'] ?? driverProf?['gender'];
    final gender = (rawGender != null && rawGender.toString().trim().isNotEmpty)
        ? rawGender.toString().trim()
        : (onboarding.gender.isNotEmpty ? onboarding.gender : '—');

    final rawAddress = _profile?['address'] ?? kycDocs?['address'] ?? driverProf?['address'];
    final address = (rawAddress != null && rawAddress.toString().trim().isNotEmpty)
        ? rawAddress.toString().trim()
        : (onboarding.address.isNotEmpty ? onboarding.address : '—');

    // Onboarding Payload: Emergency Contact
    final rawEmergName = _profile?['emergencyContactName'] ?? kycDocs?['emergencyContactName'] ?? driverProf?['emergencyContactName'];
    final emergencyName = (rawEmergName != null && rawEmergName.toString().trim().isNotEmpty)
        ? rawEmergName.toString().trim()
        : (onboarding.emergencyContactName.isNotEmpty ? onboarding.emergencyContactName : '—');

    final rawEmergPhone = _profile?['emergencyContactPhone'] ?? kycDocs?['emergencyContactPhone'] ?? driverProf?['emergencyContactPhone'];
    final emergencyPhone = (rawEmergPhone != null && rawEmergPhone.toString().trim().isNotEmpty)
        ? rawEmergPhone.toString().trim()
        : (onboarding.emergencyContactPhone.isNotEmpty ? onboarding.emergencyContactPhone : '—');

    // Onboarding Payload: Vehicle Details
    final rawVehType = _profile?['vehicleType'] ?? driverProf?['vehicleType'];
    final vehicleType = (rawVehType != null && rawVehType.toString().trim().isNotEmpty)
        ? rawVehType.toString().trim()
        : (onboarding.vehicleType.isNotEmpty ? onboarding.vehicleType : 'Sedan');

    final rawVehModel = _profile?['vehicleModel'] ?? driverProf?['vehicleModel'];
    final vehicleModel = (rawVehModel != null && rawVehModel.toString().trim().isNotEmpty)
        ? rawVehModel.toString().trim()
        : (onboarding.carModel.isNotEmpty ? onboarding.carModel : 'Fleet Vehicle');

    final rawVehPlate = _profile?['vehiclePlate'] ?? driverProf?['vehiclePlate'];
    final vehiclePlate = (rawVehPlate != null && rawVehPlate.toString().trim().isNotEmpty)
        ? rawVehPlate.toString().trim()
        : (onboarding.registrationNumber.isNotEmpty ? onboarding.registrationNumber : '—');

    final rawColor = onboarding.color.isNotEmpty ? onboarding.color : (kycDocs?['color']?.toString() ?? '');

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
                          context.tr('Personal Information'),
                          style: AppTypography.h3(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      TextButton(
                        onPressed: _navigateToEdit,
                        child: Text(
                          context.tr('Edit'),
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
                                                : _buildAvatarImage(profilePhotoUrl, name, isDark),
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
                                                  color: isVerified
                                                      ? AppColors.accentGreenDark.withValues(alpha: isDark ? 0.2 : 0.12)
                                                      : Colors.amber.withValues(alpha: isDark ? 0.2 : 0.12),
                                                  borderRadius: BorderRadius.circular(AppRadius.full),
                                                ),
                                                child: Text(
                                                  isVerified
                                                      ? context.tr('Verified')
                                                      : (rawVerification == 'UNDER_REVIEW' ? context.tr('In Review') : context.tr('Pending')),
                                                  style: AppTypography.caption(
                                                    color: isVerified
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
                                            '${context.tr('Driver ID')}: $driverId',
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

                              // ── Account Metrics Card ───────────────────────────────
                              Container(
                                decoration: BoxDecoration(
                                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                                  borderRadius: BorderRadius.circular(AppRadius.lg),
                                  border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                                ),
                                child: Column(
                                  children: [
                                    InkWell(
                                      onTap: () => context.push(AppRoutes.kycVerificationScreen, extra: 'identity'),
                                      borderRadius: BorderRadius.circular(AppRadius.lg),
                                      child: _buildMetricTile(
                                        isDark: isDark,
                                        label: context.tr('Verification Status'),
                                        valueWidget: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Text(
                                              verificationStatus,
                                              style: AppTypography.body(
                                                color: isVerified
                                                    ? (isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark)
                                                    : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                            if (isVerified) ...[
                                              const SizedBox(width: 4),
                                              Icon(
                                                Icons.check_circle_rounded,
                                                size: 16,
                                                color: isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark,
                                              ),
                                            ],
                                            const SizedBox(width: 6),
                                            Icon(
                                              Icons.chevron_right_rounded,
                                              size: 16,
                                              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                    Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
                                    _buildMetricTile(
                                      isDark: isDark,
                                      label: context.tr('Account Created'),
                                      valueWidget: Text(
                                        createdAt,
                                        style: AppTypography.body(
                                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                    Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
                                    _buildMetricTile(
                                      isDark: isDark,
                                      label: context.tr('Total Trips Completed'),
                                      valueWidget: Text(
                                        totalTrips,
                                        style: AppTypography.body(
                                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                    Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
                                    _buildMetricTile(
                                      isDark: isDark,
                                      label: context.tr('Customer Rating'),
                                      valueWidget: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Text(
                                            averageRating,
                                            style: AppTypography.body(
                                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: (isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark).withValues(alpha: isDark ? 0.2 : 0.12),
                                              borderRadius: BorderRadius.circular(AppRadius.xs),
                                            ),
                                            child: Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Icon(
                                                  Icons.star_rounded,
                                                  size: 13,
                                                  color: isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark,
                                                ),
                                                const SizedBox(width: 2),
                                                Text(
                                                  averageRating,
                                                  style: AppTypography.caption(
                                                    color: isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark,
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: AppSpacing.md),

                              // ── Personal & Onboarding Details ──────────────────────
                              _buildSectionCard(
                                isDark: isDark,
                                title: context.tr('Personal Details'),
                                icon: Icons.person_outline_rounded,
                                children: [
                                  _buildMetricTile(
                                    isDark: isDark,
                                    label: context.tr('Date of Birth'),
                                    valueWidget: Text(
                                      dob,
                                      style: AppTypography.body(
                                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                  Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
                                  _buildMetricTile(
                                    isDark: isDark,
                                    label: context.tr('Gender'),
                                    valueWidget: Text(
                                      gender,
                                      style: AppTypography.body(
                                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                  Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
                                  _buildMetricTile(
                                    isDark: isDark,
                                    label: context.tr('Permanent Address'),
                                    valueWidget: Text(
                                      address,
                                      textAlign: TextAlign.end,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                      style: AppTypography.caption(
                                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: AppSpacing.md),

                              // ── Emergency Contact ──────────────────────────────────
                              _buildSectionCard(
                                isDark: isDark,
                                title: context.tr('Emergency Contact'),
                                icon: Icons.contact_phone_outlined,
                                children: [
                                  _buildMetricTile(
                                    isDark: isDark,
                                    label: context.tr('Contact Name'),
                                    valueWidget: Text(
                                      emergencyName,
                                      style: AppTypography.body(
                                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                  Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
                                  _buildMetricTile(
                                    isDark: isDark,
                                    label: context.tr('Contact Phone'),
                                    valueWidget: Text(
                                      emergencyPhone,
                                      style: AppTypography.body(
                                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: AppSpacing.md),

                              // ── Registered Vehicle ─────────────────────────────────
                              _buildSectionCard(
                                isDark: isDark,
                                title: context.tr('Registered Vehicle'),
                                icon: Icons.directions_car_outlined,
                                children: [
                                  _buildMetricTile(
                                    isDark: isDark,
                                    label: context.tr('Vehicle Type & Model'),
                                    valueWidget: Text(
                                      '$vehicleType • $vehicleModel',
                                      style: AppTypography.body(
                                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                  Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
                                  _buildMetricTile(
                                    isDark: isDark,
                                    label: context.tr('Plate Number'),
                                    valueWidget: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.12),
                                        borderRadius: BorderRadius.circular(AppRadius.xs),
                                        border: Border.all(
                                          color: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.25),
                                        ),
                                      ),
                                      child: Text(
                                        vehiclePlate,
                                        style: AppTypography.caption(
                                          color: isDark ? AppColors.primaryLight : AppColors.primary,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ),
                                  if (rawColor.isNotEmpty && rawColor != '—') ...[
                                    Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
                                    _buildMetricTile(
                                      isDark: isDark,
                                      label: context.tr('Vehicle Color'),
                                      valueWidget: Text(
                                        rawColor,
                                        style: AppTypography.body(
                                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                              const SizedBox(height: AppSpacing.xl),
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

  Widget _buildMetricTile({
    required bool isDark,
    required String label,
    required Widget valueWidget,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.lg,
        vertical: AppSpacing.md,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: AppTypography.body(color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight),
          ),
          const SizedBox(width: AppSpacing.md),
          Flexible(
            child: Align(
              alignment: Alignment.centerRight,
              child: valueWidget,
            ),
          ),
        ],
      ),
    );
  }


}
