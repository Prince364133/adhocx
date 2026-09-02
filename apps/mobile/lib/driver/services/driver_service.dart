import '../../core/networking/api_client.dart';

class DriverService {
  static DriverService? _instance;
  static DriverService get instance => _instance ??= DriverService._();

  DriverService._();

  final ApiClient _api = ApiClient.instance;

  // Profile & Availability
  Future<dynamic> getProfile() async {
    return await _api.get('/drivers/profile');
  }

  Future<dynamic> updateAvailability(String availabilityStatus) async {
    return await _api.patch(
      '/drivers/availability',
      body: {'availabilityStatus': availabilityStatus},
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

  // Offers
  Future<List<dynamic>> getOffers() async {
    final response = await _api.get('/offers');
    return response is List ? response : [];
  }

  Future<dynamic> acceptOffer(String offerId) async {
    return await _api.post('/offers/$offerId/accept');
  }

  Future<dynamic> declineOffer(String offerId, {String? reason}) async {
    return await _api.post(
      '/offers/$offerId/decline',
      body: reason != null ? {'reason': reason} : null,
    );
  }

  // Trip Lifecycle
  Future<List<dynamic>> getTrips({String? status}) async {
    final query = status != null ? {'status': status} : null;
    final response = await _api.get('/trips', queryParameters: query);
    return response is List ? response : [];
  }

  Future<dynamic> markArrived(String tripId) async {
    return await _api.post('/trips/$tripId/arrive');
  }

  Future<dynamic> startTrip(
    String tripId,
    String otp, {
    double? lat,
    double? lng,
  }) async {
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

  // Wallet & Settlements
  Future<dynamic> getWalletSummary() async {
    return await _api.get('/driver/wallet');
  }

  Future<dynamic> requestWithdrawal({
    required double amount,
    required String bankAccountName,
    required String bankAccountNumber,
    required String bankIfsc,
  }) async {
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
