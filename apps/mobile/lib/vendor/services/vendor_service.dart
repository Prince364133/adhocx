import '../../core/networking/api_client.dart';

class VendorService {
  static VendorService? _instance;
  static VendorService get instance => _instance ??= VendorService._();

  VendorService._();

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
    String? specialInstructions,
  }) async {
    return await _api.post(
      '/requirements',
      body: {
        'vehicleType': vehicleType,
        'quantity': quantity,
        'pickupAddress': pickupAddress,
        'pickupLat': pickupLat,
        'pickupLng': pickupLng,
        'dropAddress': dropAddress,
        'dropLat': dropLat,
        'dropLng': dropLng,
        'reportingTime': reportingTime.toIso8601String(),
        if (specialInstructions != null) 'specialInstructions': specialInstructions,
      },
    );
  }

  Future<List<dynamic>> getRequirements({String? status}) async {
    final query = status != null ? {'status': status} : null;
    final response = await _api.get('/requirements', queryParameters: query);
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
