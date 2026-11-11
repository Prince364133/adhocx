import 'dart:async';
import '../core/networking/api_client.dart';
import 'auth_service.dart';
import 'dispatch_location.dart';
import 'permission_service.dart';
export 'digio_service.dart';

/// No trustworthy GPS fix is available for an action that must report the driver's position.
class LocationUnavailableException implements Exception {
  const LocationUnavailableException([this.message = 'Location not available — move to an open area and try again']);
  final String message;
  @override
  String toString() => message;
}

/// Body for `PATCH /trips/:id/location`. Must match the API's TripLocationUpdateDto: `location` is
/// nested, and unknown top-level fields are rejected (ValidationPipe forbidNonWhitelisted).
/// Speed is metres per second; negative speed/heading mean "unavailable" on Android and are omitted.
Map<String, dynamic> tripLocationPingBody({
  required double lat,
  required double lng,
  double? speed,
  double? heading,
}) =>
    {
      'location': {'latitude': lat, 'longitude': lng},
      if (speed != null && speed >= 0) 'speed': speed,
      if (heading != null && heading >= 0) 'heading': heading,
    };

class DriverService {
  static DriverService? _instance;
  static DriverService get instance => _instance ??= DriverService._();

  DriverService._();

  final ApiClient _api = ApiClient.instance;

  final StreamController<Map<String, dynamic>> _tripEventsController =
      StreamController<Map<String, dynamic>>.broadcast();

  /// Stream of real-time and client-side trip lifecycle updates (STARTED, ARRIVED, COMPLETED, CANCELLED, ASSIGNED).
  Stream<Map<String, dynamic>> get tripEventsStream => _tripEventsController.stream;

  /// Globally broadcasts a trip state transition and invalidates trips & wallet caches across the app
  void notifyTripChanged({String? tripId, String? status}) {
    invalidateCache(trips: true);
    _api.invalidateCache(prefix: '/trips');
    _api.invalidateCache(prefix: '/settlements');
    _api.invalidateCache(prefix: '/wallet');
    if (!_tripEventsController.isClosed) {
      _tripEventsController.add({
        'tripId': tripId,
        'status': status,
        'timestamp': DateTime.now().toIso8601String(),
      });
    }
  }

  // In-memory smart response caches with TTLs to prevent network flooding
  List<dynamic>? _cachedOffers;
  DateTime? _lastOffersFetchTime;

  final Map<String, List<dynamic>> _cachedTripsByStatus = {};
  final Map<String, DateTime> _lastTripsFetchTimeByStatus = {};

  dynamic _cachedProfile;
  DateTime? _lastProfileFetchTime;

  dynamic _cachedTrustScore;
  DateTime? _lastTrustScoreFetchTime;

  dynamic _cachedWallet;
  DateTime? _lastWalletFetchTime;

  void invalidateCache({bool all = false, bool offers = false, bool trips = false, bool profile = false}) {
    if (all || offers) {
      _cachedOffers = null;
      _lastOffersFetchTime = null;
    }
    if (all || trips) {
      _cachedTripsByStatus.clear();
      _lastTripsFetchTimeByStatus.clear();
      _cachedWallet = null;
      _lastWalletFetchTime = null;
      _api.invalidateCache(prefix: '/trips');
    }
    if (all || profile) {
      _cachedProfile = null;
      _lastProfileFetchTime = null;
      _cachedTrustScore = null;
      _lastTrustScoreFetchTime = null;
    }
    if (all) {
      _cachedVehicleCategories = null;
      _lastVehicleCategoriesFetchTime = null;
    }
  }

  Future<void> _ensureDriverSession() async {
    try {
      await AuthService.instance.ensureDriverSession();
    } catch (_) {}
  }

  // Profile & Availability (30s cache TTL)
  Future<dynamic> getProfile({bool forceRefresh = false}) async {
    final now = DateTime.now();
    if (!forceRefresh &&
        _cachedProfile != null &&
        _lastProfileFetchTime != null &&
        now.difference(_lastProfileFetchTime!).inSeconds < 30) {
      return _cachedProfile;
    }
    await _ensureDriverSession();
    final response = await _api.get('/drivers/profile', force: forceRefresh);
    _cachedProfile = response;
    _lastProfileFetchTime = now;
    if (response is Map) {
      final pUrl = response['profilePhotoUrl'] ??
          response['photoUrl'] ??
          (response['kycDocuments'] is Map ? response['kycDocuments']['profilePhotoUrl'] : null) ??
          (response['data'] is Map ? (response['data']['profilePhotoUrl'] ?? response['data']['photoUrl']) : null);
      if (pUrl != null && pUrl.toString().trim().isNotEmpty && pUrl.toString().trim() != 'null') {
        AuthService.instance.updateCurrentUserProfilePhoto(pUrl.toString().trim());
      }
    }
    return response;
  }

  Future<dynamic> updateProfile(Map<String, dynamic> data) async {
    await _ensureDriverSession();
    final result = await _api.patch(
      '/drivers/profile',
      body: data,
    );
    invalidateCache(profile: true);

    final String? fullName = data['fullName']?.toString() ?? data['name']?.toString();
    final String? phone = data['phone']?.toString();
    final String? email = data['email']?.toString();
    final String? photoUrl = data['profilePhotoUrl']?.toString() ?? data['photoUrl']?.toString();
    if (fullName != null || phone != null || email != null || photoUrl != null) {
      AuthService.instance.updateCurrentUser(
        fullName: fullName,
        phone: phone,
        email: email,
        photoUrl: photoUrl,
        driverProfile: data,
      );
    }

    try {
      await AuthService.instance.fetchCurrentUser(forceRefresh: true);
    } catch (_) {}

    return result;
  }

  Future<dynamic> uploadProfilePhoto({
    required List<int> fileBytes,
    String fileName = 'profile_photo.jpg',
    String mimeType = 'image/jpeg',
  }) async {
    final result = await uploadKycDocument(
      documentType: 'PROFILE_PHOTO',
      fileBytes: fileBytes,
      fileName: fileName,
      mimeType: mimeType,
    );
    invalidateCache(profile: true);

    final uploadedUrl = (result is Map && result['url'] != null)
        ? result['url'].toString()
        : (result is Map && result['data'] is Map && result['data']['url'] != null)
            ? result['data']['url'].toString()
            : null;
    if (uploadedUrl != null && uploadedUrl.isNotEmpty && uploadedUrl != 'null') {
      AuthService.instance.updateCurrentUserProfilePhoto(uploadedUrl);
    }

    return result;
  }

  // 100-Point Driver Performance & Trust Score (30s cache TTL)
  Future<dynamic> getTrustScore({bool forceRefresh = false}) async {
    final now = DateTime.now();
    if (!forceRefresh &&
        _cachedTrustScore != null &&
        _lastTrustScoreFetchTime != null &&
        now.difference(_lastTrustScoreFetchTime!).inSeconds < 30) {
      return _cachedTrustScore;
    }
    await _ensureDriverSession();
    final response = await _api.get('/drivers/trust-score', force: forceRefresh);
    _cachedTrustScore = response;
    _lastTrustScoreFetchTime = now;
    return response;
  }

  /// Body for `PATCH /drivers/availability`. Coordinates are included only when a real fix exists:
  /// no fix means no location (the server keeps the driver out of dispatch until one arrives).
  static Map<String, dynamic> availabilityPayload(String availabilityStatus, {double? lat, double? lng}) => {
        'status': availabilityStatus.toUpperCase(),
        if (lat != null && lng != null)
          'currentLocation': {
            'latitude': lat,
            'longitude': lng,
          },
      };

  Future<dynamic> updateAvailability(String availabilityStatus, {double? lat, double? lng}) async {
    await _ensureDriverSession();
    final result = await _api.patch(
      '/drivers/availability',
      body: availabilityPayload(availabilityStatus, lat: lat, lng: lng),
    );
    invalidateCache(profile: true, offers: true);
    return result;
  }


  // KYC Document Upload (Cloudflare R2 Integration)
  Future<dynamic> uploadKycDocument({
    String documentType = 'GENERAL',
    required List<int> fileBytes,
    String? fileName,
    String? filename,
    String mimeType = 'image/jpeg',
  }) async {
    await _ensureDriverSession();
    final effectiveName = filename ?? fileName ?? 'document.jpg';
    return await _api.multipartUpload(
      '/drivers/documents/upload',
      fileField: 'document',
      fileBytes: fileBytes,
      fileName: effectiveName,
      fields: {'documentType': documentType, 'mimeType': mimeType},
    );
  }

  // KYC Profile Submission
  /// Licence fields for the KYC submission. Only a real (entered, OCR'd or Digio-verified) licence
  /// number is ever sent; nothing is fabricated from the vehicle plate. Expiry is sent only when
  /// it is actually known.
  static Map<String, dynamic> licenseFieldsFor({String? licenseNumber, String? dlNumber, DateTime? licenseExpiry}) {
    String? clean(String? v) {
      final t = v?.trim().toUpperCase() ?? '';
      if (t.isEmpty || t == 'DL-PENDING') return null;
      return t;
    }

    final dl = clean(dlNumber) ?? clean(licenseNumber);
    return {
      if (dl != null) 'licenseNumber': dl,
      if (dl != null) 'dlNumber': dl,
      if (licenseExpiry != null) 'licenseExpiry': licenseExpiry.toIso8601String(),
    };
  }

  Future<dynamic> submitKyc({
    String? licenseNumber,
    DateTime? licenseExpiry,
    required List<String> documentUrls,
    required Map<String, dynamic> vehicleDetails,
    String? phone,
    String? email,
    String? fullName,
    String? profilePhotoUrl,
    String? dateOfBirth,
    String? gender,
    String? address,
    String? emergencyContactName,
    String? emergencyContactPhone,
    String? dlFrontUrl,
    String? dlBackUrl,
    String? rcDocUrl,
    String? rcFrontUrl,
    String? rcBackUrl,
    String? insuranceDocUrl,
    String? vehiclePhotoUrl,
    String? aadharFrontUrl,
    String? aadharBackUrl,
    String? panDocUrl,
    String? dlNumber,
    String? panNumber,
    String? rcNumber,
    String? color,
    String? modelYear,
    String? insurancePolicyNumber,
    String? insuranceCompany,
    String? insuranceExpiry,
  }) async {
    await _ensureDriverSession();
    final res = await _api.post(
      '/drivers/kyc',
      body: {
        ...licenseFieldsFor(licenseNumber: licenseNumber, dlNumber: dlNumber, licenseExpiry: licenseExpiry),
        'documentUrls': documentUrls,
        'vehicle': vehicleDetails,
        if (phone != null && phone.isNotEmpty) 'phone': phone,
        if (email != null && email.isNotEmpty) 'email': email,
        if (fullName != null && fullName.isNotEmpty) 'fullName': fullName,
        if (profilePhotoUrl != null && profilePhotoUrl.isNotEmpty) 'profilePhotoUrl': profilePhotoUrl,
        if (dateOfBirth != null && dateOfBirth.isNotEmpty) 'dateOfBirth': dateOfBirth,
        if (gender != null && gender.isNotEmpty) 'gender': gender,
        if (address != null && address.isNotEmpty) 'address': address,
        if (emergencyContactName != null && emergencyContactName.isNotEmpty)
          'emergencyContactName': emergencyContactName,
        if (emergencyContactPhone != null && emergencyContactPhone.isNotEmpty)
          'emergencyContactPhone': emergencyContactPhone,
        if (dlFrontUrl != null) 'dlFrontUrl': dlFrontUrl,
        if (dlBackUrl != null) 'dlBackUrl': dlBackUrl,
        if (rcDocUrl != null) 'rcDocUrl': rcDocUrl,
        if (rcFrontUrl != null) 'rcFrontUrl': rcFrontUrl,
        if (rcBackUrl != null) 'rcBackUrl': rcBackUrl,
        if (insuranceDocUrl != null) 'insuranceDocUrl': insuranceDocUrl,
        if (vehiclePhotoUrl != null) 'vehiclePhotoUrl': vehiclePhotoUrl,
        if (aadharFrontUrl != null) 'aadharFrontUrl': aadharFrontUrl,
        if (aadharBackUrl != null) 'aadharBackUrl': aadharBackUrl,
        if (panDocUrl != null) 'panDocUrl': panDocUrl,
        if (panNumber != null && panNumber.isNotEmpty) 'panNumber': panNumber,
        if (rcNumber != null && rcNumber.isNotEmpty) 'rcNumber': rcNumber,
        if (color != null && color.isNotEmpty) 'vehicleColor': color,
        if (modelYear != null && modelYear.isNotEmpty) 'modelYear': modelYear,
        if (insurancePolicyNumber != null && insurancePolicyNumber.isNotEmpty)
          'insurancePolicyNumber': insurancePolicyNumber,
        if (insuranceCompany != null && insuranceCompany.isNotEmpty)
          'insuranceCompany': insuranceCompany,
        if (insuranceExpiry != null && insuranceExpiry.isNotEmpty)
          'insuranceExpiry': insuranceExpiry,
      },
    );
    invalidateCache(profile: true);

    if (fullName != null || phone != null) {
      AuthService.instance.updateCurrentUser(
        fullName: fullName,
        phone: phone,
      );
    }
    try {
      await AuthService.instance.fetchCurrentUser(forceRefresh: true);
    } catch (_) {}

    return res;
  }

  // Offers (Direct Dispatch Mode with 8s cache TTL)
  Future<List<dynamic>> getOffers({bool forceRefresh = false}) async {
    final now = DateTime.now();
    if (!forceRefresh &&
        _cachedOffers != null &&
        _lastOffersFetchTime != null &&
        now.difference(_lastOffersFetchTime!).inSeconds < 8) {
      return _cachedOffers!;
    }
    await _ensureDriverSession();
    final response = await _api.get('/offers', force: forceRefresh);
    if (response is List) {
      _cachedOffers = response;
      _lastOffersFetchTime = now;
      return response;
    }
    return _cachedOffers ?? [];
  }

  /// Fetch a single offer by ID including current status and remaining expiry time.
  Future<Map<String, dynamic>?> getOfferById(String offerId, {bool forceRefresh = true}) async {
    await _ensureDriverSession();
    final response = await _api.get('/offers/$offerId', force: forceRefresh);
    if (response is Map) {
      return Map<String, dynamic>.from(response);
    }
    return null;
  }

  Future<dynamic> acceptOffer(String offerId) async {
    await _ensureDriverSession();
    final res = await _api.post('/offers/$offerId/accept');
    invalidateCache(offers: true, trips: true);
    notifyTripChanged(status: 'ASSIGNED');
    return res;
  }

  Future<dynamic> declineOffer(String offerId, {String? reason}) async {
    await _ensureDriverSession();
    final res = await _api.post(
      '/offers/$offerId/decline',
      body: reason != null ? {'reason': reason} : null,
    );
    invalidateCache(offers: true);
    return res;
  }

  // Trip Lifecycle (15s cache TTL)
  Future<List<dynamic>> getTrips({String? status, bool forceRefresh = false}) async {
    final key = status ?? 'ALL';
    final now = DateTime.now();
    if (!forceRefresh &&
        _cachedTripsByStatus.containsKey(key) &&
        _lastTripsFetchTimeByStatus.containsKey(key) &&
        now.difference(_lastTripsFetchTimeByStatus[key]!).inSeconds < 15) {
      return _cachedTripsByStatus[key]!;
    }
    if (forceRefresh) {
      _cachedTripsByStatus.remove(key);
      _lastTripsFetchTimeByStatus.remove(key);
      _api.invalidateCache(prefix: '/trips');
    }
    await _ensureDriverSession();
    final query = status != null ? {'status': status} : null;
    final response = await _api.get('/trips', queryParameters: query, force: forceRefresh);
    if (response is List) {
      _cachedTripsByStatus[key] = response;
      _lastTripsFetchTimeByStatus[key] = now;
      return response;
    }
    return _cachedTripsByStatus[key] ?? [];
  }

  Future<dynamic> markArrived(String tripId) async {
    await _ensureDriverSession();
    final res = await _api.post('/trips/$tripId/arrive');
    notifyTripChanged(tripId: tripId, status: 'ARRIVED');
    return res;
  }

  Future<dynamic> startTrip(
    String tripId,
    String otp, {
    double? lat,
    double? lng,
  }) async {
    await _ensureDriverSession();
    final loc = await _requireTripLocation(lat, lng);
    final res = await _api.post(
      '/trips/$tripId/start',
      body: {
        'otp': otp,
        'currentLocation': {
          'latitude': loc.$1,
          'longitude': loc.$2,
        },
      },
    );
    notifyTripChanged(tripId: tripId, status: 'IN_PROGRESS');
    return res;
  }

  /// Resolves the location a trip start/complete must carry: the caller's coordinates, else a
  /// dispatch-quality fix. Never a hardcoded city (that put drivers tens of km from where they are).
  Future<(double, double)> _requireTripLocation(double? lat, double? lng) async {
    if (lat != null && lng != null) return (lat, lng);
    final fix = await PermissionService.instance.getDispatchPosition();
    if (fix == null) throw const LocationUnavailableException();
    return (fix.latitude, fix.longitude);
  }

  /// Body for `POST /drivers/location`.
  static Map<String, dynamic> heartbeatPayload(DispatchFix fix) => {
        'latitude': fix.position.latitude,
        'longitude': fix.position.longitude,
        'accuracyM': fix.position.accuracy,
        'source': fix.source.wire,
        'recordedAt': fix.position.timestamp.toUtc().toIso8601String(),
      };

  /// Idle-driver location heartbeat (AVAILABLE, not on a trip). See [DriverLocationHeartbeat].
  Future<dynamic> sendLocationHeartbeat(DispatchFix fix) async {
    await _ensureDriverSession();
    return _api.post('/drivers/location', body: heartbeatPayload(fix));
  }

  Future<dynamic> sendLocationPing(
    String tripId, {
    required double lat,
    required double lng,
    double? speed,
    double? heading,
  }) async {
    await _ensureDriverSession();
    return await _api.patch(
      '/trips/$tripId/location',
      body: tripLocationPingBody(lat: lat, lng: lng, speed: speed, heading: heading),
    );
  }

  Future<dynamic> completeTrip(
    String tripId, {
    double? tollCharges,
    double? parkingCharges,
    double? lat,
    double? lng,
  }) async {
    await _ensureDriverSession();
    final loc = await _requireTripLocation(lat, lng);
    final res = await _api.post(
      '/trips/$tripId/complete',
      body: {
        'tollCharges': tollCharges ?? 0,
        'parkingCharges': parkingCharges ?? 0,
        'currentLocation': {
          'latitude': loc.$1,
          'longitude': loc.$2,
        },
      },
    );
    notifyTripChanged(tripId: tripId, status: 'COMPLETED');
    return res;
  }

  /// Delivery receipt for a displayed offer. Best-effort: never throws.
  Future<void> markOfferSeen(String offerId) async {
    try {
      await _ensureDriverSession();
      await _api.post('/offers/$offerId/seen');
    } catch (_) {}
  }

  // Reviews & Rating Submission
  Future<dynamic> submitReview({
    required String tripId,
    required int rating,
    String? feedback,
  }) async {
    await _ensureDriverSession();
    return await _api.post(
      '/reviews',
      body: {
        'tripId': tripId,
        'rating': rating,
        if (feedback != null) 'feedback': feedback,
      },
    );
  }

  // Dispute Tickets
  Future<dynamic> fileDispute({
    required String tripId,
    required String reason,
    String? description,
  }) async {
    await _ensureDriverSession();
    return await _api.post(
      '/disputes',
      body: {
        'tripId': tripId,
        'reason': reason,
        if (description != null) 'description': description,
      },
    );
  }

  // Wallet & Settlements (20s cache TTL)
  Future<dynamic> getWalletSummary({bool forceRefresh = false}) async {
    final now = DateTime.now();
    if (!forceRefresh &&
        _cachedWallet != null &&
        _lastWalletFetchTime != null &&
        now.difference(_lastWalletFetchTime!).inSeconds < 20) {
      return _cachedWallet;
    }
    await _ensureDriverSession();
    final response = await _api.get('/settlements/wallet', force: forceRefresh);
    _cachedWallet = response;
    _lastWalletFetchTime = now;
    return response;
  }

  Future<dynamic> getTrip(String tripId) async {
    await _ensureDriverSession();
    return await _api.get('/trips/$tripId');
  }

  Future<List<dynamic>> getTripMessages(String tripId) async {
    await _ensureDriverSession();
    final res = await _api.get('/trips/$tripId/messages', force: true);
    if (res is List) return res;
    if (res is Map && res['data'] is List) return res['data'] as List<dynamic>;
    return [];
  }

  Future<dynamic> sendTripMessage(String tripId, String text) async {
    await _ensureDriverSession();
    return await _api.post('/trips/$tripId/messages', body: {'text': text});
  }

  Future<dynamic> requestWithdrawal({
    required double amount,
    required String bankAccountName,
    required String bankAccountNumber,
    required String bankIfsc,
    String? bankName,
  }) async {
    await _ensureDriverSession();
    final res = await _api.post(
      '/settlements/withdraw',
      body: {
        'amount': amount,
        'bankAccountName': bankAccountName,
        'bankAccountNumber': bankAccountNumber,
        'bankIfsc': bankIfsc,
        if (bankName != null && bankName.isNotEmpty) 'bankName': bankName,
      },
    );
    invalidateCache(trips: true, profile: true);
    _cachedWallet = null;
    return res;
  }

  Future<List<dynamic>> getSettlements({bool forceRefresh = false}) async {
    await _ensureDriverSession();
    final response = await _api.get('/settlements', force: forceRefresh);
    if (response is List) {
      return response;
    } else if (response is Map && response['data'] is List) {
      return response['data'] as List<dynamic>;
    }
    return [];
  }

  Future<dynamic> getSettlementDetails(String id) async {
    await _ensureDriverSession();
    return await _api.get('/settlements/$id');
  }

  Future<dynamic> updateBankDetails({
    required String bankAccountName,
    required String bankAccountNumber,
    required String bankIfsc,
    String? bankName,
    String? upiId,
  }) async {
    await _ensureDriverSession();
    final res = await _api.patch(
      '/drivers/bank-details',
      body: {
        'bankAccountName': bankAccountName,
        'bankAccountNumber': bankAccountNumber,
        'bankIfsc': bankIfsc,
        if (bankName != null && bankName.isNotEmpty) 'bankName': bankName,
        if (upiId != null && upiId.isNotEmpty) 'upiId': upiId,
      },
    );
    invalidateCache(profile: true);
    return res;
  }

  Future<List<dynamic>> getPricingTiers({bool forceRefresh = false}) async {
    try {
      final res = await _api.get('/pricing', force: forceRefresh);
      return res is List ? res : [];
    } catch (_) {
      return [];
    }
  }

  /// Driver rate card (payouts only) for a vehicle category, from the active distance plan.
  /// Returns null when no plan is active or the request fails.
  Future<dynamic> getDriverDistanceRateCard({String? vehicleCategory, bool forceRefresh = false}) async {
    final query = vehicleCategory != null ? {'vehicleCategory': vehicleCategory} : null;
    try {
      final res = await _api.get('/driver/pricing/rate-card', queryParameters: query, force: forceRefresh);
      if (res is Map && res['slabs'] is List) return res;
    } catch (_) {}
    return null;
  }

  /// Global platform policy config (dynamic per-ride commission %, min withdrawal, etc.)
  Future<dynamic> getPolicyConfig({bool forceRefresh = false}) async {
    try {
      return await _api.get('/pricing/policy-config', force: forceRefresh);
    } catch (_) {
      return null;
    }
  }

  // Driver Monthly Subscription & 15-Day Free Trial Engine
  Future<dynamic> getSubscriptionStatus({bool forceRefresh = false}) async {
    await _ensureDriverSession();
    return await _api.get('/subscriptions/status', force: forceRefresh);
  }

  Future<dynamic> createSubscriptionOrder({String? couponCode}) async {
    await _ensureDriverSession();
    return await _api.post(
      '/subscriptions/order',
      body: couponCode != null && couponCode.trim().isNotEmpty ? {'couponCode': couponCode.trim()} : null,
    );
  }

  Future<dynamic> verifySubscriptionPayment({
    required String razorpayOrderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
    String? couponCode,
  }) async {
    await _ensureDriverSession();
    final res = await _api.post(
      '/subscriptions/verify',
      body: {
        'razorpayOrderId': razorpayOrderId,
        'razorpayPaymentId': razorpayPaymentId,
        'razorpaySignature': razorpaySignature,
        if (couponCode != null && couponCode.trim().isNotEmpty) 'couponCode': couponCode.trim(),
      },
    );
    invalidateCache(profile: true);
    return res;
  }

  Future<dynamic> renewSubscriptionWithWallet() async {
    await _ensureDriverSession();
    final res = await _api.post('/subscriptions/renew-wallet');
    invalidateCache(profile: true, trips: true);
    return res;
  }

  // Emergency Safety SOS
  Future<dynamic> triggerSos(String tripId, {double? lat, double? lng, String? note}) async {
    await _ensureDriverSession();
    return await _api.post(
      '/trips/$tripId/sos',
      body: {
        if (lat != null) 'latitude': lat,
        if (lng != null) 'longitude': lng,
        if (note != null) 'note': note,
      },
    );
  }

  // Dynamic Vehicle Categories & Authoritative Rate Cards
  List<Map<String, dynamic>>? _cachedVehicleCategories;
  DateTime? _lastVehicleCategoriesFetchTime;

  Future<List<Map<String, dynamic>>> getVehicleCategories({bool forceRefresh = false}) async {
    final now = DateTime.now();
    if (!forceRefresh &&
        _cachedVehicleCategories != null &&
        _lastVehicleCategoriesFetchTime != null &&
        now.difference(_lastVehicleCategoriesFetchTime!).inSeconds < 30) {
      return _cachedVehicleCategories!;
    }

    try {
      dynamic res = await _api.get('/pricing/tiers', force: forceRefresh);
      List<dynamic> list = [];
      if (res is List) {
        list = res;
      } else if (res is Map) {
        if (res['data'] is List) {
          list = res['data'] as List<dynamic>;
        } else if (res['items'] is List) {
          list = res['items'] as List<dynamic>;
        } else if (res['tiers'] is List) {
          list = res['tiers'] as List<dynamic>;
        }
      }

      if (list.isEmpty) {
        dynamic fallback = await _api.get('/pricing', force: forceRefresh);
        if (fallback is List) {
          list = fallback;
        } else if (fallback is Map) {
          if (fallback['data'] is List) {
            list = fallback['data'] as List<dynamic>;
          } else if (fallback['items'] is List) {
            list = fallback['items'] as List<dynamic>;
          }
        }
      }

      if (list.isNotEmpty) {
        _cachedVehicleCategories = List<Map<String, dynamic>>.from(
          list.whereType<Map>().map((item) => Map<String, dynamic>.from(item)),
        );
        _lastVehicleCategoriesFetchTime = now;
        return _cachedVehicleCategories!;
      }
    } catch (_) {}

    return _cachedVehicleCategories ?? [];
  }

  /// Submit an operational issue or support ticket to admin
  Future<dynamic> submitSupportQuery({
    required String category,
    required String subject,
    required String description,
    String? tripId,
    String priority = 'NORMAL',
    String? contactPerson,
    String? contactPhone,
    String? contactEmail,
  }) async {
    final user = AuthService.instance.currentUser;
    final driverName = user?.fullName ?? contactPerson ?? 'Driver';
    final phone = user?.phone ?? contactPhone ?? '';
    final email = user?.email ?? contactEmail ?? 'driver@adhocx.com';

    return await _api.post(
      '/disputes/support-query',
      body: {
        'category': category,
        'subject': subject,
        'description': description,
        if (tripId != null && tripId.isNotEmpty) 'tripId': tripId,
        'priority': priority,
        'companyName': 'AdhocX Driver',
        'contactPerson': driverName,
        'contactPhone': phone,
        'contactEmail': email,
      },
    );
  }

  /// Fetch support queries and reported issues filed by this driver
  Future<List<dynamic>> getMySupportQueries() async {
    final res = await _api.get('/disputes/support-query/my');
    return res is List ? res : [];
  }

  // ── Driver payout ─────────────────────────────────────────────────────────
  /// The driver payout for a trip, offer or requirement, read only from driver-side fields the server
  /// sends (pricing snapshot, offer rate, trip earnings). Vendor amounts are never used or converted:
  /// when no driver amount is present this returns 0 and the UI shows '₹--'.
  static double resolveDriverPayout(Map<String, dynamic>? data) {
    if (data == null) return 0.0;

    double? asAmount(dynamic v) {
      if (v == null) return null;
      final val = (v is num) ? v.toDouble() : double.tryParse(v.toString());
      return (val != null && val > 0) ? val : null;
    }

    final snapshot = data['pricingSnapshot'];
    final candidates = [
      (snapshot is Map && snapshot['driverPayoutPaise'] is num) ? (snapshot['driverPayoutPaise'] as num) / 100 : null,
      (snapshot is Map) ? snapshot['driverPayoutRupees'] : null,
      data['driverPayoutPaise'] is num ? (data['driverPayoutPaise'] as num) / 100 : null,
      data['driverPayoutRupees'],
      data['driverEarnings'],
      data['driverRate'],
      data['totalDriverEarnings'],
      data['offeredRate'],
      data['offeredPrice'],
      data['payoutAmount'],
      data['driverPayout'],
      data['fare'],
    ];
    for (final c in candidates) {
      final val = asAmount(c);
      if (val != null) return val;
    }

    final req = data['requirement'];
    if (req is Map) {
      for (final c in [req['driverRate'], req['driverEarnings'], req['offeredRate']]) {
        final val = asAmount(c);
        if (val != null) return val;
      }
    }
    return 0.0;
  }

  /// Formatted driver payout string, e.g. '₹765' or '₹--'.
  static String resolveDriverPayoutFormatted(Map<String, dynamic>? data) {
    final amount = resolveDriverPayout(data);
    return amount > 0 ? '₹${amount.toStringAsFixed(0)}' : '₹--';
  }

  // ── Dedicated Corporate ETS Driver Operations (PRD 04 & 09) ────────────────
  /// Check if the driver has a live 60-second corporate route offer
  Future<dynamic> getCorporateActiveOffer() async {
    await _ensureDriverSession();
    return await _api.get('/corporate/dispatch/my-offer');
  }

  /// Pending corporate route offer for the authenticated driver (Redis live offer with a
  /// CorporateDriverOffer fallback). Used on app start / reconnect to restore the 60 s popup.
  /// Shape: `{hasActiveOffer, offer?: {routeId, remainingSeconds, offerExpiresAt, ...}}`.
  Future<dynamic> getCorporateDriverOffers() async {
    await _ensureDriverSession();
    return await _api.get('/corporate/dispatch/driver-offers', force: true);
  }

  /// Accept an active corporate route offer within the 60-second window.
  /// The server binds `driverId` to the authenticated driver (CorporateAccessGuard offer mode).
  Future<dynamic> acceptCorporateOffer(String routeId) async {
    await _ensureDriverSession();
    final res = await _api.post(
      '/corporate/dispatch/routes/$routeId/offers/accept',
      body: <String, dynamic>{},
    );
    _api.invalidateCache(prefix: '/corporate');
    return res;
  }

  /// Decline an active corporate route offer
  Future<dynamic> declineCorporateOffer(String routeId, {String? reason}) async {
    await _ensureDriverSession();
    final res = await _api.post(
      '/corporate/dispatch/routes/$routeId/offers/reject',
      body: {
        if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim(),
      },
    );
    _api.invalidateCache(prefix: '/corporate');
    return res;
  }

  /// Upcoming committed corporate duties (ASSIGNED / IN_TRANSIT routes) for the authenticated driver.
  Future<dynamic> getCorporateDuties() async {
    await _ensureDriverSession();
    return await _api.get('/corporate/dispatch/driver-duties', force: true);
  }

  /// All corporate routes assigned to the authenticated driver (latest 50, any status).
  Future<dynamic> getCorporateDriverRoutes() async {
    await _ensureDriverSession();
    return await _api.get('/corporate/trips/driver/routes', force: true);
  }

  /// Start driving toward pickup 1 (ASSIGNED -> IN_TRANSIT). The GPS fix is optional and only
  /// used by the server for the employees' ETA computation.
  Future<dynamic> startCorporateRoute(String routeId, {double? lat, double? lng}) async {
    await _ensureDriverSession();
    final res = await _api.post(
      '/corporate/trips/routes/$routeId/start',
      body: {
        if (lat != null && lng != null) 'driverLatitude': lat,
        if (lat != null && lng != null) 'driverLongitude': lng,
      },
    );
    _api.invalidateCache(prefix: '/corporate');
    return res;
  }

  /// Live GPS telemetry for an active corporate route (DRV-11).
  Future<dynamic> postCorporateTelemetry(String routeId, Map<String, dynamic> fix) async {
    return await _api.post('/corporate/trips/routes/$routeId/telemetry', body: fix);
  }

  /// Corporate commute earnings summary (paise strings) with payout split and TDS estimate.
  Future<dynamic> getCorporateEarningsSummary(String driverId) async {
    await _ensureDriverSession();
    return await _api.get('/corporate/billing/drivers/$driverId/earnings', force: true);
  }

  /// Get the active assigned corporate route with all ordered stops and dwell timers
  Future<dynamic> getCorporateActiveRoute() async {
    await _ensureDriverSession();
    return await _api.get('/corporate/trips/driver/active-route');
  }

  /// Mark driver arrival at a corporate pickup stop (<150m geofence), triggering 5-minute dwell timer
  Future<dynamic> arriveCorporateStop(
    String routeId,
    String stopId, {
    required double lat,
    required double lng,
  }) async {
    await _ensureDriverSession();
    final res = await _api.post(
      '/corporate/trips/routes/$routeId/stops/$stopId/arrive',
      body: {
        'driverLatitude': lat,
        'driverLongitude': lng,
      },
    );
    notifyTripChanged(tripId: routeId, status: 'ARRIVED');
    return res;
  }

  /// Verify 4-digit boarding OTP presented by commuter
  Future<dynamic> verifyCorporateBoardingOtp(
    String routeId,
    String stopId,
    String otpCode,
  ) async {
    await _ensureDriverSession();
    final res = await _api.post(
      '/corporate/trips/routes/$routeId/stops/$stopId/verify-otp',
      body: {'otpCode': otpCode},
    );
    notifyTripChanged(tripId: routeId, status: 'BOARDED');
    return res;
  }

  /// Mark employee absent / no-show after 5-minute wait timer elapsed (server re-checks the 300 s window)
  Future<dynamic> markCorporateNoShow(
    String routeId,
    String stopId, {
    String? reason,
    double? lat,
    double? lng,
  }) async {
    await _ensureDriverSession();
    final res = await _api.post(
      '/corporate/trips/routes/$routeId/stops/$stopId/no-show',
      body: {
        if (reason != null) 'reason': reason,
        if (lat != null && lng != null) 'driverLatitude': lat,
        if (lat != null && lng != null) 'driverLongitude': lng,
      },
    );
    notifyTripChanged(tripId: routeId, status: 'NO_SHOW');
    return res;
  }

  /// Complete corporate route upon arrival at destination office hub
  Future<dynamic> completeCorporateRoute(String routeId) async {
    await _ensureDriverSession();
    final res = await _api.post('/corporate/trips/routes/$routeId/complete');
    notifyTripChanged(tripId: routeId, status: 'COMPLETED');
    return res;
  }

  /// Driver records passenger dropped at destination geofence (<150m)
  Future<dynamic> dropCorporatePassenger(
    String routeId,
    String stopId, {
    required double lat,
    required double lng,
  }) async {
    await _ensureDriverSession();
    final res = await _api.post(
      '/corporate/trips/routes/$routeId/stops/$stopId/drop',
      body: {
        'driverLatitude': lat,
        'driverLongitude': lng,
      },
    );
    notifyTripChanged(tripId: routeId, status: 'DROPPED');
    return res;
  }

  /// Driver confirms female safe drop / night-shift logout escort
  Future<dynamic> confirmCorporateSafeDrop(
    String routeId,
    String stopId, {
    String? notes,
  }) async {
    await _ensureDriverSession();
    final res = await _api.post(
      '/corporate/safety/routes/$routeId/stops/$stopId/confirm-safe-drop',
      body: {
        'confirmedByRole': 'DRIVER',
        if (notes != null) 'notes': notes,
      },
    );
    notifyTripChanged(tripId: routeId, status: 'SAFE_CONFIRMED');
    return res;
  }

  /// Get ordered waypoints and corridor polyline for navigation
  Future<dynamic> getCorporateRouteWaypoints(String routeId) async {
    await _ensureDriverSession();
    return await _api.get('/corporate/trips/routes/$routeId/waypoints');
  }

  /// Trigger emergency SOS distress alert directly to Command Centre.
  /// Body follows TriggerSosAlertDto: routeId, stopId?, latitude, longitude, batteryPct?, triggerReason?.
  Future<dynamic> triggerCorporateSos(
    String routeId, {
    required double lat,
    required double lng,
    String? stopId,
    int? batteryPct,
    String? note,
  }) async {
    await _ensureDriverSession();
    return await _api.post(
      '/corporate/safety/sos',
      body: {
        'routeId': routeId,
        'latitude': lat,
        'longitude': lng,
        if (stopId != null) 'stopId': stopId,
        if (batteryPct != null) 'batteryPct': batteryPct,
        if (note != null && note.trim().isNotEmpty) 'triggerReason': note.trim(),
      },
    );
  }
}
