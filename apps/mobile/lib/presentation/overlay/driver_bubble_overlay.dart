import 'dart:async';
import 'dart:convert';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_overlay_window/flutter_overlay_window.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:vibration/vibration.dart';

/// Top-level Entry Point for the Floating Assistive Overlay Window.
/// Runs in a dedicated background Flutter isolate directly on the Android WindowManager.
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

/// Floating Assistive Ball & Live Bottom Sheet for AdhocX Drivers.
///
/// Features:
/// 1. Assistive Ball:
///    - Compact floating circle (76x76dp) with pulsating glowing ring and online dot.
///    - Draggable along screen edges; visible over all apps (e.g. Google Maps, Waze).
///    - Displays badge counter when new ride opportunities are available.
/// 2. Live Bottom Sheet (Opens on tap):
///    - Expands to full-width bottom sheet (520dp) docked to bottom of the screen.
///    - "Ongoing Ride" tab: Live status, passenger name, 1-tap call, pickup/drop, Start OTP badge,
///      and direct 1-tap Google Maps Navigation shortcut.
///    - "Coming Rides" tab: List of incoming dispatch offers with net payout, vehicle type,
///      distance, and 1-tap Accept / Decline buttons.
/// 3. Auto-Open on Incoming Offer:
///    - When a new ride offer arrives, the bottom sheet auto-expands immediately over any active screen.
///    - Triggers repeating vibration and looping alert siren.
///    - Displays 30-second live countdown, route points, net payout, and Accept/Pass buttons.
class DriverAssistiveBubbleOverlay extends StatefulWidget {
  const DriverAssistiveBubbleOverlay({super.key});

  @override
  State<DriverAssistiveBubbleOverlay> createState() => _DriverAssistiveBubbleOverlayState();
}

class _DriverAssistiveBubbleOverlayState extends State<DriverAssistiveBubbleOverlay>
    with SingleTickerProviderStateMixin {
  static const MethodChannel _foregroundChannel = MethodChannel('com.adhocx.app/foreground');

  // Sizing Constants (dp)
  static const int bubbleWidth = 76;
  static const int bubbleHeight = 76;
  static const int sheetHeight = 520;

  // View Mode: 0 = Compact Ball, 1 = Bottom Sheet, 2 = Incoming Offer Alert
  bool _isBottomSheetOpen = false;
  bool _isOfferActive = false;
  int _selectedTab = 0; // 0 = Ongoing Ride, 1 = Coming Rides

  // State Data
  Map<String, dynamic>? _activeTripData;
  List<Map<String, dynamic>> _availableOffers = [];
  Map<String, dynamic>? _currentOfferData;

  // Countdown & Alert
  Timer? _countdownTimer;
  int _secondsRemaining = 30;
  static const int _totalSeconds = 30;

  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;
  StreamSubscription? _overlaySub;
  AudioPlayer? _overlayAudioPlayer;

  @override
  void initState() {
    super.initState();

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.90, end: 1.15).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    // Listen to real-time events and state updates from the Main AdhocX App
    _overlaySub = FlutterOverlayWindow.overlayListener.listen(_handleMainAppMessage);

    // Initial resize and positioning:
    // Ensures window dimensions are converted via dpToPx and placed safely on screen
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      try {
        await FlutterOverlayWindow.resizeOverlay(bubbleWidth, bubbleHeight, true);
        await FlutterOverlayWindow.moveOverlay(const OverlayPosition(0, 150));
        // Immediately request current active trip and offers list from main app
        await FlutterOverlayWindow.shareData(jsonEncode({'action': 'REQUEST_STATE_SYNC'}));
      } catch (e) {
        debugPrint('⚠️ [Overlay] Post-frame initialization notice: $e');
      }
    });
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

      if (type == 'OFFER_RECEIVED' || type == 'TRIP_OFFER' || (msg.containsKey('offerId') && !msg.containsKey('action'))) {
        _triggerIncomingOffer(msg);
      } else if (type == 'DISMISS_OFFER' || type == 'OFFER_CANCELLED' || type == 'OFFER_EXPIRED') {
        _dismissOfferLocally();
      } else if (type == 'ACTIVE_TRIP_UPDATE') {
        _handleActiveTripUpdate(msg['trip']);
      } else if (type == 'TRIP_COMPLETED' || type == 'TRIP_CANCELLED') {
        _clearActiveTrip();
      } else if (type == 'OFFERS_LIST_UPDATE') {
        final rawList = msg['offers'] as List<dynamic>? ?? [];
        setState(() {
          _availableOffers = rawList.map((o) => Map<String, dynamic>.from(o as Map)).toList();
        });
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
    });
  }

  /// Auto-opens the Bottom Sheet into the 30-Second Countdown Dispatch Offer View
  Future<void> _triggerIncomingOffer(Map<String, dynamic> offerData) async {
    _countdownTimer?.cancel();

    final req = offerData['requirement'] as Map<String, dynamic>?;
    final expSec = int.tryParse(offerData['expiresInSeconds']?.toString() ?? '') ??
        int.tryParse(req?['expiresInSeconds']?.toString() ?? '') ??
        30;

    setState(() {
      _currentOfferData = offerData;
      _isOfferActive = true;
      _secondsRemaining = expSec.clamp(5, 60);
    });

    // 1. Automatically expand overlay to full-width Bottom Sheet
    try {
      await FlutterOverlayWindow.moveOverlay(const OverlayPosition(0, 0));
      await FlutterOverlayWindow.resizeOverlay(WindowSize.matchParent, sheetHeight, false);
    } catch (_) {}

    // 2. Start repeating hardware vibration
    try {
      final hasVib = await Vibration.hasVibrator();
      if (hasVib == true) {
        await Vibration.vibrate(
          pattern: [0, 800, 400, 800, 400],
          repeat: 0,
        );
      }
    } catch (_) {}

    // 3. Start looping alert siren
    try {
      _overlayAudioPlayer ??= AudioPlayer();
      await _overlayAudioPlayer?.stop();
      await _overlayAudioPlayer?.setReleaseMode(ReleaseMode.loop);
      await _overlayAudioPlayer?.setVolume(1.0);
      await _overlayAudioPlayer?.play(AssetSource('sounds/dispatch_alert.wav'));
    } catch (e) {
      debugPrint('⚠️ [Overlay] Audio playback notice: $e');
    }

    // 4. Start 1-second countdown timer
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
      _currentOfferData = null;
      _secondsRemaining = 30;
    });

    // If bottom sheet was not manually opened before this offer, collapse back to compact ball
    if (!_isBottomSheetOpen) {
      try {
        await FlutterOverlayWindow.resizeOverlay(bubbleWidth, bubbleHeight, true);
        await FlutterOverlayWindow.moveOverlay(const OverlayPosition(0, 150));
      } catch (_) {}
    }
  }

  Future<void> _onOfferTimeout() async {
    final offerId = _currentOfferData?['id'] ?? _currentOfferData?['offerId'];
    if (offerId != null) {
      FlutterOverlayWindow.shareData(jsonEncode({
        'action': 'OFFER_EXPIRED',
        'offerId': offerId.toString(),
      }));
    }
    await _dismissOfferLocally();
  }

  Future<void> _acceptCurrentOffer([Map<String, dynamic>? customOffer]) async {
    final target = customOffer ?? _currentOfferData;
    final offerId = target?['id'] ?? target?['offerId'];
    FlutterOverlayWindow.shareData(jsonEncode({
      'action': 'ACCEPT_OFFER',
      'offerId': offerId?.toString(),
      'offerData': target,
    }));
    await _dismissOfferLocally();
    await _bringAppToFront();
  }

  Future<void> _declineCurrentOffer([Map<String, dynamic>? customOffer]) async {
    final target = customOffer ?? _currentOfferData;
    final offerId = target?['id'] ?? target?['offerId'];
    FlutterOverlayWindow.shareData(jsonEncode({
      'action': 'DECLINE_OFFER',
      'offerId': offerId?.toString(),
      'offerData': target,
    }));
    if (customOffer == null || customOffer == _currentOfferData) {
      await _dismissOfferLocally();
    } else {
      setState(() {
        _availableOffers.removeWhere((o) => (o['id'] ?? o['offerId'])?.toString() == offerId?.toString());
      });
    }
  }

  Future<void> _bringAppToFront() async {
    try {
      await _foregroundChannel.invokeMethod('bringToFront');
    } catch (e) {
      debugPrint('⚠️ [Foreground Channel] Error bringing app to front: $e');
    }
  }

  /// Opens the Bottom Sheet over other apps
  Future<void> _openBottomSheet() async {
    setState(() {
      _isBottomSheetOpen = true;
      // Default to ongoing ride if active, otherwise to coming rides if available
      if (_activeTripData == null && _availableOffers.isNotEmpty) {
        _selectedTab = 1;
      }
    });

    try {
      await FlutterOverlayWindow.moveOverlay(const OverlayPosition(0, 0));
      await FlutterOverlayWindow.resizeOverlay(WindowSize.matchParent, sheetHeight, false);
      FlutterOverlayWindow.shareData(jsonEncode({'action': 'REQUEST_STATE_SYNC'}));
    } catch (e) {
      debugPrint('⚠️ [Overlay] Error opening bottom sheet: $e');
    }
  }

  /// Collapses Bottom Sheet back to the draggable Assistive Ball
  Future<void> _closeBottomSheet() async {
    setState(() {
      _isBottomSheetOpen = false;
    });

    try {
      await FlutterOverlayWindow.resizeOverlay(bubbleWidth, bubbleHeight, true);
      await FlutterOverlayWindow.moveOverlay(const OverlayPosition(0, 150));
    } catch (e) {
      debugPrint('⚠️ [Overlay] Error closing bottom sheet: $e');
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

  Future<void> _callPassenger(String? phone) async {
    if (phone == null || phone.isEmpty) return;
    final uri = Uri.parse('tel:$phone');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
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
          ? _buildIncomingOfferCard()
          : (_isBottomSheetOpen ? _buildLiveBottomSheet() : _buildAssistiveBall()),
    );
  }

  // ===========================================================================
  // 1. COMPACT FLOATING ASSISTIVE BALL
  // ===========================================================================
  Widget _buildAssistiveBall() {
    final hasActiveTrip = _activeTripData != null;
    final offerCount = _availableOffers.length;
    final ringColor = hasActiveTrip ? const Color(0xFF38BDF8) : const Color(0xFF10B981);

    return Center(
      child: GestureDetector(
        onTap: _openBottomSheet,
        child: AnimatedBuilder(
          animation: _pulseAnimation,
          builder: (context, child) {
            return Container(
              width: 68,
              height: 68,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: hasActiveTrip
                      ? [const Color(0xFF0284C7), const Color(0xFF0369A1)]
                      : (offerCount > 0
                          ? [const Color(0xFF4F46E5), const Color(0xFF3730A3)]
                          : [const Color(0xFF1E293B), const Color(0xFF0F172A)]),
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                boxShadow: [
                  BoxShadow(
                    color: ringColor.withValues(alpha: 0.40 * _pulseAnimation.value),
                    blurRadius: 16 * _pulseAnimation.value,
                    spreadRadius: 3 * _pulseAnimation.value,
                  ),
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.60),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
                border: Border.all(
                  color: ringColor,
                  width: 2.5,
                ),
              ),
              child: Stack(
                alignment: Alignment.center,
                clipBehavior: Clip.none,
                children: [
                  Icon(
                    hasActiveTrip ? Icons.navigation_rounded : Icons.local_taxi_rounded,
                    color: Colors.white,
                    size: 30,
                  ),

                  // Online status glowing pip
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
                            blurRadius: 6,
                            spreadRadius: 2,
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Offer count notification badge
                  if (offerCount > 0 && !hasActiveTrip)
                    Positioned(
                      top: -4,
                      right: -4,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF59E0B),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: Colors.white, width: 1.5),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFF59E0B).withValues(alpha: 0.6),
                              blurRadius: 6,
                              spreadRadius: 1,
                            ),
                          ],
                        ),
                        child: Text(
                          '$offerCount',
                          style: const TextStyle(
                            color: Colors.black,
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                          ),
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

  // ===========================================================================
  // 2. LIVE BOTTOM SHEET (ONGOING RIDE & COMING RIDES)
  // ===========================================================================
  Widget _buildLiveBottomSheet() {
    final hasActiveTrip = _activeTripData != null;
    final offerCount = _availableOffers.length;

    return Align(
      alignment: Alignment.bottomCenter,
      child: Container(
        width: double.infinity,
        height: sheetHeight.toDouble(),
        decoration: BoxDecoration(
          color: const Color(0xFF0F172A),
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          border: Border.all(color: const Color(0xFF334155), width: 1.5),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.8),
              blurRadius: 25,
              offset: const Offset(0, -6),
            ),
          ],
        ),
        child: Column(
          children: [
            // Top Drag Handle (Tap to collapse back to floating ball)
            GestureDetector(
              onTap: _closeBottomSheet,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 10),
                color: Colors.transparent,
                alignment: Alignment.center,
                child: Container(
                  width: 44,
                  height: 5,
                  decoration: BoxDecoration(
                    color: const Color(0xFF64748B),
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              ),
            ),

            // Header Row: Status, Open App & Minimize
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: hasActiveTrip ? const Color(0xFF38BDF8) : const Color(0xFF10B981),
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: (hasActiveTrip ? const Color(0xFF38BDF8) : const Color(0xFF10B981)).withValues(alpha: 0.6),
                              blurRadius: 6,
                              spreadRadius: 2,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        hasActiveTrip ? 'Ongoing Trip Active' : 'AdhocX Driver Online',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      // Open App in Foreground
                      IconButton(
                        tooltip: 'Open AdhocX App',
                        icon: const Icon(Icons.open_in_new_rounded, color: Color(0xFF94A3B8), size: 20),
                        onPressed: _bringAppToFront,
                      ),
                      // Minimize to Ball
                      IconButton(
                        tooltip: 'Minimize to Ball',
                        icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF94A3B8), size: 26),
                        onPressed: _closeBottomSheet,
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 6),

            // Tab Selector: Ongoing Ride vs Coming Rides
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Container(
                padding: const EdgeInsets.all(3),
                decoration: BoxDecoration(
                  color: const Color(0xFF1E293B),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _selectedTab = 0),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(
                            color: _selectedTab == 0 ? const Color(0xFF2563EB) : Colors.transparent,
                            borderRadius: BorderRadius.circular(9),
                          ),
                          alignment: Alignment.center,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.directions_car_rounded,
                                size: 16,
                                color: _selectedTab == 0 ? Colors.white : const Color(0xFF94A3B8),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Ongoing Ride',
                                style: TextStyle(
                                  color: _selectedTab == 0 ? Colors.white : const Color(0xFF94A3B8),
                                  fontWeight: _selectedTab == 0 ? FontWeight.bold : FontWeight.w600,
                                  fontSize: 12,
                                ),
                              ),
                              if (hasActiveTrip)
                                Container(
                                  margin: const EdgeInsets.only(left: 6),
                                  width: 6,
                                  height: 6,
                                  decoration: const BoxDecoration(
                                    color: Color(0xFF38BDF8),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _selectedTab = 1),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(
                            color: _selectedTab == 1 ? const Color(0xFF2563EB) : Colors.transparent,
                            borderRadius: BorderRadius.circular(9),
                          ),
                          alignment: Alignment.center,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.bolt_rounded,
                                size: 16,
                                color: _selectedTab == 1 ? Colors.white : const Color(0xFF94A3B8),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Coming Rides',
                                style: TextStyle(
                                  color: _selectedTab == 1 ? Colors.white : const Color(0xFF94A3B8),
                                  fontWeight: _selectedTab == 1 ? FontWeight.bold : FontWeight.w600,
                                  fontSize: 12,
                                ),
                              ),
                              if (offerCount > 0)
                                Container(
                                  margin: const EdgeInsets.only(left: 6),
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF59E0B),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    '$offerCount',
                                    style: const TextStyle(
                                      color: Colors.black,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w900,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 12),

            // Tab Content
            Expanded(
              child: _selectedTab == 0 ? _buildOngoingRideTab() : _buildComingRidesTab(),
            ),
          ],
        ),
      ),
    );
  }

  // ===========================================================================
  // TAB 1: ONGOING RIDE VIEW
  // ===========================================================================
  Widget _buildOngoingRideTab() {
    final trip = _activeTripData;
    if (trip == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.05),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.car_crash_rounded, color: Color(0xFF64748B), size: 32),
              ),
              const SizedBox(height: 16),
              const Text(
                'No Active Ongoing Ride',
                style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              const Text(
                'When you accept a trip, live route navigation, passenger contact, and start OTP will appear here.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
              ),
              if (_availableOffers.isNotEmpty) ...[
                const SizedBox(height: 18),
                ElevatedButton.icon(
                  onPressed: () => setState(() => _selectedTab = 1),
                  icon: const Icon(Icons.bolt_rounded, size: 16),
                  label: Text('View Coming Rides (${_availableOffers.length})'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ],
            ],
          ),
        ),
      );
    }

    final status = trip['status']?.toString().toUpperCase() ?? 'ASSIGNED';
    final rider = trip['user']?['name'] ?? trip['userName'] ?? trip['requesterName'] ?? 'Corporate Rider';
    final riderPhone = trip['user']?['phone'] ?? trip['phone'] ?? trip['requesterPhone']?.toString();
    final otp = trip['otp']?.toString() ?? trip['startOtp']?.toString();
    final isEnRouteToDrop = status == 'STARTED' || status == 'IN_PROGRESS';
    final isArrived = status == 'ARRIVED';
    final pickupAddress = (trip['pickupLocation']?['address'] ?? trip['pickupAddress'] ?? 'Pickup point').toString();
    final dropAddress = (trip['dropLocation']?['address'] ?? trip['dropAddress'] ?? 'Drop destination').toString();
    final tripId = trip['id'] ?? trip['tripId'];

    Color statusBadgeColor = const Color(0xFFF59E0B);
    String statusText = 'ON THE WAY TO PICKUP';
    if (isArrived) {
      statusBadgeColor = const Color(0xFF38BDF8);
      statusText = 'ARRIVED AT PICKUP LOCATION';
    } else if (isEnRouteToDrop) {
      statusBadgeColor = const Color(0xFF10B981);
      statusText = 'RIDE IN PROGRESS TO DROP';
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Status Chip & Trip ID
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusBadgeColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: statusBadgeColor.withValues(alpha: 0.4)),
                ),
                child: Text(
                  statusText,
                  style: TextStyle(
                    color: statusBadgeColor,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              if (tripId != null)
                Text(
                  '#${tripId.toString().substring(0, tripId.toString().length > 6 ? 6 : tripId.toString().length)}',
                  style: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                ),
            ],
          ),

          const SizedBox(height: 10),

          // Passenger Info Card
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: const Color(0xFF38BDF8).withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.person_rounded, color: Color(0xFF38BDF8), size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        rider.toString(),
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      const Text(
                        'Corporate Verified Passenger',
                        style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                      ),
                    ],
                  ),
                ),
                if (riderPhone != null && riderPhone.isNotEmpty)
                  IconButton(
                    onPressed: () => _callPassenger(riderPhone),
                    icon: const Icon(Icons.phone_rounded, color: Color(0xFF10B981)),
                    style: IconButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981).withValues(alpha: 0.15),
                    ),
                  ),
              ],
            ),
          ),

          const SizedBox(height: 10),

          // Start OTP Callout (If trip has not started yet)
          if (otp != null && !isEnRouteToDrop)
            Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF10B981), width: 1.5),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.key_rounded, color: Color(0xFF10B981), size: 18),
                      SizedBox(width: 8),
                      Text(
                        'START RIDE OTP:',
                        style: TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                    ],
                  ),
                  Text(
                    otp,
                    style: const TextStyle(
                      color: Color(0xFF10B981),
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 2.0,
                    ),
                  ),
                ],
              ),
            ),

          // Route Details
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Column(
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Padding(
                      padding: EdgeInsets.only(top: 2),
                      child: Icon(Icons.circle, color: Color(0xFF10B981), size: 12),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'PICKUP',
                            style: TextStyle(color: Color(0xFF64748B), fontSize: 10, fontWeight: FontWeight.bold),
                          ),
                          Text(
                            pickupAddress,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w500),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                Padding(
                  padding: const EdgeInsets.only(left: 5, top: 4, bottom: 4),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Container(
                      width: 2,
                      height: 16,
                      color: const Color(0xFF475569),
                    ),
                  ),
                ),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Padding(
                      padding: EdgeInsets.only(top: 2),
                      child: Icon(Icons.location_on_rounded, color: Color(0xFFEF4444), size: 14),
                    ),
                    const SizedBox(width: 9),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'DESTINATION',
                            style: TextStyle(color: Color(0xFF64748B), fontSize: 10, fontWeight: FontWeight.bold),
                          ),
                          Text(
                            dropAddress,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w500),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 14),

          // Action Buttons: MAPS NAVIGATION & VIEW IN APP
          Row(
            children: [
              Expanded(
                flex: 3,
                child: ElevatedButton.icon(
                  onPressed: _launchGoogleMapsNavigation,
                  icon: const Icon(Icons.navigation_rounded, size: 16),
                  label: const Text('GOOGLE MAPS NAV', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0284C7),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    elevation: 3,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                flex: 2,
                child: OutlinedButton.icon(
                  onPressed: () {
                    FlutterOverlayWindow.shareData(jsonEncode({
                      'action': 'OPEN_TRIP_IN_APP',
                      'tripId': tripId?.toString(),
                    }));
                    _bringAppToFront();
                  },
                  icon: const Icon(Icons.open_in_new_rounded, size: 14),
                  label: const Text('OPEN APP', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: Color(0xFF475569), width: 1.5),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
        ],
      ),
    );
  }

  // ===========================================================================
  // TAB 2: COMING RIDES (AVAILABLE DISPATCH OFFERS)
  // ===========================================================================
  Widget _buildComingRidesTab() {
    if (_availableOffers.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.05),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.radar_rounded, color: Color(0xFF10B981), size: 34),
              ),
              const SizedBox(height: 16),
              const Text(
                'Searching for Rides...',
                style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              const Text(
                'You are Online & available to corporate riders nearby. New dispatch offers will appear here automatically.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
              ),
              const SizedBox(height: 18),
              OutlinedButton.icon(
                onPressed: () {
                  FlutterOverlayWindow.shareData(jsonEncode({'action': 'REQUEST_STATE_SYNC'}));
                },
                icon: const Icon(Icons.refresh_rounded, size: 16),
                label: const Text('Refresh'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF38BDF8),
                  side: const BorderSide(color: Color(0xFF38BDF8)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: _availableOffers.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final offer = _availableOffers[index];
        final req = offer['requirement'] as Map<String, dynamic>?;
        final rate = offer['offeredRate'] ?? req?['ratePerVehicle'] ?? offer['rate'] ?? '---';
        final vehicleType = (offer['vehicleType'] ?? req?['vehicleType'] ?? 'SEDAN').toString().toUpperCase();
        final pickup = (offer['pickupAddress'] ?? req?['pickupAddress'] ?? 'Pickup point').toString();
        final drop = (offer['dropAddress'] ?? req?['dropAddress'] ?? 'Drop destination').toString();
        final distanceKm = offer['distanceKm'] ?? req?['distanceKm'] ?? '';
        final hasEscort = offer['hasEscort'] == true || req?['hasEscort'] == true;

        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFF334155)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Top Rate & Vehicle Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          '₹$rate NET',
                          style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          vehicleType,
                          style: const TextStyle(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  if (hasEscort)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF59E0B).withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text('ESCORT', style: TextStyle(color: Color(0xFFF59E0B), fontSize: 9, fontWeight: FontWeight.bold)),
                    ),
                  if (distanceKm.toString().isNotEmpty)
                    Text('${distanceKm}km', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                ],
              ),

              const SizedBox(height: 8),

              // Addresses
              Text(
                'Pickup: $pickup',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 2),
              Text(
                'Drop: $drop',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
              ),

              const SizedBox(height: 10),

              // Action Buttons: Pass vs Accept
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _declineCurrentOffer(offer),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFFEF4444),
                        side: const BorderSide(color: Color(0xFFEF4444), width: 1),
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: const Text('PASS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton(
                      onPressed: () => _acceptCurrentOffer(offer),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: const Text('ACCEPT RIDE', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  // ===========================================================================
  // 3. AUTO-OPENED 30-SECOND COUNTDOWN DISPATCH OFFER VIEW
  // ===========================================================================
  Widget _buildIncomingOfferCard() {
    final req = _currentOfferData?['requirement'] as Map<String, dynamic>?;
    final rate = _currentOfferData?['offeredRate'] ?? req?['ratePerVehicle'] ?? _currentOfferData?['rate'] ?? '---';
    final vehicleType = (_currentOfferData?['vehicleType'] ?? req?['vehicleType'] ?? 'SEDAN').toString().toUpperCase();
    final pickup = (_currentOfferData?['pickupAddress'] ?? req?['pickupAddress'] ?? 'Pickup point').toString();
    final drop = (_currentOfferData?['dropAddress'] ?? req?['dropAddress'] ?? 'Drop point').toString();
    final distanceKm = _currentOfferData?['distanceKm'] ?? _currentOfferData?['tripDistanceKm'] ?? req?['distanceKm'] ?? '';
    final hasEscort = _currentOfferData?['hasEscort'] == true || req?['hasEscort'] == true;

    final progress = (_secondsRemaining / _totalSeconds).clamp(0.0, 1.0);
    final isUrgent = _secondsRemaining <= 10;

    return Align(
      alignment: Alignment.bottomCenter,
      child: Container(
        width: double.infinity,
        height: sheetHeight.toDouble(),
        decoration: BoxDecoration(
          color: const Color(0xFF0F172A),
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          border: Border.all(
            color: isUrgent ? const Color(0xFFEF4444) : const Color(0xFF5B42F3),
            width: 2,
          ),
          boxShadow: [
            BoxShadow(
              color: (isUrgent ? const Color(0xFFEF4444) : const Color(0xFF5B42F3)).withValues(alpha: 0.4),
              blurRadius: 25,
              offset: const Offset(0, -6),
            ),
          ],
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Top Countdown and Urgent Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Stack(
                      alignment: Alignment.center,
                      children: [
                        SizedBox(
                          width: 44,
                          height: 44,
                          child: CircularProgressIndicator(
                            value: progress,
                            strokeWidth: 4,
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
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'NEW TRIP DISPATCH ALERT',
                          style: TextStyle(
                            color: Color(0xFF10B981),
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.8,
                          ),
                        ),
                        Text(
                          vehicleType,
                          style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ],
                ),
                if (hasEscort)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF59E0B).withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFF59E0B)),
                    ),
                    child: const Text('ESCORT REQUIRED', style: TextStyle(color: Color(0xFFF59E0B), fontSize: 9, fontWeight: FontWeight.bold)),
                  ),
              ],
            ),

            const SizedBox(height: 14),

            // Guaranteed Net Earnings Banner
            Container(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Net Guaranteed Payout',
                    style: TextStyle(color: Colors.white70, fontSize: 13),
                  ),
                  Text(
                    '₹$rate',
                    style: const TextStyle(
                      color: Color(0xFF10B981),
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // Pickup & Destination
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.circle, color: Color(0xFF10B981), size: 12),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          pickup,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                  Padding(
                    padding: const EdgeInsets.only(left: 5, top: 4, bottom: 4),
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: Container(
                        width: 2,
                        height: 16,
                        color: const Color(0xFF475569),
                      ),
                    ),
                  ),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.location_on, color: Color(0xFFEF4444), size: 14),
                      const SizedBox(width: 9),
                      Expanded(
                        child: Text(
                          drop,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Colors.white70, fontSize: 12),
                        ),
                      ),
                      if (distanceKm.toString().isNotEmpty)
                        Text(
                          '${distanceKm}km',
                          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                        ),
                    ],
                  ),
                ],
              ),
            ),

            const Spacer(),

            // Action Buttons: PASS vs ACCEPT
            Row(
              children: [
                Expanded(
                  flex: 2,
                  child: OutlinedButton(
                    onPressed: () => _declineCurrentOffer(),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFFEF4444),
                      side: const BorderSide(color: Color(0xFFEF4444), width: 1.5),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('PASS', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 3,
                  child: ElevatedButton(
                    onPressed: () => _acceptCurrentOffer(),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      elevation: 4,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.check_circle_rounded, size: 20),
                        SizedBox(width: 8),
                        Text('ACCEPT', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}
