import 'dart:convert';

/// Reads (does not verify) the claims of an AdhocX access token. Used only to route the UI:
/// the API re-checks role and `corporateEmployeeId` on every request.
class JwtClaims {
  final String? userId;
  final String? role;
  final String? corporateEmployeeId;
  final String? corporateTenantId;
  final DateTime? expiresAt;

  const JwtClaims({this.userId, this.role, this.corporateEmployeeId, this.corporateTenantId, this.expiresAt});

  static JwtClaims? tryParse(String? token) {
    if (token == null) return null;
    final parts = token.split('.');
    if (parts.length != 3) return null;
    try {
      final json = jsonDecode(utf8.decode(base64Url.decode(base64Url.normalize(parts[1]))));
      if (json is! Map) return null;
      final exp = json['exp'];
      return JwtClaims(
        userId: json['id']?.toString() ?? json['sub']?.toString(),
        role: json['role']?.toString(),
        corporateEmployeeId: json['corporateEmployeeId']?.toString(),
        corporateTenantId: json['corporateTenantId']?.toString(),
        expiresAt: exp is num ? DateTime.fromMillisecondsSinceEpoch(exp.toInt() * 1000, isUtc: true) : null,
      );
    } catch (_) {
      return null;
    }
  }
}
