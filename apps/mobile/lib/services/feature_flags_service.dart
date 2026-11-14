import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/networking/api_client.dart';
import '../core/config/feature_flags.dart';

/// Central client service for live dynamic Feature Flags synchronization.
/// Synchronizes platform feature toggles from `GET /api/v1/feature-flags`
/// with local SharedPreferences caching for zero-latency startup.
class FeatureFlagsService extends ChangeNotifier {
  static FeatureFlagsService? _instance;
  static FeatureFlagsService get instance => _instance ??= FeatureFlagsService._();

  FeatureFlagsService._();

  static const String _cacheKey = 'adhocx_cached_feature_flags';
  final Map<String, bool> _flags = <String, bool>{};
  bool _isInitialized = false;

  bool get isInitialized => _isInitialized;

  /// Returns whether a given feature flag is enabled.
  bool isEnabled(String key, {bool defaultValue = true}) {
    if (_flags.containsKey(key)) {
      return _flags[key]!;
    }
    return defaultValue;
  }

  /// Convenience getter for vendor wallet access.
  bool get isVendorWalletEnabled => isEnabled('vendor_wallet', defaultValue: true);

  /// Initializes the service from cached preferences and performs a background fetch.
  Future<void> init() async {
    await _loadFromCache();
    // Fetch live in background without blocking initial frame rendering
    fetchFlags().catchError((e) {
      debugPrint('⚠️ [FEATURE FLAGS] Initial fetch error: $e');
    });
  }

  /// Loads cached flags from SharedPreferences.
  Future<void> _loadFromCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_cacheKey);
      if (raw != null && raw.isNotEmpty) {
        final decoded = jsonDecode(raw);
        if (decoded is Map) {
          _flags.clear();
          decoded.forEach((key, value) {
            if (key is String && value is bool) {
              _flags[key] = value;
            }
          });
          _syncToStaticFeatureFlags();
        }
      }
      _isInitialized = true;
      notifyListeners();
    } catch (e) {
      debugPrint('⚠️ [FEATURE FLAGS] Failed to read cached flags: $e');
    }
  }

  /// Fetches latest feature flags from the authoritative backend API.
  Future<void> fetchFlags() async {
    try {
      final res = await ApiClient.instance.get('/feature-flags');
      if (res is Map) {
        final data = res['data'] ?? res;
        final flagsMap = data['flags'];
        if (flagsMap is Map) {
          _flags.clear();
          flagsMap.forEach((key, value) {
            if (key is String && value is bool) {
              _flags[key] = value;
            }
          });

          _syncToStaticFeatureFlags();
          _isInitialized = true;
          notifyListeners();

          // Persist to local cache for offline/instant resume
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString(_cacheKey, jsonEncode(_flags));
        }
      }
    } catch (e) {
      debugPrint('⚠️ [FEATURE FLAGS] Live flags fetch failed (falling back to cache): $e');
    }
  }

  /// Synchronizes dynamic flags to the static FeatureFlags class for legacy consumers.
  void _syncToStaticFeatureFlags() {
    final bool vendorWallet = isEnabled('vendor_wallet', defaultValue: true);
    FeatureFlags.updateVendorWalletLive(vendorWallet);
  }

  @visibleForTesting
  void setFlagForTesting(String key, bool enabled) {
    _flags[key] = enabled;
    _syncToStaticFeatureFlags();
    notifyListeners();
  }
}
