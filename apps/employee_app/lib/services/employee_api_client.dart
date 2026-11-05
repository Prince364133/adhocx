import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class EmployeeApiClient {
  static const String _keyAccessToken = 'adhocx_employee_access_token';
  static const String _keyRefreshToken = 'adhocx_employee_refresh_token';
  static const String _keyCachedUser = 'adhocx_employee_cached_user';

  final String baseUrl;
  final http.Client _httpClient;

  Completer<String?>? _refreshCompleter;

  EmployeeApiClient({
    String? baseUrl,
    http.Client? httpClient,
  })  : baseUrl = baseUrl ?? defaultBaseUrl,
        _httpClient = httpClient ?? http.Client();

  static String get defaultBaseUrl {
    const envUrl = String.fromEnvironment('API_URL');
    if (envUrl.isNotEmpty) return envUrl;
    if (kIsWeb) return 'http://localhost:7001/api/v1';
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:7001/api/v1';
    }
    return 'http://localhost:7001/api/v1';
  }

  // ─── Token Persistence ──────────────────────────────────────────────

  Future<String?> getAccessToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyAccessToken);
  }

  Future<String?> getRefreshToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyRefreshToken);
  }

  Future<void> saveTokens({
    required String accessToken,
    String? refreshToken,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyAccessToken, accessToken);
    if (refreshToken != null && refreshToken.isNotEmpty) {
      await prefs.setString(_keyRefreshToken, refreshToken);
    }
  }

  Future<void> saveCachedUser(Map<String, dynamic> userMap) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyCachedUser, jsonEncode(userMap));
  }

  Future<Map<String, dynamic>?> getCachedUser() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonStr = prefs.getString(_keyCachedUser);
    if (jsonStr == null || jsonStr.isEmpty) return null;
    try {
      return jsonDecode(jsonStr) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  Future<void> clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyAccessToken);
    await prefs.remove(_keyRefreshToken);
    await prefs.remove(_keyCachedUser);
  }

  // ─── Silent Refresh Interceptor ────────────────────────────────────

  Future<String?> _refreshToken() async {
    if (_refreshCompleter != null) {
      return _refreshCompleter!.future;
    }

    _refreshCompleter = Completer<String?>();

    try {
      final currentRefresh = await getRefreshToken();
      if (currentRefresh == null || currentRefresh.isEmpty) {
        _refreshCompleter!.complete(null);
        return null;
      }

      final uri = Uri.parse('$baseUrl/auth/refresh');
      final res = await _httpClient.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': currentRefresh}),
      );

      if (res.statusCode >= 200 && res.statusCode < 300) {
        final body = jsonDecode(res.body);
        final payload = body['data'] ?? body;
        final newAccess = payload['accessToken'] as String?;
        final newRefresh = payload['refreshToken'] as String?;

        if (newAccess != null) {
          await saveTokens(
            accessToken: newAccess,
            refreshToken: newRefresh ?? currentRefresh,
          );
          _refreshCompleter!.complete(newAccess);
          return newAccess;
        }
      }

      // Refresh rejected or expired
      await clearSession();
      _refreshCompleter!.complete(null);
      return null;
    } catch (e) {
      debugPrint('[EmployeeApiClient] Token refresh failed: $e');
      _refreshCompleter!.complete(null);
      return null;
    } finally {
      _refreshCompleter = null;
    }
  }

  // ─── Core Request Engine with Auto 401 Replay ───────────────────────

  Future<Map<String, dynamic>> get(
    String endpoint, {
    Map<String, String>? queryParams,
  }) async {
    return _sendWithAuth((token) async {
      var uri = Uri.parse('$baseUrl$endpoint');
      if (queryParams != null && queryParams.isNotEmpty) {
        uri = uri.replace(queryParameters: queryParams);
      }
      final headers = _buildHeaders(token);
      return _httpClient.get(uri, headers: headers);
    });
  }

  Future<Map<String, dynamic>> post(
    String endpoint, {
    dynamic body,
  }) async {
    return _sendWithAuth((token) async {
      final uri = Uri.parse('$baseUrl$endpoint');
      final headers = _buildHeaders(token);
      final encodedBody = body != null ? jsonEncode(body) : null;
      return _httpClient.post(uri, headers: headers, body: encodedBody);
    });
  }

  Future<Map<String, dynamic>> patch(
    String endpoint, {
    dynamic body,
  }) async {
    return _sendWithAuth((token) async {
      final uri = Uri.parse('$baseUrl$endpoint');
      final headers = _buildHeaders(token);
      final encodedBody = body != null ? jsonEncode(body) : null;
      return _httpClient.patch(uri, headers: headers, body: encodedBody);
    });
  }

  Future<Map<String, dynamic>> delete(String endpoint) async {
    return _sendWithAuth((token) async {
      final uri = Uri.parse('$baseUrl$endpoint');
      final headers = _buildHeaders(token);
      return _httpClient.delete(uri, headers: headers);
    });
  }

  Map<String, String> _buildHeaders(String? token) {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  Future<Map<String, dynamic>> _sendWithAuth(
    Future<http.Response> Function(String? token) sendFn,
  ) async {
    String? token = await getAccessToken();
    http.Response res = await sendFn(token);

    // Silent Token Rotation on 401 Unauthorized
    if (res.statusCode == 401 && token != null) {
      debugPrint('[EmployeeApiClient] 401 received. Attempting silent token rotation...');
      final newToken = await _refreshToken();
      if (newToken != null) {
        res = await sendFn(newToken);
      }
    }

    final parsed = _parseResponse(res);
    return parsed;
  }

  Map<String, dynamic> _parseResponse(http.Response res) {
    Map<String, dynamic> json;
    try {
      json = jsonDecode(res.body) as Map<String, dynamic>;
    } catch (_) {
      json = {'rawBody': res.body};
    }

    if (res.statusCode >= 200 && res.statusCode < 300) {
      return json;
    }

    final errorObj = json['error'];
    final errorMsg = errorObj is Map
        ? errorObj['message'] ?? 'Request failed (${res.statusCode})'
        : json['message'] ?? 'Request failed (${res.statusCode})';

    throw ApiException(
      statusCode: res.statusCode,
      message: errorMsg.toString(),
      data: json,
    );
  }
}

class ApiException implements Exception {
  final int statusCode;
  final String message;
  final dynamic data;

  const ApiException({
    required this.statusCode,
    required this.message,
    this.data,
  });

  @override
  String toString() => message;
}

