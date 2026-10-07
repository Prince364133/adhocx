import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_service.dart';
import '../../services/onboarding_provider.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';

class UserProfileExtendedScreen extends StatelessWidget {
  const UserProfileExtendedScreen({super.key});

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
      {'title': 'Company Information', 'icon': Icons.business, 'route': AppRoutes.userCompanyInformationScreen},
      {'title': 'Contact Information', 'icon': Icons.phone_outlined, 'route': AppRoutes.userContactInformationScreen},
      {'title': 'Account Status', 'icon': Icons.verified_user_outlined, 'route': AppRoutes.userAccountStatusScreen},
      {'title': 'Notification Settings', 'icon': Icons.notifications_none, 'route': AppRoutes.userNotificationSettingsScreen},
      {'title': 'Support Center', 'icon': Icons.help_outline, 'route': AppRoutes.userSupportCenterScreen},
    ];

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        elevation: 0,
        leading: IconButton(
          onPressed: () => context.pop(),
          icon: Icon(Icons.arrow_back, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
        ),
        title: Text('User Profile', style: AppTypography.h3(color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight, fontWeight: FontWeight.bold)),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            children: [
              // Purple Gradient Header Card
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppColors.primary, AppColors.primaryLight],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: Colors.white24,
                      child: Text(initials.isNotEmpty ? initials : 'AX', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 20)),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(displayName, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
                          const Text('User ID: USR-1001', style: TextStyle(color: Colors.white70, fontSize: 11)),
                          const SizedBox(height: 4),
                          Row(
                            children: const [
                              Icon(Icons.verified, size: 14, color: AppColors.accentGreen),
                              SizedBox(width: 4),
                              Text('Verified User', style: TextStyle(color: AppColors.accentGreen, fontSize: 11, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () {},
                      icon: const Icon(Icons.edit_outlined, color: Colors.white),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: AppSpacing.lg),

              // Menu List Items Container
              Container(
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                ),
                child: Column(
                  children: List.generate(menuItems.length, (index) {
                    final item = menuItems[index];
                    final bool isLast = index == menuItems.length - 1;

                    return Column(
                      children: [
                        ListTile(
                          leading: Icon(item['icon'] as IconData, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                          title: Text(item['title'] as String, style: TextStyle(fontSize: 13, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight)),
                          trailing: const Icon(Icons.chevron_right, size: 20),
                          onTap: () {
                            final route = item['route'] as String;
                            if (route.isNotEmpty) {
                              context.push(route);
                            }
                          },
                        ),
                        if (!isLast) const Divider(height: 1),
                      ],
                    );
                  }),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
