import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_overlay_window/flutter_overlay_window.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../presentation/dispatch_overlay/incoming_requirement_bottom_sheet.dart';
import '../routes/app_routes.dart';
import '../theme/app_colors.dart';
import '../theme/app_radius.dart';
import '../theme/app_spacing.dart';
import '../theme/app_typography.dart';
import '../utils/dispatch_sound_player.dart';
import '../utils/vehicle_utils.dart';
import './auth_service.dart';
import './driver_service.dart';
import './local_notification_service.dart';
import './permission_service.dart';

/// Global Dispatch Overlay Service for AdhocX Driver App.
/// Decoupled singleton that manages:
/// 1. Real-time SSE event stream connection for sub-50ms dispatch alerts.
/// 2. Presenting incoming trip offers anywhere across the app via [rootNavigatorKey].
/// 3. Cross-platform audible and haptic dispatch chime alerts.
/// 4. Android SYSTEM_ALERT_WINDOW ("Display over other apps") permission flow.
/// 5. Assistive Floating Bubble & Bottom Sheet Overlay over other apps.
class GlobalDispatchOverlayService {
  GlobalDispatchOverlayService._();
  static final GlobalDispatchOverlayService instance = GlobalDispatchOverlayService._();

  static const MethodChannel _foregroundChannel = MethodChannel('com.adhocx.app/foreground');

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

  bool _isBubbleActive = false;
  StreamSubscription? _overlayActionSub;
  Map<String, dynamic>? _lastActiveTrip;
  List<Map<String, dynamic>> _lastOffers = [];

  bool get isShowingOffer => _isShowingOffer;
  String? get activeOfferId => _activeOfferId;
  bool get isListening => _isListening;
  bool get isPaymentFlowActive => _isPaymentFlowActive;
  bool get isBubbleActive => _isBubbleActive;

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

  /// Starts the Android Assistive Floating Bubble that draws over other apps.
  /// Remains visible until the driver toggles OFFLINE.
  Future<void> startAssistiveBubble() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return;
    try {
      final isGranted = await FlutterOverlayWindow.isPermissionGranted();
      if (isGranted != true) {
        debugPrint('⚠️ [OverlayService] SYSTEM_ALERT_WINDOW permission not granted yet');
        return;
      }

      final isActive = await FlutterOverlayWindow.isActive();
      if (!isActive) {
        await FlutterOverlayWindow.showOverlay(
          height: 76,
          width: 76,
          enableDrag: true,
          overlayTitle: 'AdhocX Driver Online',
          overlayContent: 'Assistive floating bubble is active',
          flag: OverlayFlag.defaultFlag,
          alignment: OverlayAlignment.bottomRight,
          visibility: NotificationVisibility.visibilityPublic,
          positionGravity: PositionGravity.none,
          startPosition: const OverlayPosition(0, 150),
        );
      }
      _isBubbleActive = true;
      _listenToOverlayActions();

      // Proactively sync latest state to overlay
      if (_lastActiveTrip != null) {
        await syncActiveTripToBubble(_lastActiveTrip);
      }
      if (_lastOffers.isNotEmpty) {
        await syncOffersToBubble(_lastOffers);
      }
      debugPrint('🟢 [OverlayService] Assistive floating bubble activated');
    } catch (e) {
      debugPrint('⚠️ [OverlayService] Failed to start assistive bubble: $e');
    }
  }

  /// Closes and destroys the Android Assistive Floating Bubble (when driver goes OFFLINE).
  Future<void> stopAssistiveBubble() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return;
    try {
      _overlayActionSub?.cancel();
      _overlayActionSub = null;
      _isBubbleActive = false;
      await FlutterOverlayWindow.closeOverlay();
      debugPrint('⚪ [OverlayService] Assistive floating bubble closed');
    } catch (e) {
      debugPrint('⚠️ [OverlayService] Error closing overlay: $e');
    }
  }

  /// Syncs active ongoing trip details to the floating assistive bubble and bottom sheet
  Future<void> syncActiveTripToBubble(Map<String, dynamic>? tripData) async {
    _lastActiveTrip = tripData;
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return;
    try {
      final isOverlayActive = await FlutterOverlayWindow.isActive();
      if (isOverlayActive) {
        final driverName = AuthService.instance.currentUser?.fullName;
        if (tripData != null) {
          await FlutterOverlayWindow.shareData(jsonEncode({
            'type': 'ACTIVE_TRIP_UPDATE',
            'trip': tripData,
            'driverName': driverName,
          }));
        } else {
          await FlutterOverlayWindow.shareData(jsonEncode({
            'type': 'TRIP_COMPLETED',
            'driverName': driverName,
          }));
        }
      }
    } catch (_) {}
  }

  /// Syncs list of available incoming ride opportunities to the overlay bottom sheet
  Future<void> syncOffersToBubble(List<dynamic> offers) async {
    _lastOffers = offers.map((o) => Map<String, dynamic>.from(o as Map)).toList();
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return;
    try {
      final isOverlayActive = await FlutterOverlayWindow.isActive();
      if (isOverlayActive) {
        final driverName = AuthService.instance.currentUser?.fullName;
        await FlutterOverlayWindow.shareData(jsonEncode({
          'type': 'OFFERS_LIST_UPDATE',
          'offers': _lastOffers,
          'driverName': driverName,
        }));
      }
    } catch (_) {}
  }

  Future<void> _bringAppToFront() async {
    try {
      await _foregroundChannel.invokeMethod('bringToFront');
    } catch (e) {
      debugPrint('⚠️ [Foreground Channel] Error bringing app to front: $e');
    }
  }

  void _listenToOverlayActions() {
    _overlayActionSub?.cancel();
    _overlayActionSub = FlutterOverlayWindow.overlayListener.listen((data) async {
      if (data == null) return;
      try {
        final decoded = data is Map ? Map<String, dynamic>.from(data) : jsonDecode(data.toString());
        final action = decoded['action']?.toString();
        final offerId = decoded['offerId']?.toString();

        debugPrint('📲 [OverlayAction Received] Action: $action | OfferId: $offerId');

        if (action == 'REQUEST_STATE_SYNC') {
          // 0. Send driver metadata & theme
          try {
            final currentUser = AuthService.instance.currentUser;
            final driverName = currentUser?.fullName ?? currentUser?.name;
            final prefs = await SharedPreferences.getInstance();
            final storedTheme = prefs.getString('app_theme_mode') ?? 'system';
            await FlutterOverlayWindow.shareData(jsonEncode({
              'type': 'METADATA_UPDATE',
              'driverName': driverName,
              'themeMode': storedTheme,
            }));
          } catch (_) {}

          // 1. Send active trip state
          if (_lastActiveTrip != null) {
            await FlutterOverlayWindow.shareData(jsonEncode({
              'type': 'ACTIVE_TRIP_UPDATE',
              'trip': _lastActiveTrip,
            }));
          } else {
            await FlutterOverlayWindow.shareData(jsonEncode({
              'type': 'TRIP_COMPLETED',
            }));
          }

          // 2. Send available offers
          if (_lastOffers.isNotEmpty) {
            await FlutterOverlayWindow.shareData(jsonEncode({
              'type': 'OFFERS_LIST_UPDATE',
              'offers': _lastOffers,
            }));
          } else {
            // Proactively query backend to populate offers and trips
            try {
              final trips = await DriverService.instance.getTrips();
              final activeTrip = trips.firstWhere(
                (t) =>
                    t['status'] == 'IN_PROGRESS' ||
                    t['status'] == 'ARRIVED' ||
                    t['status'] == 'ASSIGNED' ||
                    t['status'] == 'DRIVER_ASSIGNED',
                orElse: () => null,
              );
              if (activeTrip != null) {
                _lastActiveTrip = Map<String, dynamic>.from(activeTrip as Map);
                await FlutterOverlayWindow.shareData(jsonEncode({
                  'type': 'ACTIVE_TRIP_UPDATE',
                  'trip': _lastActiveTrip,
                }));
              }

              final rawOffers = await DriverService.instance.getOffers();
              _lastOffers = rawOffers.map((o) => Map<String, dynamic>.from(o as Map)).toList();
              await FlutterOverlayWindow.shareData(jsonEncode({
                'type': 'OFFERS_LIST_UPDATE',
                'offers': _lastOffers,
              }));
            } catch (_) {}
          }
        } else if (action == 'ACCEPT_OFFER' && offerId != null) {
          DispatchSoundPlayer.stopAlert();
          dismissCurrentOffer(offerId: offerId);
          final res = await DriverService.instance.acceptOffer(offerId);
          if (res != null) {
            _lastOffers.removeWhere((o) => (o['id'] ?? o['offerId'])?.toString() == offerId);
            syncOffersToBubble(_lastOffers);
            await _bringAppToFront();
            final navContext = rootNavigatorKey.currentContext;
            if (navContext != null && navContext.mounted) {
              final tripId = decoded['offerData']?['tripId'] ?? res['tripId'] ?? offerId;
              navContext.push('/trips/$tripId');
            }
          }
        } else if (action == 'DECLINE_OFFER' && offerId != null) {
          DispatchSoundPlayer.stopAlert();
          dismissCurrentOffer(offerId: offerId);
          _lastOffers.removeWhere((o) => (o['id'] ?? o['offerId'])?.toString() == offerId);
          syncOffersToBubble(_lastOffers);
          await DriverService.instance.declineOffer(offerId);
        } else if (action == 'OFFER_EXPIRED' || action == 'DISMISS_OFFER') {
          DispatchSoundPlayer.stopAlert();
          dismissCurrentOffer(offerId: offerId);
        } else if (action == 'OPEN_TRIP_IN_APP') {
          final tripId = decoded['tripId']?.toString();
          await _bringAppToFront();
          if (tripId != null) {
            final navContext = rootNavigatorKey.currentContext;
            if (navContext != null && navContext.mounted) {
              navContext.push('/trips/$tripId');
            }
          }
        } else if (action == 'BRING_APP_TO_FRONT') {
          await _bringAppToFront();
        }
      } catch (e) {
        debugPrint('⚠️ [OverlayAction Error] $e');
      }
    });
  }

  /// Display an incoming trip offer bottom sheet anywhere in the application.
  Future<bool?> showIncomingOffer(Map<String, dynamic> offerData) async {
    final offerId = (offerData['id'] ?? offerData['offerId']) as String? ?? '';
    if (offerId.isNotEmpty && _isShowingOffer && _activeOfferId == offerId) {
      return null;
    }

    // Vehicle compatibility guard: Ensure Sedan driver does NOT receive Hatchback or SUV offers
    final driverProf = AuthService.instance.currentUser?.driverProfile;
    final driverV = VehicleUtils.extractVehicleType(driverProf);
    final req = offerData['requirement'] as Map<String, dynamic>?;
    final reqV = (req?['vehicleType'] ?? offerData['vehicleType'])?.toString();

    if (!VehicleUtils.isCompatible(driverVehicle: driverV.isEmpty ? 'SEDAN' : driverV, requiredVehicle: reqV)) {
      debugPrint('🚫 [OverlayService] Dropping incoming offer $offerId: vehicle mismatch (driver: $driverV, req: $reqV)');
      return null;
    }

    _isShowingOffer = true;
    _activeOfferId = offerId;

    // 1. Trigger audible chime and repeating attention vibration
    DispatchSoundPlayer.playIncomingOfferAlert();

    // 2. Trigger heads-up notification with sound & vibration
    final pickup = (req?['pickupLocation'] ?? offerData['pickupLocation'] ?? 'Pickup available').toString();
    final rate = (offerData['offeredRate'] ?? req?['ratePerVehicle'] ?? '').toString();
    final bodyText = rate.isNotEmpty ? '₹$rate • Pickup: $pickup' : 'Pickup: $pickup';
    final payloadMap = {
      'type': 'TRIP_OFFER',
      'offerId': offerId,
      'id': offerId,
      'route': '/offers/$offerId',
      ...offerData,
    };
    LocalNotificationService.instance.showIncomingRideNotification(
      title: 'New Ride Requirement Available!',
      body: bodyText,
      payload: jsonEncode(payloadMap),
    );

    // 3. Forward to Android Floating Overlay Window if active
    try {
      if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
        final isOverlayActive = await FlutterOverlayWindow.isActive();
        if (isOverlayActive) {
          await FlutterOverlayWindow.shareData(jsonEncode({
            'type': 'OFFER_RECEIVED',
            ...offerData,
          }));
        }
      }
    } catch (e) {
      debugPrint('⚠️ [OverlayService] ShareData with floating bubble failed: $e');
    }

    // 4. Delivery receipt: the driver actually saw this offer (unseen expiries are not penalized)
    if (offerId.isNotEmpty) {
      unawaited(DriverService.instance.markOfferSeen(offerId));
    }

    final context = rootNavigatorKey.currentContext;
    if (context == null || !context.mounted) {
      debugPrint('ℹ️ [OverlayService] App in background: offer $offerId alerted via floating bubble & heads-up push');
      return null;
    }

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

    try {
      if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
        FlutterOverlayWindow.shareData(jsonEncode({
          'type': 'DISMISS_OFFER',
          'offerId': offerId,
        }));
      }
    } catch (_) {}

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
      case 'TRIP_COMPLETED':
      case 'TRIP_CANCELLED':
        DriverService.instance.notifyTripChanged(
          tripId: payload['tripId']?.toString(),
          status: event.replaceFirst('TRIP_', ''),
        );
        syncActiveTripToBubble(null);
        break;
      case 'TRIP_STARTED':
      case 'TRIP_ARRIVED':
      case 'TRIP_ASSIGNED':
        DriverService.instance.notifyTripChanged(
          tripId: payload['tripId']?.toString(),
          status: event.replaceFirst('TRIP_', ''),
        );
        syncActiveTripToBubble(payload);
        break;
      case 'NEW_NOTIFICATION':
        final type = payload['type'];
        final data = payload['data'] as Map<String, dynamic>?;
        if (type == 'TRIP_STATUS' || type == 'WALLET_UPDATE') {
          DriverService.instance.notifyTripChanged(
            tripId: data?['tripId']?.toString() ?? payload['tripId']?.toString(),
            status: data?['status']?.toString(),
          );
        }
        if (type == 'TRIP_OFFER' && data != null) {
          showIncomingOffer(data);
        } else {
          final title = payload['title']?.toString() ?? 'AdhocX Notification';
          final body = payload['body']?.toString() ?? payload['message']?.toString() ?? 'You have a new update';
          LocalNotificationService.instance.showIncomingRideNotification(
            title: title,
            body: body,
            payload: jsonEncode(payload),
          );
        }
        break;
      case 'OFFER_EXPIRED':
      case 'OFFER_CANCELLED':
        final offId = payload['offerId'] as String?;
        dismissCurrentOffer(offerId: offId);
        break;
      case 'DRIVER_COOLDOWN':
        final minutes = payload['cooldownMinutes']?.toString() ?? '3';
        LocalNotificationService.instance.showIncomingRideNotification(
          title: 'Offers paused for $minutes min',
          body: payload['message']?.toString() ??
              'You skipped several nearby trips in a row. New offers resume automatically.',
          payload: jsonEncode(payload),
        );
        break;
      case 'DRIVER_COOLDOWN_CLEARED':
        LocalNotificationService.instance.showIncomingRideNotification(
          title: 'Offers resumed',
          body: payload['message']?.toString() ?? 'You can receive new trip offers again.',
          payload: jsonEncode(payload),
        );
        break;
    }
  }

  /// Android SYSTEM_ALERT_WINDOW In-App Onboarding Dialog
  /// Guides driver to enable "Display over other apps" so they never miss an alert while using Google Maps/Waze.
  static Future<void> promptAndroidOverlayPermission(BuildContext context, {bool force = false}) async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return;

    // 1. If already granted by the system, never prompt again
    final isGranted = await PermissionService.instance.isOverlayPermissionGranted();
    if (isGranted) return;

    // 2. If user already dismissed or was previously prompted, do not nag repeatedly on every online switch
    if (!force) {
      try {
        final prefs = await SharedPreferences.getInstance();
        final hasPrompted = prefs.getBool('overlay_permission_prompted') ?? false;
        if (hasPrompted) return;
      } catch (_) {}
    }

    if (!context.mounted) return;

    final isDark = Theme.of(context).brightness == Brightness.dark;

    await showModalBottomSheet(
      context: context,
      useRootNavigator: true,
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
                      final prefs = await SharedPreferences.getInstance();
                      await prefs.setBool('overlay_permission_prompted', true);
                      final status = await Permission.systemAlertWindow.request();
                      if (status.isGranted) {
                        await GlobalDispatchOverlayService.instance.startAssistiveBubble();
                      } else {
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
                onPressed: () async {
                  Navigator.of(ctx).pop();
                  try {
                    final prefs = await SharedPreferences.getInstance();
                    await prefs.setBool('overlay_permission_prompted', true);
                  } catch (_) {}
                },
                child: Text('Maybe Later', style: TextStyle(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
              ),
            ],
          ),
        ),
      ),
    );

    // Save flag even if dismissed by tapping outside or swiping down
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('overlay_permission_prompted', true);
    } catch (_) {}
  }
}
