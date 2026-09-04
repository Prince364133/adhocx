import '../core/networking/api_client.dart';

class UserService {
  static UserService? _instance;
  static UserService get instance => _instance ??= UserService._();

  UserService._();

  final ApiClient _api = ApiClient.instance;

  Future<dynamic> createRequirement({
    required String vehicleType,
    required int quantity,
    required String pickupAddress,
    required double pickupLat,
    required double pickupLng,
    required String dropAddress,
    required double dropLat,
    required double dropLng,
    required DateTime reportingTime,
    String fulfillmentMode = 'DIRECT_DISPATCH',
    double? ratePerVehicle,
    double? suggestedBudget,
    String? specialInstructions,
  }) async {
    return await _api.post(
      '/requirements',
      body: {
        'vehicleType': vehicleType,
        'quantity': quantity,
        'pickupLocation': {
          'latitude': pickupLat,
          'longitude': pickupLng,
          'address': pickupAddress,
        },
        'dropLocation': {
          'latitude': dropLat,
          'longitude': dropLng,
          'address': dropAddress,
        },
        'reportingTime': reportingTime.toIso8601String(),
        'fulfillmentMode': fulfillmentMode,
        if (ratePerVehicle != null) 'ratePerVehicle': ratePerVehicle,
        if (suggestedBudget != null) 'suggestedBudget': suggestedBudget,
        if (specialInstructions != null) 'notes': specialInstructions,
      },
    );
  }

  Future<List<dynamic>> getRequirements({String? status}) async {
    final query = status != null ? {'status': status} : null;
    final response = await _api.get('/requirements', queryParameters: query);
    if (response is Map && response['items'] is List) {
      return response['items'] as List<dynamic>;
    }
    return response is List ? response : [];
  }

  Future<dynamic> getRequirement(String id) async {
    return await _api.get('/requirements/$id');
  }

  Future<dynamic> cancelRequirement(String id, {String? reason}) async {
    return await _api.post(
      '/requirements/$id/cancel',
      body: reason != null ? {'reason': reason} : null,
    );
  }

  // Bidding Flow for Requester
  Future<List<dynamic>> getBids(String requirementId) async {
    final response = await _api.get('/bids/requirement/$requirementId');
    return response is List ? response : [];
  }

  Future<dynamic> acceptBid(String bidId) async {
    return await _api.post('/bids/$bidId/accept');
  }

  // Reviews & Ratings
  Future<dynamic> submitReview({
    required String tripId,
    required int rating,
    String? feedback,
  }) async {
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
    return await _api.post(
      '/disputes',
      body: {
        'tripId': tripId,
        'reason': reason,
        if (description != null) 'description': description,
      },
    );
  }

  Future<dynamic> initiatePayment({
    required String requirementId,
    required double amount,
    String paymentMethod = 'ONLINE_UPI',
  }) async {
    return await _api.post(
      '/payments/initiate',
      body: {
        'requirementId': requirementId,
        'amount': amount,
        'paymentMethod': paymentMethod,
      },
    );
  }
}

typedef VendorService = UserService;
