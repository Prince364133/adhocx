import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../services/location_service.dart';
import '../../shared/theme/app_colors.dart';
import '../../shared/theme/app_radius.dart';
import '../../shared/theme/app_spacing.dart';
import '../../shared/theme/app_typography.dart';
import '../../shared/widgets/app_primary_button.dart';
import '../../shared/widgets/osm_map_picker_widget.dart';

class UniversalLocationPickerScreen extends StatefulWidget {
  final String title;
  final String? initialAddress;
  final double? initialLat;
  final double? initialLng;

  const UniversalLocationPickerScreen({
    super.key,
    this.title = 'Search Location',
    this.initialAddress,
    this.initialLat,
    this.initialLng,
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
  bool _isMapMode = false;
  String _selectedCategory = 'All';
  Timer? _debounceTimer;

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
    final defaultLat = widget.initialLat ?? 28.4950;
    final defaultLng = widget.initialLng ?? 77.0895;
    final defaultAddress = widget.initialAddress != null && widget.initialAddress!.isNotEmpty
        ? widget.initialAddress!
        : 'DLF Cyber City, Gurugram';

    _selectedLocation = LocationModel(
      title: defaultAddress.split(',').first.trim(),
      fullAddress: defaultAddress,
      latitude: defaultLat,
      longitude: defaultLng,
      category: 'SAVED',
      icon: LocationService.getIconForCategory('SAVED', defaultAddress),
    );

    _searchController.addListener(_onSearchChanged);
    _loadRecentsAndCategories();
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _searchController.dispose();
    _searchFocus.dispose();
    super.dispose();
  }

  Future<void> _loadRecentsAndCategories() async {
    final recents = await _locationService.getRecentLocations();
    final places = await _locationService.fetchCategoryPlaces('All');

    if (mounted) {
      setState(() {
        _recentLocations = recents;
        _categoryPlaces = places;
      });
    }
  }

  Future<void> _loadCategoryPlaces(String category) async {
    setState(() {
      _selectedCategory = category;
      _isLoadingCategoryPlaces = true;
    });

    final places = await _locationService.fetchCategoryPlaces(category);
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
      final results = await _locationService.searchLocations(text);
      if (mounted) {
        setState(() {
          _searchResults = results;
          _isLoadingSearch = false;
        });
      }
    });
  }

  Future<void> _selectLocation(LocationModel loc, {bool confirmImmediately = false}) async {
    await _locationService.saveRecentLocation(loc);
    if (!mounted) return;

    setState(() {
      _selectedLocation = loc;
      _isSearching = false;
      _searchController.text = loc.title;
      _searchFocus.unfocus();
    });

    if (confirmImmediately) {
      _confirmAndReturn();
    }
  }

  Future<void> _handleMapPinChanged(double lat, double lng) async {
    final reverse = await _locationService.reverseGeocode(lat, lng);
    if (mounted) {
      setState(() {
        _selectedLocation = reverse;
      });
    }
  }

  Future<void> _fetchCurrentGpsLocation() async {
    setState(() => _isLoadingSearch = true);
    // Reverse geocode default current location via live OpenStreetMap
    final loc = await _locationService.reverseGeocode(_selectedLocation.latitude, _selectedLocation.longitude);
    if (mounted) {
      setState(() => _isLoadingSearch = false);
      _selectLocation(loc);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('📍 Current Location: ${loc.title} (${loc.city ?? "OpenStreetMap"})'),
          duration: const Duration(seconds: 2),
          backgroundColor: AppColors.primary,
        ),
      );
    }
  }

  void _confirmAndReturn() {
    _locationService.saveRecentLocation(_selectedLocation);
    context.pop(_selectedLocation.toMap());
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
              style: AppTypography.h3(
                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                fontWeight: FontWeight.bold,
              ),
            ),
            Row(
              children: [
                Icon(Icons.public, size: 11, color: AppColors.primary),
                const SizedBox(width: 4),
                Text(
                  'Powered by OpenStreetMap (Nominatim & Photon)',
                  style: TextStyle(
                    fontSize: 10,
                    color: AppColors.primary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: () => setState(() => _isMapMode = !_isMapMode),
            icon: Icon(
              _isMapMode ? Icons.list_alt_rounded : Icons.map_rounded,
              color: AppColors.primary,
            ),
            tooltip: _isMapMode ? 'Switch to List View' : 'Switch to Map View',
          ),
          IconButton(
            onPressed: _fetchCurrentGpsLocation,
            icon: Icon(Icons.my_location_rounded, color: AppColors.primary),
            tooltip: 'GPS Current Location',
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Search Bar Input Field (Live OpenStreetMap Dual Search)
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
                    hintText: 'Search city, landmark, or street via OpenStreetMap...',
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

            // Content Body
            Expanded(
              child: _isSearching
                  ? _buildSearchResultsList(isDark)
                  : _isMapMode
                      ? _buildFullMapView(isDark)
                      : _buildExploreAndRecentView(isDark),
            ),

            // Bottom Selected Location Card & Confirm Action
            _buildBottomConfirmationCard(isDark),
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
              'Searching OpenStreetMap across India...',
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
                'No matching places found on OpenStreetMap',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Try searching by landmark (e.g. "Cyber City", "Airport T3", "Sector 62", "Connaught Place")',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12,
                  color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                ),
              ),
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
          title: Text(
            loc.title,
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 14,
              color: isSelected
                  ? AppColors.primary
                  : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
            ),
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
          // Quick Action Tiles
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
            child: Row(
              children: [
                Expanded(
                  child: _buildQuickActionButton(
                    icon: Icons.my_location_rounded,
                    label: 'Current Location',
                    subtitle: 'GPS Geocode',
                    color: AppColors.primary,
                    onTap: _fetchCurrentGpsLocation,
                    isDark: isDark,
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: _buildQuickActionButton(
                    icon: Icons.map_rounded,
                    label: 'Choose on Map',
                    subtitle: 'Drag & Pinpoint',
                    color: AppColors.accentPurple,
                    onTap: () => setState(() => _isMapMode = true),
                    isDark: isDark,
                  ),
                ),
              ],
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
                  title: Text(
                    item.title,
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    ),
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

          // Category Discovery Pills
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
            child: Text(
              'Popular Landmarks & Transit Hubs',
              style: AppTypography.h4(
                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                fontWeight: FontWeight.bold,
              ),
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
                    title: Text(
                      place.title,
                      style: TextStyle(
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                        fontSize: 13,
                        color: isSelected
                            ? AppColors.primary
                            : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                      ),
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

  /// 3. Fullscreen Interactive OpenStreetMap Map Mode
  Widget _buildFullMapView(bool isDark) {
    return Stack(
      children: [
        OsmMapPickerWidget(
          initialLat: _selectedLocation.latitude,
          initialLng: _selectedLocation.longitude,
          onPositionChanged: _handleMapPinChanged,
        ),
        Positioned(
          bottom: 12,
          right: 12,
          child: FloatingActionButton.extended(
            onPressed: () => setState(() => _isMapMode = false),
            icon: const Icon(Icons.list_alt_rounded),
            label: const Text('Back to Search'),
            backgroundColor: AppColors.primary,
          ),
        ),
      ],
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
  }) {
    return GestureDetector(
      onTap: onTap,
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
              child: Icon(icon, color: color, size: 20),
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

  /// 4. Bottom Selected Location Summary and Confirmation Button
  Widget _buildBottomConfirmationCard(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.lg)),
        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 10,
            offset: const Offset(0, -3),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                child: Icon(_selectedLocation.icon, color: AppColors.primary, size: 24),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            _selectedLocation.title,
                            style: AppTypography.h4(
                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                              fontWeight: FontWeight.bold,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (_selectedLocation.city != null && _selectedLocation.city!.isNotEmpty)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(AppRadius.xs),
                            ),
                            child: Text(
                              _selectedLocation.city!,
                              style: TextStyle(fontSize: 10, color: AppColors.primary, fontWeight: FontWeight.bold),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _selectedLocation.fullAddress,
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          AppPrimaryButton(
            text: 'Confirm Location ✓',
            onPressed: _confirmAndReturn,
          ),
        ],
      ),
    );
  }
}
