import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'app_logger.dart';

/// Access / refresh token storage. Production uses the platform keystore (same pattern as
/// apps/mobile ApiClient); tests use [MemoryTokenStore].
abstract class TokenStore {
  Future<String?> readAccess();
  Future<String?> readRefresh();
  Future<void> write({required String accessToken, String? refreshToken});
  Future<void> clear();
}

class SecureTokenStore implements TokenStore {
  static const String _accessKey = 'adhocx_employee_auth_token';
  static const String _refreshKey = 'adhocx_employee_refresh_token';
  static const FlutterSecureStorage _storage = FlutterSecureStorage();

  @override
  Future<String?> readAccess() => _read(_accessKey);

  @override
  Future<String?> readRefresh() => _read(_refreshKey);

  Future<String?> _read(String key) async {
    try {
      final v = await _storage.read(key: key);
      return (v == null || v.isEmpty) ? null : v;
    } catch (e) {
      AppLogger.warn('Secure storage read failed: $e', tag: 'AUTH');
      return null;
    }
  }

  @override
  Future<void> write({required String accessToken, String? refreshToken}) async {
    await _storage.write(key: _accessKey, value: accessToken);
    if (refreshToken != null && refreshToken.isNotEmpty) {
      await _storage.write(key: _refreshKey, value: refreshToken);
    }
  }

  @override
  Future<void> clear() async {
    try {
      await _storage.delete(key: _accessKey);
      await _storage.delete(key: _refreshKey);
    } catch (e) {
      AppLogger.warn('Secure storage delete failed: $e', tag: 'AUTH');
    }
  }
}

class MemoryTokenStore implements TokenStore {
  String? access;
  String? refresh;

  MemoryTokenStore({this.access, this.refresh});

  @override
  Future<String?> readAccess() async => access;

  @override
  Future<String?> readRefresh() async => refresh;

  @override
  Future<void> write({required String accessToken, String? refreshToken}) async {
    access = accessToken;
    if (refreshToken != null && refreshToken.isNotEmpty) refresh = refreshToken;
  }

  @override
  Future<void> clear() async {
    access = null;
    refresh = null;
  }
}
