import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import '../../services/location_service.dart';
import '../../services/permission_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../user/requirements/utils/office_hub_detector.dart';

class UniversalLocationPickerScreen extends StatefulWidget {
  final String title;
  final String? initialAddress;
  final double? initialLat;
  final double? initialLng;
  final bool officeHubOnly;

  const UniversalLocationPickerScreen({
    super.key,
    this.title = 'Search Location',
    this.initialAddress,
    this.initialLat,
    this.initialLng,
    this.officeHubOnly = false,
  });

  @override
  State<UniversalLocationPickerScreen> createState() => _UniversalLocationPickerScreenState();
}

class _UniversalLocationPickerScreenState extends State<UniversalLocationPickerScreen> {
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocus = FocusNode();
  final LocationService _locationService = LocationService.instance;

  late LocationModel _selectedLocation;
  List<LocationModel> _searchResults = [];
  List<LocationModel> _recentLocations = [];
  List<LocationModel> _categoryPlaces = [];

  bool _isSearching = false;
  bool _isLoadingSearch = false;
  bool _isLoadingCategoryPlaces = false;
  bool _isFetchingGps = false;
  bool _hasLocationPermission = false;
  String _selectedCategory = 'All';
  Timer? _debounceTimer;

  String? _currentCity;
  double? _currentLat;
  double? _currentLng;

  final List<String> _categories = [
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
    _currentLat = widget.initialLat;
    _currentLng = widget.initialLng;
    final defaultAddress = widget.initialAddress != null && widget.initialAddress!.isNotEmpty
        ? widget.initialAddress!
        : 'Select Location';

    _selectedLocation = LocationModel(
      title: defaultAddress.split(',').first.trim(),
      fullAddress: defaultAddress,
      latitude: widget.initialLat ?? 17.4435,
      longitude: widget.initialLng ?? 78.3772,
      category: 'SAVED',
      icon: LocationService.getIconForCategory('SAVED', defaultAddress),
    );

    _searchController.addListener(_onSearchChanged);
    _detectLocationAndLoadData();
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _searchController.dispose();
    _searchFocus.dispose();
    super.dispose();
  }

  Future<void> _detectLocationAndLoadData() async {
    final recents = await _locationService.getRecentLocations();
    if (mounted) {
      setState(() => _recentLocations = recents);
    }

    try {
      final isGranted = await PermissionService.instance.isLocationPermissionGranted();
      if (isGranted) {
        final pos = await PermissionService.instance.getCurrentPosition(requestIfDenied: false);
        if (pos != null) {
          _hasLocationPermission = true;
          _currentLat = pos.latitude;
          _currentLng = pos.longitude;
          final rev = await _locationService.reverseGeocode(pos.latitude, pos.longitude);
          if (rev.city != null && rev.city!.isNotEmpty) {
            _currentCity = rev.city;
          }
        }
      }
    } catch (e) {
      debugPrint('Location detection error: $e');
    }

    // If city is still null and initial coordinates were provided
    if (_currentCity == null && _currentLat != null && _currentLng != null) {
      try {
        final rev = await _locationService.reverseGeocode(_currentLat!, _currentLng!);
        if (rev.city != null && rev.city!.isNotEmpty) {
          _currentCity = rev.city;
        }
      } catch (_) {}
    }

    // Fallback: If no location permission or location unavailable, default to Hyderabad
    if (!_hasLocationPermission && (_currentCity == null || _currentCity!.isEmpty)) {
      _currentCity = 'Hyderabad';
    }

    final places = await _locationService.fetchCategoryPlaces(
      'All',
      lat: _currentLat,
      lon: _currentLng,
      cityName: _hasLocationPermission ? _currentCity : 'Hyderabad',
    );

    if (mounted) {
      setState(() {
        _categoryPlaces = places;
      });
    }
  }

  Future<void> _loadCategoryPlaces(String category) async {
    setState(() {
      _selectedCategory = category;
      _isLoadingCategoryPlaces = true;
    });

    final places = await _locationService.fetchCategoryPlaces(
      category,
      lat: _currentLat,
      lon: _currentLng,
      cityName: _hasLocationPermission ? _currentCity : 'Hyderabad',
    );
    if (mounted) {
      setState(() {
        _categoryPlaces = places;
        _isLoadingCategoryPlaces = false;
      });
    }
  }

  void _onSearchChanged() {
    final text = _searchController.text.trim();
    if (text.isEmpty) {
      setState(() {
        _isSearching = false;
        _searchResults = [];
        _isLoadingSearch = false;
      });
      return;
    }

    _debounceTimer?.cancel();
    setState(() {
      _isSearching = true;
      _isLoadingSearch = true;
    });

    _debounceTimer = Timer(const Duration(milliseconds: 300), () async {
      final results = await _locationService.searchLocations(
        text,
        lat: _currentLat,
        lon: _currentLng,
      );
      if (mounted) {
        setState(() {
          _searchResults = results;
          _isLoadingSearch = false;
        });
      }
    });
  }

  Future<void> _selectLocation(LocationModel loc) async {
    if (widget.officeHubOnly) {
      final detectedHub = OfficeHubDetector.detectHub(
        lat: loc.latitude,
        lng: loc.longitude,
        addressText: '${loc.title} ${loc.fullAddress}',
      );
      if (detectedHub == null) {
        _showNonHubLocationDialog(loc);
        return;
      }
    }
    await _locationService.saveRecentLocation(loc);
    if (!mounted) return;
    context.pop(loc.toMap());
  }

  void _showNonHubLocationDialog(LocationModel loc) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showModalBottomSheet(
      context: context,
      useRootNavigator: true,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (sheetCtx) => Container(
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.xl)),
        ),
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 38,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: AppSpacing.md),
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.borderSubtleDark : AppColors.borderSubtleLight,
                    borderRadius: AppRadius.borderPill,
                  ),
                ),
              ),
              Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.error.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.location_off_rounded, color: AppColors.error, size: 22),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Outside Office Hub Area',
                          style: AppTypography.h3(
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Requires office hub selection',
                          style: AppTypography.caption(
                            color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                '${loc.title} is not within our 2 official corporate office hubs:',
                style: TextStyle(
                  fontSize: 13,
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                ),
              ),
              const SizedBox(height: 12),
              _buildHubInfoBullet(
                '1. HITEC / Nanakramguda Hub',
                'Cyber Towers, Madhapur, Raidurg, Financial District, Waverock',
                AppColors.primary,
              ),
              const SizedBox(height: 8),
              _buildHubInfoBullet(
                '2. Kokapet Hub',
                'Kokapet SEZ, GAR Infobahn, Neopolis, Golden Mile',
                AppColors.accentPurple,
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.bgDark : AppColors.slate100,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  border: Border.all(
                    color: isDark ? AppColors.borderDark : AppColors.borderLight,
                  ),
                ),
                child: Text(
                  'Tip: If ${loc.title} is the employee\'s home or drop location, please select it under "Employee Home / Locality" in the route settings.',
                  style: TextStyle(
                    fontSize: 12,
                    fontStyle: FontStyle.italic,
                    color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              SizedBox(
                height: 48,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(sheetCtx),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                    elevation: 0,
                  ),
                  child: const Text('Got it, choose another', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHubInfoBullet(String title, String subtitle, Color color) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          margin: const EdgeInsets.only(top: 3),
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: color),
              ),
              Text(
                subtitle,
                style: const TextStyle(fontSize: 10, color: AppColors.slate500),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget? _buildHubBadge(LocationModel loc, bool isDark) {
    if (!widget.officeHubOnly) return null;

    final hubId = OfficeHubDetector.detectHub(
      lat: loc.latitude,
      lng: loc.longitude,
      addressText: '${loc.title} ${loc.fullAddress}',
    );

    if (hubId == OfficeHubDetector.hitecId) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: AppColors.primary.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(4),
          border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.check_circle_rounded, size: 10, color: AppColors.primary),
            const SizedBox(width: 3),
            Text(
              'HITEC Hub',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.tealAccent : AppColors.primary,
              ),
            ),
          ],
        ),
      );
    } else if (hubId == OfficeHubDetector.kokapetId) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: AppColors.accentPurple.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(4),
          border: Border.all(color: AppColors.accentPurple.withValues(alpha: 0.3)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.check_circle_rounded, size: 10, color: AppColors.accentPurple),
            const SizedBox(width: 3),
            Text(
              'Kokapet Hub',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.purpleAccent : AppColors.accentPurple,
              ),
            ),
          ],
        ),
      );
    } else {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: AppColors.error.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(4),
          border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.warning_amber_rounded, size: 10, color: AppColors.error),
            SizedBox(width: 3),
            Text(
              'Outside Hub',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: AppColors.error,
              ),
            ),
          ],
        ),
      );
    }
  }

  Future<void> _fetchCurrentGpsLocation() async {
    if (_isFetchingGps) return;
    setState(() => _isFetchingGps = true);

    try {
      final serviceEnabled = await PermissionService.instance.isLocationServiceEnabled();
      if (!serviceEnabled) {
        setState(() => _isFetchingGps = false);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Device location (GPS) is turned off.'),
            action: SnackBarAction(
              label: 'Turn On',
              onPressed: () => PermissionService.instance.openLocationSettings(),
            ),
            duration: const Duration(seconds: 4),
          ),
        );
        return;
      }

      final pos = await PermissionService.instance.getCurrentPosition(requestIfDenied: true);
      if (pos == null) {
        setState(() => _isFetchingGps = false);
        final isGranted = await PermissionService.instance.isLocationPermissionGranted();
        if (!mounted) return;
        if (!isGranted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Location permission is required to fetch current GPS location.'),
              action: SnackBarAction(
                label: 'Settings',
                onPressed: () => Geolocator.openAppSettings(),
              ),
              duration: const Duration(seconds: 4),
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Could not acquire GPS fix. Showing Hyderabad places.'),
              duration: Duration(seconds: 3),
            ),
          );
        }
        return;
      }

      _currentLat = pos.latitude;
      _currentLng = pos.longitude;
      _hasLocationPermission = true;

      final loc = await _locationService.reverseGeocode(pos.latitude, pos.longitude);
      if (loc.city != null && loc.city!.isNotEmpty) {
        _currentCity = loc.city;
      }

      if (mounted) {
        setState(() {
          _isFetchingGps = false;
          _selectedLocation = loc;
        });
        _loadCategoryPlaces(_selectedCategory);
        _selectLocation(loc);
      }
    } catch (e) {
      debugPrint('Error fetching current GPS location: $e');
      if (mounted) setState(() => _isFetchingGps = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
        elevation: 0,
        leading: IconButton(
          onPressed: () => context.pop(),
          icon: Icon(Icons.arrow_back_rounded, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: AppTypography.h3(
                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                fontWeight: FontWeight.bold,
              ),
            ),
            Row(
              children: [
                const Icon(Icons.place, size: 11, color: Color(0xFFEA4335)),
                const SizedBox(width: 4),
                Flexible(
                  child: Text(
                    'Powered by Google Maps Platform',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 10,
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: _isFetchingGps ? null : _fetchCurrentGpsLocation,
            icon: _isFetchingGps
                ? SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.primary,
                    ),
                  )
                : Icon(Icons.my_location_rounded, color: AppColors.primary),
            tooltip: 'GPS Current Location',
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Corporate Office Hub Warning Banner
            if (widget.officeHubOnly)
              Container(
                margin: const EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.xs, AppSpacing.md, AppSpacing.xs),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.25)),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.15),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.corporate_fare_rounded, color: AppColors.primary, size: 16),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Corporate Office Search: Pickups & drops for office hubs are restricted to HITEC City / Nanakramguda and Kokapet.',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.tealAccent : AppColors.primary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

            // Search Bar Input Field (Live Google Maps Places Search)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.xs),
              child: Container(
                decoration: BoxDecoration(
                  color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                  border: Border.all(
                    color: _searchFocus.hasFocus ? AppColors.primary : (isDark ? AppColors.borderDark : AppColors.borderLight),
                    width: _searchFocus.hasFocus ? 2 : 1,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.05),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: TextField(
                  controller: _searchController,
                  focusNode: _searchFocus,
                  autofocus: widget.initialAddress == null || widget.initialAddress!.isEmpty,
                  decoration: InputDecoration(
                    hintText: 'Search city, landmark, or street via Google Maps...',
                    hintStyle: TextStyle(
                      fontSize: 13,
                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                    ),
                    prefixIcon: Icon(Icons.search_rounded, color: AppColors.primary),
                    suffixIcon: _isLoadingSearch
                        ? const Padding(
                            padding: EdgeInsets.all(12),
                            child: SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            ),
                          )
                        : _searchController.text.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.cancel_rounded, size: 18),
                                onPressed: () {
                                  _searchController.clear();
                                  setState(() {
                                    _isSearching = false;
                                    _searchResults = [];
                                  });
                                },
                              )
                            : null,
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
              ),
            ),

            if (widget.officeHubOnly)
              Container(
                margin: const EdgeInsets.fromLTRB(AppSpacing.md, 0, AppSpacing.md, AppSpacing.xs),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.25)),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.15),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.corporate_fare_rounded, size: 16, color: AppColors.primary),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Corporate Office Hub Validation',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                          ),
                          Text(
                            'Corporate pickups/drops are strictly limited to HITEC / Nanakramguda and Kokapet Hubs.',
                            style: TextStyle(
                              fontSize: 11,
                              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

            // Content Body
            Expanded(
              child: _isSearching
                  ? _buildSearchResultsList(isDark)
                  : _buildExploreAndRecentView(isDark),
            ),
          ],
        ),
      ),
    );
  }

  /// 1. Real-time Search Results List
  Widget _buildSearchResultsList(bool isDark) {
    if (_isLoadingSearch && _searchResults.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 12),
            Text(
              'Searching Google Maps across India...',
              style: TextStyle(
                fontSize: 13,
                color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
              ),
            ),
          ],
        ),
      );
    }

    if (_searchResults.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xl),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.location_off_rounded, size: 48, color: AppColors.slate400),
              const SizedBox(height: 12),
              Text(
                'No matching places found on Google Maps',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                ),
              ),
              if (_searchController.text.trim().isNotEmpty) ...[
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: () {
                    final query = _searchController.text.trim();
                    _selectLocation(LocationModel(
                      title: query.split(',').first.trim(),
                      fullAddress: query,
                      latitude: _currentLat ?? 17.4435,
                      longitude: _currentLng ?? 78.3772,
                      category: 'CUSTOM',
                    ));
                  },
                  icon: const Icon(Icons.check_circle_outline_rounded, size: 18),
                  label: Text(
                    'Use "${_searchController.text.trim()}"',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
                  ),
                ),
              ],
            ],
          ),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.xs),
      itemCount: _searchResults.length,
      separatorBuilder: (context, index) => Divider(height: 1, color: isDark ? AppColors.borderDark : AppColors.borderLight),
      itemBuilder: (context, index) {
        final loc = _searchResults[index];
        final isSelected = _selectedLocation.title == loc.title && _selectedLocation.fullAddress == loc.fullAddress;

        return ListTile(
          dense: true,
          contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          leading: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: isSelected ? AppColors.primary : AppColors.primary.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: Icon(
              loc.icon,
              color: isSelected ? Colors.white : AppColors.primary,
              size: 20,
            ),
          ),
          title: Row(
            children: [
              Expanded(
                child: Text(
                  loc.title,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: isSelected
                        ? AppColors.primary
                        : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                  ),
                ),
              ),
              if (_buildHubBadge(loc, isDark) != null) ...[
                const SizedBox(width: 6),
                _buildHubBadge(loc, isDark)!,
              ],
            ],
          ),
          subtitle: Text(
            loc.fullAddress,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 12,
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            ),
          ),
          trailing: isSelected
              ? Icon(Icons.check_circle_rounded, color: AppColors.primary, size: 20)
              : Icon(Icons.north_west_rounded, size: 16, color: AppColors.slate400),
          onTap: () => _selectLocation(loc),
        );
      },
    );
  }

  /// 2. Explore, Quick Actions & Recent Searches View
  Widget _buildExploreAndRecentView(bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Quick Action - Use Current Location via GPS
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
            child: _buildQuickActionButton(
              icon: Icons.my_location_rounded,
              label: 'Use Current Location',
              subtitle: _isFetchingGps
                  ? 'Acquiring GPS fix via Google Maps...'
                  : (_hasLocationPermission && _currentCity != null
                      ? 'Near $_currentCity • Tap to update GPS'
                      : 'Tap to fetch precise GPS coordinates'),
              color: AppColors.primary,
              onTap: _fetchCurrentGpsLocation,
              isDark: isDark,
              isLoading: _isFetchingGps,
            ),
          ),

          const SizedBox(height: AppSpacing.md),

          // Recent Searches Section
          if (_recentLocations.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(Icons.history_rounded, size: 18, color: AppColors.primary),
                      const SizedBox(width: 6),
                      Text(
                        'Recent Searches',
                        style: AppTypography.h4(
                          color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  TextButton(
                    onPressed: () async {
                      await _locationService.clearRecentLocations();
                      setState(() => _recentLocations = []);
                    },
                    child: Text('Clear', style: TextStyle(fontSize: 12, color: AppColors.slate500)),
                  ),
                ],
              ),
            ),
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
              itemCount: _recentLocations.length,
              itemBuilder: (context, index) {
                final item = _recentLocations[index];
                return ListTile(
                  dense: true,
                  leading: CircleAvatar(
                    radius: 16,
                    backgroundColor: isDark ? AppColors.surfaceDark : AppColors.slate200,
                    child: Icon(item.icon, size: 16, color: AppColors.primary),
                  ),
                  title: Row(
                    children: [
                      Expanded(
                        child: Text(
                          item.title,
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 13,
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          ),
                        ),
                      ),
                      if (_buildHubBadge(item, isDark) != null) ...[
                        const SizedBox(width: 6),
                        _buildHubBadge(item, isDark)!,
                      ],
                    ],
                  ),
                  subtitle: Text(
                    item.fullAddress,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 11, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
                  ),
                  trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 12),
                  onTap: () => _selectLocation(item),
                );
              },
            ),
            const SizedBox(height: AppSpacing.sm),
          ],

          // Category Discovery Pills Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    'Popular Landmarks & Transit Hubs',
                    style: AppTypography.h4(
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                      fontWeight: FontWeight.bold,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: _hasLocationPermission
                        ? AppColors.primary.withValues(alpha: 0.12)
                        : (isDark ? AppColors.surfaceDark : AppColors.slate200),
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                    border: Border.all(
                      color: _hasLocationPermission
                          ? AppColors.primary.withValues(alpha: 0.3)
                          : (isDark ? AppColors.borderDark : AppColors.borderLight),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _hasLocationPermission ? Icons.near_me_rounded : Icons.location_city_rounded,
                        size: 11,
                        color: _hasLocationPermission ? AppColors.primary : AppColors.slate600,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _hasLocationPermission
                            ? (_currentCity != null ? 'Near $_currentCity' : 'Nearby')
                            : 'Hyderabad',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: _hasLocationPermission
                              ? (isDark ? Colors.tealAccent : AppColors.primary)
                              : (isDark ? AppColors.textMutedDark : AppColors.slate700),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 6),
          SizedBox(
            height: 38,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
              itemCount: _categories.length,
              separatorBuilder: (context, index) => const SizedBox(width: AppSpacing.xs),
              itemBuilder: (context, index) {
                final cat = _categories[index];
                final isSelected = _selectedCategory == cat;
                return GestureDetector(
                  onTap: () => _loadCategoryPlaces(cat),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? AppColors.primary
                          : (isDark ? AppColors.surfaceDark : AppColors.slate200),
                      borderRadius: BorderRadius.circular(AppRadius.full),
                      border: Border.all(
                        color: isSelected
                            ? AppColors.primary
                            : (isDark ? AppColors.borderDark : AppColors.borderLight),
                      ),
                    ),
                    child: Center(
                      child: Text(
                        cat,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                          color: isSelected
                              ? Colors.white
                              : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

          const SizedBox(height: AppSpacing.sm),

          // Categorized Places List
          if (_isLoadingCategoryPlaces)
            const Padding(
              padding: EdgeInsets.all(AppSpacing.lg),
              child: Center(child: CircularProgressIndicator()),
            )
          else
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
              itemCount: _categoryPlaces.length,
              itemBuilder: (context, index) {
                final place = _categoryPlaces[index];
                final isSelected = _selectedLocation.title == place.title;

                return Container(
                  margin: const EdgeInsets.only(bottom: 6),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? AppColors.primary.withValues(alpha: 0.1)
                        : (isDark ? AppColors.surfaceDark : AppColors.surfaceLight),
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    border: Border.all(
                      color: isSelected
                          ? AppColors.primary
                          : (isDark ? AppColors.borderDark : AppColors.borderLight),
                      width: isSelected ? 2 : 1,
                    ),
                  ),
                  child: ListTile(
                    dense: true,
                    leading: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppColors.primary
                            : (isDark ? AppColors.slate800 : AppColors.slate100),
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                      ),
                      child: Icon(
                        place.icon,
                        color: isSelected ? Colors.white : AppColors.primary,
                        size: 18,
                      ),
                    ),
                    title: Row(
                      children: [
                        Expanded(
                          child: Text(
                            place.title,
                            style: TextStyle(
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                              fontSize: 13,
                              color: isSelected
                                  ? AppColors.primary
                                  : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                            ),
                          ),
                        ),
                        if (_buildHubBadge(place, isDark) != null) ...[
                          const SizedBox(width: 6),
                          _buildHubBadge(place, isDark)!,
                        ],
                      ],
                    ),
                    subtitle: Text(
                      place.fullAddress,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 11,
                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                      ),
                    ),
                    trailing: isSelected
                        ? Icon(Icons.check_circle_rounded, color: AppColors.primary, size: 20)
                        : Icon(Icons.chevron_right_rounded, size: 18, color: AppColors.slate400),
                    onTap: () => _selectLocation(place),
                  ),
                );
              },
            ),
        ],
      ),
    );
  }



  /// Quick Action Button Tile
  Widget _buildQuickActionButton({
    required IconData icon,
    required String label,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
    required bool isDark,
    bool isLoading = false,
  }) {
    return GestureDetector(
      onTap: isLoading ? null : onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(AppRadius.sm),
              ),
              child: isLoading
                  ? SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: color,
                      ),
                    )
                  : Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 10,
                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
