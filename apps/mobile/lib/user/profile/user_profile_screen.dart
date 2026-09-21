import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/utils/app_logger.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_provider.dart';
import '../../services/auth_service.dart';
import '../../services/onboarding_provider.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../requirements/requirement_draft_provider.dart';

class UserProfileScreen extends StatelessWidget {
  const UserProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final onboarding = context.watch<OnboardingProvider?>();
    final currentUser = AuthService.instance.currentUser;

    final String displayName = () {
      if (onboarding != null && onboarding.fullName.isNotEmpty) {
        return onboarding.fullName;
      }
      final userFullName = currentUser?.fullName;
      if (userFullName != null && userFullName.isNotEmpty) {
        return userFullName;
      }
      if (onboarding != null && onboarding.companyName.isNotEmpty) {
        return onboarding.companyName;
      }
      return 'AdhocX User';
    }();

    final String initials = displayName
        .trim()
        .split(' ')
        .where((s) => s.isNotEmpty)
        .take(2)
        .map((s) => s[0].toUpperCase())
        .join();

    final menuItems = [
      {'icon': Icons.business_outlined, 'title': 'Company Information'},
      {'icon': Icons.phone_outlined, 'title': 'Contact Information'},
      {'icon': Icons.verified_user_outlined, 'title': 'Account Status'},
      {'icon': Icons.notifications_none_outlined, 'title': 'Notification Settings'},
      {'icon': Icons.help_outline, 'title': 'Support Center'},
    ];

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        elevation: 0,
        title: Text(
          'Profile',
          style: AppTypography.h2(
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          Stack(
            children: [
              IconButton(
                onPressed: () => context.push(AppRoutes.notificationsFeedScreen),
                icon: Icon(Icons.notifications_outlined, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
              ),
              Positioned(
                right: 8,
                top: 8,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(color: AppColors.error, shape: BoxShape.circle),
                  child: const Text('1', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            children: [
              // User Card (Avatar, Name, ID: USR-1001, Verified User)
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
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Text(
                          initials.isNotEmpty ? initials : 'AX',
                          style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          displayName,
                          style: AppTypography.h3(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'User ID: USR-1001',
                          style: AppTypography.caption(
                            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Row(
                          children: const [
                            Icon(Icons.verified, size: 14, color: AppColors.success),
                            SizedBox(width: 4),
                            Text(
                              'Verified User',
                              style: TextStyle(color: AppColors.success, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.xl),

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
                '⚠️ This action is permanent. All your company records, requirements, payments, and credentials will be completely erased from our database.',
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

  void _confirmSignOut(BuildContext context) {
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
          'Are you sure you want to sign out of your AdhocX account?',
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
              final authProvider = context.read<AuthProvider>();
              final onboardingProvider = context.read<OnboardingProvider>();
              final requirementDraftProvider = context.read<RequirementDraftProvider>();

              Navigator.of(dialogCtx).pop();
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
        ],
      ),
    );
  }
}
