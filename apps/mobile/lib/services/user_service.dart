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
    bool? isScheduled,
    String? couponCode,
    String? quoteId,
  }) async {
    await _ensureSession();
    final effectiveQuoteId = quoteId;
    final effectiveQuantity = requiredQuantity ?? quantity;
    final effectiveReportingTime = (isScheduled == false) ? DateTime.now() : (scheduledPickupTime ?? reportingTime);
    final effectiveIsScheduled = (isScheduled == false) ? false : (isScheduled ?? (scheduledPickupTime != null || effectiveReportingTime.isAfter(DateTime.now().add(const Duration(minutes: 5)))));
    // Distance-based quotes are priced server-side from the stored quote; never send a client amount.
    final effectiveBudget = effectiveQuoteId != null ? null : (ratePerVehicle ?? budgetPerVehicle ?? suggestedBudget);
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
        'reportingTime': effectiveReportingTime.toUtc().toIso8601String(),
        'fulfillmentMode': fulfillmentMode,
        'isScheduled': effectiveIsScheduled,
        if (effectiveBudget != null) 'ratePerVehicle': effectiveBudget,
        if (suggestedBudget != null) 'suggestedBudget': suggestedBudget,
        if (combinedNotes.isNotEmpty) 'notes': combinedNotes,
        if (couponCode != null && couponCode.isNotEmpty) 'couponCode': couponCode,
        if (effectiveQuoteId != null) 'quoteId': effectiveQuoteId,
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

  Future<dynamic> retryRequirement(String id) async {
    await _ensureSession();
    return await _api.post('/requirements/$id/retry');
  }

  // Reviews & Ratings
  Future<Map<String, dynamic>?> getPendingReview() async {
    await _ensureSession();
    try {
      final res = await _api.get('/trips/pending-review');
      if (res is Map<String, dynamic> && res['pending'] == true && res['trip'] != null) {
        return res['trip'] as Map<String, dynamic>;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

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
      'walletBalance': 0.0,
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
    throw Exception('Failed to generate payment order from server');
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

  /// Record payment cancellation or failure on ledger for full financial auditability
  Future<dynamic> recordTopUpStatus({
    required String orderId,
    required double amount,
    required String status,
    String? reason,
  }) async {
    await _ensureSession();
    return await _api.post(
      '/payments/wallet/top-up/record-status',
      body: {
        'orderId': orderId,
        'amount': amount,
        'status': status,
        if (reason != null && reason.isNotEmpty) 'reason': reason,
      },
    );
  }

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
    try {
      final query = status != null ? {'status': status} : null;
      final response = await _api.get('/trips', queryParameters: query);
      if (response is List) return response;
      if (response is Map) {
        if (response['items'] is List) return response['items'] as List<dynamic>;
        if (response['data'] is List) return response['data'] as List<dynamic>;
        if (response['trips'] is List) return response['trips'] as List<dynamic>;
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  Future<dynamic> getTrip(String tripId) async {
    await _ensureSession();
    return await _api.get('/trips/$tripId');
  }

  Future<List<dynamic>> getTripMessages(String tripId) async {
    await _ensureSession();
    final res = await _api.get('/trips/$tripId/messages', force: true);
    if (res is List) return res;
    if (res is Map && res['data'] is List) return res['data'] as List<dynamic>;
    return [];
  }

  Future<dynamic> sendTripMessage(String tripId, String text) async {
    await _ensureSession();
    return await _api.post('/trips/$tripId/messages', body: {'text': text});
  }

  Future<dynamic> cancelTrip(String tripId, {String? reason}) async {
    await _ensureSession();
    return await _api.post(
      '/trips/$tripId/cancel',
      body: reason != null ? {'reason': reason} : null,
    );
  }

  // Vendor / Booker Profile
  Future<dynamic> getVendorProfile({bool forceRefresh = false}) async {
    await _ensureSession();
    return await _api.get('/vendors/profile', force: forceRefresh);
  }

  Future<dynamic> updateVendorProfile(Map<String, dynamic> data) async {
    await _ensureSession();
    final res = await _api.post('/vendors/profile', body: data);
    // Refresh user cached profile if available
    try {
      await AuthService.instance.fetchCurrentUser(forceRefresh: true);
    } catch (_) {}
    return res;
  }

  // Notification Preferences
  Future<Map<String, dynamic>> getNotificationPreferences() async {
    await _ensureSession();
    final res = await _api.get('/notifications/preferences');
    if (res is Map<String, dynamic>) return res;
    if (res is Map) return Map<String, dynamic>.from(res);
    return {};
  }

  Future<dynamic> updateNotificationPreferences(Map<String, dynamic> preferences) async {
    await _ensureSession();
    return await _api.patch('/notifications/preferences', body: preferences);
  }

  // Support Center & Inquiry Tickets
  Future<dynamic> submitSupportQuery({
    required String category,
    required String subject,
    required String description,
    String? tripId,
    String priority = 'NORMAL',
    String? companyName,
    String? contactPerson,
    String? contactPhone,
    String? contactEmail,
  }) async {
    await _ensureSession();
    return await _api.post(
      '/disputes/support-query',
      body: {
        'category': category,
        'subject': subject,
        'description': description,
        if (tripId != null && tripId.isNotEmpty) 'tripId': tripId,
        'priority': priority,
        if (companyName != null && companyName.isNotEmpty) 'companyName': companyName,
        if (contactPerson != null && contactPerson.isNotEmpty) 'contactPerson': contactPerson,
        if (contactPhone != null && contactPhone.isNotEmpty) 'contactPhone': contactPhone,
        if (contactEmail != null && contactEmail.isNotEmpty) 'contactEmail': contactEmail,
      },
    );
  }

  Future<List<dynamic>> getMySupportQueries() async {
    await _ensureSession();
    final res = await _api.get('/disputes/support-query/my');
    return res is List ? res : [];
  }

  // Dispute / Support Tickets
  Future<List<dynamic>> getMyDisputes() async {
    await _ensureSession();
    final response = await _api.get('/disputes/my');
    return response is List ? response : [];
  }

  Future<dynamic> getDispute(String id) async {
    await _ensureSession();
    return await _api.get('/disputes/$id');
  }

  Future<dynamic> createDispute({
    required String tripId,
    required String reason,
    required String description,
  }) async {
    await _ensureSession();
    return await _api.post(
      '/disputes',
      body: {
        'tripId': tripId,
        'reason': reason,
        'description': description,
      },
    );
  }

  // Emergency Safety SOS
  Future<dynamic> triggerSos(String tripId, {double? lat, double? lng, String? note}) async {
    await _ensureSession();
    return await _api.post(
      '/trips/$tripId/sos',
      body: {
        if (lat != null) 'latitude': lat,
        if (lng != null) 'longitude': lng,
        if (note != null) 'note': note,
      },
    );
  }

  // ── Distance pricing ──────────────────────────────────────────────────────
  // Every price comes from the server's active distance plan. The app never computes or guesses one:
  // when the server cannot price a trip (no route, no active plan) the error is shown and booking waits.

  /// Vendor rate card (charges only) for a vehicle category. Throws [ApiException] when no plan is active.
  Future<Map<String, dynamic>> getVendorRateCard({String vehicleCategory = 'ALL', bool forceRefresh = false}) async {
    await _ensureSession();
    final res = await _api.get(
      '/vendor/pricing/rate-card',
      queryParameters: {'vehicleCategory': vehicleCategory.trim().toUpperCase()},
      force: forceRefresh,
    );
    return res is Map<String, dynamic> ? res : <String, dynamic>{};
  }

  /// Server quote for one vehicle on a route. The returned `quoteId` must be sent when booking;
  /// the booked price is the quoted price.
  Future<Map<String, dynamic>> createDistanceTripQuote({
    required double pickupLat,
    required double pickupLng,
    required String pickupAddress,
    required double dropLat,
    required double dropLng,
    required String dropAddress,
    required String vehicleCategory,
    bool pickupIsOffice = false,
    bool dropIsOffice = false,
  }) async {
    await _ensureSession();
    final pData = {
      'latitude': pickupLat,
      'longitude': pickupLng,
      'address': pickupAddress,
      if (pickupIsOffice) 'isOffice': true,
    };
    final dData = {
      'latitude': dropLat,
      'longitude': dropLng,
      'address': dropAddress,
      if (dropIsOffice) 'isOffice': true,
    };
    final res = await _api.post(
      '/vendor/trip-quotes',
      body: {
        'pickup': pData,
        'drop': dData,
        'pickupLocation': pData,
        'dropLocation': dData,
        'vehicleCategory': vehicleCategory.trim().toUpperCase(),
      },
    );
    if (res is Map) {
      final map = Map<String, dynamic>.from(res);
      final dataMap = map['data'] is Map ? Map<String, dynamic>.from(map['data'] as Map) : map;
      final vendorRupees = (dataMap['vendorPriceRupees'] as num?)?.toDouble() ??
          ((dataMap['vendorPricePaise'] as num?) != null
              ? (dataMap['vendorPricePaise'] as num) / 100.0
              : (dataMap['totalAmount'] as num?)?.toDouble());
      return {
        ...dataMap,
        if (vendorRupees != null) 'totalAmount': vendorRupees,
        if (vendorRupees != null && dataMap['vendorPriceRupees'] == null) 'vendorPriceRupees': vendorRupees,
      };
    }
    return <String, dynamic>{};
  }

  /// Vehicle category catalogue (names and seating; no prices).
  Future<List<Map<String, dynamic>>> getPricingTiers({bool forceRefresh = false}) async {
    try {
      final dynamic res = await _api.get('/pricing/tiers', force: forceRefresh);
      List<dynamic> list = [];
      if (res is List) {
        list = res;
      } else if (res is Map) {
        if (res['data'] is List) {
          list = res['data'] as List<dynamic>;
        } else if (res['items'] is List) {
          list = res['items'] as List<dynamic>;
        }
      }
      return List<Map<String, dynamic>>.from(
        list.whereType<Map>().map((item) => Map<String, dynamic>.from(item)),
      );
    } catch (_) {
      return [];
    }
  }

  // ── Dedicated Corporate ETS Employee Operations (PRD 01 & 08) ─────────────
  /// Returns immediate next upcoming corporate trip card with driver and OTP challenge (EMP-02-01)
  Future<dynamic> getCorporateNextTrip() async {
    return await _api.get('/corporate/trips/me/next-trip');
  }

  /// Returns approved shift rosters calendar (EMP-03-01)
  Future<dynamic> getCorporateSchedule() async {
    return await _api.get('/corporate/trips/me/schedule');
  }

  /// Returns completed corporate commute history (EMP-08-02)
  Future<dynamic> getCorporateTripHistory() async {
    return await _api.get('/corporate/trips/me/trips');
  }

  /// Request shift reschedule or cancellation subject to the 9-hour cutoff rule (UI-03-03)
  Future<dynamic> rescheduleCorporateShift(
    String requestId, {
    required String action,
    String? employeeId,
    String? newShiftTime,
    String? newShiftDate,
  }) async {
    final effectiveEmpId = employeeId ?? AuthService.instance.currentUser?.id ?? '';
    return await _api.post(
      '/corporate/trips/requests/$requestId/reschedule',
      body: {
        'employeeId': effectiveEmpId,
        'action': action,
        if (newShiftTime != null) 'newShiftTime': newShiftTime,
        if (newShiftDate != null) 'newShiftDate': newShiftDate,
      },
    );
  }

  /// Generate dynamic time-limited QR boarding token
  Future<dynamic> getCorporateBoardingQr(String routeId, String stopId) async {
    return await _api.get('/corporate/trips/routes/$routeId/stops/$stopId/boarding-qr');
  }

  /// Trigger emergency SOS distress alert from employee mobile app
  Future<dynamic> triggerCorporateSos(
    String routeId, {
    required double lat,
    required double lng,
    String? note,
  }) async {
    return await _api.post(
      '/corporate/safety/sos',
      body: {
        'routeId': routeId,
        'currentLatitude': lat,
        'currentLongitude': lng,
        if (note != null) 'notes': note,
      },
    );
  }
}
