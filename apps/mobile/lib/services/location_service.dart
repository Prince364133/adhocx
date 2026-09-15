import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class LocationModel {
  final String title;
  final String fullAddress;
  final double latitude;
  final double longitude;
  final String? city;
  final String? state;
  final String? postcode;
  final String? category;
  final IconData icon;

  const LocationModel({
    required this.title,
    required this.fullAddress,
    required this.latitude,
    required this.longitude,
    this.city,
    this.state,
    this.postcode,
    this.category,
    this.icon = Icons.location_on_rounded,
  });

  Map<String, dynamic> toMap() {
    return {
      'title': title,
      'address': fullAddress,
      'fullAddress': fullAddress,
      'latitude': latitude,
      'longitude': longitude,
      'city': city,
      'state': state,
      'postcode': postcode,
      'category': category,
    };
  }

  factory LocationModel.fromMap(Map<String, dynamic> map) {
    final title = map['title'] as String? ?? 'Location';
    final fullAddress = map['fullAddress'] as String? ?? map['address'] as String? ?? title;
    final cat = map['category'] as String?;
    return LocationModel(
      title: title,
      fullAddress: fullAddress,
      latitude: (map['latitude'] as num?)?.toDouble() ?? 28.4950,
      longitude: (map['longitude'] as num?)?.toDouble() ?? 77.0895,
      city: map['city'] as String?,
      state: map['state'] as String?,
      postcode: map['postcode'] as String?,
      category: cat,
      icon: LocationService.getIconForCategory(cat, title),
    );
  }

  String toJson() => jsonEncode(toMap());
  factory LocationModel.fromJson(String source) => LocationModel.fromMap(jsonDecode(source) as Map<String, dynamic>);
}

class LocationService {
  static LocationService? _instance;
  static LocationService get instance => _instance ??= LocationService._();

  LocationService._();

  static const String _nominatimBase = 'https://nominatim.openstreetmap.org';
  static const String _photonBase = 'https://photon.komoot.io/api';
  static const String _recentStorageKey = 'adhocx_recent_locations_v2';

  static const Map<String, String> _headers = {
    'User-Agent': 'AdhocX-OpenStreetMap-Mobility/2.0 (support@adhocx.com)',
    'Accept': 'application/json',
  };

  /// Determine icon based on category, OSM tags or title keywords
  static IconData getIconForCategory(String? category, String? title) {
    final c = (category ?? '').toLowerCase();
    final t = (title ?? '').toLowerCase();

    if (c.contains('airport') || t.contains('airport') || t.contains('terminal') || t.contains('aerodrome') || t.contains('igi')) {
      return Icons.local_airport_rounded;
    }
    if (c.contains('railway') || c.contains('train') || c.contains('station') || t.contains('junction') || t.contains('station') || t.contains('railway')) {
      return Icons.train_rounded;
    }
    if (c.contains('metro') || t.contains('metro') || t.contains('subway')) {
      return Icons.directions_subway_rounded;
    }
    if (c.contains('tech') || c.contains('office') || c.contains('cyber') || t.contains('tech') || t.contains('cyber') || t.contains('park') || t.contains('tower') || t.contains('building')) {
      return Icons.business_rounded;
    }
    if (c.contains('hospital') || t.contains('hospital') || t.contains('medanta') || t.contains('apollo') || t.contains('fortis') || t.contains('aiims')) {
      return Icons.local_hospital_rounded;
    }
    if (c.contains('hotel') || t.contains('hotel') || t.contains('resort') || t.contains('marriott') || t.contains('hyatt') || t.contains('radisson')) {
      return Icons.hotel_rounded;
    }
    if (c.contains('mall') || c.contains('shop') || t.contains('mall') || t.contains('plaza') || t.contains('market') || t.contains('square')) {
      return Icons.storefront_rounded;
    }
    if (c.contains('highway') || t.contains('expressway') || t.contains('road') || t.contains('highway') || t.contains('toll')) {
      return Icons.add_road_rounded;
    }
    return Icons.location_on_rounded;
  }

  /// Primary search engine: Queries OSM Nominatim + Photon Komoot OSM in parallel for rapid results
  Future<List<LocationModel>> searchLocations(String query) async {
    final cleanQuery = query.trim();
    if (cleanQuery.isEmpty) {
      return fetchCategoryPlaces('All');
    }

    final results = <LocationModel>[];
    final seenKeys = <String>{};

    // 1. Query Photon Komoot OpenStreetMap (Sub-150ms typo-tolerant autocomplete)
    try {
      final photonUri = Uri.parse('$_photonBase/?q=${Uri.encodeComponent(cleanQuery)}&limit=10&lat=28.6139&lon=77.2090');
      final photonRes = await http.get(photonUri, headers: _headers).timeout(const Duration(milliseconds: 2500));

      if (photonRes.statusCode == 200) {
        final data = jsonDecode(photonRes.body);
        final features = data['features'] as List<dynamic>? ?? [];

        for (final item in features) {
          final props = item['properties'] as Map<String, dynamic>? ?? {};
          final geom = item['geometry'] as Map<String, dynamic>? ?? {};
          final coords = geom['coordinates'] as List<dynamic>?;

          final name = props['name'] as String? ?? props['street'] as String? ?? '';
          if (name.isEmpty) continue;

          final city = props['city'] as String? ?? props['district'] as String? ?? props['county'] as String? ?? '';
          final state = props['state'] as String? ?? '';
          final postcode = props['postcode'] as String? ?? '';
          final osmKey = props['osm_key'] as String? ?? '';
          final osmVal = props['osm_value'] as String? ?? '';

          final addressParts = <String>[];
          if (name.isNotEmpty) addressParts.add(name);
          if (props['street'] != null && props['street'] != name) addressParts.add(props['street']);
          if (city.isNotEmpty && city != name) addressParts.add(city);
          if (state.isNotEmpty && state != city) addressParts.add(state);
          if (postcode.isNotEmpty) addressParts.add(postcode);

          final fullAddress = addressParts.isNotEmpty ? addressParts.join(', ') : name;
          final lon = coords != null && coords.isNotEmpty ? (coords[0] as num).toDouble() : 77.0895;
          final lat = coords != null && coords.length > 1 ? (coords[1] as num).toDouble() : 28.4950;

          final dedupeKey = '${name.toLowerCase()}_${city.toLowerCase()}';
          if (!seenKeys.contains(dedupeKey)) {
            seenKeys.add(dedupeKey);
            results.add(
              LocationModel(
                title: name,
                fullAddress: fullAddress,
                latitude: lat,
                longitude: lon,
                city: city,
                state: state,
                postcode: postcode,
                category: osmKey.isNotEmpty ? osmKey.toUpperCase() : 'OSM_SEARCH',
                icon: getIconForCategory('$osmKey $osmVal', name),
              ),
            );
          }
        }
      }
    } catch (e) {
      debugPrint('Photon OSM search notice: $e');
    }

    // 2. Query OSM Nominatim (Structured address verification)
    try {
      final nominatimUri = Uri.parse(
        '$_nominatimBase/search?q=${Uri.encodeComponent(cleanQuery)}&format=json&addressdetails=1&limit=8&countrycodes=in',
      );
      final nominatimRes = await http.get(nominatimUri, headers: _headers).timeout(const Duration(milliseconds: 3000));

      if (nominatimRes.statusCode == 200) {
        final List<dynamic> jsonList = jsonDecode(nominatimRes.body);
        for (final item in jsonList) {
          final displayName = item['display_name'] as String? ?? '';
          final parts = displayName.split(',');
          final shortTitle = parts.isNotEmpty ? parts[0].trim() : 'Location';
          final lat = double.tryParse(item['lat']?.toString() ?? '0') ?? 0.0;
          final lon = double.tryParse(item['lon']?.toString() ?? '0') ?? 0.0;

          final addressObj = item['address'] as Map<String, dynamic>?;
          final city = (addressObj?['city'] ?? addressObj?['town'] ?? addressObj?['suburb'] ?? addressObj?['state_district'] ?? '').toString();
          final state = (addressObj?['state'] ?? '').toString();
          final postcode = (addressObj?['postcode'] ?? '').toString();
          final osmClass = item['class'] as String?;
          final osmType = item['type'] as String?;

          final dedupeKey = '${shortTitle.toLowerCase()}_${city.toLowerCase()}';
          if (!seenKeys.contains(dedupeKey)) {
            seenKeys.add(dedupeKey);
            results.add(
              LocationModel(
                title: shortTitle,
                fullAddress: displayName,
                latitude: lat,
                longitude: lon,
                city: city,
                state: state,
                postcode: postcode,
                category: osmClass != null ? osmClass.toUpperCase() : 'SEARCH',
                icon: getIconForCategory('$osmClass $osmType', shortTitle),
              ),
            );
          }
        }
      }
    } catch (e) {
      debugPrint('OSM Nominatim search notice: $e');
    }

    // Fallback: If network is offline or throttled, filter curated places
    if (results.isEmpty) {
      final curated = _getCuratedFallbackPlaces();
      final qLower = cleanQuery.toLowerCase();
      return curated.where((p) => p.title.toLowerCase().contains(qLower) || p.fullAddress.toLowerCase().contains(qLower)).toList();
    }

    return results;
  }

  /// Live Category Places from OpenStreetMap Nominatim / Photon API
  Future<List<LocationModel>> fetchCategoryPlaces(String category) async {
    String searchQuery;
    switch (category) {
      case 'Airports':
        searchQuery = 'international airport aerodrome Terminal New Delhi Bengaluru Mumbai';
        break;
      case 'Tech Parks':
        searchQuery = 'cyber city tech park business park electronic city Gurugram Bengaluru Noida';
        break;
      case 'Railway Stations':
        searchQuery = 'railway station junction New Delhi Anand Vihar Nizamuddin Bangalore';
        break;
      case 'Metro Hubs':
        searchQuery = 'metro station Rajiv Chowk Huda City Millennium City Botanical Garden';
        break;
      case 'Commercial Hubs':
        searchQuery = 'Connaught Place Aerocity CyberHub Bandra Kurla Complex World Trade Center';
        break;
      case 'Hospitals':
        searchQuery = 'Medanta Apollo Hospital Fortis AIIMS Max Super Speciality';
        break;
      case 'Hotels':
        searchQuery = 'The Leela Taj Palace JW Marriott Radisson Blu Oberoi';
        break;
      default:
        searchQuery = 'Cyber City IGI Airport New Delhi Railway Station Connaught Place Aerocity';
        break;
    }

    final results = <LocationModel>[];
    final seenKeys = <String>{};

    try {
      final photonUri = Uri.parse('$_photonBase/?q=${Uri.encodeComponent(searchQuery)}&limit=10&lat=28.6139&lon=77.2090');
      final res = await http.get(photonUri, headers: _headers).timeout(const Duration(milliseconds: 2500));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final features = data['features'] as List<dynamic>? ?? [];

        for (final item in features) {
          final props = item['properties'] as Map<String, dynamic>? ?? {};
          final geom = item['geometry'] as Map<String, dynamic>? ?? {};
          final coords = geom['coordinates'] as List<dynamic>?;

          final name = props['name'] as String? ?? props['street'] as String? ?? '';
          if (name.isEmpty) continue;

          final city = props['city'] as String? ?? props['district'] as String? ?? '';
          final state = props['state'] as String? ?? '';
          final postcode = props['postcode'] as String? ?? '';

          final addressParts = <String>[];
          if (name.isNotEmpty) addressParts.add(name);
          if (city.isNotEmpty) addressParts.add(city);
          if (state.isNotEmpty) addressParts.add(state);

          final fullAddress = addressParts.isNotEmpty ? addressParts.join(', ') : name;
          final lon = coords != null && coords.isNotEmpty ? (coords[0] as num).toDouble() : 77.0895;
          final lat = coords != null && coords.length > 1 ? (coords[1] as num).toDouble() : 28.4950;

          final dedupeKey = name.toLowerCase();
          if (!seenKeys.contains(dedupeKey)) {
            seenKeys.add(dedupeKey);
            results.add(
              LocationModel(
                title: name,
                fullAddress: fullAddress,
                latitude: lat,
                longitude: lon,
                city: city,
                state: state,
                postcode: postcode,
                category: category,
                icon: getIconForCategory(category, name),
              ),
            );
          }
        }
      }
    } catch (e) {
      debugPrint('Category fetch fallback: $e');
    }

    if (results.isEmpty) {
      return _getCuratedCategoryPlaces(category);
    }

    return results;
  }

  /// Live Reverse Geocoding via OpenStreetMap Nominatim API
  Future<LocationModel> reverseGeocode(double lat, double lng) async {
    try {
      final uri = Uri.parse(
        '$_nominatimBase/reverse?lat=$lat&lon=$lng&format=json&addressdetails=1',
      );

      final response = await http.get(uri, headers: _headers).timeout(const Duration(milliseconds: 3500));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final displayName = data['display_name'] as String? ?? 'Pinned Location';
        final parts = displayName.split(',');
        final title = parts.isNotEmpty ? parts[0].trim() : 'Pinned Location';

        final addressObj = data['address'] as Map<String, dynamic>?;
        final road = addressObj?['road'] ?? addressObj?['pedestrian'] ?? addressObj?['suburb'] ?? '';
        final city = (addressObj?['city'] ?? addressObj?['town'] ?? addressObj?['suburb'] ?? addressObj?['state_district'] ?? '').toString();
        final state = (addressObj?['state'] ?? '').toString();
        final postcode = (addressObj?['postcode'] ?? '').toString();
        final osmClass = data['class'] as String?;
        final osmType = data['type'] as String?;

        final effectiveTitle = title.isNotEmpty ? title : (road.toString().isNotEmpty ? road.toString() : 'Pinned Location');

        return LocationModel(
          title: effectiveTitle,
          fullAddress: displayName,
          latitude: lat,
          longitude: lng,
          city: city,
          state: state,
          postcode: postcode,
          category: 'PINNED',
          icon: getIconForCategory('$osmClass $osmType', effectiveTitle),
        );
      }
    } catch (e) {
      debugPrint('OSM Reverse Geocode error: $e');
    }

    return LocationModel(
      title: 'Pinned Location (${lat.toStringAsFixed(4)}, ${lng.toStringAsFixed(4)})',
      fullAddress: 'Lat: ${lat.toStringAsFixed(5)}, Lng: ${lng.toStringAsFixed(5)} (OpenStreetMap)',
      latitude: lat,
      longitude: lng,
      category: 'PINNED',
      icon: Icons.pin_drop_rounded,
    );
  }

  /// Recent Searches Storage (Local Persistence via SharedPreferences)
  Future<List<LocationModel>> getRecentLocations() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final list = prefs.getStringList(_recentStorageKey);
      if (list != null && list.isNotEmpty) {
        return list.map((item) => LocationModel.fromJson(item)).toList();
      }
    } catch (e) {
      debugPrint('Error loading recent locations: $e');
    }
    // Return curated recent defaults if storage is empty
    return _getCuratedFallbackPlaces().take(4).toList();
  }

  Future<void> saveRecentLocation(LocationModel location) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final currentList = prefs.getStringList(_recentStorageKey) ?? [];
      
      // Deduplicate
      currentList.removeWhere((item) {
        try {
          final m = jsonDecode(item) as Map<String, dynamic>;
          return (m['title'] == location.title && m['city'] == location.city);
        } catch (_) {
          return false;
        }
      });

      // Insert at the beginning
      currentList.insert(0, location.toJson());

      // Limit to 10 recents
      if (currentList.length > 10) {
        currentList.removeRange(10, currentList.length);
      }

      await prefs.setStringList(_recentStorageKey, currentList);
    } catch (e) {
      debugPrint('Error saving recent location: $e');
    }
  }

  Future<void> clearRecentLocations() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_recentStorageKey);
    } catch (e) {
      debugPrint('Error clearing recent locations: $e');
    }
  }

  /// Curated Fast Fallback Dataset (OpenStreetMap Verified Locations in NCR / India)
  List<LocationModel> _getCuratedFallbackPlaces() {
    return const [
      LocationModel(
        title: 'DLF Cyber City',
        fullAddress: 'DLF Cyber City, DLF Phase 2, Sector 24, Gurugram, Haryana 122002',
        latitude: 28.4950,
        longitude: 77.0895,
        city: 'Gurugram',
        state: 'Haryana',
        postcode: '122002',
        category: 'Tech Parks',
        icon: Icons.business_rounded,
      ),
      LocationModel(
        title: 'IGI Airport Terminal 3',
        fullAddress: 'Indira Gandhi International Airport, Terminal 3, New Delhi, Delhi 110037',
        latitude: 28.5562,
        longitude: 77.1000,
        city: 'New Delhi',
        state: 'Delhi',
        postcode: '110037',
        category: 'Airports',
        icon: Icons.local_airport_rounded,
      ),
      LocationModel(
        title: 'New Delhi Railway Station (NDLS)',
        fullAddress: 'Bhavbhuti Marg, Ratan Lal Market, Kamla Market, Ajmeri Gate, New Delhi 110006',
        latitude: 28.6430,
        longitude: 77.2195,
        city: 'New Delhi',
        state: 'Delhi',
        postcode: '110006',
        category: 'Railway Stations',
        icon: Icons.train_rounded,
      ),
      LocationModel(
        title: 'Connaught Place (Inner Circle)',
        fullAddress: 'Connaught Place, Block A, Central Secretariat, New Delhi, Delhi 110001',
        latitude: 28.6315,
        longitude: 77.2167,
        city: 'New Delhi',
        state: 'Delhi',
        postcode: '110001',
        category: 'Commercial Hubs',
        icon: Icons.storefront_rounded,
      ),
      LocationModel(
        title: 'Worldmark Aerocity',
        fullAddress: 'Worldmark 1, Asset Area 11, Hospitality District, Aerocity, New Delhi 110037',
        latitude: 28.5505,
        longitude: 77.1216,
        city: 'New Delhi',
        state: 'Delhi',
        postcode: '110037',
        category: 'Commercial Hubs',
        icon: Icons.business_rounded,
      ),
      LocationModel(
        title: 'Noida Electronic City (Sector 62)',
        fullAddress: 'Sector 62, Noida, Gautam Buddha Nagar, Uttar Pradesh 201309',
        latitude: 28.6280,
        longitude: 77.3649,
        city: 'Noida',
        state: 'Uttar Pradesh',
        postcode: '201309',
        category: 'Tech Parks',
        icon: Icons.business_rounded,
      ),
      LocationModel(
        title: 'Millennium City Centre Metro Station',
        fullAddress: 'Sector 29, Gurugram, Haryana 122001',
        latitude: 28.4593,
        longitude: 77.0726,
        city: 'Gurugram',
        state: 'Haryana',
        postcode: '122001',
        category: 'Metro Hubs',
        icon: Icons.directions_subway_rounded,
      ),
      LocationModel(
        title: 'Medanta - The Medicity',
        fullAddress: 'CH Bakhtawar Singh Rd, Near Rajiv Chowk, Sector 38, Gurugram, Haryana 122001',
        latitude: 28.4390,
        longitude: 77.0425,
        city: 'Gurugram',
        state: 'Haryana',
        postcode: '122001',
        category: 'Hospitals',
        icon: Icons.local_hospital_rounded,
      ),
    ];
  }

  List<LocationModel> _getCuratedCategoryPlaces(String category) {
    final all = _getCuratedFallbackPlaces();
    if (category == 'All') return all;
    final filtered = all.where((p) => p.category == category).toList();
    return filtered.isNotEmpty ? filtered : all;
  }
}
