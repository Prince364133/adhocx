import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../core/utils/app_logger.dart';
import '../../core/utils/app_toast.dart';
import '../../core/utils/name_utils.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_provider.dart';
import '../../services/auth_service.dart';
import '../../services/notification_service.dart';
import '../../services/onboarding_provider.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/theme/theme_provider.dart';
import '../../shared/widgets/app_profile_avatar.dart';
import '../requirements/requirement_draft_provider.dart';
import 'modals/vendor_rate_card_modal.dart';
import '../../presentation/profile_screen/modals/terms_modal.dart';
import '../../presentation/profile_screen/modals/privacy_modal.dart';
import '../../presentation/profile_screen/modals/about_modal.dart';
import '../../shared/widgets/app_version_label.dart';

class UserProfileScreen extends StatefulWidget {
  const UserProfileScreen({super.key});

  @override
  State<UserProfileScreen> createState() => _UserProfileScreenState();
}

class _UserProfileScreenState extends State<UserProfileScreen> {
  final ImagePicker _imagePicker = ImagePicker();
  bool _isUploadingPhoto = false;

  Future<void> _showPhotoSourceSheet() async {
    if (_isUploadingPhoto) return;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      useRootNavigator: true,
      backgroundColor: isDark ? AppColors.surfaceDark : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 14),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Text(
                'Update Profile Photo',
                style: AppTypography.h4(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              ListTile(
                leading: const CircleAvatar(
                  backgroundColor: Color(0x1A5B42F3),
                  child: Icon(Icons.camera_alt_rounded, color: AppColors.primary),
                ),
                title: Text(
                  'Take a Photo',
                  style: AppTypography.body(
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                onTap: () => Navigator.pop(ctx, ImageSource.camera),
              ),
              ListTile(
                leading: const CircleAvatar(
                  backgroundColor: Color(0x1A5B42F3),
                  child: Icon(Icons.photo_library_rounded, color: AppColors.primary),
                ),
                title: Text(
                  'Choose from Gallery',
                  style: AppTypography.body(
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                onTap: () => Navigator.pop(ctx, ImageSource.gallery),
              ),
            ],
          ),
        ),
      ),
    );

    if (source == null || !mounted) return;
    await _pickAndUploadPhoto(source);
  }

  Future<void> _pickAndUploadPhoto(ImageSource source) async {
    try {
      final picked = await _imagePicker.pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );
      if (picked == null || !mounted) return;

      setState(() => _isUploadingPhoto = true);
      final bytes = await picked.readAsBytes();
      final name = picked.name.isNotEmpty ? picked.name : 'vendor_profile.jpg';
      final lower = name.toLowerCase();
      final mimeType = lower.endsWith('.png')
          ? 'image/png'
          : (lower.endsWith('.webp') ? 'image/webp' : 'image/jpeg');

      final uploadedUrl = await UserService.instance.uploadProfilePhoto(
        fileBytes: bytes,
        fileName: name,
        mimeType: mimeType,
      );

      if (!mounted) return;
      if (uploadedUrl != null && uploadedUrl.isNotEmpty) {
        Fluttertoast.showToast(
          msg: 'Profile photo updated!',
          backgroundColor: AppColors.success,
          textColor: Colors.white,
        );
      } else {
        Fluttertoast.showToast(
          msg: 'Could not save profile photo. Please try again.',
          backgroundColor: AppColors.error,
          textColor: Colors.white,
        );
      }
    } catch (e) {
      AppLogger.error('Failed to upload vendor profile photo', tag: 'PROFILE_PHOTO', error: e);
      if (mounted) {
        AppToast.showError(e, context: context);
      }
    } finally {
      if (mounted) setState(() => _isUploadingPhoto = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final themeProvider = context.watch<ThemeProvider>();
    final onboarding = context.watch<OnboardingProvider?>();
    final currentUser = AuthService.instance.currentUser;

    final String displayName = () {
      if (onboarding != null && !isPlaceholderName(onboarding.fullName)) {
        return onboarding.fullName;
      }
      final userFullName = currentUser?.fullName;
      if (userFullName != null && !isPlaceholderName(userFullName)) {
        return userFullName;
      }
      if (onboarding != null && !isPlaceholderName(onboarding.companyName)) {
        return onboarding.companyName;
      }
      return 'AdhocX Partner';
    }();

    final menuItems = [
      {'icon': Icons.receipt_long_outlined, 'title': 'Corporate Rate Card & Tariffs', 'action': 'rate_card'},
      {'icon': Icons.corporate_fare_outlined, 'title': 'Organization Information', 'route': AppRoutes.userOrganizationInformationScreen},
      {'icon': Icons.notifications_none_outlined, 'title': 'Notification Settings', 'route': AppRoutes.userNotificationSettingsScreen},
      {'icon': Icons.help_outline, 'title': 'Support Center', 'route': AppRoutes.userSupportCenterScreen},
      {'icon': Icons.gavel_rounded, 'title': 'Terms & Conditions', 'action': 'terms'},
      {'icon': Icons.privacy_tip_outlined, 'title': 'Privacy Policy', 'action': 'privacy'},
      {'icon': Icons.info_outline_rounded, 'title': 'About Us', 'action': 'about'},
    ];

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        elevation: 0,
        leading: IconButton(
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go(AppRoutes.userHomeScreen);
            }
          },
          icon: Icon(
            Icons.arrow_back,
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
          ),
        ),
        title: Text(
          'Profile',
          style: AppTypography.h2(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          ValueListenableBuilder<int>(
            valueListenable: NotificationService.instance.unreadCount,
            builder: (context, count, _) {
              return Stack(
                clipBehavior: Clip.none,
                children: [
                  IconButton(
                    onPressed: () async {
                      await context.push(AppRoutes.notificationsFeedScreen);
                      NotificationService.instance.refreshUnreadCount();
                    },
                    icon: Icon(Icons.notifications_outlined, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                  ),
                  if (count > 0)
                    Positioned(
                      right: 6,
                      top: 6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.error,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                        child: Text(
                          count > 99 ? '99+' : count.toString(),
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold, height: 1),
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            children: [
              // User Card (Interactive Avatar with Photo Upload, Name, Verified User)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppSpacing.lg),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                ),
                child: Row(
                  children: [
                    GestureDetector(
                      onTap: _showPhotoSourceSheet,
                      child: Stack(
                        clipBehavior: Clip.none,
                        children: [
                          AppProfileAvatar(
                            radius: 32,
                            name: displayName,
                            isDark: isDark,
                          ),
                          if (_isUploadingPhoto)
                            Positioned.fill(
                              child: Container(
                                decoration: const BoxDecoration(
                                  color: Colors.black45,
                                  shape: BoxShape.circle,
                                ),
                                child: const Center(
                                  child: SizedBox(
                                    width: 22,
                                    height: 22,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2.5,
                                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          Positioned(
                            right: -2,
                            bottom: -2,
                            child: Container(
                              padding: const EdgeInsets.all(5),
                              decoration: BoxDecoration(
                                color: AppColors.primary,
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: isDark ? AppColors.surfaceDark : Colors.white,
                                  width: 2,
                                ),
                              ),
                              child: const Icon(
                                Icons.camera_alt_rounded,
                                size: 13,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            displayName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.h3(
                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            currentUser?.phone ?? 'Verified Corporate Partner',
                            style: AppTypography.caption(
                              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              const Icon(Icons.verified, size: 14, color: AppColors.success),
                              const SizedBox(width: 4),
                              const Text(
                                'Verified Partner',
                                style: TextStyle(color: AppColors.success, fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(width: 10),
                              GestureDetector(
                                onTap: _showPhotoSourceSheet,
                                child: const Text(
                                  'Change Photo',
                                  style: TextStyle(
                                    color: AppColors.primary,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    decoration: TextDecoration.underline,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.md),

              // Appearance / Theme Mode Toggle (Moved here from Home header)
              Container(
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                ),
                child: SwitchListTile(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.lg)),
                  secondary: Icon(
                    isDark ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
                    color: isDark ? AppColors.starAmber : AppColors.primary,
                    size: 22,
                  ),
                  title: Text(
                    'Dark Mode',
                    style: AppTypography.body(
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  subtitle: Text(
                    isDark ? 'Dark theme enabled' : 'Light theme enabled',
                    style: AppTypography.caption(
                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                    ),
                  ),
                  value: isDark,
                  activeThumbColor: AppColors.primary,
                  onChanged: (_) => themeProvider.toggleTheme(),
                ),
              ),

              const SizedBox(height: AppSpacing.md),

              // Profile Menu Items List
              Container(
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                ),
                child: Column(
                  children: List.generate(menuItems.length, (index) {
                    final item = menuItems[index];
                    return Column(
                      children: [
                        InkWell(
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          onTap: () {
                            if (item['action'] == 'rate_card') {
                              showModalBottomSheet(
                                context: context,
                                useRootNavigator: true,
                                isScrollControlled: true,
                                backgroundColor: Colors.transparent,
                                builder: (_) => const VendorRateCardModal(),
                              );
                              return;
                            }
                            if (item['action'] == 'terms') {
                              showModalBottomSheet(
                                context: context,
                                useRootNavigator: true,
                                isScrollControlled: true,
                                backgroundColor: Colors.transparent,
                                builder: (_) => const SingleChildScrollView(child: TermsModal(forVendor: true)),
                              );
                              return;
                            }
                            if (item['action'] == 'privacy') {
                              showModalBottomSheet(
                                context: context,
                                useRootNavigator: true,
                                isScrollControlled: true,
                                backgroundColor: Colors.transparent,
                                builder: (_) => const SingleChildScrollView(child: PrivacyModal(forVendor: true)),
                              );
                              return;
                            }
                            if (item['action'] == 'about') {
                              showModalBottomSheet(
                                context: context,
                                useRootNavigator: true,
                                isScrollControlled: true,
                                backgroundColor: Colors.transparent,
                                builder: (_) => const SingleChildScrollView(child: AboutModal()),
                              );
                              return;
                            }
                            final route = item['route'] as String?;
                            if (route != null && route.isNotEmpty) {
                              context.push(route);
                              return;
                            }
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text('Opened ${item['title']}')),
                            );
                          },
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 14),
                            child: Row(
                              children: [
                                Icon(item['icon'] as IconData, color: AppColors.primary, size: 22),
                                const SizedBox(width: AppSpacing.md),
                                Expanded(
                                  child: Text(
                                    item['title'] as String,
                                    style: AppTypography.body(
                                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ),
                                Icon(Icons.chevron_right, size: 20, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                              ],
                            ),
                          ),
                        ),
                        if (index < menuItems.length - 1) const Divider(height: 1),
                      ],
                    );
                  }),
                ),
              ),

              const SizedBox(height: AppSpacing.lg),

              // Logout Button (Red)
              Container(
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
                ),
                child: InkWell(
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  onTap: () => _confirmSignOut(context),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 14),
                    child: Row(
                      children: const [
                        Icon(Icons.logout, color: AppColors.error, size: 22),
                        SizedBox(width: AppSpacing.md),
                        Expanded(
                          child: Text(
                            'Logout',
                            style: TextStyle(color: AppColors.error, fontWeight: FontWeight.bold, fontSize: 15),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Center(
                child: TextButton.icon(
                  onPressed: () => _confirmDeleteAccount(context),
                  icon: const Icon(Icons.delete_forever_rounded, size: 16, color: AppColors.error),
                  label: const Text(
                    'Delete Account Permanently',
                    style: TextStyle(color: AppColors.error, fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              Center(
                child: Column(
                  children: [
                    Text(
                      'AdhocX Corporate • Enterprise Edition',
                      style: AppTypography.caption(
                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    AppVersionLabel(
                      style: AppTypography.micro(
                        color: isDark
                            ? AppColors.textMutedDark.withValues(alpha: 0.7)
                            : AppColors.textMutedLight.withValues(alpha: 0.7),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Text(
                        kAdhocxOperatorStatement,
                        textAlign: TextAlign.center,
                        style: AppTypography.micro(
                          color: isDark
                              ? AppColors.textMutedDark.withValues(alpha: 0.85)
                              : AppColors.textMutedLight.withValues(alpha: 0.85),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _confirmDeleteAccount(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final authProvider = context.read<AuthProvider>();
    final onboardingProvider = context.read<OnboardingProvider>();
    final requirementDraftProvider = context.read<RequirementDraftProvider>();
    final router = GoRouter.of(context);

    showModalBottomSheet(
      context: context,
      useRootNavigator: true,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (sheetCtx) => Container(
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
        ),
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 38,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: AppSpacing.md),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.borderSubtleDark : AppColors.borderSubtleLight,
                    borderRadius: AppRadius.borderPill,
                  ),
                ),
              ),
              Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.error.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.delete_forever_rounded, color: AppColors.error, size: 24),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Delete Account',
                          style: AppTypography.h3(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Permanent & irreversible action',
                          style: AppTypography.caption(
                            color: AppColors.error,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              Text(
                'Are you sure you want to permanently delete your AdhocX account?',
                style: AppTypography.body(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: AppColors.error.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  border: Border.all(color: AppColors.error.withValues(alpha: 0.2)),
                ),
                child: Text(
                  'This action is permanent. All your company records, requirements, payments, and credentials will be completely erased from our database.',
                  style: AppTypography.caption(
                    color: isDark ? const Color(0xFFFFA4A4) : const Color(0xFFC92A2A),
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              SizedBox(
                height: 48,
                child: ElevatedButton(
                  onPressed: () async {
                    Navigator.of(sheetCtx).pop();
                    try {
                      AppLogger.warn('User confirmed permanent account deletion from DB', tag: 'AUTH');
                      await authProvider.deleteAccount();
                      onboardingProvider.reset();
                      requirementDraftProvider.reset();
                      Fluttertoast.showToast(
                        msg: 'Account permanently deleted from database',
                        backgroundColor: AppColors.error,
                        textColor: Colors.white,
                      );
                      if (context.mounted) {
                        router.go(AppRoutes.signInScreen);
                      }
                    } catch (e) {
                      AppLogger.error('Error deleting account: $e', tag: 'AUTH', error: e);
                      if (context.mounted) {
                        AppToast.showError(e, context: context);
                      }
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.error,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                    elevation: 0,
                  ),
                  child: const Text('Delete Forever', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              TextButton(
                onPressed: () => Navigator.of(sheetCtx).pop(),
                child: Text(
                  'Cancel',
                  style: AppTypography.body(
                    color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _confirmSignOut(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showModalBottomSheet(
      context: context,
      useRootNavigator: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) => Container(
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
        ),
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 38,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: AppSpacing.md),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.borderSubtleDark : AppColors.borderSubtleLight,
                    borderRadius: AppRadius.borderPill,
                  ),
                ),
              ),
              Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.logout_rounded, color: AppColors.primary, size: 22),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Sign Out',
                          style: AppTypography.h3(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Are you sure you want to sign out?',
                          style: AppTypography.caption(
                            color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              Text(
                'Are you sure you want to sign out of your AdhocX account? You will need to sign back in to access corporate bookings and payments.',
                style: AppTypography.body(
                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              SizedBox(
                height: 48,
                child: ElevatedButton(
                  onPressed: () async {
                    final authProvider = context.read<AuthProvider>();
                    final onboardingProvider = context.read<OnboardingProvider>();
                    final requirementDraftProvider = context.read<RequirementDraftProvider>();

                    Navigator.of(sheetCtx).pop();
                    try {
                      AppLogger.info('User confirmed sign out', tag: 'AUTH');
                      await authProvider.logout();
                      onboardingProvider.reset();
                      requirementDraftProvider.reset();
                      Fluttertoast.showToast(
                        msg: 'Signed out successfully',
                        backgroundColor: AppColors.primaryDark,
                        textColor: Colors.white,
                      );
                    } catch (e) {
                      AppLogger.error('Error signing out: $e', tag: 'AUTH', error: e);
                    }
                    if (context.mounted) {
                      context.go(AppRoutes.signInScreen);
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.error,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                    elevation: 0,
                  ),
                  child: const Text('Sign Out', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              TextButton(
                onPressed: () => Navigator.of(sheetCtx).pop(),
                child: Text(
                  'Cancel',
                  style: AppTypography.body(
                    color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
