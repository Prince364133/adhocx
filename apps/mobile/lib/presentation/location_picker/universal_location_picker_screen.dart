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
    this.title = 'Select Location',
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
  List<LocationModel> _categoryPlaces = [];
  bool _isSearching = false;
  bool _isLoadingSearch = false;
  bool _isLoadingCategoryPlaces = false;
  String _selectedCategory = 'All';
  Timer? _debounceTimer;

  final List<String> _categories = ['All', 'Airports', 'Tech Parks', 'Railway Stations', 'Commercial Hubs'];

  @override
  void initState() {
    super.initState();
    final defaultLat = widget.initialLat ?? 28.4950;
    final defaultLng = widget.initialLng ?? 77.0895;
    final defaultAddress = widget.initialAddress ?? 'Live OpenStreetMap Location';

    _selectedLocation = LocationModel(
      title: defaultAddress.split(',').first.trim(),
      fullAddress: defaultAddress,
      latitude: defaultLat,
      longitude: defaultLng,
    );

    _searchController.addListener(_onSearchChanged);
    _loadCategoryPlaces('All');
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _searchController.dispose();
    _searchFocus.dispose();
    super.dispose();
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
      });
      return;
    }

    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 350), () async {
      setState(() {
        _isSearching = true;
        _isLoadingSearch = true;
      });

      final results = await _locationService.searchLocations(text);
      if (mounted) {
        setState(() {
          _searchResults = results;
          _isLoadingSearch = false;
        });
      }
    });
  }

  void _selectLocation(LocationModel loc) {
    setState(() {
      _selectedLocation = loc;
      _isSearching = false;
      _searchController.clear();
      _searchFocus.unfocus();
    });
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
    // Reverse geocode default current location via live OpenStreetMap
    final loc = await _locationService.reverseGeocode(_selectedLocation.latitude, _selectedLocation.longitude);
    if (mounted) {
      _selectLocation(loc);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Updated to live OpenStreetMap location: ${loc.title}'),
          duration: const Duration(seconds: 2),
        ),
      );
    }
  }

  void _confirmAndReturn() {
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
          icon: Icon(Icons.arrow_back, color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
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
            Text(
              'Live OpenStreetMap (Nominatim API)',
              style: TextStyle(
                fontSize: 11,
                color: AppColors.primary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: _fetchCurrentGpsLocation,
            icon: Icon(Icons.my_location_rounded, color: AppColors.primary),
            tooltip: 'Live GPS / Center Location',
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Search Bar Input Field (Live OpenStreetMap Nominatim Search)
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
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: TextField(
                  controller: _searchController,
                  focusNode: _searchFocus,
                  decoration: InputDecoration(
                    hintText: 'Search any address via live OpenStreetMap...',
                    hintStyle: TextStyle(
                      fontSize: 13,
                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                    ),
                    prefixIcon: Icon(Icons.search_rounded, color: AppColors.primary),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18),
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

            // Live Autocomplete Suggestions (Streamed from OpenStreetMap Nominatim)
            if (_isSearching)
              Expanded(
                child: _isLoadingSearch
                    ? const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            CircularProgressIndicator(),
                            SizedBox(height: 12),
                            Text('Querying live OpenStreetMap...', style: TextStyle(fontSize: 12)),
                          ],
                        ),
                      )
                    : _searchResults.isEmpty
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.all(AppSpacing.xl),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.search_off_rounded, size: 48, color: AppColors.slate400),
                                  const SizedBox(height: 8),
                                  Text(
                                    'No matching locations on OpenStreetMap',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Try typing landmark, sector, or city name',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.all(AppSpacing.md),
                            itemCount: _searchResults.length,
                            separatorBuilder: (context, index) => const Divider(height: 1),
                            itemBuilder: (context, index) {
                              final loc = _searchResults[index];
                              return ListTile(
                                leading: Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(AppRadius.sm),
                                  ),
                                  child: Icon(loc.icon, color: AppColors.primary, size: 20),
                                ),
                                title: Text(
                                  loc.title,
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
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
                                onTap: () => _selectLocation(loc),
                              );
                            },
                          ),
              )
            else
              // Interactive Map View + Live OpenStreetMap Category Places
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Interactive OpenStreetMap Canvas
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.xs),
                        child: SizedBox(
                          height: 220,
                          child: OsmMapPickerWidget(
                            initialLat: _selectedLocation.latitude,
                            initialLng: _selectedLocation.longitude,
                            onPositionChanged: _handleMapPinChanged,
                          ),
                        ),
                      ),

                      // Live Category Filter Pills
                      Container(
                        height: 36,
                        margin: const EdgeInsets.only(top: AppSpacing.xs, bottom: AppSpacing.xs),
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
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
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

                      // Live OpenStreetMap Places Header
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.xs),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Live OpenStreetMap Places',
                              style: AppTypography.h4(
                                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            if (_isLoadingCategoryPlaces)
                              const SizedBox(
                                width: 14,
                                height: 14,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              ),
                          ],
                        ),
                      ),

                      if (_isLoadingCategoryPlaces)
                        const Padding(
                          padding: EdgeInsets.all(AppSpacing.lg),
                          child: Center(child: CircularProgressIndicator()),
                        )
                      else if (_categoryPlaces.isEmpty)
                        Padding(
                          padding: const EdgeInsets.all(AppSpacing.md),
                          child: Center(
                            child: Text(
                              'Search above to find places on OpenStreetMap',
                              style: TextStyle(color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight, fontSize: 12),
                            ),
                          ),
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
                                    : Icon(Icons.chevron_right, size: 18, color: AppColors.slate400),
                                onTap: () => _selectLocation(place),
                              ),
                            );
                          },
                        ),
                    ],
                  ),
                ),
              ),

            // Bottom Selected Location Card & Confirm Action
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.lg)),
                border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.1),
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
                          color: AppColors.primary.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(AppRadius.md),
                        ),
                        child: Icon(Icons.pin_drop_rounded, color: AppColors.primary, size: 24),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _selectedLocation.title,
                              style: AppTypography.h4(
                                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                fontWeight: FontWeight.bold,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
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
            ),
          ],
        ),
      ),
    );
  }
}
