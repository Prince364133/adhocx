/// Tolerant readers for API JSON (numbers may arrive as strings from Prisma Decimals).
Map<String, dynamic> asMap(Object? v) =>
    v is Map ? v.map((k, val) => MapEntry(k.toString(), val)) : <String, dynamic>{};

List<Map<String, dynamic>> asMapList(Object? v) =>
    v is List ? v.map(asMap).toList() : const <Map<String, dynamic>>[];

String? str(Object? v) {
  if (v == null) return null;
  final s = v.toString();
  return s.isEmpty ? null : s;
}

String strOr(Object? v, String fallback) => str(v) ?? fallback;

double? dbl(Object? v) => v is num ? v.toDouble() : (v is String ? double.tryParse(v) : null);

int? integer(Object? v) => v is num ? v.toInt() : (v is String ? int.tryParse(v) : null);

bool boolean(Object? v) => v == true || v == 'true';

DateTime? time(Object? v) => v is String ? DateTime.tryParse(v)?.toUtc() : null;
