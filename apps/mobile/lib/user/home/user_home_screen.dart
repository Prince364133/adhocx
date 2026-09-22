import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/utils/app_logger.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_provider.dart';
import '../../services/auth_service.dart';
import '../../services/onboarding_provider.dart';
import '../../services/user_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/theme/theme_provider.dart';
import '../../shared/widgets/app_primary_button.dart';
import '../requirements/requirement_draft_provider.dart';

class UserHomeScreen extends StatefulWidget {
  const UserHomeScreen({super.key});

  @override
  State<UserHomeScreen> createState() => _UserHomeScreenState();
}

class _UserHomeScreenState extends State<UserHomeScreen> {
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
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
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
                // Header Row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        IconButton(
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          onPressed: () {
                            showModalBottomSheet(
                              context: context,
                              backgroundColor: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                              shape: const RoundedRectangleBorder(
                                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                              ),
                              builder: (ctx) => SafeArea(
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      ListTile(
                                        leading: const CircleAvatar(
                                          backgroundColor: AppColors.primary,
                                          child: Icon(Icons.business, color: Colors.white, size: 20),
                                        ),
                                        title: Text(
                                          displayName,
                                          style: const TextStyle(fontWeight: FontWeight.bold),
                                        ),
                                        subtitle: const Text('Booker / Corporate Fleet Account'),
                                      ),
                                      const Divider(),
                                      ListTile(
                                        leading: Icon(Icons.drive_eta, color: AppColors.primary),
                                        title: const Text('Switch to Driver Partner Mode'),
                                        subtitle: const Text('View driver operations & trip simulator'),
                                        onTap: () {
                                          Navigator.pop(ctx);
                                          context.go(AppRoutes.homeScreen);
                                        },
                                      ),
                                      ListTile(
                                        leading: const Icon(Icons.receipt_long_outlined),
                                        title: const Text('All Requirements'),
                                        onTap: () {
                                          Navigator.pop(ctx);
                                          context.go(AppRoutes.userRequirementsScreen);
                                        },
                                      ),
                                      ListTile(
                                        leading: const Icon(Icons.account_balance_wallet_outlined),
                                        title: const Text('Wallet & Payments'),
                                        onTap: () {
                                          Navigator.pop(ctx);
                                          context.push(AppRoutes.userPaymentsScreen);
                                        },
                                      ),
                                      ListTile(
                                        leading: const Icon(Icons.settings_outlined),
                                        title: const Text('App Settings'),
                                        onTap: () {
                                          Navigator.pop(ctx);
                                          context.push(AppRoutes.userAppSettingsScreen);
                                        },
                                      ),
                                      ListTile(
                                        leading: const Icon(Icons.help_outline),
                                        title: const Text('Help & Support'),
                                        onTap: () {
                                          Navigator.pop(ctx);
                                          context.push(AppRoutes.userHelpFaqScreen);
                                        },
                                      ),
                                       ListTile(
                                         leading: Icon(Icons.logout, color: AppColors.error),
                                         title: Text('Sign Out', style: TextStyle(color: AppColors.error)),
                                         onTap: () async {
                                           final authProvider = context.read<AuthProvider>();
                                           final onboardingProvider = context.read<OnboardingProvider>();
                                           final requirementDraftProvider = context.read<RequirementDraftProvider>();
                                           final router = GoRouter.of(context);

                                           Navigator.pop(ctx);
                                           try {
                                             AppLogger.info('User sign out from home drawer', tag: 'AUTH');
                                             await authProvider.logout();
                                             onboardingProvider.reset();
                                             requirementDraftProvider.reset();
                                           } catch (e) {
                                             AppLogger.error('Error during sign out: $e', tag: 'AUTH', error: e);
                                           }
                                           if (mounted) {
                                             router.go(AppRoutes.signInScreen);
                                           }
                                         },
                                       ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                          icon: Icon(
                            Icons.menu,
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            size: 26,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Good morning,',
                                style: AppTypography.caption(
                                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Row(
                                children: [
                                  Flexible(
                                    child: Text(
                                      displayName,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: AppTypography.h2(
                                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  const Text('👋', style: TextStyle(fontSize: 20)),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
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
                        Stack(
                          children: [
                            IconButton(
                              onPressed: () => context.push(AppRoutes.notificationsFeedScreen),
                              icon: Icon(
                                Icons.notifications_outlined,
                                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                size: 26,
                              ),
                            ),
                            Positioned(
                              right: 8,
                              top: 8,
                              child: Container(
                                padding: const EdgeInsets.all(4),
                                decoration: BoxDecoration(
                                  color: AppColors.error,
                                  shape: BoxShape.circle,
                                ),
                                child: const Text(
                                  '1',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                          ],
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
