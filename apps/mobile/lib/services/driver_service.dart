import '../core/networking/api_client.dart';
import 'auth_service.dart';

class DriverService {
  static DriverService? _instance;
  static DriverService get instance => _instance ??= DriverService._();

  DriverService._();

  final ApiClient _api = ApiClient.instance;

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
    }
    if (all || profile) {
      _cachedProfile = null;
      _lastProfileFetchTime = null;
      _cachedTrustScore = null;
      _lastTrustScoreFetchTime = null;
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
    String? dlFrontUrl,
    String? dlBackUrl,
    String? rcDocUrl,
    String? insuranceDocUrl,
    String? vehiclePhotoUrl,
    String? aadharFrontUrl,
    String? aadharBackUrl,
    String? panDocUrl,
  }) async {
    await _ensureDriverSession();
    return await _api.post(
      '/drivers/kyc',
      body: {
        'licenseNumber': licenseNumber,
        'licenseExpiry': licenseExpiry.toIso8601String(),
        'documentUrls': documentUrls,
        'vehicle': vehicleDetails,
        if (dlFrontUrl != null) 'dlFrontUrl': dlFrontUrl,
        if (dlBackUrl != null) 'dlBackUrl': dlBackUrl,
        if (rcDocUrl != null) 'rcDocUrl': rcDocUrl,
        if (insuranceDocUrl != null) 'insuranceDocUrl': insuranceDocUrl,
        if (vehiclePhotoUrl != null) 'vehiclePhotoUrl': vehiclePhotoUrl,
        if (aadharFrontUrl != null) 'aadharFrontUrl': aadharFrontUrl,
        if (aadharBackUrl != null) 'aadharBackUrl': aadharBackUrl,
        if (panDocUrl != null) 'panDocUrl': panDocUrl,
      },
    );
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
    invalidateCache(trips: true);
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
    invalidateCache(trips: true);
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
    invalidateCache(trips: true);
    return res;
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

  Future<dynamic> requestWithdrawal({
    required double amount,
    required String bankAccountName,
    required String bankAccountNumber,
    required String bankIfsc,
  }) async {
    await _ensureDriverSession();
    final res = await _api.post(
      '/settlements/withdraw',
      body: {
        'amount': amount,
        'bankAccountName': bankAccountName,
        'bankAccountNumber': bankAccountNumber,
        'bankIfsc': bankIfsc,
      },
    );
    invalidateCache(trips: true);
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
}

