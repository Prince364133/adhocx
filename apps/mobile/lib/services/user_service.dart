import '../core/networking/api_client.dart';
import 'auth_service.dart';

class UserService {
  static UserService? _instance;
  static UserService get instance => _instance ??= UserService._();

  UserService._();

  final ApiClient _api = ApiClient.instance;

  Future<void> _ensureSession() async {
    try {
      await AuthService.instance.ensureVendorSession();
    } catch (_) {}
  }

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
    int? requiredQuantity,
    DateTime? scheduledPickupTime,
    String? couponCode,
  }) async {
    await _ensureSession();
    final effectiveQuantity = requiredQuantity ?? quantity;
    final effectiveReportingTime = scheduledPickupTime ?? reportingTime;
    final effectiveBudget = ratePerVehicle ?? budgetPerVehicle ?? suggestedBudget;
    final combinedNotes = [
      if (title != null && title.isNotEmpty) title,
      if (notes != null && notes.isNotEmpty) notes,
      if (specialInstructions != null && specialInstructions.isNotEmpty) 'Special Instructions: $specialInstructions',
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
        if (couponCode != null && couponCode.isNotEmpty) 'couponCode': couponCode,
      },
    );
  }

  Future<List<dynamic>> getRequirements({String? status}) async {
    await _ensureSession();
    final query = status != null ? {'status': status} : null;
    final response = await _api.get('/requirements', queryParameters: query);
    if (response is Map && response['items'] is List) {
      return response['items'] as List<dynamic>;
    }
    return response is List ? response : [];
  }

  Future<dynamic> getRequirement(String id) async {
    await _ensureSession();
    return await _api.get('/requirements/$id');
  }

  Future<dynamic> cancelRequirement(String id, {String? reason}) async {
    await _ensureSession();
    return await _api.post(
      '/requirements/$id/cancel',
      body: reason != null ? {'reason': reason} : null,
    );
  }

  // Bidding Flow for Requester
  Future<List<dynamic>> getBids(String requirementId) async {
    await _ensureSession();
    final response = await _api.get('/bids/requirement/$requirementId');
    return response is List ? response : [];
  }

  Future<dynamic> acceptBid(String bidId) async {
    await _ensureSession();
    return await _api.post('/bids/$bidId/accept');
  }

  // Reviews & Ratings
  Future<dynamic> submitReview({
    required String tripId,
    required int rating,
    String? feedback,
  }) async {
    await _ensureSession();
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
    await _ensureSession();
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
    await _ensureSession();
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
    await _ensureSession();
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

  Future<Map<String, dynamic>> createWalletTopUpOrder(double amount, {String? couponCode}) async {
    await _ensureSession();
    final response = await _api.post(
      '/payments/wallet/top-up/create-order',
      body: {
        'amount': amount,
        if (couponCode != null && couponCode.isNotEmpty) 'couponCode': couponCode,
      },
    );
    if (response is Map<String, dynamic>) return response;
    if (response is Map) return Map<String, dynamic>.from(response);
    return {'orderId': 'order_mock', 'amount': amount, 'currency': 'INR', 'keyId': 'rzp_test'};
  }

  Future<Map<String, dynamic>> createTopUpOrder(double amount, {String? couponCode}) =>
      createWalletTopUpOrder(amount, couponCode: couponCode);

  Future<dynamic> verifyWalletTopUp({
    required String razorpayOrderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
    required double amount,
    String? couponCode,
  }) async {
    await _ensureSession();
    return await _api.post(
      '/payments/wallet/top-up/verify',
      body: {
        'razorpayOrderId': razorpayOrderId,
        'razorpayPaymentId': razorpayPaymentId,
        'razorpaySignature': razorpaySignature,
        'amount': amount,
        if (couponCode != null && couponCode.isNotEmpty) 'couponCode': couponCode,
      },
    );
  }

  Future<dynamic> verifyTopUp({
    required String razorpayOrderId,
    required String razorpayPaymentId,
    required String razorpaySignature,
    required double amount,
    String? couponCode,
  }) => verifyWalletTopUp(
    razorpayOrderId: razorpayOrderId,
    razorpayPaymentId: razorpayPaymentId,
    razorpaySignature: razorpaySignature,
    amount: amount,
    couponCode: couponCode,
  );

  // Promotional Coupons & Discounts
  Future<Map<String, dynamic>> validateCoupon({
    required String code,
    required double amount,
    String context = 'ALL',
  }) async {
    await _ensureSession();
    final response = await _api.post(
      '/coupons/validate',
      body: {
        'code': code.trim().toUpperCase(),
        'amount': amount,
        'context': context,
      },
    );
    if (response is Map<String, dynamic>) return response;
    if (response is Map) return Map<String, dynamic>.from(response);
    return {'valid': false, 'message': 'Unknown response'};
  }

  Future<List<dynamic>> getAvailableCoupons({String? context}) async {
    await _ensureSession();
    final query = context != null ? {'context': context} : null;
    final response = await _api.get('/coupons/available', queryParameters: query);
    return response is List ? response : [];
  }

  Future<List<dynamic>> getWalletTransactions() async {
    await _ensureSession();
    final response = await _api.get('/payments/wallet/transactions');
    return response is List ? response : [];
  }

  // Booker / User Trips
  Future<List<dynamic>> getTrips({String? status}) async {
    await _ensureSession();
    final query = status != null ? {'status': status} : null;
    final response = await _api.get('/trips', queryParameters: query);
    return response is List ? response : [];
  }

  Future<dynamic> getTrip(String tripId) async {
    await _ensureSession();
    return await _api.get('/trips/$tripId');
  }

  Future<dynamic> cancelTrip(String tripId, {String? reason}) async {
    await _ensureSession();
    return await _api.post(
      '/trips/$tripId/cancel',
      body: reason != null ? {'reason': reason} : null,
    );
  }
}

typedef VendorService = UserService;


