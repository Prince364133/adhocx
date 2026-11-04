import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import 'api_exception.dart';
import 'app_logger.dart';
import 'env.dart';
import 'token_store.dart';

/// Successful response: the unwrapped `data` plus the server's envelope `timestamp`
/// (TransformInterceptor), which screens show as "Updated at" so stale data is visible.
class ApiResponse<T> {
  final T data;
  final DateTime? serverTime;

  const ApiResponse(this.data, this.serverTime);
}

/// HTTP client for the AdhocX API, following the apps/mobile ApiClient pattern:
/// bearer token from secure storage, one transparent `/auth/refresh` retry on 401,
/// `{ success, data, timestamp }` envelope unwrapping and `{ error: { code, message } }` errors.
class ApiClient {
  final String baseUrl;
  final http.Client _http;
  final TokenStore tokens;
  final Duration timeout;

  /// Called once when the refresh token is rejected (session over). The session clears state.
  void Function()? onSessionExpired;

  Future<bool>? _refreshing;

  ApiClient({
    String? baseUrl,
    http.Client? httpClient,
    TokenStore? tokenStore,
    this.timeout = const Duration(seconds: 15),
  })  : baseUrl = baseUrl ?? Env.apiBaseUrl,
        _http = httpClient ?? http.Client(),
        tokens = tokenStore ?? SecureTokenStore();

  static bool _isAuthEndpoint(String path) =>
      path.startsWith('/auth/otp') || path.startsWith('/auth/refresh') || path.startsWith('/auth/login');

  Uri uri(String path, [Map<String, String>? query]) {
    final u = Uri.parse('$baseUrl$path');
    return (query == null || query.isEmpty) ? u : u.replace(queryParameters: query);
  }

  Future<ApiResponse<dynamic>> get(String path, {Map<String, String>? query}) =>
      _send('GET', path, query: query);

  Future<ApiResponse<dynamic>> post(String path, {Object? body, String? bearerOverride}) =>
      _send('POST', path, body: body, bearerOverride: bearerOverride);

  Future<ApiResponse<dynamic>> _send(
    String method,
    String path, {
    Map<String, String>? query,
    Object? body,
    String? bearerOverride,
    bool retried = false,
  }) async {
    final target = uri(path, query);
    final headers = <String, String>{'Accept': 'application/json'};
    if (body != null) headers['Content-Type'] = 'application/json';
    final token = bearerOverride ?? await tokens.readAccess();
    if (token != null && token.isNotEmpty) headers['Authorization'] = 'Bearer $token';

    http.Response res;
    final sw = Stopwatch()..start();
    try {
      AppLogger.httpReq(method, target.toString(), body: body);
      final req = http.Request(method, target)..headers.addAll(headers);
      if (body != null) req.body = jsonEncode(body);
      res = await http.Response.fromStream(await _http.send(req).timeout(timeout));
    } on TimeoutException {
      throw const ApiException(kind: ApiErrorKind.offline, message: 'The server took too long to respond.');
    } on SocketException {
      throw const ApiException(kind: ApiErrorKind.offline, message: 'You are offline.');
    } on http.ClientException catch (e) {
      throw ApiException(kind: ApiErrorKind.offline, message: 'Network error: ${e.message}');
    }
    sw.stop();
    AppLogger.httpRes(res.statusCode, method, target.toString(), sw.elapsed, body: res.body);

    if (res.statusCode == 401 && bearerOverride == null && !_isAuthEndpoint(path) && !retried) {
      if (await _refresh()) {
        return _send(method, path, query: query, body: body, retried: true);
      }
      await tokens.clear();
      onSessionExpired?.call();
      throw const ApiException(
        kind: ApiErrorKind.unauthorized,
        statusCode: 401,
        message: 'Your session has expired. Please sign in again.',
      );
    }
    return parse(res);
  }

  /// Single-flight refresh: concurrent 401s share one /auth/refresh call.
  Future<bool> _refresh() {
    return _refreshing ??= _doRefresh().whenComplete(() => _refreshing = null);
  }

  Future<bool> _doRefresh() async {
    final refresh = await tokens.readRefresh();
    if (refresh == null) return false;
    try {
      final res = await _http
          .post(
            uri('/auth/refresh'),
            headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
            body: jsonEncode({'refreshToken': refresh}),
          )
          .timeout(timeout);
      if (res.statusCode < 200 || res.statusCode >= 300) return false;
      final payload = parse(res).data;
      final access = payload is Map ? payload['accessToken']?.toString() : null;
      if (access == null || access.isEmpty) return false;
      await tokens.write(accessToken: access, refreshToken: payload['refreshToken']?.toString());
      return true;
    } catch (e) {
      AppLogger.warn('Token refresh failed: $e', tag: 'AUTH');
      return false;
    }
  }

  static ApiResponse<dynamic> parse(http.Response res) {
    dynamic decoded;
    if (res.body.isNotEmpty) {
      try {
        decoded = jsonDecode(res.body);
      } catch (_) {
        decoded = null;
      }
    }

    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (decoded is Map && decoded['success'] == true && decoded.containsKey('data')) {
        return ApiResponse(decoded['data'], _parseTime(decoded['timestamp']) ?? _parseHttpDate(res));
      }
      return ApiResponse(decoded, _parseHttpDate(res));
    }

    String message = res.statusCode >= 500
        ? 'The server is temporarily unavailable. Please try again shortly.'
        : 'The request could not be completed.';
    String? code;
    if (decoded is Map) {
      final err = decoded['error'];
      if (err is Map) {
        code = err['code']?.toString();
        final m = err['message'];
        if (m is String && m.isNotEmpty) message = m;
      } else if (decoded['message'] is String) {
        message = decoded['message'] as String;
      } else if (decoded['message'] is List) {
        message = (decoded['message'] as List).join('. ');
      }
    }
    throw ApiException.fromStatus(res.statusCode, message, code: code);
  }

  static DateTime? _parseTime(Object? v) => v is String ? DateTime.tryParse(v)?.toUtc() : null;

  static DateTime? _parseHttpDate(http.Response res) {
    final d = res.headers['date'];
    if (d == null) return null;
    try {
      return HttpDate.parse(d).toUtc();
    } catch (_) {
      return null;
    }
  }

  void close() => _http.close();
}
