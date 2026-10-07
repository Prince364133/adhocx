import 'dart:convert';
import 'dart:math' as math;
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

  /// Google Maps Platform API Key
  static const String googleMapsApiKey = 'AIzaSyB8uEHtGy96QPbx3eIxG0s0_WYlWpB8QVI';

  static const String _placesSearchTextBase = 'https://places.googleapis.com/v1/places:searchText';
  static const String _geocodeBase = 'https://maps.googleapis.com/maps/api/geocode/json';
  static const String _routesBase = 'https://routes.googleapis.com/directions/v2:computeRoutes';
  static const String _recentStorageKey = 'adhocx_recent_locations_v2';

  /// Standard Google Maps API headers for Places & Routes (New)
  static const Map<String, String> _googleJsonHeaders = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': googleMapsApiKey,
  };

  /// Determine icon based on category or place title keywords
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
    if (c.contains('highway') || t.contains('expressway') || t.contains('road') || t.contains('toll')) {
      return Icons.add_road_rounded;
    }
    return Icons.location_on_rounded;
  }

  /// Generates a Google Maps Static API URL for map preview widgets
  static String getStaticMapUrl({
    required double lat,
    required double lng,
    int zoom = 15,
    int width = 600,
    int height = 380,
    bool isDark = false,
  }) {
    final darkStyle = isDark
        ? '&style=element:geometry%7Ccolor:0x242f3e'
          '&style=element:labels.text.stroke%7Ccolor:0x242f3e'
          '&style=element:labels.text.fill%7Ccolor:0x746855'
          '&style=feature:administrative.locality%7Celement:labels.text.fill%7Ccolor:0xd59563'
          '&style=feature:poi%7Celement:labels.text.fill%7Ccolor:0xd59563'
          '&style=feature:poi.park%7Celement:geometry%7Ccolor:0x263c3f'
          '&style=feature:road%7Celement:geometry%7Ccolor:0x38414e'
          '&style=feature:road%7Celement:geometry.stroke%7Ccolor:0x212a37'
          '&style=feature:road%7Celement:labels.text.fill%7Ccolor:0x9ca5b3'
          '&style=feature:road.highway%7Celement:geometry%7Ccolor:0x746855'
          '&style=feature:road.highway%7Celement:geometry.stroke%7Ccolor:0x1f2835'
          '&style=feature:road.highway%7Celement:labels.text.fill%7Ccolor:0xf3d19c'
          '&style=feature:transit%7Celement:geometry%7Ccolor:0x2f3948'
          '&style=feature:water%7Celement:geometry%7Ccolor:0x17263c'
          '&style=feature:water%7Celement:labels.text.fill%7Ccolor:0x515c6d'
        : '&style=feature:poi%7Cvisibility:simplified';

    return 'https://maps.googleapis.com/maps/api/staticmap'
        '?center=$lat,$lng'
        '&zoom=$zoom'
        '&size=${width}x$height'
        '&scale=2'
        '&maptype=roadmap'
        '$darkStyle'
        '&markers=color:red%7C$lat,$lng'
        '&key=$googleMapsApiKey';
  }

  /// Primary search engine: Queries Google Places API (New) Text Search with location bias
  Future<List<LocationModel>> searchLocations(String query, {double? lat, double? lon}) async {
    final cleanQuery = query.trim();
    if (cleanQuery.isEmpty) {
      return fetchCategoryPlaces('All', lat: lat, lon: lon);
    }

    final results = <LocationModel>[];
    final seenKeys = <String>{};

    try {
      final biasLat = lat ?? 28.6139;
      final biasLon = lon ?? 77.2090;

      final body = {
        'textQuery': cleanQuery,
        'languageCode': 'en',
        'locationBias': {
          'circle': {
            'center': {
              'latitude': biasLat,
              'longitude': biasLon,
            },
            'radius': 50000.0,
          },
        },
      };

      final response = await http.post(
        Uri.parse(_placesSearchTextBase),
        headers: {
          ..._googleJsonHeaders,
          'X-Goog-FieldMask':
              'places.id,places.displayName,places.formattedAddress,places.location,places.addressComponents,places.types',
        },
        body: jsonEncode(body),
      ).timeout(const Duration(milliseconds: 3500));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final places = data['places'] as List<dynamic>? ?? [];

        for (final item in places) {
          final place = item as Map<String, dynamic>;
          final displayName = place['displayName']?['text']?.toString() ?? '';
          final formattedAddress = place['formattedAddress']?.toString() ?? displayName;

          if (displayName.isEmpty && formattedAddress.isEmpty) continue;

          final location = place['location'] as Map<String, dynamic>?;
          final pLat = (location?['latitude'] as num?)?.toDouble() ?? biasLat;
          final pLon = (location?['longitude'] as num?)?.toDouble() ?? biasLon;

          // Parse address components
          String city = '';
          String state = '';
          String postcode = '';
          final components = place['addressComponents'] as List<dynamic>? ?? [];
          for (final comp in components) {
            final types = (comp['types'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
            if (types.contains('locality') || types.contains('sublocality_level_1') || types.contains('administrative_area_level_2')) {
              if (city.isEmpty) city = comp['longText']?.toString() ?? comp['shortText']?.toString() ?? '';
            }
            if (types.contains('administrative_area_level_1')) {
              state = comp['longText']?.toString() ?? comp['shortText']?.toString() ?? '';
            }
            if (types.contains('postal_code')) {
              postcode = comp['longText']?.toString() ?? comp['shortText']?.toString() ?? '';
            }
          }

          final typesList = (place['types'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
          final primaryType = typesList.isNotEmpty ? typesList.first : 'SEARCH';
          final title = displayName.isNotEmpty ? displayName : formattedAddress.split(',').first.trim();

          final dedupeKey = '${title.toLowerCase()}_${city.toLowerCase()}';
          if (!seenKeys.contains(dedupeKey)) {
            seenKeys.add(dedupeKey);
            results.add(
              LocationModel(
                title: title,
                fullAddress: formattedAddress,
                latitude: pLat,
                longitude: pLon,
                city: city.isNotEmpty ? city : null,
                state: state.isNotEmpty ? state : null,
                postcode: postcode.isNotEmpty ? postcode : null,
                category: primaryType.toUpperCase(),
                icon: getIconForCategory(primaryType, title),
              ),
            );
          }
        }
      }
    } catch (e) {
      debugPrint('Google Places search error: $e');
    }

    // Fallback: If network is offline or empty results, filter curated places
    if (results.isEmpty) {
      final curated = _getCuratedFallbackPlaces();
      final qLower = cleanQuery.toLowerCase();
      return curated.where((p) => p.title.toLowerCase().contains(qLower) || p.fullAddress.toLowerCase().contains(qLower)).toList();
    }

    return results;
  }

  /// Live Category Places from Google Places API (New) dynamically biased to user city and lat/lon
  Future<List<LocationModel>> fetchCategoryPlaces(String category, {double? lat, double? lon, String? cityName}) async {
    final citySuffix = (cityName != null && cityName.trim().isNotEmpty) ? ' in ${cityName.trim()}' : ' in Delhi NCR';
    String searchQuery;
    switch (category) {
      case 'Airports':
        searchQuery = 'international domestic airport terminal$citySuffix';
        break;
      case 'Tech Parks':
        searchQuery = 'tech park cyber park IT park business hub$citySuffix';
        break;
      case 'Railway Stations':
        searchQuery = 'railway station junction terminal$citySuffix';
        break;
      case 'Metro Hubs':
        searchQuery = 'metro station rapid metro$citySuffix';
        break;
      case 'Commercial Hubs':
        searchQuery = 'shopping mall commercial center market$citySuffix';
        break;
      case 'Hospitals':
        searchQuery = 'hospital medical center super speciality hospital$citySuffix';
        break;
      case 'Hotels':
        searchQuery = 'luxury hotel 5 star resort inn$citySuffix';
        break;
      default:
        searchQuery = 'popular transit hubs airports tech parks$citySuffix';
        break;
    }

    final results = <LocationModel>[];
    final seenKeys = <String>{};
    final biasLat = lat ?? 28.6139;
    final biasLon = lon ?? 77.2090;

    try {
      final body = {
        'textQuery': searchQuery,
        'languageCode': 'en',
        'locationBias': {
          'circle': {
            'center': {
              'latitude': biasLat,
              'longitude': biasLon,
            },
            'radius': 35000.0,
          },
        },
      };

      final response = await http.post(
        Uri.parse(_placesSearchTextBase),
        headers: {
          ..._googleJsonHeaders,
          'X-Goog-FieldMask':
              'places.id,places.displayName,places.formattedAddress,places.location,places.addressComponents,places.types',
        },
        body: jsonEncode(body),
      ).timeout(const Duration(milliseconds: 3500));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final places = data['places'] as List<dynamic>? ?? [];

        for (final item in places) {
          final place = item as Map<String, dynamic>;
          final displayName = place['displayName']?['text']?.toString() ?? '';
          final formattedAddress = place['formattedAddress']?.toString() ?? displayName;

          if (displayName.isEmpty && formattedAddress.isEmpty) continue;

          final location = place['location'] as Map<String, dynamic>?;
          final pLat = (location?['latitude'] as num?)?.toDouble() ?? biasLat;
          final pLon = (location?['longitude'] as num?)?.toDouble() ?? biasLon;

          // Parse address components
          String city = '';
          String state = '';
          String postcode = '';
          final components = place['addressComponents'] as List<dynamic>? ?? [];
          for (final comp in components) {
            final types = (comp['types'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
            if (types.contains('locality') || types.contains('sublocality_level_1') || types.contains('administrative_area_level_2')) {
              if (city.isEmpty) city = comp['longText']?.toString() ?? comp['shortText']?.toString() ?? '';
            }
            if (types.contains('administrative_area_level_1')) {
              state = comp['longText']?.toString() ?? comp['shortText']?.toString() ?? '';
            }
            if (types.contains('postal_code')) {
              postcode = comp['longText']?.toString() ?? comp['shortText']?.toString() ?? '';
            }
          }

          final title = displayName.isNotEmpty ? displayName : formattedAddress.split(',').first.trim();
          final dedupeKey = title.toLowerCase();

          if (!seenKeys.contains(dedupeKey)) {
            seenKeys.add(dedupeKey);
            results.add(
              LocationModel(
                title: title,
                fullAddress: formattedAddress,
                latitude: pLat,
                longitude: pLon,
                city: city.isNotEmpty ? city : cityName,
                state: state.isNotEmpty ? state : null,
                postcode: postcode.isNotEmpty ? postcode : null,
                category: category,
                icon: getIconForCategory(category, title),
              ),
            );
          }
        }
      }
    } catch (e) {
      debugPrint('Google Places category fetch error: $e');
    }

    if (results.isEmpty) {
      return _getCuratedCategoryPlaces(category);
    }

    return results;
  }

  /// Live Reverse Geocoding via Google Geocoding API
  Future<LocationModel> reverseGeocode(double lat, double lng) async {
    try {
      final uri = Uri.parse('$_geocodeBase?latlng=$lat,$lng&key=$googleMapsApiKey');
      final response = await http.get(uri).timeout(const Duration(milliseconds: 3500));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        if (data['status'] == 'OK' && data['results'] != null && (data['results'] as List).isNotEmpty) {
          final first = data['results'][0] as Map<String, dynamic>;
          final formattedAddress = first['formatted_address'] as String? ?? 'Pinned Location';
          final parts = formattedAddress.split(',');
          final title = parts.isNotEmpty ? parts[0].trim() : 'Pinned Location';

          String city = '';
          String state = '';
          String postcode = '';
          final components = first['address_components'] as List<dynamic>? ?? [];
          for (final comp in components) {
            final types = (comp['types'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
            if (types.contains('locality') || types.contains('sublocality_level_1') || types.contains('administrative_area_level_2')) {
              if (city.isEmpty) city = comp['long_name']?.toString() ?? comp['short_name']?.toString() ?? '';
            }
            if (types.contains('administrative_area_level_1')) {
              state = comp['long_name']?.toString() ?? comp['short_name']?.toString() ?? '';
            }
            if (types.contains('postal_code')) {
              postcode = comp['long_name']?.toString() ?? comp['short_name']?.toString() ?? '';
            }
          }

          return LocationModel(
            title: title,
            fullAddress: formattedAddress,
            latitude: lat,
            longitude: lng,
            city: city.isNotEmpty ? city : null,
            state: state.isNotEmpty ? state : null,
            postcode: postcode.isNotEmpty ? postcode : null,
            category: 'PINNED',
            icon: Icons.pin_drop_rounded,
          );
        }
      }
    } catch (e) {
      debugPrint('Google Geocode error: $e');
    }

    return LocationModel(
      title: 'Pinned Location (${lat.toStringAsFixed(4)}, ${lng.toStringAsFixed(4)})',
      fullAddress: 'Lat: ${lat.toStringAsFixed(5)}, Lng: ${lng.toStringAsFixed(5)} (Google Maps)',
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

  /// Curated Fast Fallback Dataset (Google Maps Verified Locations in NCR / India)
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

  /// Real-time road distance and ETA calculation using Google Routes API (New)
  Future<RoadRouteResult> calculateRoadRoute({
    required double startLat,
    required double startLng,
    required double endLat,
    required double endLng,
  }) async {
    if (startLat == 0.0 || startLng == 0.0 || endLat == 0.0 || endLng == 0.0 ||
        (startLat == endLat && startLng == endLng)) {
      return const RoadRouteResult(
        distanceKm: 0.0,
        durationMinutes: 0,
        formattedDistance: '0 km',
        formattedEta: '0 mins',
      );
    }

    try {
      final body = {
        'origin': {
          'location': {
            'latLng': {
              'latitude': startLat,
              'longitude': startLng,
            },
          },
        },
        'destination': {
          'location': {
            'latLng': {
              'latitude': endLat,
              'longitude': endLng,
            },
          },
        },
        'travelMode': 'DRIVE',
        'routingPreference': 'TRAFFIC_AWARE',
      };

      final response = await http.post(
        Uri.parse(_routesBase),
        headers: {
          ..._googleJsonHeaders,
          'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.description',
        },
        body: jsonEncode(body),
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final routes = data['routes'] as List<dynamic>?;
        if (routes != null && routes.isNotEmpty) {
          final route = routes[0] as Map<String, dynamic>;
          final distanceMeters = (route['distanceMeters'] as num?)?.toDouble() ?? 0.0;
          final durationRaw = route['duration']?.toString() ?? '0s';
          final durationSeconds = double.tryParse(durationRaw.replaceAll('s', '')) ?? 0.0;

          if (distanceMeters > 0) {
            return RoadRouteResult.fromMetersAndSeconds(distanceMeters, durationSeconds, isAccurate: true);
          }
        }
      }
    } catch (e) {
      debugPrint('Google Routes API error: $e');
    }

    // Fallback: Haversine distance * 1.28x Indian road network curvature factor
    final haversineKm = _calculateHaversineKm(startLat, startLng, endLat, endLng) * 1.28;
    final fallbackMins = (haversineKm * 2.2).round().clamp(5, 600);
    return RoadRouteResult.fromMetersAndSeconds(haversineKm * 1000.0, fallbackMins * 60.0, isAccurate: false);
  }

  double _calculateHaversineKm(double lat1, double lon1, double lat2, double lon2) {
    const double p = 0.017453292519943295; // Math.PI / 180
    final dLat = (lat2 - lat1) * p;
    final dLon = (lon2 - lon1) * p;
    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(lat1 * p) * math.cos(lat2 * p) * math.sin(dLon / 2) * math.sin(dLon / 2);
    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    const double earthRadiusKm = 6371.0;
    final d = earthRadiusKm * c;
    return d > 0 ? d : 5.0;
  }
}

/// Result of a Google Maps road routing computation
class RoadRouteResult {
  final double distanceKm;
  final int durationMinutes;
  final String formattedDistance;
  final String formattedEta;
  final bool isAccurateRoad;

  const RoadRouteResult({
    required this.distanceKm,
    required this.durationMinutes,
    required this.formattedDistance,
    required this.formattedEta,
    this.isAccurateRoad = true,
  });

  factory RoadRouteResult.fromMetersAndSeconds(double distanceMeters, double durationSeconds, {bool isAccurate = true}) {
    final km = (distanceMeters / 1000.0);
    final mins = (durationSeconds / 60.0).round();
    final String distStr = km < 1 ? '${(km * 1000).round()} m' : '${km.toStringAsFixed(1)} km';
    final String etaStr = mins < 60 ? '$mins mins' : '${mins ~/ 60}h ${mins % 60}m';
    return RoadRouteResult(
      distanceKm: km,
      durationMinutes: mins,
      formattedDistance: distStr,
      formattedEta: etaStr,
      isAccurateRoad: isAccurate,
    );
  }
}
