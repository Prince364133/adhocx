import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:go_router/go_router.dart';
import '../routes/app_routes.dart';

/// Local Notification Service for showing high-priority heads-up alerts
/// on Android and iOS when ride dispatches and offers arrive.
class LocalNotificationService {
  LocalNotificationService._();
  static final LocalNotificationService instance = LocalNotificationService._();

  final FlutterLocalNotificationsPlugin _plugin = FlutterLocalNotificationsPlugin();
  bool _isInitialized = false;

  static const String _dispatchChannelId = 'dispatch_alerts';
  static const String _dispatchChannelName = 'Trip & Dispatch Alerts';
  static const String _dispatchChannelDesc = 'Urgent ride requests and dispatch notifications';

  Future<void> initialize() async {
    if (_isInitialized) return;
    if (kIsWeb) {
      _isInitialized = true;
      return;
    }

    try {
      const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
      const darwinSettings = DarwinInitializationSettings(
        requestAlertPermission: true,
        requestBadgePermission: true,
        requestSoundPermission: true,
      );

      const initSettings = InitializationSettings(
        android: androidSettings,
        iOS: darwinSettings,
      );

      await _plugin.initialize(
        settings: initSettings,
        onDidReceiveNotificationResponse: (details) {
          debugPrint('🔔 [NOTIFICATION CLICK] Payload: ${details.payload}');
          if (details.payload != null && details.payload!.isNotEmpty) {
            _handlePayloadNavigation(details.payload!);
          }
        },
      );

      // Create Android Notification Channel with Max Importance & Vibration
      final androidPlugin = _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
      if (androidPlugin != null) {
        await androidPlugin.requestNotificationsPermission();
        final channel = AndroidNotificationChannel(
          _dispatchChannelId,
          _dispatchChannelName,
          description: _dispatchChannelDesc,
          importance: Importance.max,
          enableVibration: true,
          vibrationPattern: Int64List.fromList([0, 500, 200, 500, 200, 500]),
          playSound: true,
        );
        await androidPlugin.createNotificationChannel(channel);
      }

      _isInitialized = true;
      debugPrint('✅ [LOCAL NOTIFICATIONS] Initialized successfully with high-priority channel');
    } catch (e) {
      debugPrint('⚠️ [LOCAL NOTIFICATIONS] Init warning: $e');
    }
  }

  void _handlePayloadNavigation(String rawPayload) {
    try {
      final navContext = rootNavigatorKey.currentContext;
      if (navContext == null || !navContext.mounted) return;

      Map<String, dynamic>? data;
      try {
        final decoded = jsonDecode(rawPayload);
        if (decoded is Map<String, dynamic>) {
          data = decoded;
        } else if (decoded is Map) {
          data = Map<String, dynamic>.from(decoded);
        }
      } catch (_) {}

      if (data != null) {
        AppRoutes.handleNotificationNavigation(navContext, data);
      } else if (rawPayload.isNotEmpty) {
        if (rawPayload.startsWith('/')) {
          AppRoutes.handleNotificationNavigation(navContext, {'route': rawPayload});
        } else {
          AppRoutes.handleNotificationNavigation(navContext, {
            'id': rawPayload,
            'offerId': rawPayload,
            'tripId': rawPayload,
            'requirementId': rawPayload,
          });
        }
      } else {
        navContext.push(AppRoutes.notificationsFeedScreen);
      }
    } catch (e) {
      debugPrint('⚠️ [LOCAL NOTIFICATION NAV ERROR] $e');
    }
  }

  /// Display a high-priority heads-up banner notification with sound and vibration
  Future<void> showIncomingRideNotification({
    required String title,
    required String body,
    String? payload,
  }) async {
    if (kIsWeb) return;
    try {
      if (!_isInitialized) {
        await initialize();
      }

      final androidDetails = AndroidNotificationDetails(
        _dispatchChannelId,
        _dispatchChannelName,
        channelDescription: _dispatchChannelDesc,
        importance: Importance.max,
        priority: Priority.high,
        enableVibration: true,
        vibrationPattern: Int64List.fromList([0, 500, 200, 500, 200, 500]),
        playSound: true,
        category: AndroidNotificationCategory.call,
        visibility: NotificationVisibility.public,
        fullScreenIntent: true,
        autoCancel: true,
      );

      const darwinDetails = DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
        interruptionLevel: InterruptionLevel.timeSensitive,
      );

      final notificationDetails = NotificationDetails(
        android: androidDetails,
        iOS: darwinDetails,
      );

      final id = DateTime.now().millisecondsSinceEpoch % 100000;
      await _plugin.show(
        id: id,
        title: title,
        body: body,
        notificationDetails: notificationDetails,
        payload: payload,
      );
      debugPrint('🔔 [NOTIFICATION DISPLAYED] $title - $body');
    } catch (e) {
      debugPrint('⚠️ [NOTIFICATION ERROR] Could not show notification: $e');
    }
  }

  /// Cancel all active notifications
  Future<void> cancelAll() async {
    if (kIsWeb) return;
    try {
      await _plugin.cancelAll();
    } catch (_) {}
  }
}
