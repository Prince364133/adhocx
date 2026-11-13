import 'dart:async';
import 'dart:convert';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_overlay_window/flutter_overlay_window.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:vibration/vibration.dart';
import '../dispatch_overlay/incoming_requirement_bottom_sheet.dart';
import '../../shared/theme/app_theme.dart';

/// Top-level Entry Point for the Floating Assistive Overlay Window.
/// Runs in a dedicated background Flutter isolate directly on the Android WindowManager.
@pragma("vm:entry-point")
void overlayMain() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      home: const DriverAssistiveBubbleOverlay(),
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

  // Dynamic Driver Metadata & Theme (defaults to clean light theme to match app)
  String _driverName = '';
  String _appThemeMode = 'light';

  // State Data
  Map<String, dynamic>? _activeTripData;
  List<Map<String, dynamic>> _availableOffers = [];
  Map<String, dynamic>? _currentOfferData;

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
          _appThemeMode = (storedTheme != null && storedTheme.isNotEmpty) ? storedTheme.toLowerCase() : 'light';
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
        final tMode = msg['themeMode'].toString().trim().toLowerCase();
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
    final incomingOfferId = (offerData['id'] ?? offerData['offerId'])?.toString();
    if (_isOfferActive && incomingOfferId != null &&
        incomingOfferId == (_currentOfferData?['id'] ?? _currentOfferData?['offerId'])?.toString()) {
      return;
    }

    setState(() {
      _currentOfferData = offerData;
      _isOfferActive = true;
      _isBallVisible = false;
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

  }

  Future<void> _dismissOfferLocally() async {
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

  Future<void> _finishOverlayOffer(String outcome) async {
    final offerId = (_currentOfferData?['id'] ?? _currentOfferData?['offerId'])?.toString();
    if (offerId != null && offerId.isNotEmpty) {
      try {
        await FlutterOverlayWindow.shareData(jsonEncode({
          'action': 'OFFER_ACTION_COMPLETED',
          'offerId': offerId,
          'outcome': outcome,
        }));
      } catch (e) {
        debugPrint('⚠️ [Overlay] Could not sync offer outcome: $e');
      }
    }

    await _dismissOfferLocally();
    if (outcome == 'accepted') {
      await _bringAppToFront();
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
    if (_appThemeMode == 'system') {
      return MediaQuery.maybeOf(context)?.platformBrightness == Brightness.dark;
    }
    return false;
  }

  @override
  void dispose() {
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
          ? _buildIncomingOfferCard()
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
                          // Open App in Foreground
                          IconButton(
                            tooltip: 'Open AdhocX App',
                            icon: Icon(Icons.open_in_new_rounded,
                                color: colors.textSecondary, size: 20),
                            onPressed: _bringAppToFront,
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

                // Main Content (Ongoing Ride View / Empty State with Pull to Refresh)
                Expanded(
                  child: _buildOngoingRideTab(colors),
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

  Widget _buildIncomingOfferCard() {
    final offer = _currentOfferData;
    if (offer == null) return const SizedBox.shrink();

    return Align(
      alignment: Alignment.bottomCenter,
      child: AnimatedBuilder(
        animation: _sheetSlideAnim,
        builder: (context, child) {
          final dy = (1.0 - _sheetSlideAnim.value) * _currentSheetHeight;
          return Transform.translate(offset: Offset(0, dy), child: child);
        },
        child: SizedBox(
          width: double.infinity,
          child: IncomingRequirementBottomSheet(
            key: ValueKey(offer['id'] ?? offer['offerId']),
            offerData: offer,
            overlayPresentation: true,
            onOverlayAccepted: () => unawaited(_finishOverlayOffer('accepted')),
            onOverlayDeclined: () => unawaited(_finishOverlayOffer('declined')),
            onOverlayExpired: () => unawaited(_finishOverlayOffer('expired')),
          ),
        ),
      ),
    );
  }

}
