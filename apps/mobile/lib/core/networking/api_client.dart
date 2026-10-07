import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/app_logger.dart';

class ApiException implements Exception {
  final int statusCode;
  final String message;
  final dynamic data;

  ApiException({required this.statusCode, required this.message, this.data});

  @override
  String toString() => 'ApiException($statusCode): $message';
}

class _ApiCacheEntry {
  final dynamic data;
  final DateTime timestamp;
  final Duration ttl;

  _ApiCacheEntry(this.data, this.timestamp, this.ttl);

  bool get isExpired => DateTime.now().difference(timestamp) > ttl;
}

class ApiClient {
  static ApiClient? _instance;
  static ApiClient get instance => _instance ??= ApiClient._();

  ApiClient._();

  static const String _tokenKey = 'adhocx_auth_token';
  static const String _refreshTokenKey = 'adhocx_refresh_token';

  static const FlutterSecureStorage _secureStorage = FlutterSecureStorage();

  // In-memory short-lived response cache and concurrent in-flight request deduplication
  final Map<String, _ApiCacheEntry> _responseCache = {};
  final Map<String, Future<dynamic>> _inFlightGets = {};

  bool _isRefreshing = false;
  Future<bool>? _refreshFuture;

  void invalidateCache({String? prefix}) {
    if (prefix == null) {
      _responseCache.clear();
    } else {
      _responseCache.removeWhere((key, _) => key.startsWith(prefix));
    }
  }

  // Base URL configuration (Strictly prioritize live production domain when running in browser or release)
  String get baseUrl {
    // 1. If running in a web browser:
    if (kIsWeb) {
      final host = Uri.base.host.toLowerCase();
      // On any adhocx domain (app.adhocx.com, m.adhocx.com, etc.), ALWAYS use live production API
      if (host.contains('adhocx.com')) {
        return 'https://api.adhocx.com/api/v1';
      }
      // If deployed on any non-local domain/IP, use current origin's /api/v1
      if (host.isNotEmpty && host != 'localhost' && host != '127.0.0.1' && !host.startsWith('192.168.') && !host.startsWith('10.')) {
        return '${Uri.base.scheme}://$host/api/v1';
      }
    }

    // 2. Check compile-time definitions (e.g. from CI/CD or launch scripts),
    // but NEVER let a localhost URL be used when on a remote web domain
    const fromEnv = String.fromEnvironment('API_URL', defaultValue: '');
    if (fromEnv.isNotEmpty) {
      if (kIsWeb && fromEnv.contains('localhost')) {
        final host = Uri.base.host.toLowerCase();
        if (host.isNotEmpty && host != 'localhost' && host != '127.0.0.1') {
          return 'https://api.adhocx.com/api/v1';
        }
      }
      return fromEnv;
    }

    const fromBaseEnv = String.fromEnvironment('API_BASE_URL', defaultValue: '');
    if (fromBaseEnv.isNotEmpty) {
      if (kIsWeb && fromBaseEnv.contains('localhost')) {
        final host = Uri.base.host.toLowerCase();
        if (host.isNotEmpty && host != 'localhost' && host != '127.0.0.1') {
          return 'https://api.adhocx.com/api/v1';
        }
      }
      return fromBaseEnv;
    }

    // 3. Local web development fallback
    if (kIsWeb) {
      return 'http://localhost:7001/api/v1';
    }

    // 4. Default for Native Mobile (Android & iOS) -> Live AWS Production API
    return 'https://api.adhocx.com/api/v1';
  }

  Future<String?> getToken() async {
    try {
      final secureToken = await _secureStorage.read(key: _tokenKey);
      if (secureToken != null && secureToken.isNotEmpty) {
        return secureToken;
      }
    } catch (e) {
      AppLogger.warn('Secure storage read warning: $e', tag: 'AUTH');
    }

    // Seamless migration from legacy SharedPreferences if present
    final prefs = await SharedPreferences.getInstance();
    final legacyToken = prefs.getString(_tokenKey);
    if (legacyToken != null && legacyToken.isNotEmpty) {
      try {
        await _secureStorage.write(key: _tokenKey, value: legacyToken);
        await prefs.remove(_tokenKey);
      } catch (_) {}
      return legacyToken;
    }
    return null;
  }

  Future<String?> getRefreshToken() async {
    try {
      final secureRefresh = await _secureStorage.read(key: _refreshTokenKey);
      if (secureRefresh != null && secureRefresh.isNotEmpty) {
        return secureRefresh;
      }
    } catch (e) {
      AppLogger.warn('Secure storage read warning: $e', tag: 'AUTH');
    }

    // Seamless migration from legacy SharedPreferences if present
    final prefs = await SharedPreferences.getInstance();
    final legacyToken = prefs.getString(_refreshTokenKey);
    if (legacyToken != null && legacyToken.isNotEmpty) {
      try {
        await _secureStorage.write(key: _refreshTokenKey, value: legacyToken);
        await prefs.remove(_refreshTokenKey);
      } catch (_) {}
      return legacyToken;
    }
    return null;
  }

  Future<void> setToken(String token, {String? refreshToken}) async {
    try {
      await _secureStorage.write(key: _tokenKey, value: token);
      if (refreshToken != null && refreshToken.isNotEmpty) {
        await _secureStorage.write(key: _refreshTokenKey, value: refreshToken);
      }
    } catch (e) {
      AppLogger.error('Failed to write to secure storage: $e', tag: 'AUTH');
    }
    // Remove from unencrypted SharedPreferences if exists
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    if (refreshToken != null && refreshToken.isNotEmpty) {
      await prefs.remove(_refreshTokenKey);
    }
  }

  Future<void> setTokens({required String accessToken, required String refreshToken}) async {
    try {
      await _secureStorage.write(key: _tokenKey, value: accessToken);
      await _secureStorage.write(key: _refreshTokenKey, value: refreshToken);
    } catch (e) {
      AppLogger.error('Failed to write tokens to secure storage: $e', tag: 'AUTH');
    }
    // Clean up cleartext SharedPreferences
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_refreshTokenKey);
  }

  Future<void> clearToken() async {
    try {
      await _secureStorage.delete(key: _tokenKey);
      await _secureStorage.delete(key: _refreshTokenKey);
    } catch (e) {
      AppLogger.warn('Secure storage delete warning: $e', tag: 'AUTH');
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_refreshTokenKey);
    invalidateCache();
    AppLogger.info('Cleared authentication tokens from secure storage and cached sessions', tag: 'AUTH');
  }

  /// Checks whether a JWT token is expired or within the [buffer] before expiration.
  static bool isTokenExpiring(String token, {Duration buffer = const Duration(minutes: 5)}) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return false;
      final normalized = base64Url.normalize(parts[1]);
      final payloadJson = utf8.decode(base64Url.decode(normalized));
      final payload = jsonDecode(payloadJson);
      if (payload is Map && payload['exp'] != null) {
        final expSeconds = payload['exp'] is int
            ? payload['exp'] as int
            : int.tryParse(payload['exp'].toString());
        if (expSeconds != null) {
          final expDate = DateTime.fromMillisecondsSinceEpoch(expSeconds * 1000);
          return DateTime.now().isAfter(expDate.subtract(buffer));
        }
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  bool _isNonRefreshableEndpoint(String endpoint) {
    final ep = endpoint.trim().toLowerCase();
    return ep == '/auth/refresh' ||
        ep.startsWith('/auth/login') ||
        ep.startsWith('/auth/otp') ||
        ep.startsWith('/auth/verify') ||
        ep.startsWith('/auth/social') ||
        ep.startsWith('/auth/register');
  }

  Future<bool> attemptTokenRefresh() async {
    if (_isRefreshing && _refreshFuture != null) {
      return await _refreshFuture!;
    }
    _isRefreshing = true;
    _refreshFuture = _executeTokenRefresh();
    try {
      return await _refreshFuture!;
    } finally {
      _isRefreshing = false;
      _refreshFuture = null;
    }
  }

  Future<bool> _executeTokenRefresh() async {
    final refresh = await getRefreshToken();
    if (refresh == null || refresh.isEmpty) {
      AppLogger.warn('No refresh token found; clearing session', tag: 'AUTH');
      await clearToken();
      return false;
    }

    AppLogger.info('Attempting JWT token refresh via /auth/refresh...', tag: 'AUTH');
    try {
      final uri = Uri.parse('$baseUrl/auth/refresh');
      final sw = Stopwatch()..start();
      AppLogger.httpReq('POST', uri.toString());
      final res = await http.post(
        uri,
        headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
        body: jsonEncode({'refreshToken': refresh}),
      ).timeout(const Duration(seconds: 15));
      sw.stop();
      AppLogger.httpRes(res.statusCode, 'POST', uri.toString(), sw.elapsed, body: res.body);

      if (res.statusCode >= 200 && res.statusCode < 300) {
        final decoded = jsonDecode(res.body);
        final payload = decoded is Map && decoded['data'] is Map ? decoded['data'] : decoded;
        final newAccess = payload['accessToken']?.toString() ?? payload['token']?.toString();
        final newRefresh = payload['refreshToken']?.toString();
        if (newAccess != null && newAccess.isNotEmpty) {
          await setToken(newAccess, refreshToken: newRefresh ?? refresh);
          AppLogger.info('JWT token successfully refreshed', tag: 'AUTH');
          return true;
        }
      } else if (res.statusCode == 401 || res.statusCode == 403) {
        // Refresh token is revoked or permanently expired on backend
        AppLogger.warn('Refresh token is invalid or expired (status ${res.statusCode}); clearing session', tag: 'AUTH');
        await clearToken();
        return false;
      } else {
        // Transient server error (500, 502, etc.) - retain existing tokens
        AppLogger.warn('Server error (${res.statusCode}) during refresh; retaining tokens for retry', tag: 'AUTH');
        return false;
      }
    } catch (e) {
      // Network timeout, socket error, offline - retain existing tokens for retry
      AppLogger.warn('Token refresh network exception: $e (retaining session)', tag: 'AUTH');
      return false;
    }

    return false;
  }

  Future<Map<String, String>> _getHeaders({bool isMultipart = false, String? endpoint}) async {
    final headers = <String, String>{};
    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
      headers['Accept'] = 'application/json';
    }

    // Proactive refresh: if endpoint requires auth and current token is near expiry, refresh beforehand
    if (endpoint != null && !_isNonRefreshableEndpoint(endpoint)) {
      final existingToken = await getToken();
      if (existingToken != null && existingToken.isNotEmpty && isTokenExpiring(existingToken)) {
        AppLogger.info('JWT access token expiring soon; refreshing proactively before request...', tag: 'AUTH');
        await attemptTokenRefresh();
      }
    }

    final token = await getToken();
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    return headers;
  }

  Future<dynamic> get(
    String endpoint, {
    Map<String, dynamic>? queryParameters,
    bool force = false,
    Duration? cacheDuration,
  }) async {
    final cacheKey = queryParameters != null && queryParameters.isNotEmpty
        ? '$endpoint?${queryParameters.entries.map((e) => '${e.key}=${e.value}').join('&')}'
        : endpoint;

    final ttl = cacheDuration ?? const Duration(seconds: 4);

    // 1. Return fresh cached response if available
    if (!force && _responseCache.containsKey(cacheKey)) {
      final entry = _responseCache[cacheKey]!;
      if (!entry.isExpired) {
        return entry.data;
      } else {
        _responseCache.remove(cacheKey);
      }
    }

    // 2. Join concurrent in-flight request if already pending
    if (!force && _inFlightGets.containsKey(cacheKey)) {
      return await _inFlightGets[cacheKey]!;
    }

    // 3. Dispatch actual network request
    final future = _executeGet(endpoint, queryParameters);
    _inFlightGets[cacheKey] = future;
    try {
      final res = await future;
      _responseCache[cacheKey] = _ApiCacheEntry(res, DateTime.now(), ttl);
      return res;
    } finally {
      _inFlightGets.remove(cacheKey);
    }
  }

  Future<dynamic> _executeGet(String endpoint, Map<String, dynamic>? queryParameters) async {
    Uri uri = Uri.parse('$baseUrl$endpoint');
    if (queryParameters != null && queryParameters.isNotEmpty) {
      uri = uri.replace(
        queryParameters: queryParameters.map(
          (key, value) => MapEntry(key, value.toString()),
        ),
      );
    }

    final headers = await _getHeaders(endpoint: endpoint);
    final sw = Stopwatch()..start();
    AppLogger.httpReq('GET', uri.toString());
    final response = await http.get(uri, headers: headers).timeout(
      const Duration(seconds: 15),
    );
    sw.stop();
    AppLogger.httpRes(response.statusCode, 'GET', uri.toString(), sw.elapsed, body: response.body);

    if (response.statusCode == 401 && !_isNonRefreshableEndpoint(endpoint)) {
      final refreshed = await attemptTokenRefresh();
      if (refreshed) {
        final retryHeaders = await _getHeaders(endpoint: endpoint);
        final retrySw = Stopwatch()..start();
        AppLogger.httpReq('GET (RETRY)', uri.toString());
        final retryRes = await http.get(uri, headers: retryHeaders).timeout(const Duration(seconds: 15));
        retrySw.stop();
        AppLogger.httpRes(retryRes.statusCode, 'GET (RETRY)', uri.toString(), retrySw.elapsed, body: retryRes.body);
        return _handleResponse(retryRes);
      }
    }

    return _handleResponse(response);
  }

  Future<dynamic> post(String endpoint, {dynamic body}) async {
    final uri = Uri.parse('$baseUrl$endpoint');
    final headers = await _getHeaders(endpoint: endpoint);
    final sw = Stopwatch()..start();
    AppLogger.httpReq('POST', uri.toString(), body: body);

    final response = await http.post(
      uri,
      headers: headers,
      body: body != null ? jsonEncode(body) : null,
    ).timeout(const Duration(seconds: 15));
    sw.stop();
    AppLogger.httpRes(response.statusCode, 'POST', uri.toString(), sw.elapsed, body: response.body);

    if (response.statusCode == 401 && !_isNonRefreshableEndpoint(endpoint)) {
      final refreshed = await attemptTokenRefresh();
      if (refreshed) {
        final retryHeaders = await _getHeaders(endpoint: endpoint);
        final retrySw = Stopwatch()..start();
        AppLogger.httpReq('POST (RETRY)', uri.toString(), body: body);
        final retryRes = await http.post(
          uri,
          headers: retryHeaders,
          body: body != null ? jsonEncode(body) : null,
        ).timeout(const Duration(seconds: 15));
        retrySw.stop();
        AppLogger.httpRes(retryRes.statusCode, 'POST (RETRY)', uri.toString(), retrySw.elapsed, body: retryRes.body);
        final result = _handleResponse(retryRes);
        invalidateCache();
        return result;
      }
    }

    final result = _handleResponse(response);
    invalidateCache();
    return result;
  }

  Future<dynamic> patch(String endpoint, {dynamic body}) async {
    final uri = Uri.parse('$baseUrl$endpoint');
    final headers = await _getHeaders(endpoint: endpoint);
    final sw = Stopwatch()..start();
    AppLogger.httpReq('PATCH', uri.toString(), body: body);

    final response = await http.patch(
      uri,
      headers: headers,
      body: body != null ? jsonEncode(body) : null,
    ).timeout(const Duration(seconds: 15));
    sw.stop();
    AppLogger.httpRes(response.statusCode, 'PATCH', uri.toString(), sw.elapsed, body: response.body);

    if (response.statusCode == 401 && !_isNonRefreshableEndpoint(endpoint)) {
      final refreshed = await attemptTokenRefresh();
      if (refreshed) {
        final retryHeaders = await _getHeaders(endpoint: endpoint);
        final retrySw = Stopwatch()..start();
        AppLogger.httpReq('PATCH (RETRY)', uri.toString(), body: body);
        final retryRes = await http.patch(
          uri,
          headers: retryHeaders,
          body: body != null ? jsonEncode(body) : null,
        ).timeout(const Duration(seconds: 15));
        retrySw.stop();
        AppLogger.httpRes(retryRes.statusCode, 'PATCH (RETRY)', uri.toString(), retrySw.elapsed, body: retryRes.body);
        final result = _handleResponse(retryRes);
        invalidateCache();
        return result;
      }
    }

    final result = _handleResponse(response);
    invalidateCache();
    return result;
  }

  Future<dynamic> delete(String endpoint) async {
    final uri = Uri.parse('$baseUrl$endpoint');
    final headers = await _getHeaders(endpoint: endpoint);
    final sw = Stopwatch()..start();
    AppLogger.httpReq('DELETE', uri.toString());

    final response = await http.delete(uri, headers: headers).timeout(
      const Duration(seconds: 15),
    );
    sw.stop();
    AppLogger.httpRes(response.statusCode, 'DELETE', uri.toString(), sw.elapsed, body: response.body);

    if (response.statusCode == 401 && !_isNonRefreshableEndpoint(endpoint)) {
      final refreshed = await attemptTokenRefresh();
      if (refreshed) {
        final retryHeaders = await _getHeaders(endpoint: endpoint);
        final retrySw = Stopwatch()..start();
        AppLogger.httpReq('DELETE (RETRY)', uri.toString());
        final retryRes = await http.delete(uri, headers: retryHeaders).timeout(const Duration(seconds: 15));
        retrySw.stop();
        AppLogger.httpRes(retryRes.statusCode, 'DELETE (RETRY)', uri.toString(), retrySw.elapsed, body: retryRes.body);
        final result = _handleResponse(retryRes);
        invalidateCache();
        return result;
      }
    }

    final result = _handleResponse(response);
    invalidateCache();
    return result;
  }

  Future<dynamic> multipartUpload(
    String endpoint, {
    required String fileField,
    required List<int> fileBytes,
    required String fileName,
    Map<String, String>? fields,
  }) async {
    if (!_isNonRefreshableEndpoint(endpoint)) {
      final existingToken = await getToken();
      if (existingToken != null && existingToken.isNotEmpty && isTokenExpiring(existingToken)) {
        await attemptTokenRefresh();
      }
    }

    final uri = Uri.parse('$baseUrl$endpoint');
    final request = http.MultipartRequest('POST', uri);

    final token = await getToken();
    if (token != null && token.isNotEmpty) {
      request.headers['Authorization'] = 'Bearer $token';
    }

    if (fields != null) {
      request.fields.addAll(fields);
    }

    // Resolve explicit MediaType so standard multipart headers are dispatched
    final mediaType = _resolveMediaType(fields?['mimeType'], fileName);

    request.files.add(
      http.MultipartFile.fromBytes(
        fileField,
        fileBytes,
        filename: fileName,
        contentType: mediaType,
      ),
    );

    final sw = Stopwatch()..start();
    AppLogger.httpReq('MULTIPART POST', uri.toString(), body: {'fileName': fileName, 'fileSize': fileBytes.length, 'fields': fields});
    final streamedResponse = await request.send().timeout(const Duration(seconds: 30));
    final response = await http.Response.fromStream(streamedResponse);
    sw.stop();
    AppLogger.httpRes(response.statusCode, 'MULTIPART POST', uri.toString(), sw.elapsed, body: response.body);

    if (response.statusCode == 401 && !_isNonRefreshableEndpoint(endpoint)) {
      final refreshed = await attemptTokenRefresh();
      if (refreshed) {
        final retryRequest = http.MultipartRequest('POST', uri);
        final retryToken = await getToken();
        if (retryToken != null && retryToken.isNotEmpty) {
          retryRequest.headers['Authorization'] = 'Bearer $retryToken';
        }
        if (fields != null) {
          retryRequest.fields.addAll(fields);
        }
        retryRequest.files.add(
          http.MultipartFile.fromBytes(
            fileField,
            fileBytes,
            filename: fileName,
            contentType: mediaType,
          ),
        );
        final retryStreamed = await retryRequest.send().timeout(const Duration(seconds: 30));
        final retryResponse = await http.Response.fromStream(retryStreamed);
        final retryResult = _handleResponse(retryResponse);
        invalidateCache();
        return retryResult;
      }
    }

    final result = _handleResponse(response);
    invalidateCache();
    return result;
  }

  MediaType _resolveMediaType(String? mimeType, String fileName) {
    if (mimeType != null && mimeType.contains('/')) {
      final parts = mimeType.split('/');
      return MediaType(parts[0].trim(), parts[1].trim());
    }
    final ext = fileName.split('.').last.toLowerCase();
    switch (ext) {
      case 'png':
        return MediaType('image', 'png');
      case 'webp':
        return MediaType('image', 'webp');
      case 'pdf':
        return MediaType('application', 'pdf');
      case 'jpg':
      case 'jpeg':
      default:
        return MediaType('image', 'jpeg');
    }
  }

  dynamic _handleResponse(http.Response response) {
    dynamic responseData;
    if (response.body.isNotEmpty) {
      try {
        responseData = jsonDecode(response.body);
      } catch (_) {
        responseData = response.body;
      }
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (responseData is Map && responseData['success'] == true && responseData.containsKey('data')) {
        return responseData['data'];
      }
      return responseData;
    }

    String errorMessage = 'Request failed with status: ${response.statusCode}';
    if (responseData is Map) {
      if (responseData['error'] is Map) {
        final err = responseData['error'] as Map;
        if (err['details'] != null) {
          final details = err['details'];
          if (details is List && details.isNotEmpty) {
            errorMessage = details.map((d) => d.toString()).join('. ');
          } else if (details is String && details.isNotEmpty) {
            errorMessage = details;
          }
        }
        if ((errorMessage == 'Request failed with status: ${response.statusCode}' ||
             errorMessage == 'Validation failed') &&
            err['message'] != null) {
          errorMessage = err['message'].toString();
        }
      } else if (responseData['message'] != null) {
        final msg = responseData['message'];
        errorMessage = msg is List ? msg.join('. ') : msg.toString();
      } else if (responseData['error'] is String) {
        errorMessage = responseData['error'];
      }
    }

    AppLogger.error('API Error [${response.statusCode}]: $errorMessage', tag: 'HTTP');

    throw ApiException(
      statusCode: response.statusCode,
      message: errorMessage,
      data: responseData,
    );
  }
}
