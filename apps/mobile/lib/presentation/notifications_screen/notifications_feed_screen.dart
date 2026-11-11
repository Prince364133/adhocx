import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/config/feature_flags.dart';
import '../../routes/app_routes.dart';
import '../../services/auth_service.dart';
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
  final String? type;
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
    this.type,
    this.extra,
    this.isUnread = true,
  });

  NotificationItem copyWith({bool? isUnread}) {
    return NotificationItem(
      id: id,
      title: title,
      body: body,
      timestamp: timestamp,
      icon: icon,
      color: color,
      routeTarget: routeTarget,
      type: type,
      extra: extra,
      isUnread: isUnread ?? this.isUnread,
    );
  }
}

/// Notifications Feed & Deep-Linking Interaction Screen.
class NotificationsFeedScreen extends StatefulWidget {
  final List<NotificationItem>? initialNotifications;

  const NotificationsFeedScreen({
    super.key,
    this.initialNotifications,
  });

  @override
  State<NotificationsFeedScreen> createState() => _NotificationsFeedScreenState();
}

class _NotificationsFeedScreenState extends State<NotificationsFeedScreen> {
  static const String _dismissedSyntheticKey = 'dismissed_synthetic_notifications';

  bool _isLoading = true;
  List<NotificationItem> _notifications = [];

  @override
  void initState() {
    super.initState();
    if (widget.initialNotifications != null) {
      _notifications = List<NotificationItem>.from(widget.initialNotifications!);
      _isLoading = false;
    } else {
      _loadLiveNotifications();
    }
  }

  bool _isSyntheticId(String id) {
    return id.startsWith('offer_') ||
        id.startsWith('trip_') ||
        id.startsWith('complete_') ||
        id.startsWith('sys_');
  }

  Future<Set<String>> _loadDismissedSyntheticIds() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return (prefs.getStringList(_dismissedSyntheticKey) ?? const <String>[]).toSet();
    } catch (_) {
      return <String>{};
    }
  }

  Future<void> _persistDismissedSyntheticIds(Iterable<String> newIds) async {
    final idsToAdd = newIds.where(_isSyntheticId).toList();
    if (idsToAdd.isEmpty) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      final existing = (prefs.getStringList(_dismissedSyntheticKey) ?? const <String>[]).toSet();
      existing.addAll(idsToAdd);
      await prefs.setStringList(_dismissedSyntheticKey, existing.toList());
    } catch (_) {}
  }

  Future<void> _loadLiveNotifications() async {
    setState(() => _isLoading = true);
    final items = <NotificationItem>[];
    final dismissedSyntheticIds = await _loadDismissedSyntheticIds();

    try {
      // 1. Fetch real in-app notifications from the backend API
      final backendRes = await NotificationService.instance.getInAppNotifications();
      final backendNotifs = backendRes['notifications'] as List<InAppNotification>? ?? [];

      for (final n in backendNotifs) {
        IconData icon = Icons.notifications_active_rounded;
        Color color = AppColors.primary;
        String routeTarget = '';
        dynamic extra = n.data;

        final data = n.data != null ? Map<String, dynamic>.from(n.data!) : <String, dynamic>{};
        final actionUrl = data['actionUrl']?.toString().trim() ?? data['route']?.toString().trim();
        if (actionUrl != null && actionUrl.isNotEmpty) {
          routeTarget = actionUrl;
        }

        final type = n.type?.toUpperCase() ?? '';
        if (type.contains('OFFER')) {
          icon = Icons.local_offer_rounded;
          color = AppColors.warning;
          if (routeTarget.isEmpty && data['offerId'] != null) {
            routeTarget = '/offers/${data['offerId']}';
          }
        } else if (type.contains('REQUIREMENT')) {
          icon = Icons.assignment_outlined;
          color = AppColors.accentBlue;
          if (routeTarget.isEmpty && data['requirementId'] != null) {
            routeTarget = '/requirements/${data['requirementId']}';
          }
        } else if (type.contains('TRIP')) {
          icon = Icons.directions_car_rounded;
          color = AppColors.primary;
          if (routeTarget.isEmpty && data['tripId'] != null) {
            routeTarget = '/trips/${data['tripId']}';
          }
        } else if (type.contains('PAY') || type.contains('WALLET')) {
          icon = Icons.account_balance_wallet_rounded;
          color = AppColors.accentGreenDark;
          final isDriver = AuthService.instance.currentUser?.isDriver ?? true;
          if (routeTarget.isEmpty && (isDriver || FeatureFlags.isVendorWalletEnabled)) {
            routeTarget = '/wallet';
          }
        } else if (type.contains('KYC') || type.contains('VERIF')) {
          icon = Icons.verified_user_rounded;
          color = AppColors.primary;
          if (routeTarget.isEmpty) routeTarget = '/verifications';
        } else if (type.contains('BROADCAST') || type.contains('SYSTEM')) {
          icon = Icons.campaign_rounded;
          color = AppColors.primary;
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
          type: n.type,
          extra: extra,
          isUnread: !n.isRead,
        ));
      }

      // 2. Fetch driver offers if any
      try {
        final offers = await DriverService.instance.getOffers();
        for (final o in offers) {
          final offer = o as Map<String, dynamic>;
          final syntheticId = 'offer_${offer['id']}';
          if (dismissedSyntheticIds.contains(syntheticId)) continue;
          final rate = offer['payoutAmount'] ?? offer['fare'] ?? 450;
          final pickup = offer['pickupLocation']?['address'] ?? 'Pickup point';
          final drop = offer['dropLocation']?['address'] ?? 'Drop point';

          items.add(NotificationItem(
            id: syntheticId,
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
            final tripNotifId = 'trip_$code';
            if (!dismissedSyntheticIds.contains(tripNotifId)) {
              items.add(NotificationItem(
                id: tripNotifId,
                title: 'Trip Confirmed ($code)',
                body: 'Your trip assignment is confirmed. Proceed to the pickup location.',
                timestamp: 'Live',
                icon: Icons.check_circle_outline,
                color: AppColors.accentGreenDark,
                routeTarget: AppRoutes.tripDetailsScreen,
                extra: trip,
                isUnread: true,
              ));
            }
            final completeNotifId = 'complete_$code';
            if (!dismissedSyntheticIds.contains(completeNotifId)) {
              final num earnVal = DriverService.resolveDriverPayout(trip);
              final earnings = earnVal > 0 ? earnVal.toStringAsFixed(0) : (trip['driverEarnings'] ?? trip['fare'] ?? '--').toString();
              items.add(NotificationItem(
                id: completeNotifId,
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
        }
      } catch (_) {}

      if (items.isEmpty && !dismissedSyntheticIds.contains('sys_welcome')) {
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
      _notifications = _notifications.map((n) => n.copyWith(isUnread: false)).toList();
    });
    await NotificationService.instance.markAllAsRead();
    Fluttertoast.showToast(msg: 'All notifications marked as read');
  }

  Future<void> _deleteNotification(NotificationItem item) async {
    setState(() {
      _notifications.removeWhere((n) => n.id == item.id);
    });
    if (_isSyntheticId(item.id)) {
      await _persistDismissedSyntheticIds([item.id]);
    } else {
      await NotificationService.instance.deleteNotification(item.id);
    }
    Fluttertoast.showToast(msg: 'Notification deleted');
  }

  Future<void> _confirmClearAll() async {
    if (_notifications.isEmpty) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Clear All Notifications?'),
        content: const Text('This will remove all notifications from your feed.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text(
              'Clear All',
              style: TextStyle(color: AppColors.error, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
    if (confirmed == true && mounted) {
      await _clearAllNotifications();
    }
  }

  Future<void> _clearAllNotifications() async {
    final idsToDismiss = <String>[
      ..._notifications.map((n) => n.id),
      'sys_welcome',
    ];
    setState(() {
      _notifications = [];
    });
    await _persistDismissedSyntheticIds(idsToDismiss);
    await NotificationService.instance.clearAllNotifications();
    Fluttertoast.showToast(msg: 'All notifications cleared');
  }

  bool _isHiddenVendorWalletTarget(String? route, String? type) {
    final isDriver = AuthService.instance.currentUser?.isDriver ?? true;
    if (isDriver || FeatureFlags.isVendorWalletEnabled) return false;
    final normalized = (route ?? '').trim();
    final upperType = (type ?? '').toUpperCase();
    if (normalized == '/wallet' ||
        normalized == '/earnings' ||
        normalized == '/payments' ||
        normalized == '/coupons' ||
        normalized == AppRoutes.walletScreen ||
        AppRoutes.isVendorWalletPath(normalized)) {
      return true;
    }
    return upperType.contains('PAY') || upperType.contains('WALLET');
  }

  bool _hasNavigationTarget(NotificationItem item) {
    if (_isHiddenVendorWalletTarget(item.routeTarget, item.type)) {
      return false;
    }
    if (item.routeTarget.trim().isNotEmpty) return true;
    if (item.extra is Map) {
      final extra = item.extra as Map;
      final route = extra['route']?.toString().trim() ?? extra['actionUrl']?.toString().trim();
      if (_isHiddenVendorWalletTarget(route, item.type)) {
        return false;
      }
      if (route != null && route.isNotEmpty) return true;
      for (final key in const ['offerId', 'requirementId', 'tripId', 'invoiceId', 'paymentId']) {
        final v = extra[key]?.toString().trim();
        if (v != null && v.isNotEmpty) return true;
      }
    }
    return false;
  }

  void _openNotification(NotificationItem item, int index) {
    if (item.isUnread) {
      setState(() {
        _notifications[index] = item.copyWith(isUnread: false);
      });
      if (!_isSyntheticId(item.id)) {
        NotificationService.instance.markAsRead(item.id);
      }
    }

    if (!_hasNavigationTarget(item)) {
      showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text(item.title),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(item.body),
              const SizedBox(height: 8),
              Text(
                item.timestamp,
                style: AppTypography.caption(color: AppColors.textMutedLight),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Close'),
            ),
          ],
        ),
      );
      return;
    }

    final Map<String, dynamic> navPayload = {
      'id': item.id,
      if (item.type != null) 'type': item.type,
      'actionUrl': item.routeTarget,
      'route': item.routeTarget,
      if (item.extra is Map) ...(item.extra as Map),
    };
    AppRoutes.handleNotificationNavigation(context, navPayload);
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
                    ],
                  ),
                ),

                // ── Quick Actions Strip (Mark All Read & Clear All) ───────────
                if (!_isLoading && _notifications.isNotEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.lg,
                      vertical: AppSpacing.xs,
                    ),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                      border: Border(
                        bottom: BorderSide(
                          color: isDark ? AppColors.borderDark : AppColors.borderLight,
                        ),
                      ),
                    ),
                    child: Wrap(
                      alignment: WrapAlignment.spaceBetween,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 8,
                      runSpacing: 4,
                      children: [
                        Text(
                          '${_notifications.length} ${_notifications.length == 1 ? 'notification' : 'notifications'}',
                          style: AppTypography.caption(
                            color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                          ),
                        ),
                        Wrap(
                          spacing: 8,
                          runSpacing: 4,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            TextButton(
                              onPressed: _markAllAsRead,
                              style: TextButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                              child: Text(
                                'Mark All Read',
                                style: AppTypography.caption(
                                  color: isDark ? AppColors.primaryLight : AppColors.primary,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            TextButton.icon(
                              onPressed: _confirmClearAll,
                              style: TextButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                foregroundColor: AppColors.error,
                              ),
                              icon: const Icon(Icons.delete_sweep_outlined, size: 16, color: AppColors.error),
                              label: Text(
                                'Clear All',
                                style: AppTypography.caption(
                                  color: AppColors.error,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
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
                                return Dismissible(
                                  key: ValueKey('notif_${item.id}'),
                                  direction: DismissDirection.endToStart,
                                  background: Container(
                                    alignment: Alignment.centerRight,
                                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                                    decoration: BoxDecoration(
                                      color: AppColors.error.withValues(alpha: 0.14),
                                      borderRadius: BorderRadius.circular(AppRadius.lg),
                                    ),
                                    child: const Icon(
                                      Icons.delete_outline_rounded,
                                      color: AppColors.error,
                                    ),
                                  ),
                                  onDismissed: (_) => _deleteNotification(item),
                                  child: InkWell(
                                    onTap: () => _openNotification(item, index),
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
                                                  crossAxisAlignment: CrossAxisAlignment.start,
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
                                                    const SizedBox(width: 6),
                                                    Text(
                                                      item.timestamp,
                                                      style: AppTypography.caption(
                                                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                                        fontSize: 10,
                                                      ),
                                                    ),
                                                    const SizedBox(width: 4),
                                                    IconButton(
                                                      tooltip: 'Delete notification',
                                                      padding: EdgeInsets.zero,
                                                      constraints: const BoxConstraints(
                                                        minWidth: 28,
                                                        minHeight: 28,
                                                      ),
                                                      iconSize: 18,
                                                      onPressed: () => _deleteNotification(item),
                                                      icon: Icon(
                                                        Icons.delete_outline_rounded,
                                                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
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
