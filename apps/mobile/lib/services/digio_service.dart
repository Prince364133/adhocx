import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/networking/api_client.dart';

class DigioService {
  DigioService._();
  static final DigioService instance = DigioService._();

  final ApiClient _api = ApiClient.instance;

  /// Reactive cache of the latest verification record per Digio check type (e.g. PAN, DRIVING_LICENSE, VEHICLE_RC, FACE_MATCH, LIVENESS, ID_OCR, AADHAAR_MASK, BANK_ACCOUNT, UPI_VPA, GST, DIGILOCKER).
  final ValueNotifier<Map<String, dynamic>> latestByTypeNotifier =
      ValueNotifier<Map<String, dynamic>>({});

  final ValueNotifier<String?> activeDigilockerRequestId =
      ValueNotifier<String?>(null);

  void _updateCache(Map<String, dynamic> record) {
    final type = record['verificationType']?.toString();
    if (type != null && type.isNotEmpty) {
      final next = Map<String, dynamic>.from(latestByTypeNotifier.value);
      next[type] = record;
      latestByTypeNotifier.value = next;
    }
  }

  // ---------------------------------------------------------------------------
  // Error helpers (API error envelope: {success:false, error:{code, message, details}})
  // ---------------------------------------------------------------------------

  /// Machine-readable API error code (e.g. `AADHAAR_CONSENT_REQUIRED`, `DIGIO_RATE_LIMITED`), if any.
  static String? errorCodeOf(Object error) {
    if (error is! ApiException) return null;
    final data = error.data;
    if (data is Map && data['error'] is Map) {
      final code = (data['error'] as Map)['code'];
      return code?.toString();
    }
    return null;
  }

  /// User-facing message for Digio failures; rate limits get a "try again in N minutes" message.
  static String? friendlyErrorMessage(Object error) {
    if (error is! ApiException) return null;
    if (error.statusCode == 429 || errorCodeOf(error) == 'DIGIO_RATE_LIMITED') {
      int? retryAfterSec;
      final data = error.data;
      if (data is Map && data['error'] is Map) {
        final details = (data['error'] as Map)['details'];
        if (details is Map && details['retryAfterSec'] != null) {
          retryAfterSec = int.tryParse(details['retryAfterSec'].toString());
        }
      }
      final minutes = retryAfterSec == null ? null : (retryAfterSec / 60).ceil().clamp(1, 24 * 60);
      return minutes == null
          ? 'Too many verification attempts. Please try again later.'
          : 'Too many verification attempts. Please try again in $minutes minute${minutes == 1 ? '' : 's'}.';
    }
    if (errorCodeOf(error) == 'AADHAAR_CONSENT_REQUIRED') {
      return 'Please accept the Aadhaar consent to continue with verification.';
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Aadhaar consent (UIDAI / DPDP): recorded server-side before any Aadhaar processing
  // ---------------------------------------------------------------------------

  static const String aadhaarConsentTextVersion = 'AADHAAR_CONSENT_V1';

  bool? _aadhaarConsentGranted;

  /// Test seams: replace the network calls behind the consent gate.
  @visibleForTesting
  Future<bool> Function()? debugConsentStatusLoader;
  @visibleForTesting
  Future<void> Function()? debugConsentGranter;

  @visibleForTesting
  void debugResetConsent() {
    _aadhaarConsentGranted = null;
    debugConsentStatusLoader = null;
    debugConsentGranter = null;
  }

  Future<bool> hasAadhaarConsent({bool force = false}) async {
    if (!force && _aadhaarConsentGranted == true) return true;
    if (debugConsentStatusLoader != null) {
      _aadhaarConsentGranted = await debugConsentStatusLoader!();
      return _aadhaarConsentGranted!;
    }
    final res = await _api.get('/kyc/digio/consent', force: true);
    _aadhaarConsentGranted = res is Map && res['granted'] == true;
    return _aadhaarConsentGranted!;
  }

  Future<void> grantAadhaarConsent() async {
    if (debugConsentGranter != null) {
      await debugConsentGranter!();
    } else {
      await _api.post('/kyc/digio/consent', body: {
        'accepted': true,
        'textVersion': aadhaarConsentTextVersion,
      });
    }
    _aadhaarConsentGranted = true;
  }

  /// Makes sure Aadhaar consent is recorded (asking the driver via [askUser] if needed) and runs
  /// [action]. Returns null without calling [action] when the driver declines. If the server still
  /// answers AADHAAR_CONSENT_REQUIRED (e.g. consent withdrawn), asks again and retries once.
  Future<T?> runWithAadhaarConsent<T>({
    required Future<bool> Function() askUser,
    required Future<T> Function() action,
  }) async {
    Future<bool> ensure({bool force = false}) async {
      bool granted = false;
      try {
        granted = await hasAadhaarConsent(force: force);
      } catch (_) {
        granted = false; // status unknown: ask (granting is idempotent server-side)
      }
      if (granted) return true;
      final accepted = await askUser();
      if (!accepted) return false;
      await grantAadhaarConsent();
      return true;
    }

    if (!await ensure()) return null;
    try {
      return await action();
    } catch (e) {
      if (errorCodeOf(e) != 'AADHAAR_CONSENT_REQUIRED') rethrow;
      _aadhaarConsentGranted = false;
      if (!await ensure(force: true)) return null;
      return await action();
    }
  }

  Future<Map<String, dynamic>> getCapabilities() async {
    final res = await _api.get('/kyc/digio/capabilities');
    return Map<String, dynamic>.from(res as Map);
  }

  Future<Map<String, dynamic>> getMyVerifications({bool force = false}) async {
    final res = await _api.get('/kyc/digio/me', force: force);
    final map = Map<String, dynamic>.from(res as Map);
    final latest = map['latestByType'];
    if (latest is Map) {
      latestByTypeNotifier.value = Map<String, dynamic>.from(latest);
    }
    return map;
  }

  Future<Map<String, dynamic>> verifyPan({
    required String panNumber,
    String? name,
    String? dob,
  }) async {
    final res = await _api.post('/kyc/digio/pan', body: {
      'panNumber': panNumber.trim().toUpperCase(),
      if (name != null && name.trim().isNotEmpty) 'name': name.trim(),
      if (dob != null && dob.trim().isNotEmpty) 'dob': dob.trim(),
    });
    final map = Map<String, dynamic>.from(res as Map);
    _updateCache(map);
    return map;
  }

  Future<Map<String, dynamic>> verifyDrivingLicense({
    required String dlNumber,
    required String dob,
    String? name,
  }) async {
    final res = await _api.post('/kyc/digio/dl', body: {
      'dlNumber': dlNumber.trim().toUpperCase(),
      'dob': dob.trim(),
      if (name != null && name.trim().isNotEmpty) 'name': name.trim(),
    });
    final map = Map<String, dynamic>.from(res as Map);
    _updateCache(map);
    return map;
  }

  Future<Map<String, dynamic>> verifyVehicleRc({
    required String registrationNumber,
    String? vehicleId,
  }) async {
    final res = await _api.post('/kyc/digio/vehicle-rc', body: {
      'registrationNumber': registrationNumber.trim().toUpperCase(),
      if (vehicleId != null && vehicleId.isNotEmpty) 'vehicleId': vehicleId,
    });
    final map = Map<String, dynamic>.from(res as Map);
    _updateCache(map);
    return map;
  }

  Future<Map<String, dynamic>> analyzeStoredIdCard({
    required String frontDocUrl,
    String? backDocUrl,
    List<String>? expectedIds,
    bool saveMaskedToDriver = true,
    String aadhaarSide = 'FRONT',
  }) async {
    final res = await _api.post('/kyc/digio/id-card/analyze-stored', body: {
      'frontDocUrl': frontDocUrl,
      if (backDocUrl != null && backDocUrl.isNotEmpty) 'backDocUrl': backDocUrl,
      if (expectedIds != null && expectedIds.isNotEmpty) 'expectedIds': expectedIds,
      'saveMaskedToDriver': saveMaskedToDriver,
      'aadhaarSide': aadhaarSide,
    });
    final map = Map<String, dynamic>.from(res as Map);
    _updateCache(map);
    return map;
  }

  Future<Map<String, dynamic>> analyzeUploadedIdCard({
    required List<int> fileBytes,
    required String fileName,
  }) async {
    final res = await _api.multipartUpload(
      '/kyc/digio/id-card/analyze',
      fileField: 'files',
      fileBytes: fileBytes,
      fileName: fileName,
    );
    final map = Map<String, dynamic>.from(res as Map);
    _updateCache(map);
    return map;
  }

  Future<Map<String, dynamic>> maskStoredAadhaar({
    required String documentUrl,
    String side = 'FRONT',
  }) async {
    final res = await _api.post('/kyc/digio/aadhaar/mask-stored', body: {
      'documentUrl': documentUrl,
      'side': side,
    });
    final map = Map<String, dynamic>.from(res as Map);
    _updateCache(map);
    return map;
  }

  Future<Map<String, dynamic>> faceMatchStored({
    String? image1Url,
    String? image2Url,
    double minimumMatch = 65,
  }) async {
    final res = await _api.post('/kyc/digio/biometric/face-match-stored', body: {
      if (image1Url != null && image1Url.isNotEmpty) 'image1Url': image1Url,
      if (image2Url != null && image2Url.isNotEmpty) 'image2Url': image2Url,
      'minimumMatch': minimumMatch,
    });
    final map = Map<String, dynamic>.from(res as Map);
    _updateCache(map);
    return map;
  }

  Future<Map<String, dynamic>> checkStoredLiveness({String? imageUrl}) async {
    final res = await _api.post('/kyc/digio/biometric/liveness-stored', body: {
      if (imageUrl != null && imageUrl.isNotEmpty) 'imageUrl': imageUrl,
    });
    final map = Map<String, dynamic>.from(res as Map);
    _updateCache(map);
    return map;
  }

  Future<Map<String, dynamic>> checkUploadedLiveness({
    required List<int> fileBytes,
    required String fileName,
  }) async {
    final res = await _api.multipartUpload(
      '/kyc/digio/biometric/liveness',
      fileField: 'file',
      fileBytes: fileBytes,
      fileName: fileName,
    );
    final map = Map<String, dynamic>.from(res as Map);
    _updateCache(map);
    return map;
  }

  Future<Map<String, dynamic>> verifyIfsc(String ifsc) async {
    final res = await _api.post('/kyc/digio/bank/ifsc', body: {
      'ifsc': ifsc.trim().toUpperCase(),
    });
    return Map<String, dynamic>.from(res as Map);
  }

  Future<Map<String, dynamic>> verifyBankAccount({
    required String accountNumber,
    required String ifsc,
    String? accountHolderName,
    String validationMode = 'PENNY_LESS',
    bool saveToDriverProfile = true,
  }) async {
    final res = await _api.post('/kyc/digio/bank/verify', body: {
      'accountNumber': accountNumber.trim(),
      'ifsc': ifsc.trim().toUpperCase(),
      if (accountHolderName != null && accountHolderName.trim().isNotEmpty)
        'accountHolderName': accountHolderName.trim(),
      'validationMode': validationMode,
      'saveToDriverProfile': saveToDriverProfile,
    });
    final map = Map<String, dynamic>.from(res as Map);
    _updateCache(map);
    return map;
  }

  Future<Map<String, dynamic>> verifyUpiVpa({
    required String vpa,
    String? name,
    bool saveToDriverProfile = true,
  }) async {
    final res = await _api.post('/kyc/digio/upi/verify', body: {
      'vpa': vpa.trim().toLowerCase(),
      if (name != null && name.trim().isNotEmpty) 'name': name.trim(),
      'saveToDriverProfile': saveToDriverProfile,
    });
    final map = Map<String, dynamic>.from(res as Map);
    _updateCache(map);
    return map;
  }

  Future<Map<String, dynamic>> verifyGst({
    required String gstin,
    bool advanced = false,
    bool saveToVendorProfile = true,
  }) async {
    final res = await _api.post('/kyc/digio/business/gst', body: {
      'gstin': gstin.trim().toUpperCase(),
      'advanced': advanced,
      'saveToVendorProfile': saveToVendorProfile,
    });
    final map = Map<String, dynamic>.from(res as Map);
    _updateCache(map);
    return map;
  }

  Future<Map<String, dynamic>> verifyPanToGst({
    required String panNumber,
    String listingType = 'BASIC',
  }) async {
    final res = await _api.post('/kyc/digio/business/pan-to-gst', body: {
      'panNumber': panNumber.trim().toUpperCase(),
      'listingType': listingType,
    });
    final map = Map<String, dynamic>.from(res as Map);
    _updateCache(map);
    return map;
  }

  Future<Map<String, dynamic>> verifyCin({required String cin}) async {
    final res = await _api.post('/kyc/digio/business/cin', body: {
      'cin': cin.trim().toUpperCase(),
    });
    final map = Map<String, dynamic>.from(res as Map);
    _updateCache(map);
    return map;
  }

  Future<Map<String, dynamic>> verifyUdyam({required String udyamNumber}) async {
    final res = await _api.post('/kyc/digio/business/udyam', body: {
      'udyamNumber': udyamNumber.trim().toUpperCase(),
    });
    final map = Map<String, dynamic>.from(res as Map);
    _updateCache(map);
    return map;
  }

  Future<Map<String, dynamic>> createDigilockerSession({
    String? customerIdentifier,
    String? customerName,
    String? templateName,
    String? redirectUrl,
  }) async {
    final res = await _api.post('/kyc/digio/digilocker/request', body: {
      if (customerIdentifier != null && customerIdentifier.trim().isNotEmpty)
        'customerIdentifier': customerIdentifier.trim(),
      if (customerName != null && customerName.trim().isNotEmpty)
        'customerName': customerName.trim(),
      if (templateName != null && templateName.trim().isNotEmpty)
        'templateName': templateName.trim(),
      if (redirectUrl != null && redirectUrl.trim().isNotEmpty)
        'redirectUrl': redirectUrl.trim(),
    });
    final map = Map<String, dynamic>.from(res as Map);
    final reqId = map['digioRequestId']?.toString();
    if (reqId != null && reqId.isNotEmpty) {
      activeDigilockerRequestId.value = reqId;
    }
    _updateCache(map);
    return map;
  }

  Future<Map<String, dynamic>> syncDigilockerStatus(String requestId) async {
    final res = await _api.get('/kyc/digio/digilocker/request/$requestId/status', force: true);
    final map = Map<String, dynamic>.from(res as Map);
    _updateCache(map);
    return map;
  }

  Future<Map<String, dynamic>> syncDigilockerMedia(String requestId) async {
    final res = await _api.post('/kyc/digio/digilocker/request/$requestId/sync-media');
    return Map<String, dynamic>.from(res as Map);
  }

  Future<bool> launchGatewayUrl(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) return false;
    return launchUrl(uri, mode: LaunchMode.externalApplication);
  }
}
