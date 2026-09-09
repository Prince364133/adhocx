import '../core/networking/api_client.dart';
import 'auth_service.dart';

class DriverService {
  static DriverService? _instance;
  static DriverService get instance => _instance ??= DriverService._();

  DriverService._();

  final ApiClient _api = ApiClient.instance;

  Future<void> _ensureDriverSession() async {
    try {
      await AuthService.instance.ensureDriverSession();
    } catch (_) {}
  }

  // Profile & Availability
  Future<dynamic> getProfile() async {
    await _ensureDriverSession();
    return await _api.get('/drivers/profile');
  }

  Future<dynamic> updateAvailability(String availabilityStatus, {double? lat, double? lng}) async {
    await _ensureDriverSession();
    return await _api.patch(
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
  }


  // KYC Document Upload (Cloudflare R2 Integration)
  Future<dynamic> uploadKycDocument({
    String documentType = 'GENERAL',
    required List<int> fileBytes,
    String? fileName,
    String? filename,
    String mimeType = 'image/jpeg',
  }) async {
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
  }) async {
    return await _api.post(
      '/drivers/kyc',
      body: {
        'licenseNumber': licenseNumber,
        'licenseExpiry': licenseExpiry.toIso8601String(),
        'documentUrls': documentUrls,
        'vehicle': vehicleDetails,
      },
    );
  }

  // Offers (Direct Dispatch Mode)
  Future<List<dynamic>> getOffers() async {
    await _ensureDriverSession();
    final response = await _api.get('/offers');
    return response is List ? response : [];
  }

  Future<dynamic> acceptOffer(String offerId) async {
    await _ensureDriverSession();
    return await _api.post('/offers/$offerId/accept');
  }

  Future<dynamic> declineOffer(String offerId, {String? reason}) async {
    await _ensureDriverSession();
    return await _api.post(
      '/offers/$offerId/decline',
      body: reason != null ? {'reason': reason} : null,
    );
  }

  // Bidding (Outstation Reverse Auction Mode)
  Future<List<dynamic>> getBiddingOpportunities() async {
    await _ensureDriverSession();
    final response = await _api.get('/bids/open-opportunities');
    return response is List ? response : [];
  }

  Future<dynamic> submitBid({
    required String requirementId,
    required double bidAmount,
    int? etaMinutes,
    String? notes,
  }) async {
    await _ensureDriverSession();
    return await _api.post(
      '/bids',
      body: {
        'requirementId': requirementId,
        'bidAmount': bidAmount,
        if (etaMinutes != null) 'etaMinutes': etaMinutes,
        if (notes != null) 'notes': notes,
      },
    );
  }

  Future<List<dynamic>> getMyBids({String? status}) async {
    await _ensureDriverSession();
    final query = status != null ? {'status': status} : null;
    final response = await _api.get('/bids', queryParameters: query);
    return response is List ? response : [];
  }

  Future<dynamic> withdrawBid(String bidId) async {
    await _ensureDriverSession();
    return await _api.post('/bids/$bidId/withdraw');
  }

  // Trip Lifecycle
  Future<List<dynamic>> getTrips({String? status}) async {
    await _ensureDriverSession();
    final query = status != null ? {'status': status} : null;
    final response = await _api.get('/trips', queryParameters: query);
    return response is List ? response : [];
  }

  Future<dynamic> markArrived(String tripId) async {
    await _ensureDriverSession();
    return await _api.post('/trips/$tripId/arrive');
  }

  Future<dynamic> startTrip(
    String tripId,
    String otp, {
    double? lat,
    double? lng,
  }) async {
    await _ensureDriverSession();
    return await _api.post(
      '/trips/$tripId/start',
      body: {
        'otp': otp,
        'currentLocation': {
          'latitude': lat ?? 28.6139,
          'longitude': lng ?? 77.2090,
        },
      },
    );
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
    return await _api.post(
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

  // Wallet & Settlements
  Future<dynamic> getWalletSummary() async {
    await _ensureDriverSession();
    return await _api.get('/settlements/wallet');
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
    return await _api.post(
      '/settlements/withdraw',
      body: {
        'amount': amount,
        'bankAccountName': bankAccountName,
        'bankAccountNumber': bankAccountNumber,
        'bankIfsc': bankIfsc,
      },
    );
  }
}

