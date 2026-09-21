import 'dart:convert';
import 'package:flutter/foundation.dart';
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

  // Base URL configuration (Default to live AWS production server or localhost for web)
  String get baseUrl {
    const fromEnv = String.fromEnvironment('API_URL', defaultValue: '');
    if (fromEnv.isNotEmpty) return fromEnv;

    const fromBaseEnv = String.fromEnvironment('API_BASE_URL', defaultValue: '');
    if (fromBaseEnv.isNotEmpty) return fromBaseEnv;

    if (kIsWeb) {
      return 'http://localhost:7001/api/v1';
    }

    return 'http://3.110.42.191/api/v1';
  }

  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  Future<String?> getRefreshToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_refreshTokenKey);
  }

  Future<void> setToken(String token, {String? refreshToken}) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
    if (refreshToken != null && refreshToken.isNotEmpty) {
      await prefs.setString(_refreshTokenKey, refreshToken);
    }
  }

  Future<void> setTokens({required String accessToken, required String refreshToken}) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, accessToken);
    await prefs.setString(_refreshTokenKey, refreshToken);
  }

  Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_refreshTokenKey);
    invalidateCache();
    AppLogger.info('Cleared authentication tokens and cached sessions', tag: 'AUTH');
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
      ).timeout(const Duration(seconds: 10));
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
      }
    } catch (e) {
      AppLogger.warn('Token refresh network exception: $e', tag: 'AUTH');
    }

    AppLogger.warn('Token refresh failed or token expired; clearing session', tag: 'AUTH');
    await clearToken();
    return false;
  }

  Future<Map<String, String>> _getHeaders({bool isMultipart = false}) async {
    final headers = <String, String>{};
    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
      headers['Accept'] = 'application/json';
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

    final headers = await _getHeaders();
    final sw = Stopwatch()..start();
    AppLogger.httpReq('GET', uri.toString());
    final response = await http.get(uri, headers: headers).timeout(
      const Duration(seconds: 15),
    );
    sw.stop();
    AppLogger.httpRes(response.statusCode, 'GET', uri.toString(), sw.elapsed, body: response.body);

    if (response.statusCode == 401 && !endpoint.startsWith('/auth/')) {
      final refreshed = await attemptTokenRefresh();
      if (refreshed) {
        final retryHeaders = await _getHeaders();
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
    final headers = await _getHeaders();
    final sw = Stopwatch()..start();
    AppLogger.httpReq('POST', uri.toString(), body: body);

    final response = await http.post(
      uri,
      headers: headers,
      body: body != null ? jsonEncode(body) : null,
    ).timeout(const Duration(seconds: 15));
    sw.stop();
    AppLogger.httpRes(response.statusCode, 'POST', uri.toString(), sw.elapsed, body: response.body);

    if (response.statusCode == 401 && !endpoint.startsWith('/auth/')) {
      final refreshed = await attemptTokenRefresh();
      if (refreshed) {
        final retryHeaders = await _getHeaders();
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
    final headers = await _getHeaders();
    final sw = Stopwatch()..start();
    AppLogger.httpReq('PATCH', uri.toString(), body: body);

    final response = await http.patch(
      uri,
      headers: headers,
      body: body != null ? jsonEncode(body) : null,
    ).timeout(const Duration(seconds: 15));
    sw.stop();
    AppLogger.httpRes(response.statusCode, 'PATCH', uri.toString(), sw.elapsed, body: response.body);

    if (response.statusCode == 401 && !endpoint.startsWith('/auth/')) {
      final refreshed = await attemptTokenRefresh();
      if (refreshed) {
        final retryHeaders = await _getHeaders();
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
    final headers = await _getHeaders();
    final sw = Stopwatch()..start();
    AppLogger.httpReq('DELETE', uri.toString());

    final response = await http.delete(uri, headers: headers).timeout(
      const Duration(seconds: 15),
    );
    sw.stop();
    AppLogger.httpRes(response.statusCode, 'DELETE', uri.toString(), sw.elapsed, body: response.body);

    if (response.statusCode == 401 && !endpoint.startsWith('/auth/')) {
      final refreshed = await attemptTokenRefresh();
      if (refreshed) {
        final retryHeaders = await _getHeaders();
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

    // Auto-clear invalid or expired token on 401 Unauthorized
    if (response.statusCode == 401) {
      clearToken();
    }

    String errorMessage = 'Request failed with status: ${response.statusCode}';
    if (responseData is Map) {
      if (responseData['error'] is Map && responseData['error']['message'] != null) {
        errorMessage = responseData['error']['message'].toString();
      } else if (responseData['message'] != null) {
        final msg = responseData['message'];
        errorMessage = msg is List ? msg.join(', ') : msg.toString();
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
