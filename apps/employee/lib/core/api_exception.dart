/// How a failed request should be presented (docs/04_DESIGN_SYSTEM.md §40 error taxonomy).
enum ApiErrorKind {
  /// No connection / DNS / timeout: show the offline state.
  offline,

  /// 401 after a failed refresh: the session is gone, sign in again.
  unauthorized,

  /// 403: signed in, but this account may not do this.
  forbidden,

  /// 404: the resource does not exist (or is not visible to this employee).
  notFound,

  /// 400 / 409 / 422: the request is not permitted right now (e.g. past the 9 h cutoff).
  business,

  /// 5xx or an unreadable response.
  server,
}

class ApiException implements Exception {
  final ApiErrorKind kind;
  final int? statusCode;
  final String message;
  final String? code;

  const ApiException({required this.kind, required this.message, this.statusCode, this.code});

  factory ApiException.fromStatus(int status, String message, {String? code}) {
    final kind = switch (status) {
      401 => ApiErrorKind.unauthorized,
      403 => ApiErrorKind.forbidden,
      404 => ApiErrorKind.notFound,
      >= 500 => ApiErrorKind.server,
      _ => ApiErrorKind.business,
    };
    return ApiException(kind: kind, message: message, statusCode: status, code: code);
  }

  bool get isAuthFailure => kind == ApiErrorKind.unauthorized;

  @override
  String toString() => message;
}
