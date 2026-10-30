import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart' show Color;
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:go_router/go_router.dart';
import '../routes/app_routes.dart';
import './app_update_service.dart';

/// Local Notification Service for showing high-priority heads-up alerts
/// on Android and iOS when ride dispatches and offers arrive, as well as
/// calm notifications for app updates.
class LocalNotificationService {
  LocalNotificationService._();
  static final LocalNotificationService instance = LocalNotificationService._();

  final FlutterLocalNotificationsPlugin _plugin = FlutterLocalNotificationsPlugin();
  bool _isInitialized = false;

  static const String _operationalChannelId = 'adhocx_operational_alerts';
  static const String _operationalChannelName = 'AdhocX Operational Alerts';
  static const String _operationalChannelDesc = 'Announcements, broadcasts, and operational alerts';

  static const String _urgentDispatchChannelId = 'adhocx_trip_dispatch_urgent';
  static const String _urgentDispatchChannelName = 'AdhocX Urgent Trip Dispatch';
  static const String _urgentDispatchChannelDesc = 'Urgent ride requests and priority dispatch alerts';

  static const String _dispatchChannelId = 'dispatch_alerts';
  static const String _dispatchChannelName = 'Trip & Dispatch Alerts';
  static const String _dispatchChannelDesc = 'Urgent ride requests and dispatch notifications';

  static const String _updatesChannelId = 'app_updates';
  static const String _updatesChannelName = 'App Updates';
  static const String _updatesChannelDesc = 'Notifications about new app versions and performance updates';

  Future<void> initialize() async {
    if (_isInitialized) return;
    if (kIsWeb) {
      _isInitialized = true;
      return;
    }

    try {
      const androidSettings = AndroidInitializationSettings('notification_icon');
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

      // Check if the app was launched by tapping a local notification
      try {
        final launchDetails = await _plugin.getNotificationAppLaunchDetails();
        if (launchDetails?.didNotificationLaunchApp == true && launchDetails?.notificationResponse?.payload != null) {
          final rawPayload = launchDetails!.notificationResponse!.payload!;
          debugPrint('🔔 [NOTIFICATION APP LAUNCH] Payload: $rawPayload');
          try {
            final decoded = jsonDecode(rawPayload);
            if (decoded is Map<String, dynamic>) {
              AppRoutes.pendingNotificationData = decoded;
            } else if (decoded is Map) {
              AppRoutes.pendingNotificationData = Map<String, dynamic>.from(decoded);
            }
          } catch (_) {
            AppRoutes.pendingNotificationData = {'actionUrl': rawPayload, 'route': rawPayload};
          }
        }
      } catch (e) {
        debugPrint('⚠️ [LOCAL NOTIFICATION LAUNCH CHECK ERROR] $e');
      }

      // Create Android Notification Channels
      final androidPlugin = _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
      if (androidPlugin != null) {
        await androidPlugin.requestNotificationsPermission();

        // 1. Operational & Broadcast Alerts Channel (High Importance, standard sound & vibrate)
        final operationalChannel = AndroidNotificationChannel(
          _operationalChannelId,
          _operationalChannelName,
          description: _operationalChannelDesc,
          importance: Importance.high,
          enableVibration: true,
          playSound: true,
        );
        await androidPlugin.createNotificationChannel(operationalChannel);

        // 2. Urgent Trip Dispatch Channel (Max Importance, Alarm sound, repeating vibration)
        final urgentDispatchChannel = AndroidNotificationChannel(
          _urgentDispatchChannelId,
          _urgentDispatchChannelName,
          description: _urgentDispatchChannelDesc,
          importance: Importance.max,
          enableVibration: true,
          vibrationPattern: Int64List.fromList([0, 800, 400, 800, 400]),
          playSound: true,
          sound: const RawResourceAndroidNotificationSound('dispatch_alert'),
          audioAttributesUsage: AudioAttributesUsage.alarm,
        );
        await androidPlugin.createNotificationChannel(urgentDispatchChannel);

        // 3. Dispatch & Trip Alert Channel (Legacy compatibility)
        final dispatchChannel = AndroidNotificationChannel(
          _dispatchChannelId,
          _dispatchChannelName,
          description: _dispatchChannelDesc,
          importance: Importance.max,
          enableVibration: true,
          vibrationPattern: Int64List.fromList([0, 800, 400, 800, 400]),
          playSound: true,
          sound: const RawResourceAndroidNotificationSound('dispatch_alert'),
          audioAttributesUsage: AudioAttributesUsage.alarm,
        );
        await androidPlugin.createNotificationChannel(dispatchChannel);

        // 4. App Updates Channel (Default Importance, standard notification)
        final updatesChannel = AndroidNotificationChannel(
          _updatesChannelId,
          _updatesChannelName,
          description: _updatesChannelDesc,
          importance: Importance.defaultImportance,
          enableVibration: false,
          playSound: true,
        );
        await androidPlugin.createNotificationChannel(updatesChannel);
      }

      _isInitialized = true;
      debugPrint('✅ [LOCAL NOTIFICATIONS] Initialized successfully with all operational, dispatch & update channels');
    } catch (e) {
      debugPrint('⚠️ [LOCAL NOTIFICATIONS] Init warning: $e');
    }
  }

  void _handlePayloadNavigation(String rawPayload) {
    try {
      Map<String, dynamic>? data;
      try {
        final decoded = jsonDecode(rawPayload);
        if (decoded is Map<String, dynamic>) {
          data = decoded;
        } else if (decoded is Map) {
          data = Map<String, dynamic>.from(decoded);
        }
      } catch (_) {}

      // If notification is for an App Update, directly launch Play Store
      if (data != null && (data['action'] == 'app_update' || data['type'] == 'app_update')) {
        AppUpdateService.instance.openPlayStoreUpdate();
        return;
      }

      final navContext = rootNavigatorKey.currentContext;
      if (navContext == null || !navContext.mounted) {
        // App is not ready yet, save as pending
        if (data != null) {
          AppRoutes.pendingNotificationData = data;
        } else if (rawPayload.isNotEmpty) {
          AppRoutes.pendingNotificationData = {'actionUrl': rawPayload, 'route': rawPayload};
        }
        return;
      }

      if (data != null) {
        AppRoutes.handleNotificationNavigation(navContext, data);
      } else if (rawPayload.isNotEmpty) {
        if (rawPayload.startsWith('/')) {
          AppRoutes.handleNotificationNavigation(navContext, {'route': rawPayload, 'actionUrl': rawPayload});
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
        _urgentDispatchChannelId,
        _urgentDispatchChannelName,
        channelDescription: _urgentDispatchChannelDesc,
        icon: 'notification_icon',
        largeIcon: const DrawableResourceAndroidBitmap('@mipmap/ic_launcher'),
        color: const Color(0xFF5B42F3),
        importance: Importance.max,
        priority: Priority.high,
        enableVibration: true,
        vibrationPattern: Int64List.fromList([0, 800, 400, 800, 400]),
        playSound: true,
        sound: const RawResourceAndroidNotificationSound('dispatch_alert'),
        audioAttributesUsage: AudioAttributesUsage.alarm,
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

  /// Display a calm, standard notification informing the user that an app update is available
  Future<void> showAppUpdateNotification({
    required String title,
    required String body,
    String? payload,
  }) async {
    if (kIsWeb) return;
    try {
      if (!_isInitialized) {
        await initialize();
      }

      const androidDetails = AndroidNotificationDetails(
        _updatesChannelId,
        _updatesChannelName,
        channelDescription: _updatesChannelDesc,
        icon: 'notification_icon',
        largeIcon: DrawableResourceAndroidBitmap('@mipmap/ic_launcher'),
        color: Color(0xFF5B42F3),
        importance: Importance.defaultImportance,
        priority: Priority.defaultPriority,
        playSound: true,
        autoCancel: true,
      );

      const darwinDetails = DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      );

      const notificationDetails = NotificationDetails(
        android: androidDetails,
        iOS: darwinDetails,
      );

      // Fixed ID so repeated checks update the single notification rather than spamming
      const updateNotificationId = 9999;
      await _plugin.show(
        id: updateNotificationId,
        title: title,
        body: body,
        notificationDetails: notificationDetails,
        payload: payload ?? '{"action":"app_update"}',
      );
      debugPrint('🔔 [APP UPDATE NOTIFICATION DISPLAYED] $title - $body');
    } catch (e) {
      debugPrint('⚠️ [APP UPDATE NOTIFICATION ERROR] Could not show update notification: $e');
    }
  }

  /// Cancel app update notification (ID 9999) when app is confirmed up to date
  Future<void> cancelAppUpdateNotification() async {
    if (kIsWeb) return;
    try {
      await _plugin.cancel(id: 9999);
      debugPrint('🧹 [LOCAL NOTIFICATION] Stale app update notification cleared');
    } catch (_) {}
  }

  /// Cancel all active notifications
  Future<void> cancelAll() async {
    if (kIsWeb) return;
    try {
      await _plugin.cancelAll();
    } catch (_) {}
  }
}
