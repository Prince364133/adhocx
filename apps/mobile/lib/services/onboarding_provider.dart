import 'package:flutter/material.dart';

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

  int get uploadedDocumentsCount {
    int count = 0;
    if (_drivingLicenseUrl != null) count++;
    if (_rcFrontUrl != null || _rcBookUrl != null) count++;
    if (_rcBackUrl != null) count++;
    if (_insuranceUrl != null) count++;
    if (_vehiclePhotoUrl != null) count++;
    if (_aadharFrontUrl != null) count++;
    if (_aadharBackUrl != null) count++;
    if (_panCardUrl != null) count++;
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
    if (modelYear != null) _modelYear = modelYear;
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
    _companyName = '';
    _gstNumber = '';
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
    notifyListeners();
  }
}
