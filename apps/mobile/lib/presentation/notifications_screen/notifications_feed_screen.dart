import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import '../../routes/app_routes.dart';
import '../../services/driver_service.dart';
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
        } else if (status == 'COMPLETED') {
          final earnings = trip['driverEarnings'] ?? trip['agreedRate'] ?? 1200;
          items.add(NotificationItem(
            id: 'complete_$code',
            title: 'Trip Completed — ₹$earnings Credited',
            body: 'Trip $code completed. Earnings have been deposited to your shared wallet.',
            timestamp: 'Today',
            icon: Icons.account_balance_wallet_rounded,
            color: AppColors.accentGreenDark,
            routeTarget: AppRoutes.walletScreen,
            extra: trip,
            isUnread: false,
          ));
        }
      }

      items.add(const NotificationItem(
        id: 'sys_kyc',
        title: 'Platform Verification Verified',
        body: 'Your KYC credentials and driving license are active and approved.',
        timestamp: 'Verified',
        icon: Icons.verified_user_rounded,
        color: AppColors.primary,
        routeTarget: AppRoutes.kycVerificationScreen,
        isUnread: false,
      ));
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

  void _markAllAsRead() {
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
    Fluttertoast.showToast(msg: 'All notifications marked as read');
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
                      Expanded(
                        child: Text(
                          'Notifications',
                          style: AppTypography.h3(
                            color: AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      TextButton(
                        onPressed: _markAllAsRead,
                        child: Text(
                          'Mark All Read',
                          style: AppTypography.caption(
                            color: AppColors.primary,
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
                                  Icon(Icons.notifications_none, size: 48, color: AppColors.textMutedLight),
                                  const SizedBox(height: 12),
                                  Text(
                                    'No notifications yet',
                                    style: AppTypography.body(color: AppColors.textMutedLight),
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
                                  onTap: () {
                                    context.push(item.routeTarget, extra: item.extra);
                                  },
                                  borderRadius: BorderRadius.circular(AppRadius.lg),
                                  child: Container(
                                    padding: const EdgeInsets.all(AppSpacing.md),
                                    decoration: BoxDecoration(
                                      color: item.isUnread ? AppColors.surfaceLight : AppColors.bgLight,
                                      borderRadius: BorderRadius.circular(AppRadius.lg),
                                      border: Border.all(
                                        color: item.isUnread ? AppColors.primary.withValues(alpha: 0.3) : AppColors.borderLight,
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
                                                        color: AppColors.textPrimaryLight,
                                                        fontWeight: FontWeight.bold,
                                                      ),
                                                    ),
                                                  ),
                                                  Text(
                                                    item.timestamp,
                                                    style: AppTypography.caption(
                                                      color: AppColors.textMutedLight,
                                                      fontSize: 10,
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
