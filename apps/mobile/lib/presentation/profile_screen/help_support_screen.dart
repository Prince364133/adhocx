import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/utils/app_logger.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_service.dart';
import '../../services/language_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Screen 6: Help & Support screen matching exact design mockup.
class HelpSupportScreen extends StatelessWidget {
  const HelpSupportScreen({super.key});

  Future<void> _launchContactEmail() async {
    final user = AuthService.instance.currentUser;
    final driverName = user?.fullName ?? 'Driver';
    final phone = user?.phone ?? '';
    final emailUri = Uri(
      scheme: 'mailto',
      path: 'support@adhocx.com',
      query:
          'subject=${Uri.encodeComponent('AdhocX Driver Support Request')}&body=${Uri.encodeComponent('Hi AdhocX Support Team,\n\nI need assistance with my driver account.\n\nDriver Name: $driverName\nPhone: $phone\n\nIssue Details:\n')}',
    );

    try {
      await launchUrl(emailUri, mode: LaunchMode.externalApplication);
    } catch (e) {
      AppLogger.error('Failed to open email client: $e', tag: 'SUPPORT');
    }
  }

  Future<void> _launchPhoneCall() async {
    final telUri = Uri(scheme: 'tel', path: '+917893545818');
    try {
      await launchUrl(telUri, mode: LaunchMode.externalApplication);
    } catch (e) {
      AppLogger.error('Failed to open phone dialer: $e', tag: 'SUPPORT');
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

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
                      bottom: BorderSide(color: isDark ? AppColors.borderDark : AppColors.borderLight),
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
                      Text(
                        context.tr('Help & Support'),
                        style: AppTypography.h3(
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),

                // ── Scrollable Body ──────────────────────────────────────────
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    children: [
                      // ── Support Hero Banner Card ───────────────────────────
                      Container(
                        padding: const EdgeInsets.all(AppSpacing.xl),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
                              blurRadius: 4,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    context.tr('How can we help you?'),
                                    style: AppTypography.h3(
                                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    context.tr("We're here to support you 24/7"),
                                    style: AppTypography.body(
                                      color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              width: 56,
                              height: 56,
                              decoration: BoxDecoration(
                                color: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.12),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                Icons.headset_mic_outlined,
                                color: isDark ? AppColors.primaryLight : AppColors.primary,
                                size: 30,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),

                      // ── Options List Card ──────────────────────────────────
                      Material(
                        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                        clipBehavior: Clip.antiAlias,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          side: BorderSide(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                        ),
                        child: Column(
                          children: [
                            _buildOptionTile(
                              isDark: isDark,
                              icon: Icons.help_outline_rounded,
                              title: context.tr('Help Center'),
                              subtitle: context.tr('FAQs and guides'),
                              onTap: () {
                                context.push(AppRoutes.faqScreen);
                              },
                            ),
                            Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
                            _buildOptionTile(
                              isDark: isDark,
                              icon: Icons.chat_bubble_outline_rounded,
                              title: context.tr('Contact Support'),
                              subtitle: 'support@adhocx.com',
                              onTap: _launchContactEmail,
                            ),
                            Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
                            _buildOptionTile(
                              isDark: isDark,
                              icon: Icons.phone_outlined,
                              title: context.tr('Call Support'),
                              subtitle: '+91 7893545818',
                              badgeText: '24/7',
                              onTap: _launchPhoneCall,
                            ),
                            Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
                            _buildOptionTile(
                              isDark: isDark,
                              icon: Icons.report_problem_outlined,
                              title: context.tr('Report an Issue'),
                              subtitle: context.tr('Something not working?'),
                              onTap: () {
                                context.push(AppRoutes.reportIssueScreen);
                              },
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),
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

  Widget _buildOptionTile({
    required bool isDark,
    required IconData icon,
    required String title,
    required String subtitle,
    String? badgeText,
    required VoidCallback onTap,
  }) {
    return ListTile(
      onTap: onTap,
      leading: Icon(icon, color: isDark ? AppColors.primaryLight : AppColors.textPrimaryLight, size: 22),
      title: Text(
        title,
        style: AppTypography.body(
          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
          fontWeight: FontWeight.bold,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: AppTypography.caption(color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight),
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (badgeText != null) ...[
            Text(
              badgeText,
              style: AppTypography.caption(
                color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(width: 6),
          ],
          Icon(Icons.chevron_right, size: 18, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
        ],
      ),
    );
  }
}
