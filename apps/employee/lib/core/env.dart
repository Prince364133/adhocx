/// Build-time configuration, same pattern as apps/mobile:
///   flutter run --dart-define-from-file=env.json
/// `API_URL` wins over `API_BASE_URL`; both default to the production API.
class Env {
  Env._();

  static const String _apiUrl = String.fromEnvironment('API_URL', defaultValue: '');
  static const String _apiBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: '');

  /// Google Static Maps key for the live-tracking map image. Empty = coordinates-only view.
  /// Never hard-code the key in source (see apps/api key rotation note).
  static const String googleMapsStaticKey = String.fromEnvironment('GOOGLE_MAPS_STATIC_KEY', defaultValue: '');

  static String get apiBaseUrl {
    final raw = _apiUrl.isNotEmpty
        ? _apiUrl
        : (_apiBaseUrl.isNotEmpty ? _apiBaseUrl : 'https://api.adhocx.com/api/v1');
    return raw.endsWith('/') ? raw.substring(0, raw.length - 1) : raw;
  }
}
