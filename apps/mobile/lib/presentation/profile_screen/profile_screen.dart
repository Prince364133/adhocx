import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/utils/app_logger.dart';
import '../../core/utils/name_utils.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_provider.dart';
import '../../services/auth_service.dart';
import '../../services/driver_service.dart';
import '../../services/onboarding_provider.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';
import '../../theme/theme_provider.dart';
import './modals/rate_card_modal.dart';
import './widgets/profile_driver_card_widget.dart';
import '../language_selection_widget.dart';
import './widgets/profile_menu_item_widget.dart';
import '../../user/requirements/requirement_draft_provider.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Map<String, dynamic> _driverProfile = {};

  @override
  void initState() {
    super.initState();
    _fetchProfile();
  }

  Future<void> _fetchProfile() async {
    try {
      await AuthService.instance.ensureAuthenticatedSession(role: 'DRIVER');

      final profileRes = await DriverService.instance.getProfile();
      final tripsRes = await DriverService.instance.getTrips();

      if (mounted) {
        setState(() {
          if (profileRes is Map) {
            _driverProfile = Map<String, dynamic>.from(profileRes);
          }
          final user = AuthService.instance.currentUser;
          final rawPName = _driverProfile['fullName'] ?? _driverProfile['full_name'] ?? user?.fullName;
          _driverProfile['name'] = !isPlaceholderName(rawPName) ? rawPName! : 'Partner';
          _driverProfile['phone'] = _driverProfile['phone'] ?? user?.phone ?? '';

          final veh = _driverProfile['vehicle'] ?? (_driverProfile['vehicles'] is List && (_driverProfile['vehicles'] as List).isNotEmpty ? _driverProfile['vehicles'][0] : null);
          if (veh is Map) {
            final plate = veh['registrationNumber'] ?? veh['vehicleNumber'] ?? '';
            final model = veh['model'] ?? veh['vehicleType'] ?? 'Commercial Fleet';
            _driverProfile['vehicle'] = plate.toString().isNotEmpty ? '$plate · $model' : '$model';
          } else {
            _driverProfile['vehicle'] = 'Verified Commercial Fleet';
          }

          final status = (_driverProfile['verificationStatus'] ?? _driverProfile['verification_status'] ?? '').toString().toUpperCase();
          _driverProfile['is_verified'] = status == 'VERIFIED' || status == 'APPROVED' || _driverProfile['isApproved'] == true;

          final totalTrips = tripsRes.length;
          _driverProfile['total_trips'] = '$totalTrips';
          _driverProfile['rating'] = (_driverProfile['rating'] != null && _driverProfile['rating'] != 0) ? _driverProfile['rating'].toString() : '5.0';
          _driverProfile['acceptance_rate'] = (_driverProfile['acceptanceRate'] != null && _driverProfile['acceptanceRate'] != 0) ? '${_driverProfile['acceptanceRate']}%' : '100%';
        });
      }
    } catch (e) {
      debugPrint('Error loading live driver profile: $e');
    }
  }

  Future<void> _openModal(Widget modal) async {
    await showModalBottomSheet(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => modal,
    );
  }

  void _signOut() {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
        ),
        title: Text(
          'Sign Out',
          style: AppTypography.h3(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
        content: Text(
          'Are you sure you want to sign out of your AdhocX driver account?',
          style: AppTypography.body(
            color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(),
            child: Text(
              'Cancel',
              style: AppTypography.body(
                color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(dialogCtx).pop();
              final authProvider = context.read<AuthProvider>();
              final onboardingProvider = context.read<OnboardingProvider>();
              final requirementDraftProvider = context.read<RequirementDraftProvider>();

              try {
                AppLogger.info('Driver confirmed sign out', tag: 'AUTH');
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
              appRouter.go(AppRoutes.signInScreen);
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
        ],
      ),
    );
  }

  void _confirmDeleteAccount() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final authProvider = context.read<AuthProvider>();
    final onboardingProvider = context.read<OnboardingProvider>();
    final requirementDraftProvider = context.read<RequirementDraftProvider>();

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogCtx) => AlertDialog(
        backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          side: BorderSide(color: AppColors.error.withValues(alpha: 0.3)),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.error.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.delete_forever_rounded, color: AppColors.error, size: 24),
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Text(
                'Delete Account',
                style: AppTypography.h3(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Are you sure you want to permanently delete your AdhocX driver account?',
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
                'This action is permanent and cannot be undone. All your profile records, uploaded KYC documents, vehicle details, trip history, and credentials will be completely erased from our database.',
                style: AppTypography.caption(
                  color: isDark ? const Color(0xFFFFA4A4) : const Color(0xFFC92A2A),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(),
            child: Text(
              'Cancel',
              style: AppTypography.body(
                color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(dialogCtx).pop();
              try {
                AppLogger.warn('Driver confirmed permanent account deletion from DB', tag: 'AUTH');
                await authProvider.deleteAccount();
                onboardingProvider.reset();
                requirementDraftProvider.reset();
                Fluttertoast.showToast(
                  msg: 'Account permanently deleted from database',
                  backgroundColor: AppColors.error,
                  textColor: Colors.white,
                );
                appRouter.go(AppRoutes.signInScreen);
              } catch (e) {
                AppLogger.error('Error deleting account: $e', tag: 'AUTH', error: e);
                Fluttertoast.showToast(
                  msg: 'Failed to delete account: $e',
                  backgroundColor: AppColors.error,
                  textColor: Colors.white,
                );
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
        ],
      ),
    );
  }

  void _showThemeSelector() {
    final themeProvider = context.read<ThemeProvider>();
    showModalBottomSheet(
      context: context,
      useRootNavigator: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return _ThemeSelectorSheet(themeProvider: themeProvider);
      },
    );
  }

  void _showLanguageSelector() {
    final languageProvider = context.read<LanguageProvider>();
    showModalBottomSheet(
      context: context,
      useRootNavigator: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return _LanguageSelectorSheet(languageProvider: languageProvider);
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final themeProvider = context.watch<ThemeProvider>();
    final languageProvider = context.watch<LanguageProvider>();
    final onboarding = context.watch<OnboardingProvider>();

    // Dynamic profile resolution
    final effectiveProfile = {
      'name': (_driverProfile['name'] != null && _driverProfile['name'].toString().isNotEmpty && !isPlaceholderName(_driverProfile['name'].toString()))
          ? _driverProfile['name'].toString()
          : (!isPlaceholderName(onboarding.fullName)
              ? onboarding.fullName
              : (!isPlaceholderName(AuthService.instance.currentUser?.fullName) ? AuthService.instance.currentUser!.fullName! : 'Partner')),
      'phone': (_driverProfile['phone'] != null && _driverProfile['phone'].toString().isNotEmpty)
          ? _driverProfile['phone'].toString()
          : (onboarding.phoneNumber.isNotEmpty
              ? onboarding.phoneNumber
              : (AuthService.instance.currentUser?.phone?.isNotEmpty == true ? AuthService.instance.currentUser!.phone! : '—')),
      'vehicle': (_driverProfile['vehicle'] != null && _driverProfile['vehicle'].toString().isNotEmpty)
          ? _driverProfile['vehicle'].toString()
          : (onboarding.registrationNumber.isNotEmpty
              ? '${onboarding.registrationNumber} · ${onboarding.vehicleType}'
              : 'Verified Commercial Fleet'),
      'is_verified': _driverProfile['is_verified'] ?? true,
      'rating': _driverProfile['rating'] ?? '5.0',
      'total_trips': _driverProfile['total_trips'] ?? '0',
      'acceptance_rate': _driverProfile['acceptance_rate'] ?? '100%',
      'profilePhotoUrl': _driverProfile['profilePhotoUrl'] ??
          _driverProfile['photoUrl'] ??
          AuthService.instance.currentUser?.effectivePhotoUrl ??
          (onboarding.profilePhotoUrl?.isNotEmpty == true ? onboarding.profilePhotoUrl : null),
    };

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.lg,
                AppSpacing.lg,
                AppSpacing.lg,
                100,
              ),
              children: [
                // ── Hero Profile Card ──────────────────────────────────
                ProfileDriverCardWidget(
                  profile: effectiveProfile,
                  onTap: () async {
                    await context.push(AppRoutes.personalInfoScreen);
                    if (mounted) _fetchProfile();
                  },
                ),
                const SizedBox(height: AppSpacing.xl),

                // ── Section 1: Vehicle & Fleet ────────────────────────
                _buildSectionTitle('VEHICLE & FLEET', isDark),
                const SizedBox(height: AppSpacing.xs),
                _buildCardGroup(
                  isDark: isDark,
                  children: [
                    ProfileMenuItemWidget(
                      icon: Icons.directions_car_outlined,
                      iconColor: AppColors.info,
                      label: context.tr('Vehicle Details'),
                      subtitle: context.tr('Car model, plate & specifications'),
                      onTap: () => context.push(AppRoutes.myVehicleScreen),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xl),

                // ── Section 2: Earnings & Rates ──────────────────────
                _buildSectionTitle('EARNINGS & RATES', isDark),
                const SizedBox(height: AppSpacing.xs),
                _buildCardGroup(
                  isDark: isDark,
                  children: [
                    ProfileMenuItemWidget(
                      icon: Icons.receipt_long_outlined,
                      iconColor: AppColors.primary,
                      label: context.tr('Driver Rate Card'),
                      subtitle: context.tr('Standard base fare & distance rates'),
                      onTap: () => _openModal(const RateCardModal()),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xl),

                // ── Section 3: Preferences & System ───────────────────
                _buildSectionTitle('PREFERENCES & SYSTEM', isDark),
                const SizedBox(height: AppSpacing.xs),
                _buildCardGroup(
                  isDark: isDark,
                  children: [
                    ProfileMenuItemWidget(
                      icon: Icons.language_rounded,
                      iconColor: AppColors.info,
                      label: context.tr('App Language'),
                      subtitle: context.tr('Select your preferred dialect'),
                      trailing: _buildPill(
                        text: languageProvider.currentLanguageLabel,
                        color: AppColors.primary,
                        isDark: isDark,
                      ),
                      onTap: _showLanguageSelector,
                    ),
                    _divider(isDark),
                    ProfileMenuItemWidget(
                      icon: _themeIcon(themeProvider.themeMode),
                      iconColor: AppColors.success,
                      label: context.tr('App Theme'),
                      subtitle: context.tr('Light, dark, or system default'),
                      trailing: _buildPill(
                        text: themeProvider.themeModeLabel,
                        color: AppColors.accentGreen,
                        isDark: isDark,
                      ),
                      onTap: _showThemeSelector,
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xl),

                      // ── Section 4: Support & Security ─────────────────────
                      _buildSectionTitle('SUPPORT & SECURITY', isDark),
                      const SizedBox(height: AppSpacing.xs),
                      _buildCardGroup(
                        isDark: isDark,
                        children: [
                          ProfileMenuItemWidget(
                            icon: Icons.headset_mic_outlined,
                            iconColor: AppColors.primaryLight,
                            label: context.tr('Help & 24/7 Support'),
                            subtitle: context.tr('Driver helpline & incident support'),
                            onTap: () => context.push(AppRoutes.helpSupportScreen),
                          ),
                          _divider(isDark),
                          ProfileMenuItemWidget(
                            icon: Icons.delete_forever_outlined,
                            iconColor: AppColors.error,
                            label: context.tr('Delete Account'),
                            subtitle: context.tr('Permanently remove account & all data'),
                            onTap: _confirmDeleteAccount,
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.xxl),

                      // ── Sign Out Button ────────────────────────────────────
                      _buildSignOutButton(isDark),

                      const SizedBox(height: AppSpacing.xl),

                      // ── App Version Footer ─────────────────────────────────
                      Center(
                        child: Column(
                          children: [
                            Text(
                              'AdhocX Driver • Enterprise Edition',
                              style: AppTypography.caption(
                                color: isDark
                                    ? AppColors.textMutedDark
                                    : AppColors.textMutedLight,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'v1.4.2 • Build 204 • Made for Logistics Excellence',
                              style: AppTypography.micro(
                                color: isDark
                                    ? AppColors.textMutedDark.withValues(alpha: 0.7)
                                    : AppColors.textMutedLight.withValues(alpha: 0.7),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
  }

  Widget _buildSectionTitle(String title, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 4),
      child: Text(
        context.tr(title),
        style: AppTypography.micro(
          color: isDark ? AppColors.textMutedDark : AppColors.textSecondaryLight,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }

  Widget _buildCardGroup({
    required bool isDark,
    required List<Widget> children,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: isDark
                ? Colors.black.withValues(alpha: 0.15)
                : AppColors.textSecondaryLight.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        child: Column(
          children: children,
        ),
      ),
    );
  }

  Widget _buildPill({
    required String text,
    required Color color,
    required bool isDark,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: isDark ? 0.2 : 0.12),
        borderRadius: BorderRadius.circular(AppRadius.full),
        border: Border.all(
          color: color.withValues(alpha: isDark ? 0.35 : 0.25),
        ),
      ),
      child: Text(
        text,
        style: AppTypography.micro(
          color: color,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  IconData _themeIcon(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.light:
        return Icons.light_mode_rounded;
      case ThemeMode.dark:
        return Icons.dark_mode_rounded;
      case ThemeMode.system:
        return Icons.brightness_auto_rounded;
    }
  }

  Widget _buildSignOutButton(bool isDark) {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: OutlinedButton.icon(
        onPressed: _signOut,
        icon: const Icon(Icons.logout_rounded, size: 18),
        label: Text(context.tr('Sign Out')),
        style: OutlinedButton.styleFrom(
          backgroundColor: isDark
              ? AppColors.errorContainer.withValues(alpha: 0.15)
              : AppColors.errorContainer.withValues(alpha: 0.4),
          foregroundColor: isDark ? AppColors.error : AppColors.error,
          side: BorderSide(
            color: isDark
                ? AppColors.error.withValues(alpha: 0.4)
                : AppColors.error.withValues(alpha: 0.3),
            width: 1,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.lg),
          ),
          textStyle: AppTypography.body(fontWeight: FontWeight.bold),
        ),
      ),
    );
  }

  Widget _divider(bool isDark) => Divider(
        color: isDark ? AppColors.borderDark : AppColors.borderLight,
        height: 1,
        indent: AppSpacing.lg + 38 + AppSpacing.md,
        endIndent: AppSpacing.lg,
      );
}

// ─────────────────────────────────────────────────────────────────────────────
// Theme Selector Bottom Sheet
// ─────────────────────────────────────────────────────────────────────────────
class _ThemeSelectorSheet extends StatefulWidget {
  final ThemeProvider themeProvider;
  const _ThemeSelectorSheet({required this.themeProvider});

  @override
  State<_ThemeSelectorSheet> createState() => _ThemeSelectorSheetState();
}

class _ThemeSelectorSheetState extends State<_ThemeSelectorSheet> {
  late ThemeMode _selected;

  @override
  void initState() {
    super.initState();
    _selected = widget.themeProvider.themeMode;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final options = [
      const _ThemeOption(
        mode: ThemeMode.system,
        icon: Icons.brightness_auto_rounded,
        label: 'System Default',
        subtitle: 'Syncs automatically with your device settings',
      ),
      const _ThemeOption(
        mode: ThemeMode.light,
        icon: Icons.light_mode_rounded,
        label: 'Light Mode',
        subtitle: 'Crisp white & clean enterprise theme',
      ),
      const _ThemeOption(
        mode: ThemeMode.dark,
        icon: Icons.dark_mode_rounded,
        label: 'Dark Mode',
        subtitle: 'Sleek operational night-friendly theme',
      ),
    ];

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
        border: Border(
          top: BorderSide(
            color: isDark ? AppColors.borderDark : AppColors.borderLight,
            width: 1,
          ),
        ),
      ),
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.xl,
        AppSpacing.md,
        AppSpacing.xl,
        AppSpacing.xxl,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 44,
              height: 5,
              decoration: BoxDecoration(
                color: isDark ? AppColors.borderDark : AppColors.borderSubtleLight,
                borderRadius: BorderRadius.circular(AppRadius.full),
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(
            'Choose Appearance',
            style: AppTypography.h2(
              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            'Select your preferred visual style',
            style: AppTypography.caption(
              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
            ),
          ),
          const SizedBox(height: AppSpacing.lg),
          ...options.map((opt) {
            final isSelected = _selected == opt.mode;
            return GestureDetector(
              onTap: () async {
                setState(() => _selected = opt.mode);
                await widget.themeProvider.setThemeMode(opt.mode);
                if (context.mounted) Navigator.of(context).pop();
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.lg,
                  vertical: AppSpacing.md,
                ),
                decoration: BoxDecoration(
                  color: isSelected
                      ? AppColors.primary.withValues(alpha: isDark ? 0.18 : 0.08)
                      : (isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceElevatedLight),
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  border: Border.all(
                    color: isSelected
                        ? AppColors.primary
                        : (isDark ? AppColors.borderDark : AppColors.borderLight),
                    width: isSelected ? 1.5 : 1,
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppColors.primary.withValues(alpha: isDark ? 0.3 : 0.15)
                            : (isDark ? AppColors.borderDark : AppColors.borderLight),
                        borderRadius: BorderRadius.circular(AppRadius.md),
                      ),
                      child: Icon(
                        opt.icon,
                        color: isSelected
                            ? AppColors.primary
                            : (isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight),
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            opt.label,
                            style: AppTypography.body(
                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            opt.subtitle,
                            style: AppTypography.caption(
                              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (isSelected)
                      Icon(
                        Icons.check_circle_rounded,
                        color: AppColors.primary,
                        size: 22,
                      ),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}

class _ThemeOption {
  final ThemeMode mode;
  final IconData icon;
  final String label;
  final String subtitle;
  const _ThemeOption({
    required this.mode,
    required this.icon,
    required this.label,
    required this.subtitle,
  });
}

class _LanguageSelectorSheet extends StatelessWidget {
  final LanguageProvider languageProvider;

  const _LanguageSelectorSheet({required this.languageProvider});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final currentCode = languageProvider.currentLocale.languageCode;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.25),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: AppSpacing.md),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                ),
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.translate_rounded,
                      color: isDark ? AppColors.primaryLight : AppColors.primary,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      context.tr('Select Language'),
                      style: AppTypography.h3(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: Icon(
                    Icons.close_rounded,
                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                    size: 20,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),
            ...AppLanguageService.supportedLanguages.map((lang) {
              final isSelected = currentCode == lang.code;
              return Container(
                margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                decoration: BoxDecoration(
                  color: isSelected
                      ? AppColors.primary.withValues(alpha: isDark ? 0.2 : 0.1)
                      : (isDark ? AppColors.surfaceElevatedDark : AppColors.surfaceLight),
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  border: Border.all(
                    color: isSelected
                        ? AppColors.primary
                        : (isDark ? AppColors.borderDark : AppColors.borderLight),
                    width: isSelected ? 1.5 : 1,
                  ),
                ),
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 2),
                  leading: CircleAvatar(
                    backgroundColor: isSelected
                        ? AppColors.primary
                        : (isDark ? AppColors.surfaceDark : AppColors.surfaceElevatedLight),
                    radius: 18,
                    child: Text(
                      lang.code.toUpperCase(),
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: isSelected ? Colors.white : (isDark ? Colors.white70 : Colors.black87),
                      ),
                    ),
                  ),
                  title: Text(
                    lang.nativeName,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    ),
                  ),
                  subtitle: Text(
                    lang.englishName,
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                    ),
                  ),
                  trailing: isSelected
                      ? const Icon(Icons.check_circle_rounded, color: AppColors.primary, size: 22)
                      : null,
                  onTap: () {
                    languageProvider.setLanguage(lang.code);
                    Navigator.of(context).pop();
                  },
                ),
              );
            }),
            const SizedBox(height: AppSpacing.sm),
          ],
        ),
      ),
    );
  }
}