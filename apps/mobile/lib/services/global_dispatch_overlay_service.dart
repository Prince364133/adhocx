import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:permission_handler/permission_handler.dart';
import '../presentation/dispatch_overlay/incoming_requirement_bottom_sheet.dart';
import '../routes/app_routes.dart';
import '../theme/app_colors.dart';
import '../theme/app_radius.dart';
import '../theme/app_spacing.dart';
import '../theme/app_typography.dart';
import '../utils/dispatch_sound_player.dart';
import './local_notification_service.dart';

/// Global Dispatch Overlay Service for AdhocX Driver App.
/// Decoupled singleton that manages:
/// 1. Real-time SSE event stream connection for sub-50ms dispatch alerts.
/// 2. Presenting incoming trip offers anywhere across the app via [rootNavigatorKey].
/// 3. Cross-platform audible and haptic dispatch chime alerts.
/// 4. Android SYSTEM_ALERT_WINDOW ("Display over other apps") permission flow.
class GlobalDispatchOverlayService {
  GlobalDispatchOverlayService._();
  static final GlobalDispatchOverlayService instance = GlobalDispatchOverlayService._();

  bool _isShowingOffer = false;
  String? _activeOfferId;
  http.Client? _sseClient;
  StreamSubscription<String>? _sseSubscription;
  Timer? _reconnectTimer;
  bool _isListening = false;
  String? _lastBaseUrl;
  String? _lastToken;
  String? _lastChannel;
  int _reconnectAttempts = 0;
  static const int _maxReconnectAttempts = 10;
  bool _isPaymentFlowActive = false;

  bool get isShowingOffer => _isShowingOffer;
  String? get activeOfferId => _activeOfferId;
  bool get isListening => _isListening;
  bool get isPaymentFlowActive => _isPaymentFlowActive;

  /// Call this when entering a payment flow (Razorpay, wallet top-up) to
  /// prevent SSE reconnect loops from flooding the network.
  void pauseForPaymentFlow() {
    _isPaymentFlowActive = true;
    debugPrint('⏸️ [SSE] Paused for payment flow');
  }

  /// Resume SSE after payment flow completes or is cancelled.
  void resumeAfterPaymentFlow() {
    _isPaymentFlowActive = false;
    _reconnectAttempts = 0;
    debugPrint('▶️ [SSE] Resumed after payment flow');
    if (_isListening) {
      _connectSseStream();
    }
  }

  /// Starts the persistent Real-Time Server-Sent Events (SSE) listener for driver dispatches.
  void startRealtimeListener({
    required String apiBaseUrl,
    required String authToken,
    String? channel,
  }) {
    _lastBaseUrl = apiBaseUrl;
    _lastToken = authToken;
    _lastChannel = channel;
    _isListening = true;
    _connectSseStream();
  }

  void _connectSseStream() async {
    if (!_isListening || _lastBaseUrl == null || _lastToken == null) return;
    if (_isPaymentFlowActive) return; // Don't reconnect during payment flows
    if (_reconnectAttempts >= _maxReconnectAttempts) {
      debugPrint('⛔ [SSE] Max reconnect attempts ($_maxReconnectAttempts) reached. Stopping.');
      return;
    }

    _reconnectTimer?.cancel();
    _sseSubscription?.cancel();
    _sseClient?.close();

    final targetChannel = _lastChannel ?? 'events';
    final uri = Uri.parse('$_lastBaseUrl/notifications/events?channel=$targetChannel');

    try {
      _sseClient = http.Client();
      final request = http.Request('GET', uri)
        ..headers['Authorization'] = 'Bearer $_lastToken'
        ..headers['Accept'] = 'text/event-stream'
        ..headers['Cache-Control'] = 'no-cache';

      final response = await _sseClient!.send(request);

      if (response.statusCode == 200) {
        debugPrint('🟢 [SSE STREAM CONNECTED] Listening on channel: $targetChannel');
        _reconnectAttempts = 0; // Reset on successful connection
        String buffer = '';

        _sseSubscription = response.stream
            .transform(utf8.decoder)
            .listen(
              (chunk) {
                buffer += chunk;
                while (buffer.contains('\n\n')) {
                  final index = buffer.indexOf('\n\n');
                  final message = buffer.substring(0, index);
                  buffer = buffer.substring(index + 2);
                  _processSseMessage(message);
                }
              },
              onError: (err) {
                debugPrint('⚠️ [SSE STREAM NOTICE] Connection dropped: $err. Reconnecting...');
                _scheduleSseReconnect();
              },
              onDone: () {
                debugPrint('ℹ️ [SSE STREAM CLOSED] Stream ended. Reconnecting in 3s...');
                _scheduleSseReconnect();
              },
              cancelOnError: true,
            );
      } else {
        debugPrint('⚠️ [SSE HTTP ERROR] Status ${response.statusCode}. Reconnecting in 5s...');
        _scheduleSseReconnect(delaySeconds: 5);
      }
    } catch (e) {
      debugPrint('⚠️ [SSE CONNECT EXCEPTION] $e. Retrying in 4s...');
      _scheduleSseReconnect(delaySeconds: 4);
    }
  }

  void _processSseMessage(String rawMessage) {
    String currentEvent = 'message';
    String dataContent = '';

    final lines = rawMessage.split('\n');
    for (final line in lines) {
      if (line.startsWith('event:')) {
        currentEvent = line.substring(6).trim();
      } else if (line.startsWith('data:')) {
        final d = line.substring(5).trim();
        dataContent += (dataContent.isEmpty ? '' : '\n') + d;
      }
    }

    if (dataContent.isNotEmpty) {
      try {
        final decoded = jsonDecode(dataContent);
        if (decoded is Map<String, dynamic>) {
          handleRealtimeDispatchEvent(currentEvent, decoded);
        }
      } catch (e) {
        debugPrint('⚠️ [SSE JSON PARSE ERROR] $e on raw data: $dataContent');
      }
    }
  }

  void _scheduleSseReconnect({int delaySeconds = 3}) {
    if (!_isListening || _isPaymentFlowActive) return;
    _reconnectAttempts++;
    if (_reconnectAttempts >= _maxReconnectAttempts) {
      debugPrint('⛔ [SSE] Max reconnect attempts reached. Call resumeAfterPaymentFlow() or stopRealtimeListener() to reset.');
      return;
    }
    // Exponential backoff: 3s, 4s, 5s, 8s, 13s... capped at 30s
    final backoffDelay = (delaySeconds + _reconnectAttempts).clamp(3, 30);
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(Duration(seconds: backoffDelay), () {
      if (_isListening && !_isPaymentFlowActive) {
        _connectSseStream();
      }
    });
  }

  /// Stop listening to real-time events (e.g. when driver toggles OFFLINE)
  void stopRealtimeListener() {
    _isListening = false;
    _isPaymentFlowActive = false;
    _reconnectAttempts = 0;
    _reconnectTimer?.cancel();
    _sseSubscription?.cancel();
    _sseClient?.close();
    _sseClient = null;
    debugPrint('⚪ [SSE STREAM STOPPED] Disconnected driver event stream');
  }

  /// Display an incoming trip offer bottom sheet anywhere in the application.
  Future<bool?> showIncomingOffer(Map<String, dynamic> offerData) async {
    final offerId = (offerData['id'] ?? offerData['offerId']) as String? ?? '';
    if (offerId.isNotEmpty && _isShowingOffer && _activeOfferId == offerId) {
      return null;
    }

    final context = rootNavigatorKey.currentContext;
    if (context == null || !context.mounted) {
      debugPrint('⚠️ [OverlayService] Root navigator context unavailable to display offer $offerId');
      return null;
    }

    _isShowingOffer = true;
    _activeOfferId = offerId;

    // Trigger audible chime and haptic burst
    DispatchSoundPlayer.playIncomingOfferAlert();

    // Trigger heads-up notification with sound & vibration
    final req = offerData['requirement'] as Map<String, dynamic>?;
    final pickup = (req?['pickupLocation'] ?? offerData['pickupLocation'] ?? 'Pickup available').toString();
    final rate = (offerData['offeredRate'] ?? req?['ratePerVehicle'] ?? '').toString();
    final bodyText = rate.isNotEmpty ? '₹$rate • Pickup: $pickup' : 'Pickup: $pickup';
    LocalNotificationService.instance.showIncomingRideNotification(
      title: '🚗 New Ride Requirement Available!',
      body: bodyText,
      payload: offerId,
    );

    try {
      final result = await IncomingRequirementBottomSheet.show<bool>(
        context: context,
        offerData: offerData,
        onDismissed: () {
          _isShowingOffer = false;
          _activeOfferId = null;
          DispatchSoundPlayer.stopAlert();
          LocalNotificationService.instance.cancelAll();
        },
      );
      return result;
    } catch (e) {
      debugPrint('⚠️ [OverlayService] Failed to display bottom sheet: $e');
      _isShowingOffer = false;
      _activeOfferId = null;
      DispatchSoundPlayer.stopAlert();
      return null;
    }
  }

  /// Programmatically dismiss the active dispatch offer (e.g. on wave timeout or remote cancellation)
  void dismissCurrentOffer({String? offerId}) {
    if (!_isShowingOffer) return;
    if (offerId != null && _activeOfferId != null && _activeOfferId != offerId) {
      return;
    }

    final navState = rootNavigatorKey.currentState;
    if (navState != null && navState.canPop()) {
      navState.pop();
    }
    _isShowingOffer = false;
    _activeOfferId = null;
    DispatchSoundPlayer.stopAlert();
    LocalNotificationService.instance.cancelAll();
  }

  /// Dispatches real-time SSE / WebSocket event to overlay service
  void handleRealtimeDispatchEvent(String event, Map<String, dynamic> payload) {
    debugPrint('🔔 [REALTIME DISPATCH EVENT] Event: "$event" | Payload ID: ${payload['id'] ?? payload['offerId']}');
    switch (event) {
      case 'OFFER_RECEIVED':
        showIncomingOffer(payload);
        break;
      case 'NEW_NOTIFICATION':
        final type = payload['type'];
        final data = payload['data'] as Map<String, dynamic>?;
        if (type == 'TRIP_OFFER' && data != null) {
          showIncomingOffer(data);
        }
        break;
      case 'OFFER_EXPIRED':
      case 'OFFER_CANCELLED':
        final offId = payload['offerId'] as String?;
        dismissCurrentOffer(offerId: offId);
        break;
    }
  }

  /// Android SYSTEM_ALERT_WINDOW In-App Onboarding Dialog
  /// Guides driver to enable "Display over other apps" so they never miss an alert while using Google Maps/Waze.
  static Future<void> promptAndroidOverlayPermission(BuildContext context) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return;

    final isDark = Theme.of(context).brightness == Brightness.dark;

    await showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.layers_outlined, size: 32, color: AppColors.primary),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                'Enable Floating Trip Alerts',
                style: AppTypography.h2(
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                'Allow AdhocX to "Display over other apps" so you can receive and accept high-paying trips in 1-tap while navigating in Google Maps or Waze.',
                textAlign: TextAlign.center,
                style: AppTypography.caption(
                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: () async {
                    Navigator.of(ctx).pop();
                    try {
                      final status = await Permission.systemAlertWindow.request();
                      if (!status.isGranted) {
                        await openAppSettings();
                      }
                    } catch (_) {
                      try {
                        await openAppSettings();
                      } catch (_) {}
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                  ),
                  child: const Text('OPEN SETTINGS & ENABLE', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(),
                child: Text('Maybe Later', style: TextStyle(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
