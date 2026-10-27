import 'dart:async';
import 'dart:convert';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_overlay_window/flutter_overlay_window.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:vibration/vibration.dart';

/// Top-level Entry Point for the Floating Assistive Bubble Overlay Window.
/// Runs in a dedicated Flutter isolate rendered directly on the Android WindowManager.
@pragma("vm:entry-point")
void overlayMain() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    const MaterialApp(
      debugShowCheckedModeBanner: false,
      home: DriverAssistiveBubbleOverlay(),
    ),
  );
}

/// Floating Assistive Ball / Bubble Overlay for AdhocX Drivers.
/// - Idle / Online: Draggable compact circular bubble with glowing green online ring.
/// - Active Ride: Floating HUD displaying current ride details, passenger name, OTP,
///   and direct 1-tap Google Maps Navigation shortcut.
/// - Incoming Offer: Expands to full-featured 30-second countdown dispatch card with
///   continuous vibration, looping audio siren, pickup/drop addresses, guaranteed net payout,
///   and 1-tap Accept/Decline.
class DriverAssistiveBubbleOverlay extends StatefulWidget {
  const DriverAssistiveBubbleOverlay({super.key});

  @override
  State<DriverAssistiveBubbleOverlay> createState() => _DriverAssistiveBubbleOverlayState();
}

class _DriverAssistiveBubbleOverlayState extends State<DriverAssistiveBubbleOverlay>
    with SingleTickerProviderStateMixin {
  static const MethodChannel _foregroundChannel = MethodChannel('com.adhocx.app/foreground');

  bool _isOfferActive = false;
  Map<String, dynamic>? _offerData;
  Timer? _countdownTimer;
  int _secondsRemaining = 30;
  static const int _totalSeconds = 30;

  // Active Ongoing Ride State
  Map<String, dynamic>? _activeTripData;
  bool _isTripHudExpanded = false;

  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;
  StreamSubscription? _overlaySub;
  AudioPlayer? _overlayAudioPlayer;

  static const int bubbleWidth = 72;
  static const int bubbleHeight = 72;
  static const int tripHudWidth = 300;
  static const int tripHudHeight = 220;
  static const int cardWidth = 360;
  static const int cardHeight = 440;

  @override
  void initState() {
    super.initState();

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.88, end: 1.15).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    // Listen to real-time events and state updates from the Main AdhocX App
    _overlaySub = FlutterOverlayWindow.overlayListener.listen(_handleMainAppMessage);
  }

  void _handleMainAppMessage(dynamic data) {
    if (data == null) return;
    try {
      Map<String, dynamic> msg;
      if (data is Map<String, dynamic>) {
        msg = data;
      } else if (data is Map) {
        msg = Map<String, dynamic>.from(data);
      } else {
        msg = jsonDecode(data.toString()) as Map<String, dynamic>;
      }

      final type = msg['type']?.toString();
      if (type == 'OFFER_RECEIVED' || type == 'TRIP_OFFER' || msg.containsKey('offerId')) {
        _triggerIncomingOffer(msg);
      } else if (type == 'DISMISS_OFFER' || type == 'OFFER_CANCELLED' || type == 'OFFER_EXPIRED') {
        _dismissOfferLocally();
      } else if (type == 'ACTIVE_TRIP_UPDATE') {
        _handleActiveTripUpdate(msg['trip']);
      } else if (type == 'TRIP_COMPLETED' || type == 'TRIP_CANCELLED') {
        _clearActiveTrip();
      }
    } catch (e) {
      debugPrint('⚠️ [Overlay] Error parsing incoming message: $e');
    }
  }

  void _handleActiveTripUpdate(dynamic tripData) {
    if (tripData == null) {
      _clearActiveTrip();
      return;
    }
    setState(() {
      if (tripData is Map<String, dynamic>) {
        _activeTripData = tripData;
      } else if (tripData is Map) {
        _activeTripData = Map<String, dynamic>.from(tripData);
      }
    });
  }

  void _clearActiveTrip() {
    setState(() {
      _activeTripData = null;
      _isTripHudExpanded = false;
    });
    FlutterOverlayWindow.resizeOverlay(bubbleWidth, bubbleHeight, true);
  }

  Future<void> _triggerIncomingOffer(Map<String, dynamic> offerData) async {
    _countdownTimer?.cancel();

    final req = offerData['requirement'] as Map<String, dynamic>?;
    final expSec = int.tryParse(offerData['expiresInSeconds']?.toString() ?? '') ??
        int.tryParse(req?['expiresInSeconds']?.toString() ?? '') ??
        30;

    setState(() {
      _offerData = offerData;
      _isOfferActive = true;
      _secondsRemaining = expSec.clamp(5, 60);
    });

    // 1. Expand overlay window to 30s countdown dispatch card
    try {
      await FlutterOverlayWindow.resizeOverlay(cardWidth, cardHeight, false);
    } catch (_) {}

    // 2. Start repeating hardware vibration pattern
    try {
      final hasVib = await Vibration.hasVibrator();
      if (hasVib == true) {
        await Vibration.vibrate(
          pattern: [0, 800, 400, 800, 400],
          repeat: 0,
        );
      }
    } catch (_) {}

    // 3. Start looping audio siren
    try {
      _overlayAudioPlayer ??= AudioPlayer();
      await _overlayAudioPlayer?.stop();
      await _overlayAudioPlayer?.setReleaseMode(ReleaseMode.loop);
      await _overlayAudioPlayer?.setVolume(1.0);
      await _overlayAudioPlayer?.play(AssetSource('sounds/dispatch_alert.wav'));
    } catch (e) {
      debugPrint('⚠️ [Overlay] Audio playback notice: $e');
    }

    // 4. Start 1-second interval countdown timer
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_secondsRemaining <= 1) {
        timer.cancel();
        _onOfferTimeout();
      } else {
        setState(() {
          _secondsRemaining--;
        });
      }
    });
  }

  Future<void> _dismissOfferLocally() async {
    _countdownTimer?.cancel();
    try {
      await Vibration.cancel();
    } catch (_) {}
    try {
      await _overlayAudioPlayer?.stop();
    } catch (_) {}

    setState(() {
      _isOfferActive = false;
      _offerData = null;
      _secondsRemaining = 30;
    });

    // Shrink back to compact draggable bubble
    try {
      await FlutterOverlayWindow.resizeOverlay(bubbleWidth, bubbleHeight, true);
    } catch (_) {}
  }

  Future<void> _onOfferTimeout() async {
    final offerId = _offerData?['id'] ?? _offerData?['offerId'];
    if (offerId != null) {
      FlutterOverlayWindow.shareData(jsonEncode({
        'action': 'OFFER_EXPIRED',
        'offerId': offerId.toString(),
      }));
    }
    await _dismissOfferLocally();
  }

  Future<void> _acceptOffer() async {
    final offerId = _offerData?['id'] ?? _offerData?['offerId'];
    FlutterOverlayWindow.shareData(jsonEncode({
      'action': 'ACCEPT_OFFER',
      'offerId': offerId?.toString(),
      'offerData': _offerData,
    }));
    await _dismissOfferLocally();
    await _bringAppToFront();
  }

  Future<void> _declineOffer() async {
    final offerId = _offerData?['id'] ?? _offerData?['offerId'];
    FlutterOverlayWindow.shareData(jsonEncode({
      'action': 'DECLINE_OFFER',
      'offerId': offerId?.toString(),
      'offerData': _offerData,
    }));
    await _dismissOfferLocally();
  }

  Future<void> _bringAppToFront() async {
    try {
      await _foregroundChannel.invokeMethod('bringToFront');
    } catch (e) {
      debugPrint('⚠️ [Foreground Channel] Error bringing app to front: $e');
    }
  }

  void _toggleTripHud() {
    setState(() {
      _isTripHudExpanded = !_isTripHudExpanded;
    });
    if (_isTripHudExpanded) {
      FlutterOverlayWindow.resizeOverlay(tripHudWidth, tripHudHeight, false);
    } else {
      FlutterOverlayWindow.resizeOverlay(bubbleWidth, bubbleHeight, true);
    }
  }

  void _onBubbleTap() {
    if (_activeTripData != null) {
      _toggleTripHud();
    } else {
      _bringAppToFront();
    }
  }

  Future<void> _launchGoogleMapsNavigation() async {
    final trip = _activeTripData;
    if (trip == null) return;

    final status = trip['status']?.toString().toUpperCase();
    final isEnRouteToDrop = status == 'STARTED' || status == 'IN_PROGRESS';

    double? targetLat;
    double? targetLng;

    if (isEnRouteToDrop) {
      targetLat = (trip['dropLocation']?['latitude'] as num?)?.toDouble() ??
          (trip['dropLat'] as num?)?.toDouble();
      targetLng = (trip['dropLocation']?['longitude'] as num?)?.toDouble() ??
          (trip['dropLng'] as num?)?.toDouble();
    } else {
      targetLat = (trip['pickupLocation']?['latitude'] as num?)?.toDouble() ??
          (trip['pickupLat'] as num?)?.toDouble();
      targetLng = (trip['pickupLocation']?['longitude'] as num?)?.toDouble() ??
          (trip['pickupLng'] as num?)?.toDouble();
    }

    if (targetLat != null && targetLng != null) {
      final googleMapsNavUri = Uri.parse('google.navigation:q=$targetLat,$targetLng&mode=d');
      final webFallbackUri = Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$targetLat,$targetLng');

      if (await canLaunchUrl(googleMapsNavUri)) {
        await launchUrl(googleMapsNavUri, mode: LaunchMode.externalApplication);
      } else {
        await launchUrl(webFallbackUri, mode: LaunchMode.externalApplication);
      }
    }
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _overlaySub?.cancel();
    _pulseController.dispose();
    try {
      Vibration.cancel();
    } catch (_) {}
    try {
      _overlayAudioPlayer?.stop();
      _overlayAudioPlayer?.dispose();
    } catch (_) {}
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: _isOfferActive
          ? _buildDispatchCard()
          : (_isTripHudExpanded ? _buildActiveTripHud() : _buildAssistiveBubble()),
    );
  }

  /// 1. Compact Assistive Floating Bubble
  Widget _buildAssistiveBubble() {
    final hasActiveTrip = _activeTripData != null;
    final ringColor = hasActiveTrip ? const Color(0xFF38BDF8) : const Color(0xFF10B981);

    return Center(
      child: GestureDetector(
        onTap: _onBubbleTap,
        child: AnimatedBuilder(
          animation: _pulseAnimation,
          builder: (context, child) {
            return Container(
              width: 66,
              height: 66,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: hasActiveTrip
                      ? [const Color(0xFF0284C7), const Color(0xFF0369A1)]
                      : [const Color(0xFF5B42F3), const Color(0xFF4328EB)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                boxShadow: [
                  BoxShadow(
                    color: ringColor.withValues(alpha: 0.35 * _pulseAnimation.value),
                    blurRadius: 14 * _pulseAnimation.value,
                    spreadRadius: 3 * _pulseAnimation.value,
                  ),
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.35),
                    blurRadius: 8,
                    offset: const Offset(0, 3),
                  ),
                ],
                border: Border.all(
                  color: ringColor,
                  width: 2.5,
                ),
              ),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Icon(
                    hasActiveTrip ? Icons.navigation_rounded : Icons.local_taxi_rounded,
                    color: Colors.white,
                    size: 28,
                  ),
                  Positioned(
                    top: 6,
                    right: 8,
                    child: Container(
                      width: 9,
                      height: 9,
                      decoration: BoxDecoration(
                        color: ringColor,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: ringColor,
                            blurRadius: 4,
                            spreadRadius: 1,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  /// 2. Active Trip HUD Card (Shown during an ongoing ride while using Google Maps/Home Screen)
  Widget _buildActiveTripHud() {
    final trip = _activeTripData;
    final status = trip?['status']?.toString().toUpperCase() ?? 'ASSIGNED';
    final rider = trip?['user']?['name'] ?? trip?['userName'] ?? trip?['requesterName'] ?? 'Corporate Rider';
    final otp = trip?['otp']?.toString() ?? trip?['startOtp']?.toString();
    final isEnRouteToDrop = status == 'STARTED' || status == 'IN_PROGRESS';
    final targetAddress = isEnRouteToDrop
        ? (trip?['dropLocation']?['address'] ?? trip?['dropAddress'] ?? 'Drop location')
        : (trip?['pickupLocation']?['address'] ?? trip?['pickupAddress'] ?? 'Pickup location');

    return Center(
      child: Container(
        margin: const EdgeInsets.all(6),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFF111827),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFF38BDF8), width: 1.5),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF38BDF8).withValues(alpha: 0.25),
              blurRadius: 16,
              spreadRadius: 1,
            ),
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.7),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(5),
                      decoration: BoxDecoration(
                        color: const Color(0xFF38BDF8).withValues(alpha: 0.15),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.directions_car_rounded, color: Color(0xFF38BDF8), size: 16),
                    ),
                    const SizedBox(width: 8),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          rider.toString(),
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                        ),
                        Text(
                          isEnRouteToDrop ? 'En Route to Destination' : 'En Route to Pickup',
                          style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 10, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ],
                ),
                GestureDetector(
                  onTap: _toggleTripHud,
                  child: const Icon(Icons.close_rounded, color: Colors.white60, size: 18),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(
                    isEnRouteToDrop ? Icons.location_on : Icons.circle,
                    color: isEnRouteToDrop ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                    size: 10,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      targetAddress.toString(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: Colors.white70, fontSize: 11),
                    ),
                  ),
                  if (otp != null && !isEnRouteToDrop)
                    Container(
                      margin: const EdgeInsets.only(left: 6),
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981).withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: const Color(0xFF10B981), width: 1),
                      ),
                      child: Text(
                        'OTP: $otp',
                        style: const TextStyle(color: Color(0xFF10B981), fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _launchGoogleMapsNavigation,
                    icon: const Icon(Icons.navigation_rounded, size: 14),
                    label: const Text('MAPS NAV', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0284C7),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () {
                      _toggleTripHud();
                      _bringAppToFront();
                    },
                    icon: const Icon(Icons.open_in_new_rounded, size: 14),
                    label: const Text('OPEN APP', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: const BorderSide(color: Colors.white24),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  /// 3. Expanded 30-Second Countdown Dispatch Acceptance Card
  Widget _buildDispatchCard() {
    final req = _offerData?['requirement'] as Map<String, dynamic>?;
    final rate = _offerData?['offeredRate'] ?? req?['ratePerVehicle'] ?? _offerData?['rate'] ?? '---';
    final vehicleType = (_offerData?['vehicleType'] ?? req?['vehicleType'] ?? 'SEDAN').toString().toUpperCase();
    final pickup = (_offerData?['pickupAddress'] ?? req?['pickupAddress'] ?? 'Pickup point').toString();
    final drop = (_offerData?['dropAddress'] ?? req?['dropAddress'] ?? 'Drop point').toString();
    final distanceKm = _offerData?['distanceKm'] ?? _offerData?['tripDistanceKm'] ?? req?['distanceKm'] ?? '';
    final hasEscort = _offerData?['hasEscort'] == true ||
        _offerData?['hasEscort'] == 'true' ||
        req?['hasEscort'] == true;

    final progress = (_secondsRemaining / _totalSeconds).clamp(0.0, 1.0);
    final isUrgent = _secondsRemaining <= 10;

    return Center(
      child: Container(
        margin: const EdgeInsets.all(8),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFF181C24),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isUrgent ? const Color(0xFFEF4444) : const Color(0xFF5B42F3),
            width: 2,
          ),
          boxShadow: [
            BoxShadow(
              color: (isUrgent ? const Color(0xFFEF4444) : const Color(0xFF5B42F3)).withValues(alpha: 0.35),
              blurRadius: 20,
              spreadRadius: 2,
            ),
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.6),
              blurRadius: 15,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Top Bar: Timer & Category Badge
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Stack(
                      alignment: Alignment.center,
                      children: [
                        SizedBox(
                          width: 36,
                          height: 36,
                          child: CircularProgressIndicator(
                            value: progress,
                            strokeWidth: 3.5,
                            backgroundColor: Colors.white12,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              isUrgent ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                            ),
                          ),
                        ),
                        Text(
                          '${_secondsRemaining}s',
                          style: TextStyle(
                            color: isUrgent ? const Color(0xFFEF4444) : Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'NEW TRIP DISPATCH',
                          style: TextStyle(
                            color: Color(0xFF10B981),
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.8,
                          ),
                        ),
                        Text(
                          vehicleType,
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                if (hasEscort)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF59E0B).withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: const Color(0xFFF59E0B), width: 1),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.shield_rounded, color: Color(0xFFF59E0B), size: 12),
                        SizedBox(width: 4),
                        Text(
                          'ESCORT',
                          style: TextStyle(color: Color(0xFFF59E0B), fontSize: 9, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
              ],
            ),

            const SizedBox(height: 12),

            // Guaranteed Net Earnings Banner
            Container(
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Net Guaranteed Payout',
                    style: TextStyle(color: Colors.white70, fontSize: 11),
                  ),
                  Text(
                    '₹$rate',
                    style: const TextStyle(
                      color: Color(0xFF10B981),
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 10),

            // Pickup & Drop Locations
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Column(
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.circle, color: Color(0xFF10B981), size: 10),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          pickup,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                  Padding(
                    padding: const EdgeInsets.only(left: 4),
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: Container(
                        width: 2,
                        height: 12,
                        color: Colors.white24,
                      ),
                    ),
                  ),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.location_on, color: Color(0xFFEF4444), size: 12),
                      const SizedBox(width: 7),
                      Expanded(
                        child: Text(
                          drop,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Colors.white70, fontSize: 11),
                        ),
                      ),
                      if (distanceKm.toString().isNotEmpty)
                        Text(
                          '${distanceKm}km',
                          style: const TextStyle(color: Colors.white54, fontSize: 10),
                        ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14),

            // Action Buttons: PASS vs ACCEPT
            Row(
              children: [
                Expanded(
                  flex: 2,
                  child: OutlinedButton(
                    onPressed: _declineOffer,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFFEF4444),
                      side: const BorderSide(color: Color(0xFFEF4444), width: 1.5),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text('PASS', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  flex: 3,
                  child: ElevatedButton(
                    onPressed: _acceptOffer,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      elevation: 4,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.check_circle_rounded, size: 18),
                        SizedBox(width: 6),
                        Text('ACCEPT', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
