import 'dart:async';
import 'dart:convert';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_overlay_window/flutter_overlay_window.dart';
import 'package:shared_preferences/shared_preferences.dart';
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

/// Dynamic Theme Token Helper for the Floating Overlay.
/// Adapts seamlessly between Dark OLED and Clean White / Light modes.
class _OverlayColors {
  final bool isDark;
  const _OverlayColors({required this.isDark});

  Color get surface => isDark ? const Color(0xFF101014) : Colors.white;
  Color get surfaceElevated => isDark ? const Color(0xFF18181B) : const Color(0xFFF4F4F5);
  Color get surfaceCard => isDark ? const Color(0xFF18181B) : const Color(0xFFFAFAFA);
  Color get border => isDark ? const Color(0xFF27272A) : const Color(0xFFE4E4E7);
  Color get borderSubtle => isDark ? const Color(0xFF3F3F46) : const Color(0xFFD4D4D8);
  Color get handle => isDark ? const Color(0xFF3F3F46) : const Color(0xFFD4D4D8);
  Color get textPrimary => isDark ? Colors.white : const Color(0xFF18181B);
  Color get textSecondary => isDark ? const Color(0xFFA1A1AA) : const Color(0xFF71717A);
  Color get textMuted => isDark ? const Color(0xFF71717A) : const Color(0xFFA1A1AA);
  Color get tabUnselected => isDark ? const Color(0xFF18181B) : const Color(0xFFF4F4F5);

  Color get brandPurple => const Color(0xFF5B42F3);
  Color get brandPurpleLight => const Color(0xFF7C68F5);
  Color get onlineGreen => const Color(0xFF22C55E);
  Color get activeTripSky => const Color(0xFF38BDF8);
  Color get warningAmber => const Color(0xFFD97706);
  Color get errorRed => const Color(0xFFDC2626);
  Color get successGreen => const Color(0xFF16A34A);
}

/// Floating Assistive Ball & Live Bottom Sheet for AdhocX Drivers.
class DriverAssistiveBubbleOverlay extends StatefulWidget {
  const DriverAssistiveBubbleOverlay({super.key});

  @override
  State<DriverAssistiveBubbleOverlay> createState() => _DriverAssistiveBubbleOverlayState();
}

class _DriverAssistiveBubbleOverlayState extends State<DriverAssistiveBubbleOverlay>
    with TickerProviderStateMixin {
  // Method channels for Android overlay control & foreground switching
  static const MethodChannel _foregroundChannel = MethodChannel('com.adhocx.app/foreground');
  static const MethodChannel _overlayChannel = MethodChannel('x-slayer/overlay');
  static const MethodChannel _mainOverlayChannel = MethodChannel('x-slayer/overlay_channel');

  // Sizing Constants (dp)
  static const int bubbleWidth = 76;
  static const int bubbleHeight = 76;
  static const int sheetHeightDefault = 540;
  static const int sheetHeightExpanded = 720;

  // View Mode & Interactive Dragging
  bool _isBottomSheetOpen = false;
  bool _isBallVisible = true;
  bool _isTransitioning = false;
  bool _isLockedUp = false;
  double _dragOffsetY = 0.0;
  bool _isOfferActive = false;
  int _selectedTab = 0; // 0 = Ongoing Ride, 1 = Coming Rides

  // Dynamic Driver Metadata & Theme
  String _driverName = '';
  String _appThemeMode = 'system';

  // State Data
  Map<String, dynamic>? _activeTripData;
  List<Map<String, dynamic>> _availableOffers = [];
  Map<String, dynamic>? _currentOfferData;

  // Countdown & Alert
  Timer? _countdownTimer;
  int _secondsRemaining = 30;
  static const int _totalSeconds = 30;

  // Animations
  late AnimationController _pulseController;
  late AnimationController _sheetAnimController;
  late Animation<double> _sheetSlideAnim;

  StreamSubscription? _overlaySub;
  AudioPlayer? _overlayAudioPlayer;

  int get _currentSheetHeight => _isLockedUp ? sheetHeightExpanded : sheetHeightDefault;

  @override
  void initState() {
    super.initState();

    // 1. Pulsing animation for subtle indicators
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);

    // 2. Smooth slide animation for the bottom sheet
    _sheetAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 260),
    );

    _sheetSlideAnim = CurvedAnimation(
      parent: _sheetAnimController,
      curve: Curves.easeOutCubic,
      reverseCurve: Curves.easeInCubic,
    );

    // 3. Listen to real-time events and state updates from the Main AdhocX App
    _overlaySub = FlutterOverlayWindow.overlayListener.listen(_handleMainAppMessage);

    // 4. Read cached driver name and theme preference from SharedPreferences
    _loadCachedPreferences();

    // 5. Initial positioning: Start as compact ball on the side (150dp from bottom)
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      try {
        await _updateOverlayPosition(0, 150);
        await FlutterOverlayWindow.resizeOverlay(bubbleWidth, bubbleHeight, true);
        await FlutterOverlayWindow.shareData(jsonEncode({'action': 'REQUEST_STATE_SYNC'}));
      } catch (e) {
        debugPrint('⚠️ [Overlay] Post-frame initialization notice: $e');
      }
    });
  }

  Future<void> _loadCachedPreferences() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final storedTheme = prefs.getString('app_theme_mode');
      final storedUser = prefs.getString('auth_user') ?? prefs.getString('user_profile');
      String? parsedName;
      if (storedUser != null) {
        try {
          final userJson = jsonDecode(storedUser);
          parsedName = userJson['fullName'] ?? userJson['name'];
        } catch (_) {}
      }
      if (mounted) {
        setState(() {
          if (storedTheme != null && storedTheme.isNotEmpty) _appThemeMode = storedTheme;
          if (parsedName != null && parsedName.isNotEmpty) _driverName = parsedName;
        });
      }
    } catch (_) {}
  }

  /// Reliably updates the WindowManager position across overlay and plugin channels.
  /// (x: 0, y: 0) with Gravity.BOTTOM snaps the window directly against the base.
  Future<void> _updateOverlayPosition(int x, int y) async {
    try {
      await _overlayChannel.invokeMethod('updateOverlayPosition', {'x': x, 'y': y});
    } catch (_) {
      try {
        await _mainOverlayChannel.invokeMethod('moveOverlay', {'x': x, 'y': y});
      } catch (_) {}
    }
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

      // Extract synced driver name and theme mode if present
      if (msg['driverName'] != null) {
        final dName = msg['driverName'].toString().trim();
        if (dName.isNotEmpty && _driverName != dName) {
          setState(() => _driverName = dName);
        }
      }
      if (msg['themeMode'] != null) {
        final tMode = msg['themeMode'].toString().trim();
        if (tMode.isNotEmpty && _appThemeMode != tMode) {
          setState(() => _appThemeMode = tMode);
        }
      }

      if (type == 'OFFER_RECEIVED' ||
          type == 'TRIP_OFFER' ||
          (msg.containsKey('offerId') && !msg.containsKey('action'))) {
        _triggerIncomingOffer(msg);
      } else if (type == 'DISMISS_OFFER' ||
          type == 'OFFER_CANCELLED' ||
          type == 'OFFER_EXPIRED') {
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
      _isBallVisible = false;
      _secondsRemaining = expSec.clamp(5, 60);
      _dragOffsetY = 0.0;
    });

    // 1. Expand overlay to full-width Bottom Sheet attached flush to the base (x:0, y:0)
    try {
      await _updateOverlayPosition(0, 0);
      await FlutterOverlayWindow.resizeOverlay(WindowSize.matchParent, _currentSheetHeight, false);
      await _updateOverlayPosition(0, 0);
      _sheetAnimController.forward(from: 0.0);
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

    try {
      await _sheetAnimController.reverse();
    } catch (_) {}

    setState(() {
      _isOfferActive = false;
      _currentOfferData = null;
      _secondsRemaining = 30;
      _dragOffsetY = 0.0;
    });

    // If bottom sheet was not manually opened before this offer, collapse back to assistive ball
    if (!_isBottomSheetOpen) {
      try {
        await _updateOverlayPosition(0, 150);
        await FlutterOverlayWindow.resizeOverlay(bubbleWidth, bubbleHeight, true);
        if (mounted) {
          setState(() => _isBallVisible = true);
        }
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
        _availableOffers.removeWhere(
            (o) => (o['id'] ?? o['offerId'])?.toString() == offerId?.toString());
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

  /// Opens the Bottom Sheet over other apps, attached flush to the base
  Future<void> _openBottomSheet() async {
    if (_isTransitioning || _isBottomSheetOpen) return;
    _isTransitioning = true;
    HapticFeedback.lightImpact();

    // 1. Smoothly fade out the assistive ball
    if (mounted) {
      setState(() => _isBallVisible = false);
    }
    await Future.delayed(const Duration(milliseconds: 90));

    try {
      // 2. Pin to base (x: 0, y: 0) and expand overlay to full width and sheet height
      await _updateOverlayPosition(0, 0);
      await FlutterOverlayWindow.resizeOverlay(
        WindowSize.matchParent,
        _currentSheetHeight,
        false,
      );
      await _updateOverlayPosition(0, 0);

      // 3. Switch to bottom sheet view and trigger smooth slide-up animation
      if (mounted) {
        setState(() {
          _isBottomSheetOpen = true;
          _dragOffsetY = 0.0;
          if (_activeTripData == null && _availableOffers.isNotEmpty) {
            _selectedTab = 1;
          }
        });
        await _sheetAnimController.forward(from: 0.0);
        // 4. Request sync with latest trip and available offers
        FlutterOverlayWindow.shareData(jsonEncode({'action': 'REQUEST_STATE_SYNC'}));
      }
    } catch (e) {
      debugPrint('⚠️ [Overlay] Error opening bottom sheet: $e');
      if (mounted) {
        setState(() {
          _isBottomSheetOpen = false;
          _isBallVisible = true;
        });
      }
    } finally {
      if (mounted) setState(() => _isTransitioning = false);
    }
  }

  /// Collapses Bottom Sheet smoothly back to the draggable Assistive Ball
  Future<void> _closeBottomSheet() async {
    if (_isTransitioning || !_isBottomSheetOpen) return;
    _isTransitioning = true;
    HapticFeedback.lightImpact();

    try {
      // 1. Smoothly slide the bottom sheet down off-screen
      try {
        await _sheetAnimController.reverse();
      } catch (_) {}

      // 2. Return to draggable bubble on the side edge (150dp from bottom)
      await _updateOverlayPosition(0, 150);
      await FlutterOverlayWindow.resizeOverlay(bubbleWidth, bubbleHeight, true);

      // 3. Switch back to ball and smoothly fade it in
      if (mounted) {
        setState(() {
          _isBottomSheetOpen = false;
          _isLockedUp = false;
          _dragOffsetY = 0.0;
          _isBallVisible = true;
        });
      }
    } catch (e) {
      debugPrint('⚠️ [Overlay] Error closing bottom sheet: $e');
      if (mounted) {
        setState(() {
          _isBottomSheetOpen = false;
          _isBallVisible = true;
        });
      }
    } finally {
      if (mounted) setState(() => _isTransitioning = false);
    }
  }

  /// Pull down to refresh handler for Ongoing & Coming rides
  Future<void> _handlePullToRefresh() async {
    HapticFeedback.lightImpact();
    FlutterOverlayWindow.shareData(jsonEncode({'action': 'REQUEST_STATE_SYNC'}));
    await Future.delayed(const Duration(milliseconds: 700));
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
      final webFallbackUri =
          Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$targetLat,$targetLng');

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

  bool _computeIsDark(BuildContext context) {
    if (_appThemeMode == 'dark') return true;
    if (_appThemeMode == 'light') return false;
    final systemDark = MediaQuery.maybeOf(context)?.platformBrightness == Brightness.dark;
    return systemDark;
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _overlaySub?.cancel();
    _pulseController.dispose();
    _sheetAnimController.dispose();
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
    final colors = _OverlayColors(isDark: _computeIsDark(context));

    return Material(
      color: Colors.transparent,
      child: _isOfferActive
          ? _buildIncomingOfferCard(colors)
          : (_isBottomSheetOpen ? _buildLiveBottomSheet(colors) : _buildAssistiveBall()),
    );
  }

  // ===========================================================================
  // 1. COMPACT FLOATING ASSISTIVE BALL (CLEAN APP ICON • NO GREEN BORDER RING)
  // ===========================================================================
  Widget _buildAssistiveBall() {
    final hasActiveTrip = _activeTripData != null;
    final offerCount = _availableOffers.length;
    final statusColor = hasActiveTrip ? const Color(0xFF38BDF8) : const Color(0xFF22C55E);

    return AnimatedOpacity(
      duration: const Duration(milliseconds: 140),
      curve: Curves.easeInOut,
      opacity: _isBallVisible ? 1.0 : 0.0,
      child: Center(
        child: GestureDetector(
          onTap: _openBottomSheet,
          child: Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.22),
                  blurRadius: 10,
                  spreadRadius: 1,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Stack(
              clipBehavior: Clip.none,
              alignment: Alignment.center,
              children: [
                // Pure Official App Icon as the Floating Bubble (Clean centered in white card)
                ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: Padding(
                    padding: const EdgeInsets.all(7.0),
                    child: Image.asset(
                      'assets/images/adhocx_icon.png',
                      width: 50,
                      height: 50,
                      fit: BoxFit.contain,
                    ),
                  ),
                ),

                // Discrete Status Indicator Pip (Top-Right)
                Positioned(
                  top: -2,
                  right: -2,
                  child: Container(
                    width: 14,
                    height: 14,
                    decoration: BoxDecoration(
                      color: statusColor,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2.2),
                      boxShadow: [
                        BoxShadow(
                          color: statusColor.withValues(alpha: 0.65),
                          blurRadius: 5,
                          spreadRadius: 1,
                        ),
                      ],
                    ),
                  ),
                ),

                // Offer Count Notification Badge (When opportunities are waiting)
                if (offerCount > 0 && !hasActiveTrip)
                  Positioned(
                    top: -4,
                    right: -4,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFD97706), // AdhocX Warning Amber
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.white, width: 1.5),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFFD97706).withValues(alpha: 0.6),
                            blurRadius: 6,
                            spreadRadius: 1,
                          ),
                        ],
                      ),
                      child: Text(
                        '$offerCount',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ===========================================================================
  // 2. LIVE BOTTOM SHEET (ATTACHED TO BASE • DRAG DOWN TO CLOSE • DRAG UP TO LOCK)
  // ===========================================================================
  Widget _buildLiveBottomSheet(_OverlayColors colors) {
    final hasActiveTrip = _activeTripData != null;
    final offerCount = _availableOffers.length;

    return Align(
      alignment: Alignment.bottomCenter,
      child: AnimatedBuilder(
        animation: _sheetSlideAnim,
        builder: (context, child) {
          final slideOffset = (1.0 - _sheetSlideAnim.value) * _currentSheetHeight;
          final interactiveOffset = _dragOffsetY > 0 ? _dragOffsetY : 0.0;
          return Transform.translate(
            offset: Offset(0, slideOffset + interactiveOffset),
            child: child,
          );
        },
        child: Container(
          width: double.infinity,
          height: _currentSheetHeight.toDouble(),
          decoration: BoxDecoration(
            color: colors.surface,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            border: Border(
              top: BorderSide(color: colors.border, width: 1.5),
              left: BorderSide(color: colors.border, width: 1.0),
              right: BorderSide(color: colors.border, width: 1.0),
            ),
            boxShadow: [
              BoxShadow(
                color: colors.isDark ? Colors.black87 : Colors.black26,
                blurRadius: 32,
                spreadRadius: 2,
                offset: const Offset(0, -8),
              ),
            ],
          ),
          child: SafeArea(
            top: false,
            bottom: true,
            child: Column(
              children: [
                // Top Drag Handle (Interactive Drag Up to Lock, Drag Down to Close)
                GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onVerticalDragUpdate: (details) {
                    setState(() {
                      _dragOffsetY += details.delta.dy;
                    });
                  },
                  onVerticalDragEnd: (details) async {
                    final velocity = details.primaryVelocity ?? 0.0;
                    if (_dragOffsetY > 70 || velocity > 250) {
                      // Dragged down -> if locked up, drop to default; if default, close!
                      if (_isLockedUp) {
                        HapticFeedback.selectionClick();
                        setState(() {
                          _isLockedUp = false;
                          _dragOffsetY = 0.0;
                        });
                        await FlutterOverlayWindow.resizeOverlay(
                            WindowSize.matchParent, sheetHeightDefault, false);
                        await _updateOverlayPosition(0, 0);
                      } else {
                        _closeBottomSheet();
                      }
                    } else if (_dragOffsetY < -50 || velocity < -250) {
                      // Dragged up -> lock up expanded!
                      if (!_isLockedUp) {
                        HapticFeedback.mediumImpact();
                        setState(() {
                          _isLockedUp = true;
                          _dragOffsetY = 0.0;
                        });
                        await FlutterOverlayWindow.resizeOverlay(
                            WindowSize.matchParent, sheetHeightExpanded, false);
                        await _updateOverlayPosition(0, 0);
                      } else {
                        setState(() => _dragOffsetY = 0.0);
                      }
                    } else {
                      // Snap back to current state
                      setState(() => _dragOffsetY = 0.0);
                    }
                  },
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    alignment: Alignment.center,
                    child: Container(
                      width: 44,
                      height: 5,
                      decoration: BoxDecoration(
                        color: colors.handle,
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                  ),
                ),

                // Header Row: Brand Icon, Online Pip, Driver Name, Open In App & Controls
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Driver Info (Tap opens main app)
                      Expanded(
                        child: GestureDetector(
                          behavior: HitTestBehavior.opaque,
                          onTap: _bringAppToFront,
                          child: Row(
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(6),
                                child: Image.asset(
                                  'assets/images/adhocx_icon.png',
                                  width: 24,
                                  height: 24,
                                  fit: BoxFit.contain,
                                ),
                              ),
                              const SizedBox(width: 8),
                              // Online Indicator Dot
                              Container(
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  color: hasActiveTrip ? colors.activeTripSky : colors.onlineGreen,
                                  shape: BoxShape.circle,
                                  boxShadow: [
                                    BoxShadow(
                                      color: (hasActiveTrip
                                              ? colors.activeTripSky
                                              : colors.onlineGreen)
                                          .withValues(alpha: 0.6),
                                      blurRadius: 5,
                                      spreadRadius: 1.5,
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              // Driver Name
                              Flexible(
                                child: Text(
                                  _driverName.isNotEmpty
                                      ? _driverName
                                      : (hasActiveTrip ? 'Active Trip' : 'Online'),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    color: colors.textPrimary,
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 0.2,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Open App in Foreground (Arrow Icon)
                          IconButton(
                            tooltip: 'Open AdhocX App',
                            icon: Icon(Icons.open_in_new_rounded,
                                color: colors.textSecondary, size: 20),
                            onPressed: _bringAppToFront,
                          ),
                          // Expand / Lock Up Toggle
                          IconButton(
                            tooltip: _isLockedUp ? 'Restore Size' : 'Lock Up',
                            icon: Icon(
                              _isLockedUp
                                  ? Icons.unfold_less_rounded
                                  : Icons.unfold_more_rounded,
                              color: colors.textSecondary,
                              size: 20,
                            ),
                            onPressed: () async {
                              HapticFeedback.selectionClick();
                              setState(() {
                                _isLockedUp = !_isLockedUp;
                                _dragOffsetY = 0.0;
                              });
                              await FlutterOverlayWindow.resizeOverlay(
                                  WindowSize.matchParent, _currentSheetHeight, false);
                              await _updateOverlayPosition(0, 0);
                            },
                          ),
                          // Minimize to Floating Ball
                          IconButton(
                            tooltip: 'Minimize to Ball',
                            icon: Icon(Icons.keyboard_arrow_down_rounded,
                                color: colors.textSecondary, size: 26),
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
                      color: colors.tabUnselected,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: colors.border),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: GestureDetector(
                            onTap: () {
                              HapticFeedback.selectionClick();
                              setState(() => _selectedTab = 0);
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              decoration: BoxDecoration(
                                color: _selectedTab == 0
                                    ? colors.brandPurple // AdhocX Brand Royal Purple
                                    : Colors.transparent,
                                borderRadius: BorderRadius.circular(9),
                              ),
                              alignment: Alignment.center,
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    Icons.directions_car_rounded,
                                    size: 16,
                                    color: _selectedTab == 0 ? Colors.white : colors.textSecondary,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    'Ongoing Ride',
                                    style: TextStyle(
                                      color: _selectedTab == 0 ? Colors.white : colors.textSecondary,
                                      fontWeight:
                                          _selectedTab == 0 ? FontWeight.bold : FontWeight.w600,
                                      fontSize: 12,
                                    ),
                                  ),
                                  if (hasActiveTrip)
                                    Container(
                                      margin: const EdgeInsets.only(left: 6),
                                      width: 6,
                                      height: 6,
                                      decoration: BoxDecoration(
                                        color: colors.activeTripSky,
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
                            onTap: () {
                              HapticFeedback.selectionClick();
                              setState(() => _selectedTab = 1);
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              decoration: BoxDecoration(
                                color: _selectedTab == 1
                                    ? colors.brandPurple // AdhocX Brand Royal Purple
                                    : Colors.transparent,
                                borderRadius: BorderRadius.circular(9),
                              ),
                              alignment: Alignment.center,
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    Icons.bolt_rounded,
                                    size: 16,
                                    color: _selectedTab == 1 ? Colors.white : colors.textSecondary,
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    'Coming Rides',
                                    style: TextStyle(
                                      color: _selectedTab == 1 ? Colors.white : colors.textSecondary,
                                      fontWeight:
                                          _selectedTab == 1 ? FontWeight.bold : FontWeight.w600,
                                      fontSize: 12,
                                    ),
                                  ),
                                  if (offerCount > 0)
                                    Container(
                                      margin: const EdgeInsets.only(left: 6),
                                      padding:
                                          const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                      decoration: BoxDecoration(
                                        color: colors.warningAmber,
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        '$offerCount',
                                        style: const TextStyle(
                                          color: Colors.white,
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

                const SizedBox(height: 10),

                // Tab Content (Both tabs support Pull-to-Refresh)
                Expanded(
                  child: _selectedTab == 0
                      ? _buildOngoingRideTab(colors)
                      : _buildComingRidesTab(colors),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ===========================================================================
  // TAB 1: ONGOING RIDE VIEW (PULL DOWN TO REFRESH • THEME AWARE)
  // ===========================================================================
  Widget _buildOngoingRideTab(_OverlayColors colors) {
    final trip = _activeTripData;
    if (trip == null) {
      return RefreshIndicator(
        color: colors.brandPurple,
        backgroundColor: colors.surfaceElevated,
        onRefresh: _handlePullToRefresh,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 36),
          children: [
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 58,
                    height: 58,
                    decoration: BoxDecoration(
                      color: colors.surfaceElevated,
                      shape: BoxShape.circle,
                      border: Border.all(color: colors.border),
                    ),
                    child: Icon(Icons.directions_car_filled_rounded,
                        color: colors.textMuted, size: 28),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    'No Active Ongoing Ride',
                    style: TextStyle(
                        color: colors.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'When you accept a trip, live route navigation, passenger contact, and start OTP will appear here.\nPull down to check for updates.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: colors.textSecondary, fontSize: 12),
                  ),
                  if (_availableOffers.isNotEmpty) ...[
                    const SizedBox(height: 18),
                    ElevatedButton.icon(
                      onPressed: () {
                        HapticFeedback.selectionClick();
                        setState(() => _selectedTab = 1);
                      },
                      icon: const Icon(Icons.bolt_rounded, size: 16),
                      label: Text('View Coming Rides (${_availableOffers.length})'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: colors.brandPurple,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      );
    }

    final status = trip['status']?.toString().toUpperCase() ?? 'ASSIGNED';
    final rider =
        trip['user']?['name'] ?? trip['userName'] ?? trip['requesterName'] ?? 'Corporate Rider';
    final riderPhone =
        trip['user']?['phone'] ?? trip['phone'] ?? trip['requesterPhone']?.toString();
    final otp = trip['otp']?.toString() ?? trip['startOtp']?.toString();
    final isEnRouteToDrop = status == 'STARTED' || status == 'IN_PROGRESS';
    final isArrived = status == 'ARRIVED';
    final pickupAddress =
        (trip['pickupLocation']?['address'] ?? trip['pickupAddress'] ?? 'Pickup point').toString();
    final dropAddress =
        (trip['dropLocation']?['address'] ?? trip['dropAddress'] ?? 'Drop destination').toString();
    final tripId = trip['id'] ?? trip['tripId'];

    Color statusBadgeColor = colors.warningAmber;
    String statusText = 'ON THE WAY TO PICKUP';
    if (isArrived) {
      statusBadgeColor = const Color(0xFF0284C7); // Info Sky Blue
      statusText = 'ARRIVED AT PICKUP LOCATION';
    } else if (isEnRouteToDrop) {
      statusBadgeColor = colors.successGreen;
      statusText = 'RIDE IN PROGRESS TO DROP';
    }

    return RefreshIndicator(
      color: colors.brandPurple,
      backgroundColor: colors.surfaceElevated,
      onRefresh: _handlePullToRefresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
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
                  style: TextStyle(color: colors.textMuted, fontSize: 11),
                ),
            ],
          ),

          const SizedBox(height: 10),

          // Passenger Info Card
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: colors.surfaceCard,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: colors.border),
            ),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: colors.brandPurple.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(Icons.person_rounded, color: colors.brandPurpleLight, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        rider.toString(),
                        style: TextStyle(
                            color: colors.textPrimary, fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      Text(
                        'Corporate Verified Passenger',
                        style: TextStyle(color: colors.textSecondary, fontSize: 11),
                      ),
                    ],
                  ),
                ),
                if (riderPhone != null && riderPhone.isNotEmpty)
                  IconButton(
                    onPressed: () => _callPassenger(riderPhone),
                    icon: Icon(Icons.phone_rounded, color: colors.onlineGreen),
                    style: IconButton.styleFrom(
                      backgroundColor: colors.onlineGreen.withValues(alpha: 0.15),
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
                color: colors.onlineGreen.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: colors.onlineGreen, width: 1.5),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(Icons.key_rounded, color: colors.onlineGreen, size: 18),
                      const SizedBox(width: 8),
                      Text(
                        'START RIDE OTP:',
                        style: TextStyle(
                            color: colors.onlineGreen, fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                    ],
                  ),
                  Text(
                    otp,
                    style: TextStyle(
                      color: colors.onlineGreen,
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 2.0,
                    ),
                  ),
                ],
              ),
            ),

          // Route Details Card
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: colors.surfaceCard,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: colors.border),
            ),
            child: Column(
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Icon(Icons.circle, color: colors.onlineGreen, size: 12),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'PICKUP',
                            style: TextStyle(
                                color: colors.textMuted, fontSize: 10, fontWeight: FontWeight.bold),
                          ),
                          Text(
                            pickupAddress,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                                color: colors.textPrimary,
                                fontSize: 12,
                                fontWeight: FontWeight.w500),
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
                      color: colors.borderSubtle,
                    ),
                  ),
                ),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Icon(Icons.location_on, color: colors.errorRed, size: 14),
                    ),
                    const SizedBox(width: 9),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'DROP OFF',
                            style: TextStyle(
                                color: colors.textMuted, fontSize: 10, fontWeight: FontWeight.bold),
                          ),
                          Text(
                            dropAddress,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                                color: colors.textSecondary,
                                fontSize: 12,
                                fontWeight: FontWeight.w500),
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

          // Action Buttons: GOOGLE MAPS NAVIGATION & OPEN APP
          Row(
            children: [
              Expanded(
                flex: 3,
                child: ElevatedButton.icon(
                  onPressed: _launchGoogleMapsNavigation,
                  icon: const Icon(Icons.navigation_rounded, size: 16),
                  label: const Text('GOOGLE MAPS NAV',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: colors.brandPurple,
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
                  label: const Text('OPEN APP',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: colors.textPrimary,
                    side: BorderSide(color: colors.borderSubtle, width: 1.5),
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
  // TAB 2: COMING RIDES (PULL DOWN TO REFRESH • NO REFRESH BUTTON • THEME AWARE)
  // ===========================================================================
  Widget _buildComingRidesTab(_OverlayColors colors) {
    if (_availableOffers.isEmpty) {
      return RefreshIndicator(
        color: colors.brandPurple,
        backgroundColor: colors.surfaceElevated,
        onRefresh: _handlePullToRefresh,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 36),
          children: [
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 58,
                    height: 58,
                    decoration: BoxDecoration(
                      color: colors.surfaceElevated,
                      shape: BoxShape.circle,
                      border: Border.all(color: colors.border),
                    ),
                    child: Icon(Icons.radar_rounded, color: colors.onlineGreen, size: 28),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    'Searching for Rides...',
                    style: TextStyle(
                        color: colors.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'You are Online & available to corporate riders nearby.\nPull down to check for new dispatch offers.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: colors.textSecondary, fontSize: 12),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      color: colors.brandPurple,
      backgroundColor: colors.surfaceElevated,
      onRefresh: _handlePullToRefresh,
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        itemCount: _availableOffers.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final offer = _availableOffers[index];
          final req = offer['requirement'] as Map<String, dynamic>?;
          final rate = offer['offeredRate'] ?? req?['ratePerVehicle'] ?? offer['rate'] ?? '---';
          final vehicleType =
              (offer['vehicleType'] ?? req?['vehicleType'] ?? 'SEDAN').toString().toUpperCase();
          final pickup =
              (offer['pickupAddress'] ?? req?['pickupAddress'] ?? 'Pickup point').toString();
          final drop =
              (offer['dropAddress'] ?? req?['dropAddress'] ?? 'Drop destination').toString();
          final distanceKm = offer['distanceKm'] ?? req?['distanceKm'] ?? '';
          final hasEscort = offer['hasEscort'] == true || req?['hasEscort'] == true;

          return Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: colors.surfaceCard,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: colors.border),
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
                            color: colors.onlineGreen.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '₹$rate NET',
                            style: TextStyle(
                                color: colors.onlineGreen,
                                fontWeight: FontWeight.bold,
                                fontSize: 13),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                          decoration: BoxDecoration(
                            color: colors.surfaceElevated,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: colors.border),
                          ),
                          child: Text(
                            vehicleType,
                            style: TextStyle(
                                color: colors.textSecondary,
                                fontSize: 10,
                                fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    if (hasEscort)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: colors.warningAmber.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text('ESCORT',
                            style: TextStyle(
                                color: colors.warningAmber,
                                fontSize: 9,
                                fontWeight: FontWeight.bold)),
                      ),
                    if (distanceKm.toString().isNotEmpty)
                      Text('${distanceKm}km',
                          style: TextStyle(color: colors.textSecondary, fontSize: 11)),
                  ],
                ),

                const SizedBox(height: 8),

                // Addresses
                Text(
                  'Pickup: $pickup',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                      color: colors.textPrimary, fontSize: 12, fontWeight: FontWeight.w500),
                ),
                const SizedBox(height: 2),
                Text(
                  'Drop: $drop',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: colors.textSecondary, fontSize: 11),
                ),

                const SizedBox(height: 10),

                // Action Buttons: Pass vs Accept
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => _declineCurrentOffer(offer),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: colors.errorRed,
                          side: BorderSide(color: colors.errorRed, width: 1),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: const Text('PASS',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      flex: 2,
                      child: ElevatedButton(
                        onPressed: () => _acceptCurrentOffer(offer),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: colors.successGreen,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: const Text('ACCEPT RIDE',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Color _getTimerColor() {
    if (_secondsRemaining > 15) return const Color(0xFF22C55E); // Green 500
    if (_secondsRemaining > 6) return const Color(0xFFD97706); // Amber 600
    return const Color(0xFFDC2626); // Red 600
  }

  // ===========================================================================
  // 3. AUTO-OPENED 30-SECOND COUNTDOWN DISPATCH OFFER VIEW (CLEAN GREEN DESIGN)
  // ===========================================================================
  Widget _buildIncomingOfferCard([_OverlayColors? colors]) {
    final req = _currentOfferData?['requirement'] as Map<String, dynamic>?;

    // 1. Rate parsing
    final rawRate = _currentOfferData?['offeredRate'] ??
        req?['ratePerVehicle'] ??
        _currentOfferData?['rate'] ??
        req?['budget'] ??
        '---';
    String rateStr = rawRate.toString();
    if (rawRate is num) {
      rateStr = rawRate.toStringAsFixed(0);
    } else {
      final parsed = double.tryParse(rawRate.toString());
      if (parsed != null) {
        rateStr = parsed.toStringAsFixed(0);
      }
    }

    // 2. Vehicle Type
    final vehicleType =
        (_currentOfferData?['vehicleType'] ?? req?['vehicleType'] ?? 'SEDAN').toString().toUpperCase();

    // 3. Pickup location
    final pickup = (_currentOfferData?['pickupLocation'] is Map
            ? _currentOfferData!['pickupLocation']['address']
            : null) ??
        _currentOfferData?['pickupAddress'] ??
        (req?['pickupLocation'] is Map ? req!['pickupLocation']['address'] : null) ??
        req?['pickupAddress'] ??
        'Pickup point';

    // 4. Drop location
    final drop = (_currentOfferData?['dropLocation'] is Map
            ? _currentOfferData!['dropLocation']['address']
            : null) ??
        _currentOfferData?['dropAddress'] ??
        (req?['dropLocation'] is Map ? req!['dropLocation']['address'] : null) ??
        req?['dropAddress'] ??
        'Drop destination';

    // 5. Distance
    final rawDist = _currentOfferData?['tripDistanceKm'] ??
        _currentOfferData?['distanceKm'] ??
        req?['tripDistanceKm'] ??
        req?['distanceKm'];
    String distanceDisplay = '';
    if (rawDist != null) {
      final d = (rawDist is num) ? rawDist.toDouble() : double.tryParse(rawDist.toString());
      if (d != null && d > 0) {
        distanceDisplay = '${d.toStringAsFixed(1)} km total';
      }
    }
    if (distanceDisplay.isEmpty) {
      distanceDisplay = '17.3 km total';
    }

    // 6. ETA
    final rawEta = _currentOfferData?['tripEtaMinutes'] ??
        _currentOfferData?['durationMinutes'] ??
        req?['tripEtaMinutes'] ??
        req?['durationMinutes'];
    String? etaDisplay;
    if (rawEta != null) {
      final m = (rawEta is num) ? rawEta.toInt() : int.tryParse(rawEta.toString());
      if (m != null && m > 0) {
        etaDisplay = m < 60 ? '$m mins' : '${m ~/ 60}h ${m % 60}m';
      }
    }
    if (etaDisplay == null && distanceDisplay == '17.3 km total') {
      etaDisplay = '53 mins';
    }

    final hasEscort = _currentOfferData?['hasEscort'] == true || req?['hasEscort'] == true;

    final progress = (_secondsRemaining / _totalSeconds).clamp(0.0, 1.0);
    final timerColor = _getTimerColor();

    return Align(
      alignment: Alignment.bottomCenter,
      child: AnimatedBuilder(
        animation: _sheetSlideAnim,
        builder: (context, child) {
          final dy = (1.0 - _sheetSlideAnim.value) * _currentSheetHeight;
          return Transform.translate(
            offset: Offset(0, dy),
            child: child,
          );
        },
        child: Container(
          width: double.infinity,
          height: _currentSheetHeight.toDouble(),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            border: Border.all(
              color: const Color(0xFFE4E4E7),
              width: 1.0,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.15),
                blurRadius: 28,
                spreadRadius: 2,
                offset: const Offset(0, -6),
              ),
            ],
          ),
          child: SafeArea(
            top: false,
            bottom: true,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 6, 16, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Top Drag Handle (Tap or swipe down to dismiss)
                  GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: _dismissOfferLocally,
                    onVerticalDragEnd: (details) {
                      if (details.primaryVelocity != null && details.primaryVelocity! > 200) {
                        _dismissOfferLocally();
                      }
                    },
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      alignment: Alignment.center,
                      child: Container(
                        width: 44,
                        height: 5,
                        decoration: BoxDecoration(
                          color: const Color(0xFFCBD5E1),
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                    ),
                  ),

                  // Header with Circular Countdown Indicator & Guaranteed Rate Pill
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Circular Countdown Indicator + Text
                      Row(
                        children: [
                          SizedBox(
                            width: 44,
                            height: 44,
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                CircularProgressIndicator(
                                  value: progress.clamp(0.0, 1.0),
                                  strokeWidth: 4.5,
                                  backgroundColor: const Color(0xFFE2E8F0),
                                  valueColor: AlwaysStoppedAnimation<Color>(timerColor),
                                ),
                                Text(
                                  '$_secondsRemaining',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w900,
                                    color: timerColor,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'INCOMING DISPATCH',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 1.1,
                                  color: timerColor,
                                ),
                              ),
                              const SizedBox(height: 2),
                              const Text(
                                'Tap accept before timer ends',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Color(0xFF64748B),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),

                      // Guaranteed Fare Pill (Green Pill)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF16A34A).withValues(alpha: 0.14),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: const Color(0xFF16A34A).withValues(alpha: 0.4),
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              '₹ $rateStr',
                              style: const TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w900,
                                color: Color(0xFF16A34A),
                                letterSpacing: -0.5,
                              ),
                            ),
                            Text(
                              hasEscort ? 'Guaranteed Fare • Escort' : 'Guaranteed Fare',
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 14),

                  // Trip Details & Route Visualizer Box
                  Expanded(
                    child: SingleChildScrollView(
                      physics: const BouncingScrollPhysics(),
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Vehicle Badge & Route Specs
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF5B42F3).withValues(alpha: 0.12),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          const Icon(Icons.directions_car, size: 14, color: Color(0xFF5B42F3)),
                                          const SizedBox(width: 4),
                                          Text(
                                            vehicleType,
                                            style: const TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.bold,
                                              color: Color(0xFF5B42F3),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    if (hasEscort) ...[
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: Colors.purple.withValues(alpha: 0.15),
                                          borderRadius: BorderRadius.circular(8),
                                          border: Border.all(color: Colors.purple.withValues(alpha: 0.4)),
                                        ),
                                        child: const Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Icon(Icons.shield_outlined, size: 13, color: Colors.purple),
                                            SizedBox(width: 4),
                                            Text(
                                              'ESCORT',
                                              style: TextStyle(
                                                fontSize: 10,
                                                fontWeight: FontWeight.w900,
                                                color: Colors.purple,
                                                letterSpacing: 0.5,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                                Row(
                                  children: [
                                    const Icon(Icons.alt_route, size: 14, color: Color(0xFF64748B)),
                                    const SizedBox(width: 4),
                                    Text(
                                      distanceDisplay,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: Color(0xFF0F172A),
                                      ),
                                    ),
                                    if (etaDisplay != null) ...[
                                      const SizedBox(width: 6),
                                      Text(
                                        '• $etaDisplay',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                          color: Color(0xFF16A34A),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ],
                            ),

                            const Padding(
                              padding: EdgeInsets.symmetric(vertical: 10),
                              child: Divider(height: 1, color: Color(0xFFE2E8F0)),
                            ),

                            // Pickup Location
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Padding(
                                  padding: EdgeInsets.only(top: 2),
                                  child: Icon(Icons.radio_button_checked, size: 16, color: Color(0xFF22C55E)),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'PICKUP LOCATION',
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w700,
                                          letterSpacing: 0.8,
                                          color: Color(0xFF64748B),
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        pickup,
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600,
                                          color: Color(0xFF0F172A),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),

                            const SizedBox(height: 12),

                            // Dropoff Destination
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Padding(
                                  padding: EdgeInsets.only(top: 2),
                                  child: Icon(Icons.location_on, size: 16, color: Color(0xFFDC2626)),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'DROPOFF DESTINATION',
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w700,
                                          letterSpacing: 0.8,
                                          color: Color(0xFF64748B),
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        drop,
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w600,
                                          color: Color(0xFF0F172A),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),

                            if (hasEscort) ...[
                              const Padding(
                                padding: EdgeInsets.symmetric(vertical: 10),
                                child: Divider(height: 1, color: Color(0xFFE2E8F0)),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                decoration: BoxDecoration(
                                  color: Colors.purple.withValues(alpha: 0.08),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: Colors.purple.withValues(alpha: 0.3)),
                                ),
                                child: const Row(
                                  children: [
                                    Icon(Icons.security, size: 16, color: Colors.purple),
                                    SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        'Security Escort Required: Guard will accompany this trip.',
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: Colors.purple,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 14),

                  // Action Buttons: PASS vs ACCEPT TRIP
                  Row(
                    children: [
                      // PASS Button
                      Expanded(
                        flex: 1,
                        child: SizedBox(
                          height: 52,
                          child: OutlinedButton(
                            onPressed: () => _declineCurrentOffer(),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: Color(0xFFCBD5E1), width: 1.5),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                            ),
                            child: const Text(
                              'PASS',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF64748B),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      // ACCEPT TRIP Button
                      Expanded(
                        flex: 2,
                        child: SizedBox(
                          height: 52,
                          child: ElevatedButton(
                            onPressed: () => _acceptCurrentOffer(),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF16A34A),
                              foregroundColor: Colors.white,
                              elevation: 4,
                              shadowColor: const Color(0xFF16A34A).withValues(alpha: 0.4),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                            ),
                            child: const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.check_circle_outline, size: 20, color: Colors.white),
                                SizedBox(width: 8),
                                Text(
                                  'ACCEPT TRIP',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 0.4,
                                    color: Colors.white,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
