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
    double? budgetPerVehicle,
    String? specialInstructions,
    String? notes,
    String? title,
    String? description,
    int? requiredQuantity,
    DateTime? scheduledPickupTime,
  }) async {
    final effectiveQuantity = requiredQuantity ?? quantity;
    final effectiveReportingTime = scheduledPickupTime ?? reportingTime;
    final effectiveBudget = ratePerVehicle ?? budgetPerVehicle ?? suggestedBudget;
    final combinedNotes = [
      if (notes != null && notes.isNotEmpty) notes,
      if (specialInstructions != null && specialInstructions.isNotEmpty) 'Special Instructions: $specialInstructions',
      if (description != null && description.isNotEmpty) description,
    ].join(' | ');

    return await _api.post(
      '/requirements',
      body: {
        'vehicleType': vehicleType,
        'quantity': effectiveQuantity,
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
        'reportingTime': effectiveReportingTime.toIso8601String(),
        'fulfillmentMode': fulfillmentMode,
        if (effectiveBudget != null) 'ratePerVehicle': effectiveBudget,
        if (suggestedBudget != null) 'suggestedBudget': suggestedBudget,
        if (combinedNotes.isNotEmpty) 'notes': combinedNotes,
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

  Future<Map<String, dynamic>> getRequirementsSummary() async {
    final response = await _api.get('/requirements/summary');
    if (response is Map<String, dynamic>) {
      return response;
    }
    if (response is Map) {
      return Map<String, dynamic>.from(response);
    }
    return {
      'totalRequirements': 0,
      'totalVehiclesRequired': 0,
      'totalVehiclesFulfilled': 0,
      'assignedCount': 0,
      'searchingCount': 0,
      'completedCount': 0,
    };
  }

  // Universal Wallet & Razorpay Top-Up for Requester/Vendor
  Future<Map<String, dynamic>> getWalletSummary() async {
    final response = await _api.get('/payments/wallet');
    if (response is Map<String, dynamic>) return response;
    if (response is Map) return Map<String, dynamic>.from(response);
    return {
      'walletBalance': 25000.0,
      'escrowBalance': 0.0,
      'totalSpent': 0.0,
      'currency': 'INR',
    };
  }

  Future<Map<String, dynamic>> createWalletTopUpOrder(double amount) async {
    final response = await _api.post(
      '/payments/wallet/top-up/create-order',
      body: {'amount': amount},
    );
    if (response is Map<String, dynamic>) return response;
    if (response is Map) return Map<String, dynamic>.from(response);
    return {'orderId': 'order_mock', 'amount': amount, 'currency': 'INR', 'keyId': 'rzp_test'};
  }

  Future<dynamic> verifyWalletTopUp({
    required String razorpayOrderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
    required double amount,
  }) async {
    return await _api.post(
      '/payments/wallet/top-up/verify',
      body: {
        'razorpayOrderId': razorpayOrderId,
        'razorpayPaymentId': razorpayPaymentId,
        'razorpaySignature': razorpaySignature,
        'amount': amount,
      },
    );
  }

  Future<List<dynamic>> getWalletTransactions() async {
    final response = await _api.get('/payments/wallet/transactions');
    return response is List ? response : [];
  }

  // Booker / User Trips
  Future<List<dynamic>> getTrips({String? status}) async {
    final query = status != null ? {'status': status} : null;
    final response = await _api.get('/trips', queryParameters: query);
    return response is List ? response : [];
  }

  Future<dynamic> getTrip(String tripId) async {
    return await _api.get('/trips/$tripId');
  }

  Future<dynamic> cancelTrip(String tripId, {String? reason}) async {
    return await _api.post(
      '/trips/$tripId/cancel',
      body: reason != null ? {'reason': reason} : null,
    );
  }
}

typedef VendorService = UserService;

