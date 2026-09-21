import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
// import intl removed
import '../../routes/app_routes.dart';
import '../../services/auth_service.dart';
import '../../services/driver_service.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

/// Screen 4: Account Status screen — loads live data from driver profile.
class AccountStatusScreen extends StatefulWidget {
  const AccountStatusScreen({super.key});

  @override
  State<AccountStatusScreen> createState() => _AccountStatusScreenState();
}

class _AccountStatusScreenState extends State<AccountStatusScreen> {
  bool _isLoading = true;
  Map<String, dynamic> _profile = {};

  static const _months = [
    '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final res = await DriverService.instance.getProfile(forceRefresh: true);
      if (mounted && res is Map) {
        setState(() {
          _profile = Map<String, dynamic>.from(res);
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _formatDate(String? isoDate) {
    if (isoDate == null || isoDate.isEmpty) return '\u2014';
    try {
      final dt = DateTime.parse(isoDate).toLocal();
      final day = dt.day.toString().padLeft(2, '0');
      final month = (dt.month >= 1 && dt.month <= 12) ? _months[dt.month] : '';
      return '$day $month ${dt.year}';
    } catch (_) {
      return isoDate;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final user = AuthService.instance.currentUser;
    final verificationStatus = (_profile['verificationStatus'] ?? user?.verificationStatus ?? 'PENDING').toString().toUpperCase();
    final isVerified = verificationStatus == 'VERIFIED' || verificationStatus == 'APPROVED';
    final createdAt = _formatDate(_profile['createdAt'] as String?);
    final totalTrips = (_profile['totalTrips'] ?? _profile['total_trips'] ?? 0).toString();
    final averageRating = (_profile['averageRating'] ?? _profile['rating'] ?? 0).toString();
    final statusLabel = isVerified ? 'Active Driver' : (verificationStatus == 'UNDER_REVIEW' ? 'Under Review' : 'Pending Verification');

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Column(
              children: [
                // \u2500\u2500 App Header \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
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
                        'Account Status',
                        style: AppTypography.h3(
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),

                // \u2500\u2500 Scrollable Body \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
                Expanded(
                  child: _isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : ListView(
                          padding: const EdgeInsets.all(AppSpacing.lg),
                          children: [
                            // \u2500\u2500 Top Status Card \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
                            Container(
                              padding: const EdgeInsets.all(AppSpacing.xl),
                              decoration: BoxDecoration(
                                color: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: isDark ? 0.15 : 0.08),
                                borderRadius: BorderRadius.circular(AppRadius.lg),
                                border: Border.all(
                                  color: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.25),
                                ),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 46,
                                    height: 46,
                                    decoration: BoxDecoration(
                                      color: (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(AppRadius.md),
                                    ),
                                    child: Icon(
                                      Icons.work_outline_rounded,
                                      color: isDark ? AppColors.primaryLight : AppColors.primary,
                                    ),
                                  ),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(
                                              statusLabel,
                                              style: AppTypography.h3(
                                                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                            Container(
                                              width: 10,
                                              height: 10,
                                              decoration: BoxDecoration(
                                                color: isVerified
                                                    ? (isDark ? AppColors.accentGreenLight : AppColors.accentGreenDark)
                                                    : AppColors.warning,
                                                shape: BoxShape.circle,
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          isVerified
                                              ? 'Your account is active and in good standing'
                                              : 'Your account verification is $verificationStatus',
                                          style: AppTypography.caption(
                                            color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: AppSpacing.xl),

                            // \u2500\u2500 Account Details Card List \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
                            Container(
                              decoration: BoxDecoration(
                                color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                                borderRadius: BorderRadius.circular(AppRadius.lg),
                                border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                              ),
                              child: Column(
                                children: [
                                  _buildMetricTile(
                                    isDark: isDark,
                                    label: 'Verification Status',
                                    valueWidget: Row(
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
                                      ],
                                    ),
                                  ),
                                  Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
                                  _buildMetricTile(
                                    isDark: isDark,
                                    label: 'Account Created',
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
                                    label: 'Total Trips Completed',
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
                                    label: 'Customer Rating',
                                    valueWidget: Row(
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
                            const SizedBox(height: AppSpacing.lg),

                            // \u2500\u2500 View Account Policies Tile \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
                            Container(
                              decoration: BoxDecoration(
                                color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                                borderRadius: BorderRadius.circular(AppRadius.lg),
                                border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                              ),
                              child: ListTile(
                                onTap: () {
                                  // Account policies modal / navigation
                                },
                                leading: Icon(
                                  Icons.article_outlined,
                                  color: isDark ? AppColors.primaryLight : AppColors.primary,
                                ),
                                title: Text(
                                  'View Account Policies',
                                  style: AppTypography.body(
                                    color: isDark ? AppColors.primaryLight : AppColors.primary,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                trailing: Icon(
                                  Icons.chevron_right,
                                  color: isDark ? AppColors.primaryLight : AppColors.primary,
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
          valueWidget,
        ],
      ),
    );
  }
}


