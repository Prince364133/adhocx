import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:go_router/go_router.dart';
import './local_notification_service.dart';
import './in_app_message_service.dart';
import '../routes/app_routes.dart';
import '../utils/dispatch_sound_player.dart';

/// Top-level background message handler required by FirebaseMessaging
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  debugPrint('📬 [FCM BACKGROUND MESSAGE] ${message.messageId} - ${message.data}');
}

/// Centralized FCM Push Notification Service for Mobile Client
class FcmService {
  static final FcmService _instance = FcmService._internal();
  factory FcmService() => _instance;
  static FcmService get instance => _instance;
  FcmService._internal();

  String? _fcmToken;
  String? get fcmToken => _fcmToken;
  String? _lastApiBaseUrl;
  String? _lastUserToken;

  /// Initialize FCM listeners and register token with backend API
  Future<void> initialize({required String apiBaseUrl, String? userToken}) async {
    _lastApiBaseUrl = apiBaseUrl;
    _lastUserToken = userToken;

    try {
      debugPrint('🔔 [FCM SERVICE] Initializing Push Notification handler...');

      if (!kIsWeb) {
        // 1. Request notification permissions from device
        final messaging = FirebaseMessaging.instance;
        final settings = await messaging.requestPermission(
          alert: true,
          announcement: true,
          badge: true,
          carPlay: false,
          criticalAlert: true,
          provisional: false,
          sound: true,
        );

        debugPrint('🔔 [FCM PERMISSION STATUS] ${settings.authorizationStatus}');

        // 2. Retrieve real Firebase FCM registration token
        try {
          final token = await messaging.getToken();
          if (token != null && token.isNotEmpty) {
            _fcmToken = token;
            final prefs = await SharedPreferences.getInstance();
            await prefs.setString('adhocx_fcm_token', token);
            debugPrint('📱 [REAL FCM TOKEN] Token: ${_fcmToken?.substring(0, 20)}...');
          }
        } catch (tokenErr) {
          debugPrint('⚠️ [FCM GET TOKEN NOTICE] $tokenErr');
        }

        // 3. Listen to token refreshes
        messaging.onTokenRefresh.listen((newToken) {
          debugPrint('🔄 [FCM TOKEN REFRESHED] New token generated');
          _fcmToken = newToken;
          if (_lastApiBaseUrl != null && _lastUserToken != null) {
            registerTokenWithBackend(apiBaseUrl: _lastApiBaseUrl!, authToken: _lastUserToken!);
          }
        });

        // 4. Foreground message listener -> show heads-up local notification + in-app voice/music banner
        FirebaseMessaging.onMessage.listen((RemoteMessage message) {
          debugPrint('📬 [FCM FOREGROUND MESSAGE] ${message.notification?.title}: ${message.notification?.body}');
          final title = message.notification?.title ?? message.data['title'] ?? '🚗 AdhocX Notification';
          final body = message.notification?.body ?? message.data['body'] ?? 'You have a new update';
          final type = message.data['type']?.toString();

          if (type == 'TRIP_OFFER' || type == 'NEW_OFFER') {
            DispatchSoundPlayer.playIncomingOfferAlert();
          } else {
            // Play in-app voice and musical chime alert
            DispatchSoundPlayer.playNotificationChime(title: title, body: body);
          }

          // Show in-app animated message banner inside running application
          InAppMessageService.instance.showInAppNotification(
            title: title,
            body: body,
            data: message.data,
            playSound: false, // already played above
          );

          LocalNotificationService.instance.showIncomingRideNotification(
            title: title,
            body: body,
            payload: jsonEncode(message.data),
          );
        });

        // 5. App opened from notification in system tray
        FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
          debugPrint('📬 [FCM ON MESSAGE OPENED APP] ${message.data}');
          final targetRoute = message.data['route']?.toString();
          final navContext = rootNavigatorKey.currentContext;
          if (navContext != null && navContext.mounted) {
            if (targetRoute != null && targetRoute.isNotEmpty) {
              navContext.push(targetRoute);
            } else {
              navContext.push(AppRoutes.notificationsFeedScreen);
            }
          }
        });

        // 6. Background message handler
        FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
      }

      // Fallback token for simulated / web environments if real token is absent
      if (_fcmToken == null) {
        final prefs = await SharedPreferences.getInstance();
        String? savedToken = prefs.getString('adhocx_fcm_token');
        if (savedToken == null) {
          savedToken = 'fcm_tok_${DateTime.now().millisecondsSinceEpoch}_${(1000 + (DateTime.now().microsecond % 9000))}';
          await prefs.setString('adhocx_fcm_token', savedToken);
        }
        _fcmToken = savedToken;
      }

      if (userToken != null && userToken.isNotEmpty) {
        await registerTokenWithBackend(apiBaseUrl: apiBaseUrl, authToken: userToken);
      }
    } catch (e) {
      debugPrint('⚠️ [FCM INIT NOTICE] $e');
    }
  }

  /// Register FCM registration token with AdhocX Backend
  Future<bool> registerTokenWithBackend({
    required String apiBaseUrl,
    required String authToken,
  }) async {
    if (_fcmToken == null) return false;

    try {
      final platformStr = kIsWeb ? 'WEB' : (defaultTargetPlatform == TargetPlatform.iOS ? 'IOS' : 'ANDROID');
      final uri = Uri.parse('$apiBaseUrl/notifications/device-token');

      final response = await http.post(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
        body: jsonEncode({
          'token': _fcmToken,
          'platform': platformStr,
          'deviceModel': kIsWeb ? 'Web Browser' : defaultTargetPlatform.toString(),
          'appVersion': '1.0.0+4',
        }),
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        debugPrint('✅ [FCM BACKEND SYNC] Device token registered with AdhocX backend successfully.');
        return true;
      } else {
        debugPrint('⚠️ [FCM SYNC NOTICE] Backend returned ${response.statusCode}: ${response.body}');
        return false;
      }
    } catch (e) {
      debugPrint('⚠️ [FCM REGISTER ERROR] $e');
      return false;
    }
  }

  /// Track notification open/click interaction
  Future<void> trackNotificationInteraction({
    required String apiBaseUrl,
    required String authToken,
    required String notificationId,
  }) async {
    try {
      final uri = Uri.parse('$apiBaseUrl/notifications/in-app/$notificationId/interact');
      await http.post(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
        body: jsonEncode({'action': 'CLICK', 'timestamp': DateTime.now().toIso8601String()}),
      );
      debugPrint('📊 [FCM INTERACTION TRACKED] Notification ID: $notificationId');
    } catch (e) {
      debugPrint('⚠️ [FCM INTERACTION ERROR] $e');
    }
  }

  /// Unregister device token on logout
  Future<void> unregisterToken({required String apiBaseUrl, required String authToken}) async {
    if (_fcmToken == null) return;
    try {
      final uri = Uri.parse('$apiBaseUrl/notifications/device-token');
      await http.delete(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
        body: jsonEncode({'token': _fcmToken}),
      );
      debugPrint('📱 [FCM DEACTIVATED] Token unregistered from backend.');
    } catch (e) {
      debugPrint('⚠️ [FCM UNREGISTER NOTICE] $e');
    }
  }
}
