import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

class LocationModel {
  final String title;
  final String fullAddress;
  final double latitude;
  final double longitude;
  final String? city;
  final String? state;
  final String? category;
  final IconData icon;

  const LocationModel({
    required this.title,
    required this.fullAddress,
    required this.latitude,
    required this.longitude,
    this.city,
    this.state,
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
      'category': category,
    };
  }

  factory LocationModel.fromMap(Map<String, dynamic> map) {
    return LocationModel(
      title: map['title'] as String? ?? 'Location',
      fullAddress: map['fullAddress'] as String? ?? map['address'] as String? ?? '',
      latitude: (map['latitude'] as num?)?.toDouble() ?? 28.4950,
      longitude: (map['longitude'] as num?)?.toDouble() ?? 77.0895,
      city: map['city'] as String?,
      state: map['state'] as String?,
      category: map['category'] as String?,
    );
  }
}

class LocationService {
  static LocationService? _instance;
  static LocationService get instance => _instance ??= LocationService._();

  LocationService._();

  static const String _nominatimBase = 'https://nominatim.openstreetmap.org';
  static const Map<String, String> _headers = {
    'User-Agent': 'AdhocX-OpenStreetMap-Fleet-App/1.0 (adhocx.ofc@gmail.com)',
    'Accept': 'application/json',
  };

  /// Determine icon based on OpenStreetMap feature class and type
  static IconData _getIconFromOsm(String? osmClass, String? osmType) {
    final c = (osmClass ?? '').toLowerCase();
    final t = (osmType ?? '').toLowerCase();

    if (c == 'aeroway' || t.contains('airport') || t.contains('aerodrome')) {
      return Icons.local_airport_rounded;
    }
    if (c == 'railway' || t.contains('station') || t.contains('train') || t.contains('metro')) {
      return Icons.train_rounded;
    }
    if (c == 'office' || c == 'building' || t.contains('tech') || t.contains('commercial') || t.contains('business')) {
      return Icons.business_rounded;
    }
    if (c == 'highway' || t.contains('road') || t.contains('toll')) {
      return Icons.add_road_rounded;
    }
    if (c == 'shop' || c == 'amenity' || t.contains('mall')) {
      return Icons.storefront_rounded;
    }
    if (c == 'tourism' || c == 'historic') {
      return Icons.account_balance_rounded;
    }
    return Icons.location_on_rounded;
  }

  /// Live Search from OpenStreetMap Nominatim API
  Future<List<LocationModel>> searchLocations(String query) async {
    final cleanQuery = query.trim();
    if (cleanQuery.isEmpty) {
      return fetchCategoryPlaces('All');
    }

    try {
      final uri = Uri.parse(
        '$_nominatimBase/search?q=${Uri.encodeComponent(cleanQuery)}&format=json&addressdetails=1&limit=12&countrycodes=in',
      );

      final response = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final List<dynamic> jsonList = jsonDecode(response.body);
        return jsonList.map((item) {
          final displayName = item['display_name'] as String? ?? '';
          final parts = displayName.split(',');
          final shortTitle = parts.isNotEmpty ? parts[0].trim() : 'Location';
          final lat = double.tryParse(item['lat']?.toString() ?? '0') ?? 0.0;
          final lon = double.tryParse(item['lon']?.toString() ?? '0') ?? 0.0;

          final addressObj = item['address'] as Map<String, dynamic>?;
          final city = addressObj?['city'] ?? addressObj?['town'] ?? addressObj?['suburb'] ?? addressObj?['state_district'] ?? '';
          final state = addressObj?['state'] ?? '';
          final osmClass = item['class'] as String?;
          final osmType = item['type'] as String?;

          return LocationModel(
            title: shortTitle,
            fullAddress: displayName,
            latitude: lat,
            longitude: lon,
            city: city.toString(),
            state: state.toString(),
            category: osmClass != null ? osmClass.toUpperCase() : 'SEARCH',
            icon: _getIconFromOsm(osmClass, osmType),
          );
        }).toList();
      }
    } catch (e) {
      debugPrint('OSM Nominatim Search error: $e');
    }

    return [];
  }

  /// Live Category Places from OpenStreetMap Nominatim API
  Future<List<LocationModel>> fetchCategoryPlaces(String category) async {
    String searchQuery;
    switch (category) {
      case 'Airports':
        searchQuery = 'international airport aerodrome india';
        break;
      case 'Tech Parks':
        searchQuery = 'cyber city tech park business park electronic city ncr bengaluru';
        break;
      case 'Railway Stations':
        searchQuery = 'railway station junction metro station ncr delhi';
        break;
      case 'Commercial Hubs':
        searchQuery = 'commercial hub bandra kurla complex connaught place aerocity';
        break;
      default:
        searchQuery = 'cyber city airport tech park railway station';
        break;
    }

    try {
      final uri = Uri.parse(
        '$_nominatimBase/search?q=${Uri.encodeComponent(searchQuery)}&format=json&addressdetails=1&limit=10&countrycodes=in',
      );

      final response = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final List<dynamic> jsonList = jsonDecode(response.body);
        return jsonList.map((item) {
          final displayName = item['display_name'] as String? ?? '';
          final parts = displayName.split(',');
          final shortTitle = parts.isNotEmpty ? parts[0].trim() : 'Place';
          final lat = double.tryParse(item['lat']?.toString() ?? '0') ?? 0.0;
          final lon = double.tryParse(item['lon']?.toString() ?? '0') ?? 0.0;

          final addressObj = item['address'] as Map<String, dynamic>?;
          final city = addressObj?['city'] ?? addressObj?['town'] ?? addressObj?['suburb'] ?? '';
          final state = addressObj?['state'] ?? '';
          final osmClass = item['class'] as String?;
          final osmType = item['type'] as String?;

          return LocationModel(
            title: shortTitle,
            fullAddress: displayName,
            latitude: lat,
            longitude: lon,
            city: city.toString(),
            state: state.toString(),
            category: category,
            icon: _getIconFromOsm(osmClass, osmType),
          );
        }).toList();
      }
    } catch (e) {
      debugPrint('OSM Category fetch error: $e');
    }

    return [];
  }

  /// Live Reverse Geocoding via OpenStreetMap Nominatim API
  Future<LocationModel> reverseGeocode(double lat, double lng) async {
    try {
      final uri = Uri.parse(
        '$_nominatimBase/reverse?lat=$lat&lon=$lng&format=json&addressdetails=1',
      );

      final response = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final displayName = data['display_name'] as String? ?? 'Pinned Location';
        final parts = displayName.split(',');
        final title = parts.isNotEmpty ? parts[0].trim() : 'Pinned Location';

        final addressObj = data['address'] as Map<String, dynamic>?;
        final city = addressObj?['city'] ?? addressObj?['town'] ?? addressObj?['suburb'] ?? '';
        final state = addressObj?['state'] ?? '';
        final osmClass = data['class'] as String?;
        final osmType = data['type'] as String?;

        return LocationModel(
          title: title,
          fullAddress: displayName,
          latitude: lat,
          longitude: lng,
          city: city.toString(),
          state: state.toString(),
          category: 'PINNED',
          icon: _getIconFromOsm(osmClass, osmType),
        );
      }
    } catch (e) {
      debugPrint('OSM Reverse Geocode error: $e');
    }

    return LocationModel(
      title: 'Pinned Location',
      fullAddress: '${lat.toStringAsFixed(5)}, ${lng.toStringAsFixed(5)}',
      latitude: lat,
      longitude: lng,
      category: 'PINNED',
      icon: Icons.pin_drop_rounded,
    );
  }
}
