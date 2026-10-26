import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../services/driver_service.dart';
import '../../services/notification_service.dart';
import '../../services/in_app_message_service.dart';
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
  final dynamic extra;
  final bool isUnread;

  const NotificationItem({
    required this.id,
    required this.title,
    required this.body,
    required this.timestamp,
    required this.icon,
    required this.color,
    required this.routeTarget,
    this.extra,
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
  bool _isLoading = true;
  List<NotificationItem> _notifications = [];

  @override
  void initState() {
    super.initState();
    _loadLiveNotifications();
  }

  Future<void> _loadLiveNotifications() async {
    setState(() => _isLoading = true);
    final items = <NotificationItem>[];

    try {
      // 1. Fetch real in-app notifications from the backend API
      final backendRes = await NotificationService.instance.getInAppNotifications();
      final backendNotifs = backendRes['notifications'] as List<InAppNotification>? ?? [];

      for (final n in backendNotifs) {
        IconData icon = Icons.notifications_active_rounded;
        Color color = AppColors.primary;
        String routeTarget = '';
        dynamic extra;

        final type = n.type?.toUpperCase() ?? '';
        if (type.contains('BID')) {
          icon = Icons.gavel_rounded;
          color = AppColors.accentBlue;
          if (n.data != null && n.data!['requirementId'] != null) {
            routeTarget = AppRoutes.userRequirementDetailsScreen;
            extra = n.data!['requirementId'];
          }
        } else if (type.contains('TRIP')) {
          icon = Icons.directions_car_rounded;
          color = AppColors.primary;
          if (n.data != null && n.data!['tripId'] != null) {
            routeTarget = AppRoutes.tripDetailsScreen;
            extra = {'id': n.data!['tripId']};
          }
        } else if (type.contains('PAY') || type.contains('WALLET')) {
          icon = Icons.account_balance_wallet_rounded;
          color = AppColors.accentGreenDark;
          routeTarget = AppRoutes.userPaymentsScreen;
        } else if (type.contains('OFFER')) {
          icon = Icons.local_offer_rounded;
          color = AppColors.warning;
          routeTarget = AppRoutes.opportunityOfferScreen;
        } else if (type.contains('KYC') || type.contains('VERIF')) {
          icon = Icons.verified_user_rounded;
          color = AppColors.primary;
          routeTarget = AppRoutes.kycVerificationScreen;
        }

        final now = DateTime.now();
        final diff = now.difference(n.createdAt);
        String timeAgo;
        if (diff.inMinutes < 1) {
          timeAgo = 'Just now';
        } else if (diff.inMinutes < 60) {
          timeAgo = '${diff.inMinutes}m ago';
        } else if (diff.inHours < 24) {
          timeAgo = '${diff.inHours}h ago';
        } else if (diff.inDays == 1) {
          timeAgo = 'Yesterday';
        } else {
          timeAgo = '${diff.inDays}d ago';
        }

        items.add(NotificationItem(
          id: n.id,
          title: n.title,
          body: n.body,
          timestamp: timeAgo,
          icon: icon,
          color: color,
          routeTarget: routeTarget,
          extra: extra,
          isUnread: !n.isRead,
        ));
      }

      // 2. Fetch driver offers if any
      try {
        final offers = await DriverService.instance.getOffers();
        for (final o in offers) {
          final offer = o as Map<String, dynamic>;
          final rate = offer['payoutAmount'] ?? offer['fare'] ?? 450;
          final pickup = offer['pickupLocation']?['address'] ?? 'Pickup point';
          final drop = offer['dropLocation']?['address'] ?? 'Drop point';

          items.add(NotificationItem(
            id: 'offer_${offer['id']}',
            title: 'New Trip Offer — ₹$rate',
            body: 'Direct Dispatch offer from $pickup to $drop. Tap to view and accept.',
            timestamp: 'Just now',
            icon: Icons.local_offer_rounded,
            color: AppColors.warning,
            routeTarget: AppRoutes.opportunityOfferScreen,
            extra: offer,
            isUnread: true,
          ));
        }
      } catch (_) {}

      // 3. Fetch driver trips if any
      try {
        final trips = await DriverService.instance.getTrips();
        for (final t in trips) {
          final trip = t as Map<String, dynamic>;
          final code = trip['tripCode'] ?? trip['id'] ?? 'TRP';
          final status = trip['status'] ?? 'ASSIGNED';

          if (status == 'ACCEPTED' || status == 'ASSIGNED') {
            items.add(NotificationItem(
              id: 'trip_$code',
              title: 'Trip Confirmed ($code)',
              body: 'Your trip assignment is confirmed. Proceed to the pickup location.',
              timestamp: 'Live',
              icon: Icons.check_circle_outline,
              color: AppColors.accentGreenDark,
              routeTarget: AppRoutes.tripDetailsScreen,
              extra: trip,
              isUnread: true,
            ));
            final num earnVal = DriverService.resolveDriverPayout(trip);
            final earnings = earnVal > 0 ? earnVal.toStringAsFixed(0) : (trip['driverEarnings'] ?? trip['fare'] ?? '--').toString();
            items.add(NotificationItem(
              id: 'complete_$code',
              title: 'Trip Completed — ₹$earnings Credited',
              body: 'Trip $code completed. Earnings have been deposited to your shared wallet.',
              timestamp: 'Today',
              icon: Icons.account_balance_wallet_rounded,
              color: AppColors.accentGreenDark,
              routeTarget: AppRoutes.userPaymentsScreen,
              extra: trip,
              isUnread: false,
            ));
          }
        }
      } catch (_) {}

      if (items.isEmpty) {
        items.add(const NotificationItem(
          id: 'sys_welcome',
          title: 'Welcome to ADHOCX',
          body: 'Your account is active and verified. Real-time updates and alerts will appear here.',
          timestamp: 'System',
          icon: Icons.verified_user_rounded,
          color: AppColors.primary,
          routeTarget: '',
          isUnread: false,
        ));
      }
    } catch (_) {
    } finally {
      if (mounted) {
        setState(() {
          _notifications = items;
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _markAllAsRead() async {
    setState(() {
      _notifications = _notifications
          .map((n) => NotificationItem(
                id: n.id,
                title: n.title,
                body: n.body,
                timestamp: n.timestamp,
                icon: n.icon,
                color: n.color,
                routeTarget: n.routeTarget,
                extra: n.extra,
                isUnread: false,
              ))
          .toList();
    });
    await NotificationService.instance.markAllAsRead();
    Fluttertoast.showToast(msg: 'All notifications marked as read');
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
                      bottom: BorderSide(
                        color: isDark ? AppColors.borderDark : AppColors.borderLight,
                      ),
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
                      Expanded(
                        child: Text(
                          'Notifications',
                          style: AppTypography.h3(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      IconButton(
                        tooltip: 'Test Voice & Music Alert',
                        icon: const Icon(
                          Icons.volume_up_rounded,
                          color: AppColors.primary,
                          size: 22,
                        ),
                        onPressed: () {
                          InAppMessageService.instance.triggerTestNotification();
                          Fluttertoast.showToast(msg: 'Playing in-app voice & music notification alert');
                        },
                      ),
                      TextButton(
                        onPressed: _markAllAsRead,
                        child: Text(
                          'Mark All Read',
                          style: AppTypography.caption(
                            color: isDark ? AppColors.primaryLight : AppColors.primary,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // ── Notifications List ───────────────────────────────────────
                Expanded(
                  child: _isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : _notifications.isEmpty
                          ? Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    Icons.notifications_none,
                                    size: 48,
                                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                  ),
                                  const SizedBox(height: 12),
                                  Text(
                                    'No notifications yet',
                                    style: AppTypography.body(
                                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                    ),
                                  ),
                                ],
                              ),
                            )
                          : ListView.separated(
                              padding: const EdgeInsets.all(AppSpacing.md),
                              itemCount: _notifications.length,
                              separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
                              itemBuilder: (context, index) {
                                final item = _notifications[index];
                                return InkWell(
                                  onTap: () async {
                                    if (item.isUnread) {
                                      setState(() {
                                        _notifications[index] = NotificationItem(
                                          id: item.id,
                                          title: item.title,
                                          body: item.body,
                                          timestamp: item.timestamp,
                                          icon: item.icon,
                                          color: item.color,
                                          routeTarget: item.routeTarget,
                                          extra: item.extra,
                                          isUnread: false,
                                        );
                                      });
                                      if (!item.id.startsWith('offer_') && !item.id.startsWith('trip_') && !item.id.startsWith('complete_') && !item.id.startsWith('sys_')) {
                                        NotificationService.instance.markAsRead(item.id);
                                      }
                                    }
                                    if (item.routeTarget.isNotEmpty && item.routeTarget != AppRoutes.notificationsFeedScreen) {
                                      context.push(item.routeTarget, extra: item.extra);
                                    }
                                  },
                                  borderRadius: BorderRadius.circular(AppRadius.lg),
                                  child: Container(
                                    padding: const EdgeInsets.all(AppSpacing.md),
                                    decoration: BoxDecoration(
                                      color: item.isUnread
                                          ? (isDark ? AppColors.surfaceDark : AppColors.surfaceLight)
                                          : (isDark ? AppColors.surfaceElevatedDark : AppColors.bgLight),
                                      borderRadius: BorderRadius.circular(AppRadius.lg),
                                      border: Border.all(
                                        color: item.isUnread
                                            ? (isDark ? AppColors.primaryLight : AppColors.primary).withValues(alpha: 0.3)
                                            : (isDark ? AppColors.borderDark : AppColors.borderLight),
                                      ),
                                    ),
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.all(10),
                                          decoration: BoxDecoration(
                                            color: item.color.withValues(alpha: isDark ? 0.2 : 0.12),
                                            shape: BoxShape.circle,
                                          ),
                                          child: Icon(item.icon, color: item.color, size: 20),
                                        ),
                                        const SizedBox(width: 12),
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
                                                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                                        fontWeight: FontWeight.bold,
                                                      ),
                                                    ),
                                                  ),
                                                  Text(
                                                    item.timestamp,
                                                    style: AppTypography.caption(
                                                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                                      fontSize: 10,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              const SizedBox(height: 4),
                                              Text(
                                                item.body,
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
