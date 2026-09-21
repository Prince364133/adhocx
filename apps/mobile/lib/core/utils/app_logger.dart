import 'dart:convert';
import 'package:flutter/foundation.dart';

/// Industry-standard structured logging utility for AdhocX Mobile
/// Provides color-coded log levels, tag filtering, safe payload masking, and performance timers.
enum LogLevel { debug, info, warn, error }

class AppLogger {
  AppLogger._();

  // ANSI escape codes for clean terminal colorization (Mobile & Terminal)
  static const String _reset = '\x1B[0m';
  static const String _gray = '\x1B[90m';
  static const String _cyan = '\x1B[36m';
  static const String _yellow = '\x1B[33m';
  static const String _red = '\x1B[31m';

  static bool enableLogging = kDebugMode;

  /// Debug level logs (silenced in release builds)
  static void debug(String message, {String tag = 'APP'}) {
    if (!enableLogging) return;
    _printLog(LogLevel.debug, tag, message);
  }

  /// Informational operational logs
  static void info(String message, {String tag = 'APP'}) {
    if (!enableLogging) return;
    _printLog(LogLevel.info, tag, message);
  }

  /// Warning logs for non-fatal irregularities
  static void warn(String message, {String tag = 'APP', Object? error, StackTrace? stackTrace}) {
    _printLog(LogLevel.warn, tag, message, error: error, stackTrace: stackTrace);
  }

  /// Error level logs for exceptions and failed network/auth events
  static void error(String message, {String tag = 'APP', Object? error, StackTrace? stackTrace}) {
    _printLog(LogLevel.error, tag, message, error: error, stackTrace: stackTrace);
  }

  /// HTTP Request logging with safe body masking
  static void httpReq(String method, String url, {dynamic body}) {
    if (!enableLogging) return;
    final maskedBody = _maskSensitiveData(body);
    final bodyStr = maskedBody != null ? ' | Payload: $maskedBody' : '';
    _printLog(LogLevel.info, 'HTTP', '--> $method $url$bodyStr');
  }

  /// HTTP Response logging with status code and duration
  static void httpRes(int statusCode, String method, String url, Duration duration, {dynamic body}) {
    if (!enableLogging) return;
    final isSuccess = statusCode >= 200 && statusCode < 300;
    final level = isSuccess ? LogLevel.info : (statusCode < 500 ? LogLevel.warn : LogLevel.error);
    final statusBadge = '$statusCode ${isSuccess ? 'OK' : 'ERR'}';
    final durationMs = '${duration.inMilliseconds}ms';
    final maskedBody = _maskSensitiveData(body);
    final bodySnippet = (!isSuccess && maskedBody != null) ? ' | Response: $maskedBody' : '';
    _printLog(level, 'HTTP', '<-- $statusBadge $method $url ($durationMs)$bodySnippet');
  }

  /// Measure execution duration of asynchronous tasks
  static Future<T> time<T>(String label, Future<T> Function() block, {String tag = 'PERF'}) async {
    final stopwatch = Stopwatch()..start();
    try {
      final result = await block();
      stopwatch.stop();
      info('$label completed in ${stopwatch.elapsedMilliseconds}ms', tag: tag);
      return result;
    } catch (e, st) {
      stopwatch.stop();
      error('$label failed after ${stopwatch.elapsedMilliseconds}ms: $e', tag: tag, error: e, stackTrace: st);
      rethrow;
    }
  }

  static void _printLog(
    LogLevel level,
    String tag,
    String message, {
    Object? error,
    StackTrace? stackTrace,
  }) {
    final now = DateTime.now();
    final timeStr = '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}:${now.second.toString().padLeft(2, '0')}.${now.millisecond.toString().padLeft(3, '0')}';

    String levelColor;
    String levelPrefix;

    switch (level) {
      case LogLevel.debug:
        levelColor = _gray;
        levelPrefix = '🔍 [DEBUG]';
        break;
      case LogLevel.info:
        levelColor = _cyan;
        levelPrefix = 'ℹ️  [INFO]';
        break;
      case LogLevel.warn:
        levelColor = _yellow;
        levelPrefix = '⚠️  [WARN]';
        break;
      case LogLevel.error:
        levelColor = _red;
        levelPrefix = '🚨 [ERROR]';
        break;
    }

    if (kIsWeb) {
      // In web browser console, clean plain text without ANSI escape clutter
      debugPrint('$timeStr $levelPrefix [$tag] $message');
      if (error != null) {
        debugPrint('[$tag] Exception: $error');
      }
      if (stackTrace != null) {
        debugPrint('[$tag] StackTrace:\n$stackTrace');
      }
    } else {
      // In native terminal / emulators, rich ANSI colors
      final formatted = '$levelColor$timeStr $levelPrefix [$tag] $message$_reset';
      debugPrint(formatted);
      if (error != null) {
        debugPrint('$_red[$tag] Exception: $error$_reset');
      }
      if (stackTrace != null) {
        debugPrint('$_gray[$tag] StackTrace:\n$stackTrace$_reset');
      }
    }
  }

  /// Automatically masks confidential user tokens, secrets, and passwords
  static dynamic _maskSensitiveData(dynamic data) {
    if (data == null) return null;
    if (data is String) {
      final trimmed = data.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
          (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          final decoded = jsonDecode(trimmed);
          return _maskSensitiveData(decoded);
        } catch (_) {
          return data;
        }
      }
      return data;
    }
    if (data is Map) {
      final sanitized = <String, dynamic>{};
      data.forEach((key, val) {
        final lower = key.toString().toLowerCase();
        if (lower.contains('password') ||
            lower.contains('token') ||
            lower.contains('secret') ||
            lower.contains('otp') ||
            lower.contains('authorization') ||
            lower.contains('cookie')) {
          sanitized[key.toString()] = '********';
        } else if (val is Map || val is List) {
          sanitized[key.toString()] = _maskSensitiveData(val);
        } else {
          sanitized[key.toString()] = val;
        }
      });
      return sanitized;
    }
    if (data is List) {
      return data.map((item) => _maskSensitiveData(item)).toList();
    }
    return data;
  }
}
