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

  void clearSessionCache() {
    latestByTypeNotifier.value = {};
    activeDigilockerRequestId.value = null;
    _aadhaarConsentGranted = null;
  }

  /// Derives canonical document satisfaction booleans (`digilocker`, `aadhaar`, `pan`, `dl`, `rc`)
  /// from [latestByType] so Step 2, Step 3 Vehicle, and Step 4 Review agree without duplicating logic.
  static Map<String, bool> verifiedDocsFromMap(Map<String, dynamic> latestByType) {
    final dlkr = latestByType['DIGILOCKER'];
    final dlkrVerified = dlkr is Map && dlkr['verified'] == true;
    final summary = (dlkr is Map && dlkr['summary'] is Map)
        ? dlkr['summary'] as Map
        : const <String, dynamic>{};
    final vDocs = summary['verifiedDocs'] is Map
        ? summary['verifiedDocs'] as Map
        : const <String, dynamic>{};

    bool dlkrHas(String key, String extractedKey) =>
        dlkrVerified &&
        (vDocs[key] == true ||
            (summary[extractedKey] != null &&
                summary[extractedKey].toString().trim().isNotEmpty));

    final panOk =
        (latestByType['PAN'] is Map && latestByType['PAN']['verified'] == true) ||
            dlkrHas('pan', 'extractedPan');
    final dlOk = (latestByType['DRIVING_LICENSE'] is Map &&
            latestByType['DRIVING_LICENSE']['verified'] == true) ||
        dlkrHas('dl', 'extractedDl');
    final rcOk = (latestByType['VEHICLE_RC'] is Map &&
            latestByType['VEHICLE_RC']['verified'] == true) ||
        dlkrHas('rc', 'extractedRc');
    final insOk = (latestByType['VEHICLE_INSURANCE'] is Map &&
            latestByType['VEHICLE_INSURANCE']['verified'] == true) ||
        dlkrHas('insurance', 'extractedInsurance');
    final aadhaarOk = dlkrHas('aadhaar', 'maskedAadhaar');

    return {
      'digilocker': dlkrVerified,
      'aadhaar': aadhaarOk,
      'pan': panOk,
      'dl': dlOk,
      'rc': rcOk,
      'insurance': insOk,
    };
  }

  /// Extracts verified government ID numbers (`panNumber`, `dlNumber`, `rcNumber`,
  /// vehicle attributes, and insurance metadata) from [latestByType].
  static Map<String, String> extractedIdentifiersFromMap(
      Map<String, dynamic> latestByType) {
    final out = <String, String>{};
    final pan = latestByType['PAN'];
    final dl = latestByType['DRIVING_LICENSE'];
    final rc = latestByType['VEHICLE_RC'];
    final ins = latestByType['VEHICLE_INSURANCE'];
    final dlkr = latestByType['DIGILOCKER'];
    final dlkrSum = (dlkr is Map && dlkr['summary'] is Map)
        ? dlkr['summary'] as Map
        : const <String, dynamic>{};
    final rcSum = (rc is Map && rc['summary'] is Map)
        ? rc['summary'] as Map
        : const <String, dynamic>{};
    final insSum = (ins is Map && ins['summary'] is Map)
        ? ins['summary'] as Map
        : const <String, dynamic>{};

    String? pick(dynamic v, {bool upper = true}) {
      final s = v?.toString().trim() ?? '';
      if (s.isEmpty) return null;
      return upper ? s.toUpperCase() : s;
    }

    final panNum = pick(pan is Map ? pan['identifier'] : null) ??
        pick(dlkrSum['extractedPan']);
    final dlNum = pick(dl is Map ? dl['identifier'] : null) ??
        pick(dlkrSum['extractedDl']);
    final rcNum = pick(rc is Map ? rc['identifier'] : null) ??
        pick(dlkrSum['extractedRc']);

    if (panNum != null) out['panNumber'] = panNum;
    if (dlNum != null) out['dlNumber'] = dlNum;
    if (rcNum != null) out['rcNumber'] = rcNum;

    final model = pick(rcSum['makerModel'], upper: false);
    final color = pick(rcSum['color'], upper: false);
    String? year = pick(rcSum['modelYear'], upper: false);
    if (year == null) {
      final rawDate = rcSum['manufacturingDate'] ?? rcSum['registrationDate'];
      final match = rawDate != null
          ? RegExp(r'\b(19\d{2}|20\d{2})\b').firstMatch(rawDate.toString())
          : null;
      year = match?.group(1);
    }
    if (model != null) out['vehicleModel'] = model;
    if (color != null) out['color'] = color;
    if (year != null) out['modelYear'] = year;

    final insPolicy = pick(ins is Map ? ins['identifier'] : null) ??
        pick(insSum['insurancePolicyNumber']) ??
        pick(rcSum['insurancePolicyNumber']);
    final insCompany = pick(insSum['insuranceCompany'], upper: false) ??
        pick(rcSum['insuranceCompany'], upper: false);
    final insUpto = pick(insSum['insuranceUpto'], upper: false) ??
        pick(rcSum['insuranceUpto'], upper: false);

    if (insPolicy != null) out['insurancePolicyNumber'] = insPolicy;
    if (insCompany != null) out['insuranceCompany'] = insCompany;
    if (insUpto != null) out['insuranceUpto'] = insUpto;
    return out;
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
    if (errorCodeOf(error) == 'PARIVAHAN_LOOKUP_UNAVAILABLE') {
      return error.message.trim().isNotEmpty
          ? error.message.trim()
          : 'Parivahan could not verify this RC right now. Check the plate prefix (e.g. TS/TG) or upload RC photos below.';
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
      final next = Map<String, dynamic>.from(latest);
      latestByTypeNotifier.value = next;
      final dlkr = next['DIGILOCKER'];
      if (dlkr is Map && dlkr['digioRequestId'] != null) {
        final kid = dlkr['digioRequestId'].toString();
        if (kid.isNotEmpty && dlkr['verified'] != true) {
          activeDigilockerRequestId.value ??= kid;
        }
      }
    }
    return map;
  }

  static const Duration _kycTimeout = Duration(seconds: 35);

  Future<Map<String, dynamic>> verifyPan({
    required String panNumber,
    String? name,
    String? dob,
  }) async {
    final res = await _api.post(
      '/kyc/digio/pan',
      timeout: _kycTimeout,
      body: {
        'panNumber': panNumber.trim().toUpperCase(),
        if (name != null && name.trim().isNotEmpty) 'name': name.trim(),
        if (dob != null && dob.trim().isNotEmpty) 'dob': dob.trim(),
      },
    );
    final map = Map<String, dynamic>.from(res as Map);
    _updateCache(map);
    return map;
  }

  Future<Map<String, dynamic>> verifyDrivingLicense({
    required String dlNumber,
    required String dob,
    String? name,
  }) async {
    final res = await _api.post(
      '/kyc/digio/dl',
      timeout: _kycTimeout,
      body: {
        'dlNumber': dlNumber.trim().toUpperCase(),
        'dob': dob.trim(),
        if (name != null && name.trim().isNotEmpty) 'name': name.trim(),
      },
    );
    final map = Map<String, dynamic>.from(res as Map);
    _updateCache(map);
    return map;
  }

  Future<Map<String, dynamic>> verifyVehicleRc({
    required String registrationNumber,
    String? vehicleId,
  }) async {
    final res = await _api.post(
      '/kyc/digio/vehicle-rc',
      timeout: _kycTimeout,
      body: {
        'registrationNumber': registrationNumber.trim().toUpperCase(),
        if (vehicleId != null && vehicleId.isNotEmpty) 'vehicleId': vehicleId,
      },
    );
    final map = Map<String, dynamic>.from(res as Map);
    _updateCache(map);
    return map;
  }

  Future<Map<String, dynamic>> verifyVehicleInsurance({
    required String policyNumber,
    String? registrationNumber,
    String? insurerName,
    String? vehicleId,
  }) async {
    final res = await _api.post(
      '/kyc/digio/vehicle-insurance',
      timeout: _kycTimeout,
      body: {
        'policyNumber': policyNumber.trim().toUpperCase(),
        if (registrationNumber != null && registrationNumber.trim().isNotEmpty)
          'registrationNumber': registrationNumber.trim().toUpperCase(),
        if (insurerName != null && insurerName.trim().isNotEmpty)
          'insurerName': insurerName.trim(),
        if (vehicleId != null && vehicleId.isNotEmpty) 'vehicleId': vehicleId,
      },
    );
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
