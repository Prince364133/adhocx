import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Screen 6: Help & Support screen matching exact design mockup.
class HelpSupportScreen extends StatelessWidget {
  const HelpSupportScreen({super.key});

  void _handleLogout(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.lg)),
        title: Text(
          'Sign Out',
          style: AppTypography.h3(
            color: AppColors.textPrimaryLight,
            fontWeight: FontWeight.bold,
          ),
        ),
        content: Text(
          'Are you sure you want to sign out of your account?',
          style: AppTypography.body(color: AppColors.textSecondaryLight),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(
              'Cancel',
              style: AppTypography.body(color: AppColors.textSecondaryLight),
            ),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              try {
                final authService = context.read<AuthService>();
                await authService.logout();
              } catch (_) {}
              if (context.mounted) {
                Fluttertoast.showToast(
                  msg: 'Signed out successfully',
                  backgroundColor: AppColors.textPrimaryLight,
                );
                context.go(AppRoutes.signInScreen);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(AppRadius.sm),
              ),
            ),
            child: const Text('Logout', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
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
                    color: AppColors.surfaceLight,
                    border: Border(
                      bottom: BorderSide(color: AppColors.borderLight),
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
                          color: AppColors.textPrimaryLight,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Help & Support',
                        style: AppTypography.h3(
                          color: AppColors.textPrimaryLight,
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
                          color: AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(color: AppColors.borderLight),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.03),
                              blurRadius: 4,
                              offset: Offset(0, 2),
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
                                    'How can we help you?',
                                    style: AppTypography.h3(
                                      color: AppColors.textPrimaryLight,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    "We're here to support you 24/7",
                                    style: AppTypography.body(
                                      color: AppColors.textSecondaryLight,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              width: 56,
                              height: 56,
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.1),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                Icons.headset_mic_outlined,
                                color: AppColors.primary,
                                size: 30,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),

                      // ── Options List Card ──────────────────────────────────
                      Container(
                        decoration: BoxDecoration(
                          color: AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(color: AppColors.borderLight),
                        ),
                        child: Column(
                          children: [
                            _buildOptionTile(
                              icon: Icons.help_outline_rounded,
                              title: 'Help Center',
                              subtitle: 'FAQs and guides',
                              onTap: () {
                                Fluttertoast.showToast(
                                  msg: 'Help Center opened',
                                  backgroundColor: AppColors.primaryDark,
                                );
                              },
                            ),
                            Divider(height: 1, color: AppColors.borderLight),
                            _buildOptionTile(
                              icon: Icons.chat_bubble_outline_rounded,
                              title: 'Contact Support',
                              subtitle: 'Chat with our support team',
                              onTap: () {
                                Fluttertoast.showToast(
                                  msg: 'Support chat initiated',
                                  backgroundColor: AppColors.primaryDark,
                                );
                              },
                            ),
                            Divider(height: 1, color: AppColors.borderLight),
                            _buildOptionTile(
                              icon: Icons.phone_outlined,
                              title: 'Call Support',
                              subtitle: '+91 80 1234 5678',
                              badgeText: '24/7',
                              onTap: () {
                                Fluttertoast.showToast(
                                  msg: 'Calling +91 80 1234 5678...',
                                  backgroundColor: AppColors.primaryDark,
                                );
                              },
                            ),
                            Divider(height: 1, color: AppColors.borderLight),
                            _buildOptionTile(
                              icon: Icons.report_problem_outlined,
                              title: 'Report an Issue',
                              subtitle: 'Something not working?',
                              onTap: () {
                                Fluttertoast.showToast(
                                  msg: 'Report issue form opened',
                                  backgroundColor: AppColors.primaryDark,
                                );
                              },
                            ),
                            Divider(height: 1, color: AppColors.borderLight),
                            _buildOptionTile(
                              icon: Icons.rate_review_outlined,
                              title: 'App Feedback',
                              subtitle: 'Share your feedback',
                              onTap: () {
                                Fluttertoast.showToast(
                                  msg: 'Feedback form opened',
                                  backgroundColor: AppColors.primaryDark,
                                );
                              },
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),

                      // ── Logout Red Action Button ───────────────────────────
                      Container(
                        decoration: BoxDecoration(
                          color: AppColors.surfaceLight,
                          borderRadius: BorderRadius.circular(AppRadius.lg),
                          border: Border.all(
                            color: AppColors.error.withValues(alpha: 0.3),
                          ),
                        ),
                        child: ListTile(
                          onTap: () => _handleLogout(context),
                          leading: Icon(
                            Icons.logout_rounded,
                            color: AppColors.error,
                          ),
                          title: Text(
                            'Logout',
                            style: AppTypography.body(
                              color: AppColors.error,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
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

  Widget _buildOptionTile({
    required IconData icon,
    required String title,
    required String subtitle,
    String? badgeText,
    required VoidCallback onTap,
  }) {
    return ListTile(
      onTap: onTap,
      leading: Icon(icon, color: AppColors.textPrimaryLight, size: 22),
      title: Text(
        title,
        style: AppTypography.body(
          color: AppColors.textPrimaryLight,
          fontWeight: FontWeight.bold,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: AppTypography.caption(color: AppColors.textSecondaryLight),
      ),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (badgeText != null) ...[
            Text(
              badgeText,
              style: AppTypography.caption(
                color: AppColors.textSecondaryLight,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(width: 6),
          ],
          Icon(Icons.chevron_right, size: 18, color: AppColors.textMutedLight),
        ],
      ),
    );
  }
}
