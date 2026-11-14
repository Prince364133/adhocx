import 'dart:async';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../services/live_location_hub.dart';
import '../../services/location_service.dart';
import '../../services/permission_service.dart';
import '../../shared/maps/map_assets.dart';
import '../../shared/maps/map_geo.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';

/// One screen for picking a location: search and pinpoint together (ride-hailing style).
///
/// - A full-screen Google map with a fixed centre pin. The pin tip is the chosen coordinate. Drag,
///   pinch or double-tap the map; the pin lifts while moving and drops on idle.
/// - The address under the pin is resolved once the camera settles (debounced, stale results dropped).
/// - The search bar on top opens a panel on the same screen: recents, current location, popular
///   places, live Places results. Picking a result flies the map there so the vendor can fine-tune
///   the exact gate before confirming.
///
/// Returns `LocationModel.toMap()` via `context.pop` (same contract as before).
class UniversalLocationPickerScreen extends StatefulWidget {
  final String title;
  final String? initialAddress;
  final double? initialLat;
  final double? initialLng;

  /// true: open on the map. false: open with the search panel focused (map stays behind it).
  final bool startOnMap;

  const UniversalLocationPickerScreen({
    super.key,
    this.title = 'Search Location',
    this.initialAddress,
    this.initialLat,
    this.initialLng,
    this.startOnMap = false,
  });

  @override
  State<UniversalLocationPickerScreen> createState() => _UniversalLocationPickerScreenState();
}

class _UniversalLocationPickerScreenState extends State<UniversalLocationPickerScreen> {
  static const double _pinZoom = 17.5;
  static const Duration _geocodeDebounce = Duration(milliseconds: 350);
  static const Duration _searchDebounce = Duration(milliseconds: 280);

  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocus = FocusNode();
  final LocationService _locationService = LocationService.instance;

  // Map / pin
  GoogleMapController? _map;
  late LatLng _target; // live camera target (= pin tip)
  bool _cameraMoving = false;
  bool _programmaticMove = false;
  bool _pinMovedByUser = false;
  bool _pinOnFallback = false;

  // Address under the pin
  String _pinAddress = '';
  LocationModel? _pinPlace; // a search result / recent that sits exactly under the pin
  LatLng? _geocodedAt;
  bool _isGeocoding = false;
  int _geocodeSeq = 0;
  Timer? _geocodeTimer;

  // Search panel
  bool _searchOpen = false;
  List<LocationModel> _searchResults = [];
  List<LocationModel> _recentLocations = [];
  List<LocationModel> _categoryPlaces = [];
  bool _isLoadingSearch = false;
  bool _isLoadingCategoryPlaces = false;
  String _selectedCategory = 'All';
  int _searchSeq = 0;
  Timer? _searchTimer;

  // Device location
  bool _isFetchingGps = false;
  bool _hasLocationPermission = false;
  String? _currentCity;
  double? _currentLat;
  double? _currentLng;

  static const List<String> _categories = [
    'All',
    'Airports',
    'Tech Parks',
    'Railway Stations',
    'Metro Hubs',
    'Commercial Hubs',
    'Hospitals',
    'Hotels',
  ];

  @override
  void initState() {
    super.initState();
    final hasInitial = MapGeo.isKnown(widget.initialLat, widget.initialLng);
    final last = LiveLocationHub.instance.latest;
    if (hasInitial) {
      _target = LatLng(widget.initialLat!, widget.initialLng!);
      _currentLat = widget.initialLat;
      _currentLng = widget.initialLng;
    } else if (last != null) {
      _target = LatLng(last.latitude, last.longitude);
    } else {
      _target = MapAssets.indiaFallback.target;
      _pinOnFallback = true;
    }
    final initialAddress = widget.initialAddress?.trim() ?? '';
    if (hasInitial && initialAddress.isNotEmpty) {
      _pinAddress = initialAddress;
      _geocodedAt = _target;
    }
    _searchOpen = !widget.startOnMap;
    _searchController.addListener(_onSearchChanged);
    _loadInitialData();
    if (_pinAddress.isEmpty && !_pinOnFallback) _scheduleGeocode(immediate: true);
  }

  @override
  void dispose() {
    _geocodeTimer?.cancel();
    _searchTimer?.cancel();
    _searchController.dispose();
    _searchFocus.dispose();
    super.dispose();
  }

  // ── Camera & pin ────────────────────────────────────────────────────────

  Future<void> _flyTo(LatLng p, {double? zoom}) async {
    _target = p;
    final map = _map;
    if (map == null) {
      setState(() {});
      return;
    }
    _programmaticMove = true;
    try {
      await map.animateCamera(
        zoom == null ? CameraUpdate.newLatLng(p) : CameraUpdate.newLatLngZoom(p, zoom),
        duration: const Duration(milliseconds: 650),
      );
    } catch (_) {
      _programmaticMove = false;
    }
  }

  void _onCameraMoveStarted() {
    if (!_programmaticMove) {
      _pinMovedByUser = true;
      _pinOnFallback = false;
      _pinPlace = null; // vendor is fine-tuning: the address must come from the new pin position
    }
    _geocodeTimer?.cancel();
    setState(() => _cameraMoving = true);
  }

  void _onCameraMove(CameraPosition pos) => _target = pos.target; // every frame: no setState

  void _onCameraIdle() {
    _programmaticMove = false;
    setState(() => _cameraMoving = false);
    final place = _pinPlace;
    if (place != null && MapGeo.distanceM(_target, LatLng(place.latitude, place.longitude)) < 20) {
      // A chosen search result sits under the pin: keep its name, skip the lookup.
      _geocodeSeq++;
      setState(() {
        _pinAddress = place.fullAddress;
        _geocodedAt = _target;
        _isGeocoding = false;
      });
      return;
    }
    _scheduleGeocode(); // no-op for sub-8 m nudges when an address is already shown
  }

  /// Resolves the address under the pin. Skips tiny moves; a late answer for an old pin is dropped.
  void _scheduleGeocode({bool immediate = false}) {
    final at = _target;
    final last = _geocodedAt;
    if (!immediate && last != null && _pinAddress.isNotEmpty && MapGeo.distanceM(at, last) < 8) return;
    final seq = ++_geocodeSeq;
    _geocodeTimer?.cancel();
    setState(() => _isGeocoding = true);
    _geocodeTimer = Timer(immediate ? Duration.zero : _geocodeDebounce, () async {
      String address = '';
      try {
        address = (await _locationService.reverseGeocode(at.latitude, at.longitude)).fullAddress;
      } catch (_) {}
      if (!mounted || seq != _geocodeSeq) return;
      setState(() {
        _pinAddress = address;
        _geocodedAt = at;
        _isGeocoding = false;
      });
    });
  }

  Future<void> _centerOnGps() async {
    if (_isFetchingGps) return;
    setState(() => _isFetchingGps = true);
    try {
      if (!kIsWeb && !await PermissionService.instance.isLocationServiceEnabled()) {
        _snack(
          'Device location (GPS) is turned off.',
          action: SnackBarAction(label: 'Turn On', onPressed: () => PermissionService.instance.openLocationSettings()),
        );
        return;
      }
      final pos = await PermissionService.instance.getCurrentPosition(requestIfDenied: true);
      if (!mounted) return;
      if (pos == null) {
        final granted = await PermissionService.instance.isLocationPermissionGranted();
        _snack(
          granted
              ? 'Could not get a GPS fix. Try again in the open.'
              : 'Location permission is needed to use your current location.',
          action: granted ? null : SnackBarAction(label: 'Settings', onPressed: () => Geolocator.openAppSettings()),
        );
        return;
      }
      _hasLocationPermission = true;
      _currentLat = pos.latitude;
      _currentLng = pos.longitude;
      _pinPlace = null;
      _pinOnFallback = false;
      _pinMovedByUser = true;
      _closeSearch();
      await _flyTo(LatLng(pos.latitude, pos.longitude), zoom: _pinZoom);
      if (_map == null) _scheduleGeocode(immediate: true);
    } catch (e) {
      debugPrint('GPS centre error: $e');
    } finally {
      if (mounted) setState(() => _isFetchingGps = false);
    }
  }

  void _confirm() {
    if (_isGeocoding || _cameraMoving) return;
    final place = _pinPlace;
    if (place != null && MapGeo.distanceM(_target, LatLng(place.latitude, place.longitude)) < 20) {
      _finish(place);
      return;
    }
    final address = _pinAddress;
    _finish(LocationModel(
      title: address.isNotEmpty ? address.split(',').first.trim() : 'Pinned location',
      fullAddress: address.isNotEmpty
          ? address
          : 'Lat: ${_target.latitude.toStringAsFixed(5)}, Lng: ${_target.longitude.toStringAsFixed(5)}',
      latitude: _target.latitude,
      longitude: _target.longitude,
      category: 'PINPOINT',
      icon: Icons.pin_drop_rounded,
    ));
  }

  Future<void> _finish(LocationModel loc) async {
    await _locationService.saveRecentLocation(loc);
    if (!mounted) return;
    context.pop(loc.toMap());
  }

  // ── Search ──────────────────────────────────────────────────────────────

  void _openSearch() {
    setState(() => _searchOpen = true);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _searchFocus.requestFocus();
    });
  }

  void _closeSearch() {
    _searchFocus.unfocus();
    if (_searchOpen) setState(() => _searchOpen = false);
  }

  /// Search result / recent / popular place → fly the pin there; the vendor confirms (or fine-tunes).
  void _choosePlace(LocationModel loc) {
    _closeSearch();
    _pinPlace = loc;
    _pinOnFallback = false;
    _pinMovedByUser = true;
    setState(() {
      _pinAddress = loc.fullAddress;
      _geocodedAt = LatLng(loc.latitude, loc.longitude);
      _isGeocoding = false;
    });
    _geocodeSeq++;
    _flyTo(LatLng(loc.latitude, loc.longitude), zoom: _pinZoom);
  }

  void _onSearchChanged() {
    final text = _searchController.text.trim();
    _searchTimer?.cancel();
    if (text.length < 2) {
      _searchSeq++;
      if (_searchResults.isNotEmpty || _isLoadingSearch) {
        setState(() {
          _searchResults = [];
          _isLoadingSearch = false;
        });
      } else {
        setState(() {});
      }
      return;
    }
    final seq = ++_searchSeq;
    setState(() => _isLoadingSearch = true);
    _searchTimer = Timer(_searchDebounce, () async {
      // Bias results to where the pin is (or the device), not a fixed city.
      final results = await _locationService.searchLocations(text, lat: _target.latitude, lon: _target.longitude);
      if (!mounted || seq != _searchSeq) return;
      setState(() {
        _searchResults = results;
        _isLoadingSearch = false;
      });
    });
  }

  Future<void> _loadInitialData() async {
    final recents = await _locationService.getRecentLocations();
    if (mounted) setState(() => _recentLocations = recents);

    try {
      if (await PermissionService.instance.isLocationPermissionGranted()) {
        final pos = await PermissionService.instance.getCurrentPosition(requestIfDenied: false);
        if (pos != null && mounted) {
          _hasLocationPermission = true;
          _currentLat = pos.latitude;
          _currentLng = pos.longitude;
          if (_pinOnFallback && !_pinMovedByUser) {
            _pinOnFallback = false;
            await _flyTo(LatLng(pos.latitude, pos.longitude), zoom: _pinZoom);
            if (_map == null) _scheduleGeocode(immediate: true);
          }
          final rev = await _locationService.reverseGeocode(pos.latitude, pos.longitude);
          if (rev.city != null && rev.city!.isNotEmpty) _currentCity = rev.city;
        }
      }
    } catch (e) {
      debugPrint('Location detection error: $e');
    }
    if (_currentCity == null && _currentLat != null && _currentLng != null) {
      try {
        final rev = await _locationService.reverseGeocode(_currentLat!, _currentLng!);
        if (rev.city != null && rev.city!.isNotEmpty) _currentCity = rev.city;
      } catch (_) {}
    }
    if (!_hasLocationPermission && (_currentCity == null || _currentCity!.isEmpty)) _currentCity = 'Hyderabad';
    await _loadCategoryPlaces(_selectedCategory);
  }

  Future<void> _loadCategoryPlaces(String category) async {
    if (mounted) {
      setState(() {
        _selectedCategory = category;
        _isLoadingCategoryPlaces = true;
      });
    }
    final places = await _locationService.fetchCategoryPlaces(
      category,
      lat: _currentLat,
      lon: _currentLng,
      cityName: _hasLocationPermission ? _currentCity : 'Hyderabad',
    );
    if (mounted && _selectedCategory == category) {
      setState(() {
        _categoryPlaces = places;
        _isLoadingCategoryPlaces = false;
      });
    }
  }

  void _snack(String text, {SnackBarAction? action}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(text), action: action, duration: const Duration(seconds: 4)));
  }

  // ── Build ───────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return PopScope(
      canPop: !_searchOpen,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && _searchOpen) _closeSearch(); // back closes the search panel first
      },
      child: Scaffold(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        resizeToAvoidBottomInset: false,
        body: Stack(
          children: [
            Column(
              children: [
                Expanded(child: _buildMapArea(isDark)),
                _buildConfirmSheet(isDark),
              ],
            ),
            // Search panel slides over the map on the same screen.
            Positioned.fill(
              child: IgnorePointer(
                ignoring: !_searchOpen,
                child: AnimatedOpacity(
                  opacity: _searchOpen ? 1 : 0,
                  duration: const Duration(milliseconds: 180),
                  child: AnimatedSlide(
                    offset: _searchOpen ? Offset.zero : const Offset(0, 0.04),
                    duration: const Duration(milliseconds: 220),
                    curve: Curves.easeOutCubic,
                    child: _buildSearchPanel(isDark),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMapArea(bool isDark) {
    final topInset = MediaQuery.paddingOf(context).top;
    return Stack(
      children: [
        Positioned.fill(
          child: MapAssets.nativeMapsAvailable
              ? GoogleMap(
                  initialCameraPosition: CameraPosition(target: _target, zoom: _pinOnFallback ? 12 : _pinZoom),
                  style: MapAssets.styleFor(isDark ? Brightness.dark : Brightness.light),
                  onMapCreated: (c) => _map = c,
                  onCameraMoveStarted: _onCameraMoveStarted,
                  onCameraMove: _onCameraMove,
                  onCameraIdle: _onCameraIdle,
                  // The map sits under the floating search bar; keep Google's logo/legal visible.
                  padding: EdgeInsets.only(top: topInset + 64),
                  myLocationEnabled: _hasLocationPermission && !kIsWeb,
                  myLocationButtonEnabled: false,
                  zoomControlsEnabled: false,
                  mapToolbarEnabled: false,
                  compassEnabled: false,
                  rotateGesturesEnabled: false, // a rotated map makes "which gate" harder, not easier
                  tiltGesturesEnabled: false,
                  buildingsEnabled: true,
                  indoorViewEnabled: false,
                  minMaxZoomPreference: const MinMaxZoomPreference(4, 21),
                )
              : Container(color: isDark ? AppColors.surfaceElevatedDark : AppColors.borderLight),
        ),

        // Fixed centre pin. Map padding only shifts the camera centre down by topInset+64,
        // so offset the pin by the same half-amount to keep its tip on the exact target.
        Positioned.fill(
          child: IgnorePointer(
            child: Padding(
              padding: EdgeInsets.only(top: topInset + 64),
              child: Center(child: _CenterPin(lifted: _cameraMoving, label: widget.title)),
            ),
          ),
        ),

        // Floating search bar.
        Positioned(
          top: topInset + 8,
          left: 12,
          right: 12,
          child: Row(
            children: [
              _circleButton(
                  isDark: isDark, icon: Icons.arrow_back_rounded, tooltip: 'Back', onTap: () => context.pop()),
              const SizedBox(width: 8),
              Expanded(child: _searchBarButton(isDark)),
            ],
          ),
        ),

        // Zoom + my-location controls.
        Positioned(
          right: 12,
          bottom: 16,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _circleButton(
                  isDark: isDark,
                  icon: Icons.add_rounded,
                  tooltip: 'Zoom in',
                  onTap: () => _map?.animateCamera(CameraUpdate.zoomIn())),
              const SizedBox(height: 8),
              _circleButton(
                  isDark: isDark,
                  icon: Icons.remove_rounded,
                  tooltip: 'Zoom out',
                  onTap: () => _map?.animateCamera(CameraUpdate.zoomOut())),
              const SizedBox(height: 12),
              FloatingActionButton(
                heroTag: 'map_picker_gps_btn',
                tooltip: 'Use my current location',
                backgroundColor: isDark ? AppColors.surfaceDark : Colors.white,
                foregroundColor: AppColors.primary,
                onPressed: _isFetchingGps ? null : _centerOnGps,
                child: _isFetchingGps
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.my_location_rounded),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _searchBarButton(bool isDark) {
    return Material(
      color: isDark ? AppColors.surfaceDark : Colors.white,
      elevation: 3,
      shadowColor: Colors.black26,
      borderRadius: BorderRadius.circular(AppRadius.md),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.md),
        onTap: _openSearch,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 13),
          child: Row(
            children: [
              Icon(Icons.search_rounded, color: AppColors.primary, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  widget.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildConfirmSheet(bool isDark) {
    final busy = _isGeocoding || _cameraMoving;
    final fg = isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight;
    final muted = isDark ? AppColors.textMutedDark : AppColors.textMutedLight;
    final place = _pinPlace;
    final title = place != null
        ? place.title
        : (_pinAddress.isNotEmpty ? _pinAddress.split(',').first.trim() : 'Move the map to place the pin');
    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.12), blurRadius: 12, offset: const Offset(0, -3))
        ],
      ),
      padding: const EdgeInsets.fromLTRB(AppSpacing.md, 14, AppSpacing.md, AppSpacing.md),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'SELECTED LOCATION',
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primary, letterSpacing: 0.6),
            ),
            const SizedBox(height: 8),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Padding(
                  padding: EdgeInsets.only(top: 2),
                  child: Icon(Icons.location_on_rounded, color: Color(0xFFEA4335), size: 22),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: busy
                      ? Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _skeletonLine(isDark, 160, 14),
                            const SizedBox(height: 8),
                            _skeletonLine(isDark, double.infinity, 11),
                            const SizedBox(height: 4),
                            Text('Locating…', style: TextStyle(fontSize: 11, color: muted)),
                          ],
                        )
                      : Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(title,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: AppTypography.h4(color: fg, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 2),
                            Text(
                              _pinAddress.isNotEmpty
                                  ? _pinAddress
                                  : '${_target.latitude.toStringAsFixed(5)}, ${_target.longitude.toStringAsFixed(5)}',
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontSize: 12, color: muted),
                            ),
                          ],
                        ),
                ),
                const SizedBox(width: 8),
                TextButton(onPressed: _openSearch, child: const Text('Change')),
              ],
            ),
            const SizedBox(height: 14),
            ElevatedButton(
              onPressed: busy || _pinOnFallback ? null : _confirm,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: const Text('Confirm Location', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _skeletonLine(bool isDark, double width, double height) => Container(
        width: width,
        height: height,
        decoration: BoxDecoration(
          color: isDark ? AppColors.slate700 : AppColors.slate200,
          borderRadius: BorderRadius.circular(4),
        ),
      );

  Widget _buildSearchPanel(bool isDark) {
    final query = _searchController.text.trim();
    final bg = isDark ? AppColors.bgDark : AppColors.bgLight;
    return Material(
      color: bg,
      child: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(4, 6, AppSpacing.md, 6),
              child: Row(
                children: [
                  IconButton(
                    tooltip: 'Back to map',
                    onPressed: _closeSearch,
                    icon: Icon(Icons.arrow_back_rounded,
                        color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                  ),
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                        borderRadius: BorderRadius.circular(AppRadius.md),
                        border: Border.all(color: AppColors.primary, width: 1.5),
                      ),
                      child: TextField(
                        controller: _searchController,
                        focusNode: _searchFocus,
                        autofocus: !widget.startOnMap,
                        textInputAction: TextInputAction.search,
                        decoration: InputDecoration(
                          hintText: 'Search ${widget.title.toLowerCase()}',
                          hintStyle: TextStyle(
                              fontSize: 14, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                          prefixIcon: Icon(Icons.search_rounded, color: AppColors.primary),
                          suffixIcon: _isLoadingSearch
                              ? const Padding(
                                  padding: EdgeInsets.all(14),
                                  child:
                                      SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                                )
                              : query.isNotEmpty
                                  ? IconButton(
                                      tooltip: 'Clear',
                                      icon: const Icon(Icons.cancel_rounded, size: 18),
                                      onPressed: _searchController.clear,
                                    )
                                  : null,
                          border: InputBorder.none,
                          contentPadding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // Always-available shortcuts (the two old "modes" collapse into these rows).
            _shortcutTile(
              isDark: isDark,
              icon: Icons.my_location_rounded,
              color: AppColors.primary,
              title: 'Use current location',
              subtitle: _isFetchingGps
                  ? 'Getting GPS fix…'
                  : (_hasLocationPermission && _currentCity != null
                      ? 'Near $_currentCity'
                      : 'Move the pin to where you are'),
              loading: _isFetchingGps,
              onTap: _centerOnGps,
            ),
            _shortcutTile(
              isDark: isDark,
              icon: Icons.pin_drop_rounded,
              color: const Color(0xFFEA4335),
              title: 'Set location on map',
              subtitle: 'Drag the map to the exact gate or entrance',
              onTap: _closeSearch,
            ),
            Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
            Expanded(child: query.length >= 2 ? _buildResults(isDark, query) : _buildSuggestions(isDark)),
          ],
        ),
      ),
    );
  }

  Widget _buildResults(bool isDark, String query) {
    if (_isLoadingSearch && _searchResults.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_searchResults.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.location_off_rounded, size: 44, color: AppColors.slate400),
              const SizedBox(height: 10),
              Text(
                'No places found for "$query"',
                textAlign: TextAlign.center,
                style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
              ),
              const SizedBox(height: 14),
              // A typed address with no hit has no real coordinates: the vendor must pin it.
              OutlinedButton.icon(
                onPressed: () {
                  _closeSearch();
                  _snack('Drag the map so the pin sits exactly on "$query", then confirm.');
                },
                icon: const Icon(Icons.pin_drop_rounded, size: 18),
                label: const Text('Pin it on the map'),
              ),
            ],
          ),
        ),
      );
    }
    return ListView.separated(
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      itemCount: _searchResults.length,
      separatorBuilder: (_, __) =>
          Divider(height: 1, indent: 64, color: isDark ? AppColors.borderDark : AppColors.borderLight),
      itemBuilder: (_, i) => _placeTile(isDark, _searchResults[i], trailing: Icons.north_west_rounded),
    );
  }

  Widget _buildSuggestions(bool isDark) {
    final fg = isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight;
    return ListView(
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      padding: const EdgeInsets.only(bottom: AppSpacing.lg),
      children: [
        if (_recentLocations.isNotEmpty) ...[
          Padding(
            padding: const EdgeInsets.fromLTRB(AppSpacing.md, 12, 4, 0),
            child: Row(
              children: [
                Expanded(child: Text('Recent', style: AppTypography.h4(color: fg, fontWeight: FontWeight.bold))),
                TextButton(
                  onPressed: () async {
                    await _locationService.clearRecentLocations();
                    if (mounted) setState(() => _recentLocations = []);
                  },
                  child: Text('Clear', style: TextStyle(fontSize: 12, color: AppColors.slate500)),
                ),
              ],
            ),
          ),
          ..._recentLocations.map((l) => _placeTile(isDark, l, leadingIcon: Icons.history_rounded)),
        ],
        Padding(
          padding: const EdgeInsets.fromLTRB(AppSpacing.md, 14, AppSpacing.md, 8),
          child: Text(
            _hasLocationPermission && _currentCity != null ? 'Popular near $_currentCity' : 'Popular places',
            style: AppTypography.h4(color: fg, fontWeight: FontWeight.bold),
          ),
        ),
        SizedBox(
          height: 36,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
            itemCount: _categories.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (_, i) {
              final cat = _categories[i];
              final selected = cat == _selectedCategory;
              return ChoiceChip(
                label: Text(cat),
                selected: selected,
                onSelected: (_) => _loadCategoryPlaces(cat),
                showCheckmark: false,
                selectedColor: AppColors.primary,
                labelStyle: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: selected ? Colors.white : fg),
              );
            },
          ),
        ),
        const SizedBox(height: 6),
        if (_isLoadingCategoryPlaces)
          const Padding(padding: EdgeInsets.all(AppSpacing.lg), child: Center(child: CircularProgressIndicator()))
        else
          ..._categoryPlaces.map((p) => _placeTile(isDark, p)),
      ],
    );
  }

  Widget _placeTile(bool isDark, LocationModel loc,
      {IconData? leadingIcon, IconData trailing = Icons.chevron_right_rounded}) {
    return ListTile(
      dense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 2),
      leading: CircleAvatar(
        radius: 18,
        backgroundColor: AppColors.primary.withValues(alpha: 0.12),
        child: Icon(leadingIcon ?? loc.icon, size: 18, color: AppColors.primary),
      ),
      title: Text(
        loc.title,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 14,
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
      ),
      subtitle: Text(
        loc.fullAddress,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(fontSize: 12, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
      ),
      trailing: Icon(trailing, size: 16, color: AppColors.slate400),
      onTap: () => _choosePlace(loc),
    );
  }

  Widget _shortcutTile({
    required bool isDark,
    required IconData icon,
    required Color color,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    bool loading = false,
  }) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
      leading: CircleAvatar(
        radius: 18,
        backgroundColor: color.withValues(alpha: 0.12),
        child: loading
            ? SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: color))
            : Icon(icon, size: 18, color: color),
      ),
      title: Text(title,
          style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 14,
              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight)),
      subtitle: Text(subtitle,
          style: TextStyle(fontSize: 12, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight)),
      onTap: loading ? null : onTap,
    );
  }

  Widget _circleButton(
      {required bool isDark, required IconData icon, required String tooltip, required VoidCallback onTap}) {
    return Material(
      color: isDark ? AppColors.surfaceDark : Colors.white,
      shape: const CircleBorder(),
      elevation: 3,
      shadowColor: Colors.black26,
      child: IconButton(
        tooltip: tooltip,
        onPressed: onTap,
        icon: Icon(icon, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
      ),
    );
  }
}

/// The fixed centre pin. Its tip is the exact centre of its parent; it lifts while the map moves.
class _CenterPin extends StatelessWidget {
  const _CenterPin({required this.lifted, required this.label});

  final bool lifted;
  final String label;

  static const double _pinSize = 46;
  static const double _labelH = 26;
  static const double _width = 220;

  @override
  Widget build(BuildContext context) {
    // The Material `location_pin` glyph's tip is ~22/24 of the way down its box.
    const tipFromTop = _pinSize * 22 / 24;
    const total = _labelH + 4 + tipFromTop;
    // A box of height 2*total centred on the point puts y=total (the tip) exactly on it.
    return SizedBox(
      height: total * 2,
      width: _width,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          // Ground shadow at the exact point (spreads when the pin lifts).
          Positioned(
            top: total - 3,
            left: 0,
            right: 0,
            child: Center(
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 160),
                width: lifted ? 14 : 8,
                height: lifted ? 5 : 6,
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: lifted ? 0.25 : 0.55),
                  borderRadius: BorderRadius.circular(8),
                  border: lifted ? null : Border.all(color: Colors.white, width: 1),
                ),
              ),
            ),
          ),
          AnimatedPositioned(
            duration: Duration(milliseconds: lifted ? 150 : 220),
            curve: lifted ? Curves.easeOut : Curves.easeOutBack,
            top: lifted ? -14 : 0,
            left: 0,
            right: 0,
            height: total,
            child: Column(
              children: [
                AnimatedOpacity(
                  duration: const Duration(milliseconds: 150),
                  opacity: lifted ? 0 : 1,
                  child: Container(
                    height: _labelH,
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(AppRadius.full),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withValues(alpha: 0.3), blurRadius: 6, offset: const Offset(0, 2)),
                      ],
                    ),
                    child: Center(
                      widthFactor: 1,
                      child: Text(
                        label,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                SizedBox(
                  height: tipFromTop,
                  width: _pinSize,
                  child: OverflowBox(
                    alignment: Alignment.topCenter,
                    maxHeight: _pinSize,
                    maxWidth: _pinSize,
                    child: Icon(
                      Icons.location_pin,
                      size: _pinSize,
                      color: const Color(0xFFEA4335),
                      shadows: [
                        Shadow(color: Colors.black.withValues(alpha: 0.35), blurRadius: 8, offset: const Offset(0, 4)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
