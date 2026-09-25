import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../routes/app_routes.dart';
import '../theme/app_colors.dart';
import '../utils/dispatch_sound_player.dart';

/// In-App Messaging Service for AdhocX.
/// Displays animated heads-up notification banners inside the running application
/// accompanied by voice announcements and musical chime sound alerts.
class InAppMessageService {
  InAppMessageService._();
  static final InAppMessageService instance = InAppMessageService._();

  OverlayEntry? _currentEntry;
  Timer? _dismissTimer;

  /// Display an animated in-app notification banner at the top of the screen
  /// with musical chime sound and spoken voice prompt.
  void showInAppNotification({
    required String title,
    required String body,
    Map<String, dynamic>? data,
    VoidCallback? onTap,
    bool playSound = true,
  }) {
    // 1. Play musical chime and spoken voice announcement
    if (playSound) {
      DispatchSoundPlayer.playNotificationChime(title: title, body: body);
    }

    // 2. Locate root navigator overlay context
    final overlayState = rootNavigatorKey.currentState?.overlay;
    if (overlayState == null) {
      debugPrint('⚠️ [IN-APP MESSAGE] Root overlay unavailable');
      return;
    }

    // Dismiss any active notification banner
    dismissActiveNotification();

    // 3. Create fresh OverlayEntry
    late OverlayEntry entry;
    entry = OverlayEntry(
      builder: (context) => _InAppNotificationBanner(
        title: title,
        body: body,
        data: data,
        onDismiss: () => dismissActiveNotification(),
        onTap: () {
          dismissActiveNotification();
          if (onTap != null) {
            onTap();
          } else {
            _handleDefaultNavigation(data);
          }
        },
      ),
    );

    _currentEntry = entry;
    overlayState.insert(entry);

    // 4. Auto-dismiss after 5.5 seconds
    _dismissTimer = Timer(const Duration(milliseconds: 5500), () {
      dismissActiveNotification();
    });
  }

  /// Programmatically dismiss the active banner if visible
  void dismissActiveNotification() {
    _dismissTimer?.cancel();
    _dismissTimer = null;
    if (_currentEntry != null) {
      try {
        _currentEntry?.remove();
      } catch (_) {}
      _currentEntry = null;
    }
  }

  /// Default navigation routing when user taps on an in-app message
  void _handleDefaultNavigation(Map<String, dynamic>? data) {
    final navContext = rootNavigatorKey.currentContext;
    if (navContext == null || !navContext.mounted) return;

    final targetRoute = data?['route']?.toString();
    final type = data?['type']?.toString();

    try {
      if (targetRoute != null && targetRoute.isNotEmpty) {
        navContext.push(targetRoute);
      } else if (type == 'TRIP_OFFER' || type == 'NEW_OFFER') {
        navContext.push(AppRoutes.opportunityOfferScreen, extra: data);
      } else {
        navContext.push(AppRoutes.notificationsFeedScreen);
      }
    } catch (e) {
      debugPrint('⚠️ [IN-APP NAVIGATION ERROR] $e');
    }
  }

  /// Convenient test trigger to preview in-app message, musical chime, and voice
  void triggerTestNotification() {
    showInAppNotification(
      title: 'Corporate Fleet Dispatch Notice',
      body: 'Your automated dispatch system is synchronized and ready for trip requests.',
      data: {'type': 'SYSTEM_TEST', 'route': AppRoutes.notificationsFeedScreen},
    );
  }
}

/// Animated floating banner widget rendered inside the root Overlay
class _InAppNotificationBanner extends StatefulWidget {
  final String title;
  final String body;
  final Map<String, dynamic>? data;
  final VoidCallback onDismiss;
  final VoidCallback onTap;

  const _InAppNotificationBanner({
    required this.title,
    required this.body,
    this.data,
    required this.onDismiss,
    required this.onTap,
  });

  @override
  State<_InAppNotificationBanner> createState() => _InAppNotificationBannerState();
}

class _InAppNotificationBannerState extends State<_InAppNotificationBanner>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<Offset> _slideAnimation;
  late final Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 380),
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0.0, -1.2),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutBack,
    ));

    _fadeAnimation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeIn,
    );

    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _dismissWithAnimation() {
    _controller.reverse().then((_) {
      widget.onDismiss();
    });
  }

  @override
  Widget build(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);
    final topPadding = mediaQuery.padding.top > 0 ? mediaQuery.padding.top + 8 : 16.0;

    return Positioned(
      top: topPadding,
      left: 16,
      right: 16,
      child: SlideTransition(
        position: _slideAnimation,
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: Dismissible(
            key: const Key('in_app_banner_dismissible'),
            direction: DismissDirection.up,
            onDismissed: (_) => widget.onDismiss(),
            child: Material(
              color: Colors.transparent,
              child: GestureDetector(
                onTap: widget.onTap,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B), // Rich dark slate
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.4),
                      width: 1.5,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.35),
                        blurRadius: 18,
                        offset: const Offset(0, 8),
                      ),
                      BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.2),
                        blurRadius: 10,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      // Gradient Bell / Music Icon Badge
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: const LinearGradient(
                            colors: [
                              AppColors.primary,
                              Color(0xFF8B5CF6),
                            ],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primary.withValues(alpha: 0.4),
                              blurRadius: 8,
                            ),
                          ],
                        ),
                        child: const Center(
                          child: Icon(
                            Icons.notifications_active_rounded,
                            color: Colors.white,
                            size: 22,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      // Text content (Title & Body)
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    widget.title,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w700,
                                      fontSize: 14,
                                      fontFamily: 'Inter',
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: const Text(
                                    'NOW',
                                    style: TextStyle(
                                      color: Colors.white70,
                                      fontSize: 9,
                                      fontWeight: FontWeight.bold,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 3),
                            Text(
                              widget.body,
                              style: const TextStyle(
                                color: Color(0xFFCBD5E1),
                                fontSize: 12,
                                height: 1.3,
                                fontFamily: 'Inter',
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Close button
                      InkWell(
                        onTap: _dismissWithAnimation,
                        borderRadius: BorderRadius.circular(16),
                        child: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.08),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.close_rounded,
                            color: Colors.white70,
                            size: 16,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
