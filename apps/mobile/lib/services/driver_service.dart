import 'dart:async';
import '../core/networking/api_client.dart';
import 'auth_service.dart';

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

  List<dynamic>? _cachedBiddingOps;
  DateTime? _lastBiddingFetchTime;

  final Map<String, List<dynamic>> _cachedTripsByStatus = {};
  final Map<String, DateTime> _lastTripsFetchTimeByStatus = {};

  dynamic _cachedProfile;
  DateTime? _lastProfileFetchTime;

  dynamic _cachedTrustScore;
  DateTime? _lastTrustScoreFetchTime;

  dynamic _cachedWallet;
  DateTime? _lastWalletFetchTime;

  void invalidateCache({bool all = false, bool offers = false, bool trips = false, bool bids = false, bool profile = false}) {
    if (all || offers) {
      _cachedOffers = null;
      _lastOffersFetchTime = null;
    }
    if (all || bids) {
      _cachedBiddingOps = null;
      _lastBiddingFetchTime = null;
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
    if (fullName != null || phone != null || email != null) {
      AuthService.instance.updateCurrentUser(
        fullName: fullName,
        phone: phone,
        email: email,
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

  Future<dynamic> updateAvailability(String availabilityStatus, {double? lat, double? lng}) async {
    await _ensureDriverSession();
    final result = await _api.patch(
      '/drivers/availability',
      body: {
        'status': availabilityStatus.toUpperCase(),
        if (lat != null && lng != null)
          'currentLocation': {
            'latitude': lat,
            'longitude': lng,
          },
      },
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
  Future<dynamic> submitKyc({
    required String licenseNumber,
    required DateTime licenseExpiry,
    required List<String> documentUrls,
    required Map<String, dynamic> vehicleDetails,
    String? phone,
    String? fullName,
    String? profilePhotoUrl,
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
  }) async {
    await _ensureDriverSession();
    final res = await _api.post(
      '/drivers/kyc',
      body: {
        'licenseNumber': licenseNumber,
        'licenseExpiry': licenseExpiry.toIso8601String(),
        'documentUrls': documentUrls,
        'vehicle': vehicleDetails,
        if (phone != null && phone.isNotEmpty) 'phone': phone,
        if (fullName != null && fullName.isNotEmpty) 'fullName': fullName,
        if (profilePhotoUrl != null && profilePhotoUrl.isNotEmpty) 'profilePhotoUrl': profilePhotoUrl,
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

  // Bidding (Outstation Reverse Auction Mode with 8s cache TTL)
  Future<List<dynamic>> getBiddingOpportunities({bool forceRefresh = false}) async {
    final now = DateTime.now();
    if (!forceRefresh &&
        _cachedBiddingOps != null &&
        _lastBiddingFetchTime != null &&
        now.difference(_lastBiddingFetchTime!).inSeconds < 8) {
      return _cachedBiddingOps!;
    }
    await _ensureDriverSession();
    final response = await _api.get('/bids/open-opportunities', force: forceRefresh);
    if (response is List) {
      _cachedBiddingOps = response;
      _lastBiddingFetchTime = now;
      return response;
    }
    return _cachedBiddingOps ?? [];
  }

  Future<dynamic> submitBid({
    required String requirementId,
    required double bidAmount,
    int? etaMinutes,
    String? notes,
  }) async {
    await _ensureDriverSession();
    final res = await _api.post(
      '/bids',
      body: {
        'requirementId': requirementId,
        'bidAmount': bidAmount,
        if (etaMinutes != null) 'etaMinutes': etaMinutes,
        if (notes != null) 'notes': notes,
      },
    );
    invalidateCache(bids: true);
    return res;
  }

  Future<List<dynamic>> getMyBids({String? status}) async {
    await _ensureDriverSession();
    final query = status != null ? {'status': status} : null;
    final response = await _api.get('/bids', queryParameters: query);
    return response is List ? response : [];
  }

  Future<dynamic> withdrawBid(String bidId) async {
    await _ensureDriverSession();
    final res = await _api.post('/bids/$bidId/withdraw');
    invalidateCache(bids: true);
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
    final res = await _api.post(
      '/trips/$tripId/start',
      body: {
        'otp': otp,
        'currentLocation': {
          'latitude': lat ?? 28.6139,
          'longitude': lng ?? 77.2090,
        },
      },
    );
    notifyTripChanged(tripId: tripId, status: 'IN_PROGRESS');
    return res;
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
      body: {
        'latitude': lat,
        'longitude': lng,
        if (speed != null) 'speed': speed,
        if (heading != null) 'heading': heading,
      },
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
    final res = await _api.post(
      '/trips/$tripId/complete',
      body: {
        'tollCharges': tollCharges ?? 0,
        'parkingCharges': parkingCharges ?? 0,
        'currentLocation': {
          'latitude': lat ?? 28.5355,
          'longitude': lng ?? 77.3910,
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

  Future<dynamic> getDriverZonalRateCard({bool forceRefresh = false}) async {
    try {
      return await _api.get('/pricing/zonal/driver-card', force: forceRefresh);
    } catch (_) {
      return null;
    }
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
      if (res is! List || res.isEmpty) {
        res = await _api.get('/pricing', force: forceRefresh);
      }
      if (res is List && res.isNotEmpty) {
        _cachedVehicleCategories = List<Map<String, dynamic>>.from(
          res.map((item) => Map<String, dynamic>.from(item as Map)),
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
}


