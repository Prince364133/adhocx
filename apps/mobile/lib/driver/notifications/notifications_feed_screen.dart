import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../theme/app_colors.dart';
import '../../theme/app_radius.dart';
import '../../theme/app_spacing.dart';
import '../../theme/app_typography.dart';

class NotificationItem {
  final String id;
  final String title;
  final String body;
  final String timestamp;
  final IconData icon;
  final Color color;
  final String routeTarget;
  final bool isUnread;

  const NotificationItem({
    required this.id,
    required this.title,
    required this.body,
    required this.timestamp,
    required this.icon,
    required this.color,
    required this.routeTarget,
    this.isUnread = true,
  });
}

/// Notifications Feed & Deep-Linking Interaction Screen.
class NotificationsFeedScreen extends StatefulWidget {
  const NotificationsFeedScreen({super.key});

  @override
  State<NotificationsFeedScreen> createState() => _NotificationsFeedScreenState();
}

class _NotificationsFeedScreenState extends State<NotificationsFeedScreen> {
  final List<NotificationItem> _notifications = [
    const NotificationItem(
      id: 'N1',
      title: 'New Trip Offer — ₹450',
      body: 'High payout offer: Cyber City to IGI Airport (24 km). Tap to view and accept offer.',
      timestamp: '2 mins ago',
      icon: Icons.local_offer_rounded,
      color: Color(0xFFeab308),
      routeTarget: AppRoutes.opportunityOfferScreen,
    ),
    const NotificationItem(
      id: 'N2',
      title: 'Assignment Confirmed',
      body: 'Trip #TRP-8821 confirmed! Proceed to pickup location at HDFC Bank Tower.',
      timestamp: '15 mins ago',
      icon: Icons.check_circle_outline,
      color: AppColors.accentGreenDark,
      routeTarget: AppRoutes.tripDetailsScreen,
    ),
    const NotificationItem(
      id: 'N3',
      title: 'Trip Update — Pickup Location Changed',
      body: 'Rider updated pickup point to Gate 2, DLF Phase 3.',
      timestamp: '45 mins ago',
      icon: Icons.edit_location_alt_rounded,
      color: Color(0xFF0284c7),
      routeTarget: AppRoutes.tripDetailsScreen,
    ),
    const NotificationItem(
      id: 'N4',
      title: 'Trip Cancelled by Rider',
      body: 'Trip #TRP-7710 was cancelled. Cancellation fee ₹50 credited to your wallet.',
      timestamp: '2 hours ago',
      icon: Icons.cancel_outlined,
      color: AppColors.error,
      routeTarget: AppRoutes.tripsScreen,
      isUnread: false,
    ),
    const NotificationItem(
      id: 'N5',
      title: 'Earnings Updated — ₹1,850 Added',
      body: 'Weekly incentive bonus ₹500 successfully credited to your wallet.',
      timestamp: '4 hours ago',
      icon: Icons.account_balance_wallet_rounded,
      color: AppColors.accentGreenDark,
      routeTarget: AppRoutes.walletScreen,
      isUnread: false,
    ),
    const NotificationItem(
      id: 'N6',
      title: 'Withdrawal Successful — ₹2,000',
      body: 'Transfer completed to HDFC Bank (•••• 4321). UTR512398475612.',
      timestamp: 'Yesterday',
      icon: Icons.savings_rounded,
      color: AppColors.accentGreenDark,
      routeTarget: AppRoutes.earningsWithdrawalDetailsScreen,
      isUnread: false,
    ),
    const NotificationItem(
      id: 'N7',
      title: 'KYC Document Verified',
      body: 'Your Driving License and Vehicle RC have been verified. You are clear to drive!',
      timestamp: '2 days ago',
      icon: Icons.verified_user_rounded,
      color: AppColors.primary,
      routeTarget: AppRoutes.kycVerificationScreen,
      isUnread: false,
    ),
    const NotificationItem(
      id: 'N8',
      title: 'System Notification — App Update Available',
      body: 'AdhocX v2.4.1 is now live with enhanced navigation & instant payout support.',
      timestamp: '3 days ago',
      icon: Icons.system_update_rounded,
      color: Color(0xFF8b5cf6),
      routeTarget: AppRoutes.notificationsSettingsScreen,
      isUnread: false,
    ),
  ];

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
                  decoration: const BoxDecoration(
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
                        icon: const Icon(
                          Icons.arrow_back,
                          color: AppColors.textPrimaryLight,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Notifications',
                          style: AppTypography.h3(
                            color: AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      IconButton(
                        onPressed: () {
                          Fluttertoast.showToast(msg: 'All notifications marked as read');
                        },
                        icon: const Icon(
                          Icons.done_all_rounded,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ),

                // ── Scrollable Notifications List ────────────────────────────
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    itemCount: _notifications.length,
                    separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.md),
                    itemBuilder: (context, index) {
                      final item = _notifications[index];

                      return GestureDetector(
                        onTap: () {
                          context.push(item.routeTarget);
                        },
                        child: Container(
                          padding: const EdgeInsets.all(AppSpacing.lg),
                          decoration: BoxDecoration(
                            color: item.isUnread
                                ? AppColors.primarySubtle.withValues(alpha: 0.3)
                                : AppColors.surfaceLight,
                            borderRadius: BorderRadius.circular(AppRadius.lg),
                            border: Border.all(
                              color: item.isUnread
                                  ? AppColors.primary.withValues(alpha: 0.3)
                                  : AppColors.borderLight,
                            ),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: item.color.withValues(alpha: 0.12),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(item.icon, color: item.color, size: 22),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Expanded(
                                          child: Text(
                                            item.title,
                                            style: AppTypography.body(
                                              color: AppColors.textPrimaryLight,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ),
                                        if (item.isUnread)
                                          Container(
                                            width: 8,
                                            height: 8,
                                            decoration: const BoxDecoration(
                                              color: AppColors.primary,
                                              shape: BoxShape.circle,
                                            ),
                                          ),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      item.body,
                                      style: AppTypography.caption(
                                        color: AppColors.textSecondaryLight,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          item.timestamp,
                                          style: AppTypography.caption(
                                            color: AppColors.textMutedLight,
                                          ).copyWith(fontSize: 11),
                                        ),
                                        Row(
                                          children: [
                                            Text(
                                              'View details',
                                              style: AppTypography.caption(
                                                color: AppColors.primary,
                                                fontWeight: FontWeight.bold,
                                              ).copyWith(fontSize: 11),
                                            ),
                                            const Icon(
                                              Icons.chevron_right_rounded,
                                              size: 14,
                                              color: AppColors.primary,
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
