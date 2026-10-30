import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_overlay_window/flutter_overlay_window.dart';
import 'package:vibration/vibration.dart';
import './local_notification_service.dart';
import '../routes/app_routes.dart';
import '../utils/dispatch_sound_player.dart';

/// Top-level background message handler required by FirebaseMessaging
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  debugPrint('📬 [FCM BACKGROUND MESSAGE] ${message.messageId} - ${message.data}');
  final type = message.data['type']?.toString();
  if (type == 'TRIP_OFFER' || type == 'NEW_OFFER' || message.data.containsKey('offerId')) {
    // 1. Continuous repeating hardware vibration pattern
    try {
      final hasVib = await Vibration.hasVibrator();
      if (hasVib == true) {
        await Vibration.vibrate(
          pattern: [0, 800, 400, 800, 400],
          repeat: 0,
        );
      }
    } catch (_) {}

    // 2. Forward to Floating Assistive Bubble if active on Android
    try {
      final isActive = await FlutterOverlayWindow.isActive();
      if (isActive) {
        await FlutterOverlayWindow.shareData(jsonEncode({
          'type': 'OFFER_RECEIVED',
          ...message.data,
        }));
      }
    } catch (_) {}

    // 3. Heads-up full-screen call-style notification
    final title = message.notification?.title ?? message.data['title'] ?? '🚖 New Trip Requirement Available!';
    final body = message.notification?.body ?? message.data['body'] ?? 'Tap to view and accept guaranteed payout trip.';
    await LocalNotificationService.instance.showIncomingRideNotification(
      title: title,
      body: body,
      payload: jsonEncode(message.data),
    );
  }
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

  /// Retrieve real Firebase FCM token with retry if needed
  Future<String?> _retrieveRealToken(FirebaseMessaging messaging) async {
    for (int attempt = 1; attempt <= 3; attempt++) {
      try {
        final token = await messaging.getToken();
        if (token != null && token.isNotEmpty) {
          _fcmToken = token;
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('adhocx_fcm_token', token);
          debugPrint('📱 [REAL FCM TOKEN] Token: ${_fcmToken?.substring(0, 20)}... (attempt $attempt)');
          return token;
        }
      } catch (tokenErr) {
        debugPrint('⚠️ [FCM GET TOKEN ATTEMPT $attempt NOTICE] $tokenErr');
        if (attempt < 3) {
          await Future.delayed(Duration(seconds: attempt * 2));
        }
      }
    }
    return null;
  }

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
        await _retrieveRealToken(messaging);

        // 3. Listen to token refreshes
        messaging.onTokenRefresh.listen((newToken) {
          debugPrint('🔄 [FCM TOKEN REFRESHED] New token generated');
          _fcmToken = newToken;
          SharedPreferences.getInstance().then((prefs) {
            prefs.setString('adhocx_fcm_token', newToken);
          });
          if (_lastApiBaseUrl != null && _lastUserToken != null) {
            registerTokenWithBackend(apiBaseUrl: _lastApiBaseUrl!, authToken: _lastUserToken!);
          }
        });

        // 4. Foreground message listener -> show heads-up local notification + in-app voice/music banner
        FirebaseMessaging.onMessage.listen((RemoteMessage message) {
          debugPrint('📬 [FCM FOREGROUND MESSAGE] ${message.notification?.title}: ${message.notification?.body}');
          final title = message.notification?.title ?? message.data['title'] ?? 'AdhocX Notification';
          final body = message.notification?.body ?? message.data['body'] ?? 'You have a new update';
          final type = message.data['type']?.toString();

          if (type == 'TRIP_OFFER' || type == 'NEW_OFFER') {
            DispatchSoundPlayer.playIncomingOfferAlert();
          } else {
            // Play in-app voice and musical chime alert
            DispatchSoundPlayer.playNotificationChime(title: title, body: body);
          }

          LocalNotificationService.instance.showIncomingRideNotification(
            title: title,
            body: body,
            payload: jsonEncode(message.data),
          );
        });

        // 5. App opened from notification in system tray (while backgrounded)
        FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
          debugPrint('📬 [FCM ON MESSAGE OPENED APP] ${message.data}');
          final navContext = rootNavigatorKey.currentContext;
          if (navContext != null && navContext.mounted) {
            AppRoutes.handleNotificationNavigation(navContext, message.data);
          } else {
            AppRoutes.pendingNotificationData = message.data;
          }
        });

        // 6. App launched from terminated state via notification click
        final initialMessage = await messaging.getInitialMessage();
        if (initialMessage != null) {
          debugPrint('📬 [FCM INITIAL MESSAGE] ${initialMessage.data}');
          AppRoutes.pendingNotificationData = initialMessage.data;
          WidgetsBinding.instance.addPostFrameCallback((_) {
            final navContext = rootNavigatorKey.currentContext;
            if (navContext != null && navContext.mounted) {
              AppRoutes.handleNotificationNavigation(navContext, initialMessage.data);
            }
          });
        }

        // 7. Background message handler
        FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
      }

      // Check saved token or generate fallback token for web / simulated environments only
      if (_fcmToken == null) {
        final prefs = await SharedPreferences.getInstance();
        String? savedToken = prefs.getString('adhocx_fcm_token');
        if (savedToken != null && !savedToken.startsWith('fcm_tok_')) {
          _fcmToken = savedToken;
        } else if (kIsWeb) {
          savedToken ??= 'fcm_tok_${DateTime.now().millisecondsSinceEpoch}_${(1000 + (DateTime.now().microsecond % 9000))}';
          await prefs.setString('adhocx_fcm_token', savedToken);
          _fcmToken = savedToken;
        }
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
    _lastApiBaseUrl = apiBaseUrl;
    _lastUserToken = authToken;

    // On real devices, if token is missing or still simulated, try to fetch the real FCM token now
    if (!kIsWeb && (_fcmToken == null || _fcmToken!.startsWith('fcm_tok_'))) {
      try {
        final realToken = await FirebaseMessaging.instance.getToken();
        if (realToken != null && realToken.isNotEmpty) {
          _fcmToken = realToken;
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('adhocx_fcm_token', realToken);
          debugPrint('📱 [FCM REFRESH BEFORE REGISTRATION] Acquired real token: ${_fcmToken?.substring(0, 20)}...');
        }
      } catch (e) {
        debugPrint('⚠️ [FCM PRE-REGISTER TOKEN FETCH NOTICE] $e');
      }
    }

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
