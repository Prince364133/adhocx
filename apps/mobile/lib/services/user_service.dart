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
    String? zonalQuoteId,
  }) async {
    await _ensureSession();
    final effectiveQuantity = requiredQuantity ?? quantity;
    final effectiveReportingTime = scheduledPickupTime ?? reportingTime;
    // Corporate zonal trips are priced server-side from the stored quote; never send a client amount.
    final effectiveBudget = zonalQuoteId != null ? null : (ratePerVehicle ?? budgetPerVehicle ?? suggestedBudget);
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
        if (zonalQuoteId != null) 'zonalQuoteId': zonalQuoteId,
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

  // Corporate zonal rate card (Hyderabad). Returns null when offline so screens can fall back.
  // ── Dedicated Pricing Service Methods ─────────────────────────────────────

  Map<String, dynamic>? _cachedVendorRateCard;
  Map<String, dynamic>? get cachedVendorRateCard => _cachedVendorRateCard;

  /// Corporate zonal rate card (Hyderabad). Caches in memory for instant synchronous lookup.
  Future<Map<String, dynamic>?> getVendorZonalRateCard({bool forceRefresh = false}) async {
    if (_cachedVendorRateCard != null && !forceRefresh) {
      return _cachedVendorRateCard;
    }
    try {
      final res = await _api.get('/pricing/zonal/vendor-card', force: forceRefresh);
      if (res is Map<String, dynamic>) {
        _cachedVendorRateCard = res;
        return res;
      }
      return _cachedVendorRateCard;
    } catch (_) {
      return _cachedVendorRateCard;
    }
  }

  /// Approved locality master; each result carries a stable `id`, `zoneId` and `bookable` flag.
  Future<List<Map<String, dynamic>>> searchZonalLocalities({String? query}) async {
    final res = await _api.get(
      '/pricing/zonal/localities',
      queryParameters: (query != null && query.trim().isNotEmpty) ? {'q': query.trim()} : null,
    );
    if (res is List) {
      return res.whereType<Map<String, dynamic>>().toList();
    }
    return [];
  }

  /// Creates a server-stored zonal quote. Throws [ApiException] with the server message on failure.
  /// A 200 response with `canAutoQuote: false` means the trip needs operations review.
  Future<Map<String, dynamic>> createZonalQuote({
    required String officeHubId,
    required String direction,
    required String localityId,
    required String vehicleType,
    required bool hasEscort,
    required double pickupLat,
    required double pickupLng,
    required double dropLat,
    required double dropLng,
  }) async {
    await _ensureSession();
    final res = await _api.post('/pricing/zonal/quote', body: {
      'officeHubId': officeHubId,
      'direction': direction,
      'localityId': localityId,
      'vehicleType': vehicleType,
      'hasEscort': hasEscort,
      'pickupLat': pickupLat,
      'pickupLng': pickupLng,
      'dropLat': dropLat,
      'dropLng': dropLng,
    });
    return res is Map<String, dynamic> ? res : <String, dynamic>{};
  }

  /// Live marketplace vehicle pricing tiers (Sedan, SUV, Hatchback, Bus, etc.)
  Future<List<Map<String, dynamic>>> getPricingTiers({bool forceRefresh = false}) async {
    try {
      dynamic res = await _api.get('/pricing/tiers', force: forceRefresh);
      if (res is! List || res.isEmpty) {
        res = await _api.get('/pricing', force: forceRefresh);
      }
      if (res is List && res.isNotEmpty) {
        return List<Map<String, dynamic>>.from(
          res.map((item) => Map<String, dynamic>.from(item as Map)),
        );
      }
    } catch (_) {}
    return [];
  }

  /// Dynamic trip fare quotation via backend PricingService (/pricing/calculate)
  Future<Map<String, dynamic>> calculateTripFare({
    required String vehicleType,
    double? distanceKm,
    int? durationMinutes,
    double? pickupLat,
    double? pickupLng,
    double? dropLat,
    double? dropLng,
    int quantity = 1,
  }) async {
    try {
      await _ensureSession();
      final body = <String, dynamic>{
        'vehicleType': vehicleType,
        if (distanceKm != null && distanceKm > 0) 'distanceKm': distanceKm,
        if (durationMinutes != null && durationMinutes > 0) 'durationMinutes': durationMinutes,
        if (pickupLat != null && pickupLat != 0.0 && pickupLng != null && pickupLng != 0.0)
          'pickupLocation': {'latitude': pickupLat, 'longitude': pickupLng},
        if (dropLat != null && dropLat != 0.0 && dropLng != null && dropLng != 0.0)
          'dropLocation': {'latitude': dropLat, 'longitude': dropLng},
        'quantity': quantity,
      };
      final res = await _api.post('/pricing/calculate', body: body);
      return res is Map<String, dynamic> ? res : <String, dynamic>{};
    } catch (_) {
      return <String, dynamic>{};
    }
  }

  /// Authoritative fare calculation engine that calls dedicated server services.
  /// Decides real rates on calculation without any hardcoded values in UI components.
  Future<double> calculateEstimatedFare({
    required String vehicleType,
    required String officeHubId,
    required String direction,
    Map<String, dynamic>? locality,
    bool hasEscort = false,
    double distanceKm = 0.0,
    int durationMinutes = 0,
    double pickupLat = 0.0,
    double pickupLng = 0.0,
    double dropLat = 0.0,
    double dropLng = 0.0,
    Map<String, dynamic>? existingQuote,
  }) async {
    // 1. If an active server quote already exists for this trip, return its exact total
    if (existingQuote != null && existingQuote['totalAmount'] != null) {
      final total = (existingQuote['totalAmount'] as num?)?.toDouble();
      if (total != null && total > 0) return total.roundToDouble();
    }

    final localityId = locality?['id']?.toString();
    // 2. If corporate locality is provided, query dedicated zonal pricing backend
    if (localityId != null && localityId.isNotEmpty) {
      try {
        final quote = await createZonalQuote(
          officeHubId: officeHubId,
          direction: direction,
          localityId: localityId,
          vehicleType: vehicleType == 'SUV' ? 'SUV' : 'SEDAN',
          hasEscort: hasEscort,
          pickupLat: pickupLat,
          pickupLng: pickupLng,
          dropLat: dropLat,
          dropLng: dropLng,
        );
        final total = (quote['totalAmount'] as num?)?.toDouble();
        if (total != null && total > 0) return total.roundToDouble();
      } catch (_) {}

      // Fallback: evaluate against live server rate card
      final card = await getVendorZonalRateCard();
      if (card != null && card['matrix'] is Map) {
        final hubMatrix = (card['matrix'] as Map)[officeHubId];
        final zoneId = locality?['zoneId']?.toString();
        if (hubMatrix is Map && zoneId != null) {
          final cell = hubMatrix[zoneId] as Map?;
          if (cell != null) {
            final isSuv = vehicleType == 'SUV';
            final base = (isSuv ? cell['suv'] : cell['sedan']) as num? ?? 500;
            final escort = hasEscort
                ? ((isSuv ? cell['escortSuv'] : cell['escortSedan']) as num? ?? 0)
                : 0;
            return (base + escort).toDouble().roundToDouble();
          }
        }
      }
    }

    // 3. For custom road routes, calculate via dedicated server pricing engine
    try {
      final tripFare = await calculateTripFare(
        vehicleType: vehicleType,
        distanceKm: distanceKm > 0 ? distanceKm : 10.0,
        durationMinutes: durationMinutes,
        pickupLat: pickupLat,
        pickupLng: pickupLng,
        dropLat: dropLat,
        dropLng: dropLng,
      );
      final total = (tripFare['estimatedTotal'] as num?)?.toDouble() ??
          (tripFare['ratePerVehicle'] as num?)?.toDouble();
      if (total != null && total > 0) {
        final escortAdd = hasEscort ? (vehicleType == 'SUV' ? 400.0 : 300.0) : 0.0;
        return (total + escortAdd).roundToDouble();
      }
    } catch (_) {}

    // 4. Default fallback: live vehicle category rates from server
    final tiers = await getPricingTiers();
    for (final t in tiers) {
      if (t['vehicleType'] == vehicleType) {
        final baseFare = (t['baseFare'] as num?)?.toDouble() ?? 800.0;
        final baseKm = (t['baseKm'] as num?)?.toDouble() ?? 40.0;
        final perKm = (t['perKmRate'] as num?)?.toDouble() ?? 14.5;
        double fare = baseFare;
        if (distanceKm > baseKm) {
          fare += (distanceKm - baseKm) * perKm;
        } else if (distanceKm > 0) {
          final proportional = (distanceKm * perKm) + (baseFare * 0.4);
          final minF = baseFare * 0.6;
          fare = proportional > minF ? proportional : minF;
        }
        if (hasEscort) fare += (vehicleType == 'SUV' ? 400.0 : 300.0);
        return fare.roundToDouble();
      }
    }

    return 800.0;
  }

  /// Fast synchronous calculation using cached server rate card and pricing tiers
  double calculateSynchronousFare({
    required String vehicleType,
    required String officeHubId,
    Map<String, dynamic>? locality,
    bool hasEscort = false,
    double distanceKm = 0.0,
    List<Map<String, dynamic>>? vehicleTiers,
    Map<String, dynamic>? existingQuote,
  }) {
    if (existingQuote != null && existingQuote['totalAmount'] != null) {
      final total = (existingQuote['totalAmount'] as num?)?.toDouble();
      if (total != null && total > 0) return total.roundToDouble();
    }

    // Check cached vendor rate card from server
    if (locality != null && _cachedVendorRateCard != null && _cachedVendorRateCard!['matrix'] is Map) {
      final hubMatrix = (_cachedVendorRateCard!['matrix'] as Map)[officeHubId];
      final zoneId = locality['zoneId']?.toString();
      if (hubMatrix is Map && zoneId != null) {
        final cell = hubMatrix[zoneId] as Map?;
        if (cell != null) {
          final isSuv = vehicleType == 'SUV';
          final base = (isSuv ? cell['suv'] : cell['sedan']) as num? ?? 500;
          final escort = hasEscort
              ? ((isSuv ? cell['escortSuv'] : cell['escortSedan']) as num? ?? 0)
              : 0;
          return (base + escort).toDouble().roundToDouble();
        }
      }
    }

    // Vehicle tier based calculation
    if (vehicleTiers != null && vehicleTiers.isNotEmpty) {
      for (final t in vehicleTiers) {
        if (t['id'] == vehicleType || t['vehicleType'] == vehicleType) {
          final baseFare = (t['baseRate'] ?? t['baseFare'] as num?)?.toDouble() ?? 800.0;
          final baseKm = (t['baseKm'] as num?)?.toDouble() ?? 40.0;
          final perKm = (t['perKmRate'] as num?)?.toDouble() ?? 14.5;
          double fare = baseFare;
          if (distanceKm > baseKm) {
            fare += (distanceKm - baseKm) * perKm;
          } else if (distanceKm > 0) {
            final proportional = (distanceKm * perKm) + (baseFare * 0.4);
            final minF = baseFare * 0.6;
            fare = proportional > minF ? proportional : minF;
          }
          if (hasEscort) fare += (vehicleType == 'SUV' ? 400.0 : 300.0);
          return fare.roundToDouble();
        }
      }
    }

    return 800.0;
  }
}
