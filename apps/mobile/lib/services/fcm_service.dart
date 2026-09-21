import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;

/// Centralized FCM Push Notification Service for Mobile Client
class FcmService {
  static final FcmService _instance = FcmService._internal();
  factory FcmService() => _instance;
  static FcmService get instance => _instance;
  FcmService._internal();

  String? _fcmToken;
  String? get fcmToken => _fcmToken;

  /// Initialize FCM listeners and register token with backend API
  Future<void> initialize({required String apiBaseUrl, String? userToken}) async {
    try {
      debugPrint('🔔 [FCM SERVICE] Initializing Push Notification handler...');
      
      // In web/desktop/simulated mobile, retrieve or generate local client push token
      final prefs = await SharedPreferences.getInstance();
      String? savedToken = prefs.getString('adhocx_fcm_token');
      
      if (savedToken == null) {
        savedToken = 'fcm_tok_${DateTime.now().millisecondsSinceEpoch}_${(1000 + (DateTime.now().microsecond % 9000))}';
        await prefs.setString('adhocx_fcm_token', savedToken);
      }
      
      _fcmToken = savedToken;
      debugPrint('📱 [FCM TOKEN READY] Token: ${_fcmToken?.substring(0, 15)}...');

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
          'appVersion': '1.0.0+3',
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

