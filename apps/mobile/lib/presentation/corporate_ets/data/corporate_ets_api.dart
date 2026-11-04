import '../../../services/driver_service.dart';

/// Port over the corporate ETS driver endpoints.
///
/// Screens and controllers depend on this interface so they can be exercised in tests; the
/// production implementation delegates to [DriverService] (the app's single service layer).
abstract class CorporateEtsApi {
  /// GET /corporate/dispatch/driver-offers
  Future<dynamic> getDriverOffers();

  /// POST /corporate/dispatch/routes/:id/offers/accept
  Future<dynamic> acceptOffer(String routeId);

  /// POST /corporate/dispatch/routes/:id/offers/reject
  Future<dynamic> rejectOffer(String routeId, {String? reason});

  /// GET /corporate/dispatch/driver-duties
  Future<dynamic> getDuties();

  /// GET /corporate/trips/driver/routes
  Future<dynamic> getDriverRoutes();

  /// GET /corporate/trips/driver/active-route
  Future<dynamic> getActiveRoute();

  /// GET /corporate/trips/routes/:id/waypoints
  Future<dynamic> getWaypoints(String routeId);

  /// POST /corporate/trips/routes/:id/start
  Future<dynamic> startRoute(String routeId, {double? lat, double? lng});

  /// POST /corporate/trips/routes/:id/stops/:stopId/arrive
  Future<dynamic> arriveAtStop(String routeId, String stopId, {required double lat, required double lng});

  /// POST /corporate/trips/routes/:id/stops/:stopId/verify-otp
  Future<dynamic> verifyOtp(String routeId, String stopId, String otpCode);

  /// POST /corporate/trips/routes/:id/stops/:stopId/no-show
  Future<dynamic> markNoShow(String routeId, String stopId, {required String reason, double? lat, double? lng});

  /// POST /corporate/trips/routes/:id/complete
  Future<dynamic> completeRoute(String routeId);

  /// POST /corporate/trips/routes/:id/telemetry
  Future<dynamic> postTelemetry(String routeId, Map<String, dynamic> fix);

  /// POST /corporate/safety/sos
  Future<dynamic> triggerSos({
    required String routeId,
    required double lat,
    required double lng,
    String? stopId,
    int? batteryPct,
    String? reason,
  });

  /// GET /corporate/billing/drivers/:driverId/earnings
  Future<dynamic> getEarningsSummary(String driverId);

  /// Driver row id of the authenticated driver (from GET /drivers/profile).
  Future<String?> getDriverId();
}

/// Production adapter over [DriverService].
class DriverServiceCorporateEtsApi implements CorporateEtsApi {
  DriverServiceCorporateEtsApi([DriverService? service]) : _service = service ?? DriverService.instance;

  final DriverService _service;

  @override
  Future<dynamic> getDriverOffers() => _service.getCorporateDriverOffers();

  @override
  Future<dynamic> acceptOffer(String routeId) => _service.acceptCorporateOffer(routeId);

  @override
  Future<dynamic> rejectOffer(String routeId, {String? reason}) =>
      _service.declineCorporateOffer(routeId, reason: reason);

  @override
  Future<dynamic> getDuties() => _service.getCorporateDuties();

  @override
  Future<dynamic> getDriverRoutes() => _service.getCorporateDriverRoutes();

  @override
  Future<dynamic> getActiveRoute() => _service.getCorporateActiveRoute();

  @override
  Future<dynamic> getWaypoints(String routeId) => _service.getCorporateRouteWaypoints(routeId);

  @override
  Future<dynamic> startRoute(String routeId, {double? lat, double? lng}) =>
      _service.startCorporateRoute(routeId, lat: lat, lng: lng);

  @override
  Future<dynamic> arriveAtStop(String routeId, String stopId, {required double lat, required double lng}) =>
      _service.arriveCorporateStop(routeId, stopId, lat: lat, lng: lng);

  @override
  Future<dynamic> verifyOtp(String routeId, String stopId, String otpCode) =>
      _service.verifyCorporateBoardingOtp(routeId, stopId, otpCode);

  @override
  Future<dynamic> markNoShow(String routeId, String stopId, {required String reason, double? lat, double? lng}) =>
      _service.markCorporateNoShow(routeId, stopId, reason: reason, lat: lat, lng: lng);

  @override
  Future<dynamic> completeRoute(String routeId) => _service.completeCorporateRoute(routeId);

  @override
  Future<dynamic> postTelemetry(String routeId, Map<String, dynamic> fix) =>
      _service.postCorporateTelemetry(routeId, fix);

  @override
  Future<dynamic> triggerSos({
    required String routeId,
    required double lat,
    required double lng,
    String? stopId,
    int? batteryPct,
    String? reason,
  }) =>
      _service.triggerCorporateSos(
        routeId,
        lat: lat,
        lng: lng,
        stopId: stopId,
        batteryPct: batteryPct,
        note: reason,
      );

  @override
  Future<dynamic> getEarningsSummary(String driverId) => _service.getCorporateEarningsSummary(driverId);

  @override
  Future<String?> getDriverId() async {
    final profile = await _service.getProfile();
    if (profile is! Map) return null;
    final data = profile['data'] is Map ? profile['data'] as Map : profile;
    final id = data['id'] ?? data['driverId'];
    final s = id?.toString().trim();
    return (s == null || s.isEmpty) ? null : s;
  }
}
