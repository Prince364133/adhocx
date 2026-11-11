import 'package:flutter/material.dart';
import 'digio_service.dart';

/// State management provider for the 4-step Driver and Vendor Onboarding Flow.
class OnboardingProvider extends ChangeNotifier {
  // Role: 'DRIVER' (Driver by default) or 'VENDOR' / 'USER' (Customer/Booker)
  String _role = 'DRIVER'; 

  // Step 1: Personal Details
  String _fullName = '';
  DateTime? _dateOfBirth;
  String _gender = 'Male'; // 'Male', 'Female', 'Other'
  String _email = '';
  String _phoneNumber = '';
  String _address = '';
  String _emergencyContactName = '';
  String _emergencyContactPhone = '';
  bool _isCorporate = false;
  String _companyName = '';
  String _brandName = '';
  String _businessType = 'Private Limited';
  String _gstNumber = '';
  String _panNumber = '';
  String _city = '';
  String _state = '';
  String _pincode = '';
  String _billingAddress = '';
  String _billingEmail = '';
  String _spocDesignation = 'Travel Desk Lead';
  String _monthlyTrips = '26 - 100 trips / month';

  // Step 2 & 3: Identity and Vehicle Information (Driver)
  String _vehicleType = 'Sedan';
  String _carModel = '';
  String _color = '';
  String _registrationNumber = '';
  String _modelYear = '';
  String _dlNumber = '';
  String _rcNumber = '';
  String _insurancePolicyNumber = '';
  String _insuranceCompany = '';
  String _insuranceExpiry = '';

  // Document Uploads (URLs from Cloudflare R2)
  String? _profilePhotoUrl;
  String? _drivingLicenseUrl;
  String? _rcBookUrl;
  String? _rcFrontUrl;
  String? _rcBackUrl;
  String? _insuranceUrl;
  String? _vehiclePhotoUrl;
  String? _aadharFrontUrl;
  String? _aadharBackUrl;
  String? _panCardUrl;
  String? _selfieUrl;
  bool _aadhaarVerifiedDigitally = false;
  bool _panVerifiedDigitally = false;
  bool _dlVerifiedDigitally = false;
  bool _rcVerifiedDigitally = false;
  bool _insuranceVerifiedDigitally = false;

  // Getters
  String get role => _role;
  bool get isDriver => _role == 'DRIVER';
  bool get isUser => _role == 'USER' || _role == 'VENDOR';
  bool get isVendor => isUser;
  bool get isCorporate => _isCorporate;

  String get fullName => _fullName;
  DateTime? get dateOfBirth => _dateOfBirth;
  String get gender => _gender;
  String get email => _email;
  String get phoneNumber => _phoneNumber;
  String get phone => _phoneNumber;
  String get address => _address;
  String get emergencyContactName => _emergencyContactName;
  String get emergencyContactPhone => _emergencyContactPhone;

  String get vehicleType => _vehicleType;
  String get carModel => _carModel;
  String get color => _color;
  String get registrationNumber => _registrationNumber;
  String get modelYear => _modelYear;
  String get companyName => _companyName;
  String get brandName => _brandName;
  String get businessType => _businessType;
  String get gstNumber => _gstNumber;
  String get panNumber => _panNumber;
  String get dlNumber => _dlNumber;
  String get rcNumber => _rcNumber;
  String get city => _city;
  String get stateName => _state;
  String get pincode => _pincode;
  String get billingAddress => _billingAddress;
  String get billingEmail => _billingEmail;
  String get spocDesignation => _spocDesignation;
  String get monthlyTrips => _monthlyTrips;

  String? get profilePhotoUrl => _profilePhotoUrl ?? _selfieUrl;
  String? get drivingLicenseUrl => _drivingLicenseUrl;
  String? get rcBookUrl => _rcFrontUrl ?? _rcBookUrl;
  String? get rcFrontUrl => _rcFrontUrl ?? _rcBookUrl;
  String? get rcBackUrl => _rcBackUrl;
  String? get insuranceUrl => _insuranceUrl;
  String? get vehiclePhotoUrl => _vehiclePhotoUrl;
  String? get aadharFrontUrl => _aadharFrontUrl;
  String? get aadharBackUrl => _aadharBackUrl;
  String? get panCardUrl => _panCardUrl;
  String? get selfieUrl => _selfieUrl ?? _profilePhotoUrl;

  String get insurancePolicyNumber => _insurancePolicyNumber;
  String get insuranceCompany => _insuranceCompany;
  String get insuranceExpiry => _insuranceExpiry;

  bool get isAadhaarVerifiedDigitally => _aadhaarVerifiedDigitally;
  bool get isPanVerifiedDigitally => _panVerifiedDigitally;
  bool get isDlVerifiedDigitally => _dlVerifiedDigitally;
  bool get isRcVerifiedDigitally => _rcVerifiedDigitally;
  bool get isInsuranceVerifiedDigitally => _insuranceVerifiedDigitally;

  bool get isAadhaarFrontSatisfied =>
      _aadharFrontUrl != null || _aadhaarVerifiedDigitally;
  bool get isAadhaarBackSatisfied =>
      _aadharBackUrl != null || _aadhaarVerifiedDigitally;
  bool get isPanSatisfied => _panCardUrl != null || _panVerifiedDigitally;
  bool get isDlSatisfied => _drivingLicenseUrl != null || _dlVerifiedDigitally;
  bool get isRcFrontSatisfied =>
      _rcFrontUrl != null || _rcBookUrl != null || _rcVerifiedDigitally;
  bool get isRcBackSatisfied => _rcBackUrl != null || _rcVerifiedDigitally;
  bool get isInsuranceSatisfied =>
      _insuranceUrl != null || _insuranceVerifiedDigitally;

  int get uploadedDocumentsCount {
    int count = 0;
    if (isDlSatisfied) count++;
    if (isRcFrontSatisfied) count++;
    if (isRcBackSatisfied) count++;
    if (isInsuranceSatisfied) count++;
    if (_vehiclePhotoUrl != null) count++;
    if (isAadhaarFrontSatisfied) count++;
    if (isAadhaarBackSatisfied) count++;
    if (isPanSatisfied) count++;
    return count;
  }

  int get uploadedCount => uploadedDocumentsCount;

  bool get areAllDocumentsUploaded => uploadedDocumentsCount >= 8;

  // Setters
  void setRole(String role) {
    _role = role.toUpperCase();
    notifyListeners();
  }

  void setIsCorporate(bool isCorp) {
    _isCorporate = isCorp;
    notifyListeners();
  }

  void setPersonalDetails({
    String? fullName,
    DateTime? dateOfBirth,
    String? gender,
    String? email,
    String? phone,
    String? address,
    String? emergencyContactName,
    String? emergencyContactPhone,
    String? companyName,
    bool? isCorporate,
  }) {
    if (fullName != null) _fullName = fullName;
    if (dateOfBirth != null) _dateOfBirth = dateOfBirth;
    if (gender != null) _gender = gender;
    if (email != null) _email = email;
    if (phone != null) _phoneNumber = phone;
    if (address != null) _address = address;
    if (emergencyContactName != null) _emergencyContactName = emergencyContactName;
    if (emergencyContactPhone != null) _emergencyContactPhone = emergencyContactPhone;
    if (companyName != null) _companyName = companyName;
    if (isCorporate != null) _isCorporate = isCorporate;
    notifyListeners();
  }

  void updatePersonalInfo({
    String? fullName,
    DateTime? dateOfBirth,
    String? gender,
    String? email,
    String? phone,
    String? address,
    String? emergencyContactName,
    String? emergencyContactPhone,
    String? companyName,
    bool? isCorporate,
  }) => setPersonalDetails(
    fullName: fullName,
    dateOfBirth: dateOfBirth,
    gender: gender,
    email: email,
    phone: phone,
    address: address,
    emergencyContactName: emergencyContactName,
    emergencyContactPhone: emergencyContactPhone,
    companyName: companyName,
    isCorporate: isCorporate,
  );

  void setVendorDetails({
    String? companyName,
    String? brandName,
    String? businessType,
    String? gstNumber,
    String? panNumber,
    String? address,
    String? city,
    String? state,
    String? pincode,
    String? billingAddress,
    String? billingEmail,
    String? spocName,
    String? spocDesignation,
    String? phone,
    String? monthlyTrips,
  }) {
    if (companyName != null) _companyName = companyName;
    if (brandName != null) _brandName = brandName;
    if (businessType != null) _businessType = businessType;
    if (gstNumber != null) _gstNumber = gstNumber;
    if (panNumber != null) _panNumber = panNumber;
    if (address != null) _address = address;
    if (city != null) _city = city;
    if (state != null) _state = state;
    if (pincode != null) _pincode = pincode;
    if (billingAddress != null) _billingAddress = billingAddress;
    if (billingEmail != null) _billingEmail = billingEmail;
    if (spocName != null) _fullName = spocName;
    if (spocDesignation != null) _spocDesignation = spocDesignation;
    if (phone != null) _phoneNumber = phone;
    if (monthlyTrips != null) _monthlyTrips = monthlyTrips;
    _isCorporate = true;
    notifyListeners();
  }

  void setVehicleDetails({
    required String vehicleType,
    required String carModel,
    required String color,
    required String registrationNumber,
    String? modelYear,
  }) {
    _vehicleType = vehicleType;
    _carModel = carModel;
    _color = color;
    _registrationNumber = registrationNumber;
    if (_rcNumber.isEmpty && registrationNumber.isNotEmpty) {
      _rcNumber = registrationNumber;
    }
    if (modelYear != null) _modelYear = modelYear;
    notifyListeners();
  }

  void setInsuranceDetails({
    String? policyNumber,
    String? insurerName,
    String? expiryDate,
  }) {
    if (policyNumber != null) {
      _insurancePolicyNumber = policyNumber.trim().toUpperCase();
    }
    if (insurerName != null) _insuranceCompany = insurerName.trim();
    if (expiryDate != null) _insuranceExpiry = expiryDate.trim();
    notifyListeners();
  }

  void setKycIdentifiers({
    String? dlNumber,
    String? panNumber,
    String? rcNumber,
  }) {
    if (dlNumber != null && dlNumber.trim().isNotEmpty) {
      _dlNumber = dlNumber.trim().toUpperCase();
    }
    if (panNumber != null && panNumber.trim().isNotEmpty) {
      _panNumber = panNumber.trim().toUpperCase();
    }
    if (rcNumber != null && rcNumber.trim().isNotEmpty) {
      _rcNumber = rcNumber.trim().toUpperCase();
    }
    notifyListeners();
  }

  void setVendorCompanyDetails({
    required String companyName,
    required String gstNumber,
  }) {
    _companyName = companyName;
    _gstNumber = gstNumber;
    notifyListeners();
  }

  void setDocumentUrl(String docType, String url) {
    switch (docType) {
      case 'PROFILE_PHOTO':
      case 'SELFIE':
        _profilePhotoUrl = url;
        _selfieUrl = url;
        break;
      case 'DRIVING_LICENSE':
        _drivingLicenseUrl = url;
        break;
      case 'RC_FRONT':
        _rcFrontUrl = url;
        _rcBookUrl = url;
        break;
      case 'RC_BACK':
        _rcBackUrl = url;
        break;
      case 'RC_BOOK':
        _rcFrontUrl = url;
        _rcBookUrl = url;
        break;
      case 'INSURANCE':
        _insuranceUrl = url;
        break;
      case 'VEHICLE_PHOTO':
        _vehiclePhotoUrl = url;
        break;
      case 'AADHAR_FRONT':
        _aadharFrontUrl = url;
        break;
      case 'AADHAR_BACK':
        _aadharBackUrl = url;
        break;
      case 'PAN_CARD':
        _panCardUrl = url;
        break;
    }
    notifyListeners();
  }

  /// Syncs verified flags, extracted govt IDs, and DigiLocker-attached document URLs
  /// into onboarding state so already-verified documents auto-mark green without re-upload.
  void syncFromDigioLatest(
    Map<String, dynamic> latestByType, {
    Map<String, dynamic>? syncedMediaUrls,
    bool notify = true,
  }) {
    final docs = DigioService.verifiedDocsFromMap(latestByType);
    final ids = DigioService.extractedIdentifiersFromMap(latestByType);
    bool changed = false;

    void setFlag(bool current, bool next, void Function(bool) assign) {
      if (next && !current) {
        assign(true);
        changed = true;
      }
    }

    setFlag(_aadhaarVerifiedDigitally, docs['aadhaar'] == true,
        (v) => _aadhaarVerifiedDigitally = v);
    setFlag(_panVerifiedDigitally, docs['pan'] == true,
        (v) => _panVerifiedDigitally = v);
    setFlag(_dlVerifiedDigitally, docs['dl'] == true,
        (v) => _dlVerifiedDigitally = v);
    setFlag(_rcVerifiedDigitally, docs['rc'] == true,
        (v) => _rcVerifiedDigitally = v);
    setFlag(_insuranceVerifiedDigitally, docs['insurance'] == true,
        (v) => _insuranceVerifiedDigitally = v);

    if (ids['dlNumber'] != null && _dlNumber.isEmpty) {
      _dlNumber = ids['dlNumber']!;
      changed = true;
    }
    if (ids['panNumber'] != null && _panNumber.isEmpty) {
      _panNumber = ids['panNumber']!;
      changed = true;
    }
    if (ids['rcNumber'] != null && _rcNumber.isEmpty) {
      _rcNumber = ids['rcNumber']!;
      changed = true;
    }
    if (ids['rcNumber'] != null && _registrationNumber.isEmpty) {
      _registrationNumber = ids['rcNumber']!;
      changed = true;
    }
    if (ids['vehicleModel'] != null && _carModel.isEmpty) {
      _carModel = ids['vehicleModel']!;
      changed = true;
    }
    if (ids['color'] != null && _color.isEmpty) {
      _color = ids['color']!;
      changed = true;
    }
    if (ids['modelYear'] != null && _modelYear.isEmpty) {
      _modelYear = ids['modelYear']!;
      changed = true;
    }
    if (ids['insurancePolicyNumber'] != null && _insurancePolicyNumber.isEmpty) {
      _insurancePolicyNumber = ids['insurancePolicyNumber']!;
      changed = true;
    }
    if (ids['insuranceCompany'] != null && _insuranceCompany.isEmpty) {
      _insuranceCompany = ids['insuranceCompany']!;
      changed = true;
    }
    if (ids['insuranceUpto'] != null && _insuranceExpiry.isEmpty) {
      _insuranceExpiry = ids['insuranceUpto']!;
      changed = true;
    }

    if (syncedMediaUrls != null) {
      void fillUrl(String? current, dynamic incoming, void Function(String) assign) {
        final s = incoming?.toString().trim() ?? '';
        if ((current == null || current.isEmpty) && s.isNotEmpty) {
          assign(s);
          changed = true;
        }
      }

      fillUrl(_aadharFrontUrl, syncedMediaUrls['aadharFrontUrl'],
          (u) => _aadharFrontUrl = u);
      fillUrl(_aadharBackUrl, syncedMediaUrls['aadharBackUrl'],
          (u) => _aadharBackUrl = u);
      fillUrl(_panCardUrl, syncedMediaUrls['panDocUrl'],
          (u) => _panCardUrl = u);
      fillUrl(_drivingLicenseUrl, syncedMediaUrls['dlFrontUrl'],
          (u) => _drivingLicenseUrl = u);
      final rcUrl = syncedMediaUrls['rcFrontUrl'] ?? syncedMediaUrls['rcDocUrl'];
      fillUrl(_rcFrontUrl, rcUrl, (u) {
        _rcFrontUrl = u;
        _rcBookUrl ??= u;
      });
      fillUrl(_rcBackUrl, syncedMediaUrls['rcBackUrl'], (u) => _rcBackUrl = u);
    }

    if (changed && notify) {
      notifyListeners();
    }
  }

  void reset() {
    _role = 'DRIVER';
    _fullName = '';
    _dateOfBirth = null;
    _gender = 'Male';
    _email = '';
    _phoneNumber = '';
    _address = '';
    _emergencyContactName = '';
    _emergencyContactPhone = '';
    _isCorporate = false;
    _vehicleType = 'Sedan';
    _carModel = '';
    _color = '';
    _registrationNumber = '';
    _modelYear = '';
    _dlNumber = '';
    _rcNumber = '';
    _companyName = '';
    _gstNumber = '';
    _panNumber = '';
    _profilePhotoUrl = null;
    _drivingLicenseUrl = null;
    _rcBookUrl = null;
    _rcFrontUrl = null;
    _rcBackUrl = null;
    _insuranceUrl = null;
    _vehiclePhotoUrl = null;
    _aadharFrontUrl = null;
    _aadharBackUrl = null;
    _panCardUrl = null;
    _selfieUrl = null;
    _aadhaarVerifiedDigitally = false;
    _panVerifiedDigitally = false;
    _dlVerifiedDigitally = false;
    _rcVerifiedDigitally = false;
    _insuranceVerifiedDigitally = false;
    _insurancePolicyNumber = '';
    _insuranceCompany = '';
    _insuranceExpiry = '';
    notifyListeners();
  }
}
