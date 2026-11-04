import 'dart:async';

import 'package:http/http.dart' as http;

import '../../../core/networking/api_client.dart';
import '../../../core/utils/app_toast.dart';

enum CorporateErrorKind {
  /// No connectivity / request never reached the server.
  offline,

  /// Server rejected an arrival or QR scan because the cab is outside the stop geofence.
  geofence,

  /// 409: state changed concurrently (offer expired, withdrawn or taken; route already started).
  conflict,

  /// 400/403/404/422: request was understood and refused.
  rejected,

  /// 5xx or unexpected failure.
  server,
}

/// Classified error from a corporate ETS API call, with a driver-facing message.
class CorporateError {
  CorporateError(this.kind, this.message, {this.statusCode});

  final CorporateErrorKind kind;
  final String message;
  final int? statusCode;

  bool get isOffline => kind == CorporateErrorKind.offline;

  static CorporateError from(Object error) {
    if (error is CorporateError) return error;
    if (error is TimeoutException || error is http.ClientException || _looksOffline(error.toString())) {
      return CorporateError(
        CorporateErrorKind.offline,
        'You appear to be offline. Check your internet connection and try again.',
      );
    }
    if (error is ApiException) {
      final raw = error.message.trim();
      final code = error.statusCode;
      if (raw.toLowerCase().contains('geofence')) {
        return CorporateError(CorporateErrorKind.geofence, raw, statusCode: code);
      }
      if (code == 409) {
        return CorporateError(CorporateErrorKind.conflict, raw.isEmpty ? 'This action is no longer valid.' : raw,
            statusCode: code);
      }
      if (code >= 500) {
        return CorporateError(CorporateErrorKind.server, 'Server is temporarily unavailable. Please try again shortly.',
            statusCode: code);
      }
      return CorporateError(CorporateErrorKind.rejected, AppToast.cleanErrorMessage(error), statusCode: code);
    }
    return CorporateError(CorporateErrorKind.server, AppToast.cleanErrorMessage(error));
  }

  static bool _looksOffline(String s) {
    final l = s.toLowerCase();
    return l.contains('socketexception') ||
        l.contains('failed host lookup') ||
        l.contains('network is unreachable') ||
        l.contains('connection refused') ||
        l.contains('connection closed') ||
        l.contains('xmlhttprequest error');
  }

  /// Seconds left in the 5-minute window when the server refuses an early no-show
  /// ("Cannot mark No-Show before 5-minute wait window has elapsed. 42 seconds remaining.").
  int? get noShowSecondsRemaining {
    final m = RegExp(r'(\d+)\s+seconds?\s+remaining', caseSensitive: false).firstMatch(message);
    return m == null ? null : int.tryParse(m.group(1)!);
  }

  @override
  String toString() => message;
}
