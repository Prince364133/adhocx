import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_service.dart';
import '../../services/language_service.dart';
import '../../services/notification_service.dart';
import '../../services/onboarding_provider.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/theme/theme_provider.dart';
import '../../shared/widgets/app_primary_button.dart';
import '../../shared/widgets/app_profile_avatar.dart';
import '../../shared/widgets/pending_review_gate.dart';
import '../../presentation/common/app_update_banner.dart';
import '../../services/app_update_service.dart';

class UserHomeScreen extends StatefulWidget {
  const UserHomeScreen({super.key});

  @override
  State<UserHomeScreen> createState() => _UserHomeScreenState();
}

class _UserHomeScreenState extends State<UserHomeScreen> with WidgetsBindingObserver {
  bool _isLoading = true;
  Map<String, dynamic> _summary = {
    'totalRequirements': 0,
    'totalVehiclesRequired': 0,
    'totalVehiclesFulfilled': 0,
    'assignedCount': 0,
    'searchingCount': 0,
    'completedCount': 0,
  };
  List<dynamic> _recentRequirements = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    AppUpdateService.instance.checkForUpdate();
    _loadDashboardData();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Trip may have completed while the app was backgrounded (or on another device)
    if (state == AppLifecycleState.resumed && mounted) {
      _checkPendingReview();
    }
  }

  void _checkPendingReview() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        PendingReviewGate.check(context, onCleared: () {
          if (mounted) _loadDashboardData(checkReviews: false);
        });
      }
    });
  }

  Future<void> _loadDashboardData({bool checkReviews = true}) async {
    setState(() => _isLoading = true);
    try {
      await AuthService.instance.ensureAuthenticatedSession(role: 'VENDOR');
      final summaryRes = await UserService.instance.getRequirementsSummary();
      final listRes = await UserService.instance.getRequirements();

      if (mounted) {
        setState(() {
          _summary = summaryRes;
          _recentRequirements = listRes;
          _isLoading = false;
        });
        NotificationService.instance.refreshUnreadCount();
        if (checkReviews) _checkPendingReview();
      }
    } catch (e) {
      debugPrint('Failed to load dashboard: $e');
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final onboarding = context.watch<OnboardingProvider?>();
    final currentUser = AuthService.instance.currentUser;

    final String displayName = () {
      bool isGeneric(String? s) {
        if (s == null) return true;
        final l = s.trim().toLowerCase();
        return l.isEmpty || l == 'partner' || l == 'driver partner' || l == 'vendor partner' || l == 'driver' || l == 'user';
      }

      if (onboarding != null && onboarding.fullName.isNotEmpty && !isGeneric(onboarding.fullName)) {
        return onboarding.fullName;
      }
      final userFullName = currentUser?.fullName;
      if (userFullName != null && userFullName.isNotEmpty && !isGeneric(userFullName)) {
        return userFullName;
      }
      if (onboarding != null && onboarding.companyName.isNotEmpty) {
        return onboarding.companyName;
      }
      return 'Corporate Booker';
    }();

    String getGreeting(BuildContext ctx) {
      final hour = DateTime.now().hour;
      if (hour >= 5 && hour < 12) {
        return ctx.tr('Good morning,');
      } else if (hour >= 12 && hour < 17) {
        return ctx.tr('Good afternoon,');
      } else if (hour >= 17 && hour < 22) {
        return ctx.tr('Good evening,');
      } else {
        return ctx.tr('Good night,');
      }
    }

    final int totalReq = _summary['totalRequirements'] ?? _recentRequirements.length;
    final int vehiclesRequired = _summary['totalVehiclesRequired'] ?? 0;
    final int vehiclesFulfilled = _summary['totalVehiclesFulfilled'] ?? 0;
    final double fulfillmentProgress = vehiclesRequired > 0 ? (vehiclesFulfilled / vehiclesRequired).clamp(0.0, 1.0) : 0.0;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadDashboardData,
          color: AppColors.primary,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const AppUpdateBanner(
                  margin: EdgeInsets.only(bottom: AppSpacing.sm),
                ),
                // Header Row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            getGreeting(context),
                            style: AppTypography.caption(
                              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            displayName,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.h2(
                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Row(
                      children: [
                        IconButton(
                          tooltip: isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme',
                          onPressed: () {
                            context.read<ThemeProvider>().toggleTheme();
                          },
                          icon: Icon(
                            isDark ? Icons.light_mode_rounded : Icons.dark_mode_outlined,
                            color: isDark ? AppColors.starAmber : AppColors.textSecondaryLight,
                            size: 22,
                          ),
                        ),
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
                                  icon: Icon(
                                    Icons.notifications_outlined,
                                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                    size: 26,
                                  ),
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
                                      constraints: const BoxConstraints(
                                        minWidth: 16,
                                        minHeight: 16,
                                      ),
                                      child: Text(
                                        count > 99 ? '99+' : count.toString(),
                                        textAlign: TextAlign.center,
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          height: 1,
                                        ),
                                      ),
                                    ),
                                  ),
                              ],
                            );
                          },
                        ),
                        const SizedBox(width: AppSpacing.xs),
                        GestureDetector(
                          onTap: () => context.push(AppRoutes.userProfileScreen),
                          child: AppProfileAvatar(
                            radius: 17,
                            name: displayName,
                            isDark: isDark,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),

                const SizedBox(height: AppSpacing.lg),

                // Active Requirements Summary Card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                    borderRadius: BorderRadius.circular(AppRadius.lg),
                    border: Border.all(
                      color: isDark ? AppColors.borderDark : AppColors.borderLight,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(AppRadius.md),
                            ),
                            child: const Icon(
                              Icons.dashboard_outlined,
                              color: AppColors.primary,
                              size: 20,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Text(
                            'Active Requirements',
                            style: AppTypography.h4(
                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.md),

                      // Metrics Row + Ring Chart
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '$totalReq',
                                  style: AppTypography.display(
                                    fontSize: 32,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.primary,
                                  ),
                                ),
                                Text(
                                  'Total Requirements',
                                  style: AppTypography.caption(
                                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          // Ring Chart graphic
                          Stack(
                            alignment: Alignment.center,
                            children: [
                              SizedBox(
                                width: 64,
                                height: 64,
                                child: CircularProgressIndicator(
                                  value: fulfillmentProgress > 0 ? fulfillmentProgress : 0.05,
                                  strokeWidth: 7,
                                  backgroundColor: isDark ? AppColors.slate800 : AppColors.slate200,
                                  valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
                                ),
                              ),
                              Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    '$vehiclesFulfilled/$vehiclesRequired',
                                    style: AppTypography.caption(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 10,
                                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                    ),
                                  ),
                                  Text(
                                    'Fulfilled',
                                    style: TextStyle(
                                      fontSize: 8,
                                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ],
                      ),

                      const SizedBox(height: AppSpacing.md),
                      const Divider(),
                      const SizedBox(height: 8),

                      // Sub Metrics Pills
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _buildSubMetric(
                            context,
                            '${_summary['assignedCount'] ?? 0}',
                            'Assigned',
                            AppColors.success,
                            isDark,
                          ),
                          _buildSubMetric(
                            context,
                            '${_summary['searchingCount'] ?? 0}',
                            'Searching',
                            AppColors.info,
                            isDark,
                          ),
                          _buildSubMetric(
                            context,
                            '${_summary['completedCount'] ?? 0}',
                            'Completed',
                            AppColors.primary,
                            isDark,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: AppSpacing.xl),

                // Recent Requirements Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Recent Requirements',
                      style: AppTypography.h3(
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    TextButton(
                      onPressed: () => context.go(AppRoutes.userRequirementsScreen),
                      child: const Text(
                        'View all',
                        style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: AppSpacing.xs),

                // Live Requirements List
                if (_isLoading)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.all(AppSpacing.xl),
                      child: CircularProgressIndicator(color: AppColors.primary),
                    ),
                  )
                else if (_recentRequirements.isEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(AppSpacing.xl),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                      borderRadius: BorderRadius.circular(AppRadius.lg),
                      border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                    ),
                    child: Column(
                      children: [
                        Icon(Icons.drive_eta_outlined, size: 48, color: AppColors.textMutedLight),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          'No Active Requirements Yet',
                          style: AppTypography.h4(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Post your first corporate or bulk ride requirement below.',
                          textAlign: TextAlign.center,
                          style: AppTypography.caption(
                            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  ..._recentRequirements.take(4).map((req) {
                    final String title = req['pickupAddress'] ?? 'Bulk Ride Transfer';
                    final int qty = req['quantity'] ?? 1;
                    final int assigned = req['assignedQuantity'] ?? 0;
                    final String status = req['status'] ?? 'POSTED';
                    final String vehicle = req['vehicleType'] ?? 'Sedan';

                    Color statusColor = AppColors.info;
                    if (status == 'FULFILLED' || status == 'COMPLETED') statusColor = AppColors.success;
                    if (status == 'PARTIALLY_FULFILLED') statusColor = AppColors.warning;
                    if (status == 'CANCELLED') statusColor = AppColors.error;

                    return Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                      child: _buildRequirementCard(
                        context,
                        title: '$vehicle ($qty Vehicles)',
                        subtitle: title,
                        status: status.replaceAll('_', ' '),
                        progressText: '$assigned/$qty',
                        statusColor: statusColor,
                        isDark: isDark,
                        onTap: () => context.push(
                          AppRoutes.userRequirementDetailsScreen,
                          extra: {'id': req['id']},
                        ),
                      ),
                    );
                  }),

                const SizedBox(height: AppSpacing.xl),

                // Post New Requirement Button CTA
                AppPrimaryButton(
                  text: '+ Post New Requirement',
                  onPressed: () => context.push(AppRoutes.userCreateRequirementScreen),
                ),
                const SizedBox(height: AppSpacing.xl),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSubMetric(BuildContext context, String value, String label, Color color, bool isDark) {
    return Column(
      children: [
        Row(
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            const SizedBox(width: 6),
            Text(
              value,
              style: AppTypography.h4(
                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: AppTypography.caption(
            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            fontSize: 11,
          ),
        ),
      ],
    );
  }

  Widget _buildRequirementCard(
    BuildContext context, {
    required String title,
    required String subtitle,
    required String status,
    required String progressText,
    required Color statusColor,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          borderRadius: BorderRadius.circular(AppRadius.lg),
          border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: AppTypography.h4(
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTypography.caption(
                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                    ),
                    child: Text(
                      status,
                      style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: Text(
                progressText,
                style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 13),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
