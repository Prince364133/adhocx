/// GPS freshness shown on the live map. Same thresholds as apps/api tracking.types.ts
/// (LIVE <= 45 s, STALE <= 180 s, else OFFLINE), measured on the device timestamp of the fix.
enum GpsFreshness { live, stale, offline }

const int gpsLiveMaxAgeSec = 45;
const int gpsStaleMaxAgeSec = 180;

extension GpsFreshnessText on GpsFreshness {
  String get label => switch (this) {
        GpsFreshness.live => 'LIVE',
        GpsFreshness.stale => 'STALE',
        GpsFreshness.offline => 'OFFLINE',
      };
}

GpsFreshness _fromApi(String? s) => switch (s?.toUpperCase()) {
      'LIVE' => GpsFreshness.live,
      'STALE' => GpsFreshness.stale,
      'OFFLINE' => GpsFreshness.offline,
      _ => GpsFreshness.offline,
    };

GpsFreshness classifyAge(int? ageSec) {
  if (ageSec == null) return GpsFreshness.offline;
  if (ageSec <= gpsLiveMaxAgeSec) return GpsFreshness.live;
  if (ageSec <= gpsStaleMaxAgeSec) return GpsFreshness.stale;
  return GpsFreshness.offline;
}

class GpsView {
  final GpsFreshness freshness;
  final int? ageSec;

  const GpsView(this.freshness, this.ageSec);
}

/// Combines the server's verdict with the fix's own age and returns the WORSE of the two, so a
/// stale position is never displayed as live (e.g. the response itself was served from a cache,
/// or the screen kept showing it while polling failed).
///
/// [reference] is the server "as of" time when known, otherwise the device clock [now]. The age
/// keeps growing locally between polls: [now] - [fetchedAt] is added to the server-side age.
GpsView resolveGps({
  String? apiState,
  int? apiAgeSec,
  DateTime? recordedAt,
  DateTime? reference,
  DateTime? fetchedAt,
  required DateTime now,
}) {
  int? age;
  if (recordedAt != null) {
    final ref = reference ?? now;
    age = ref.difference(recordedAt).inSeconds;
    if (age < 0) age = 0;
  } else {
    age = apiAgeSec;
  }
  if (age != null && fetchedAt != null && reference != null) {
    final sinceFetch = now.difference(fetchedAt).inSeconds;
    if (sinceFetch > 0) age += sinceFetch;
  }

  final computed = classifyAge(age);
  final server = apiState == null ? computed : _fromApi(apiState);
  final worst = server.index >= computed.index ? server : computed;
  return GpsView(worst, age);
}
