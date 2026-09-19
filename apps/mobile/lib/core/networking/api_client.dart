import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:shared_preferences/shared_preferences.dart';

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

  // In-memory short-lived response cache and concurrent in-flight request deduplication
  final Map<String, _ApiCacheEntry> _responseCache = {};
  final Map<String, Future<dynamic>> _inFlightGets = {};

  void invalidateCache({String? prefix}) {
    if (prefix == null) {
      _responseCache.clear();
    } else {
      _responseCache.removeWhere((key, _) => key.startsWith(prefix));
    }
  }

  // Base URL configuration (Android emulator uses 10.0.2.2; iOS/Web uses localhost)
  String get baseUrl {
    const fromEnv = String.fromEnvironment('API_URL', defaultValue: '');
    if (fromEnv.isNotEmpty) return fromEnv;

    if (kIsWeb) {
      return 'http://localhost:7001/api/v1';
    } else if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:7001/api/v1';
    } else {
      return 'http://localhost:7001/api/v1';
    }
  }

  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  Future<void> setToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }

  Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    invalidateCache();
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
    final response = await http.get(uri, headers: headers).timeout(
      const Duration(seconds: 15),
    );

    return _handleResponse(response);
  }

  Future<dynamic> post(String endpoint, {dynamic body}) async {
    final uri = Uri.parse('$baseUrl$endpoint');
    final headers = await _getHeaders();

    final response = await http.post(
      uri,
      headers: headers,
      body: body != null ? jsonEncode(body) : null,
    ).timeout(const Duration(seconds: 15));

    final result = _handleResponse(response);
    invalidateCache();
    return result;
  }

  Future<dynamic> patch(String endpoint, {dynamic body}) async {
    final uri = Uri.parse('$baseUrl$endpoint');
    final headers = await _getHeaders();

    final response = await http.patch(
      uri,
      headers: headers,
      body: body != null ? jsonEncode(body) : null,
    ).timeout(const Duration(seconds: 15));

    final result = _handleResponse(response);
    invalidateCache();
    return result;
  }

  Future<dynamic> delete(String endpoint) async {
    final uri = Uri.parse('$baseUrl$endpoint');
    final headers = await _getHeaders();

    final response = await http.delete(uri, headers: headers).timeout(
      const Duration(seconds: 15),
    );

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

    final streamedResponse = await request.send().timeout(const Duration(seconds: 30));
    final response = await http.Response.fromStream(streamedResponse);

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

    throw ApiException(
      statusCode: response.statusCode,
      message: errorMessage,
      data: responseData,
    );
  }
}
