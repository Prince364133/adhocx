import 'package:flutter/material.dart';

/// State management provider for the 4-step Driver and Vendor Onboarding Flow.
class OnboardingProvider extends ChangeNotifier {
  // Role: 'DRIVER' (Driver Partner by default) or 'VENDOR' / 'USER' (Customer/Booker)
  String _role = 'DRIVER'; 

  // Step 1: Personal Details
  String _fullName = '';
  DateTime? _dateOfBirth;
  String _gender = 'Male'; // 'Male', 'Female', 'Other'
  String _email = '';
  String _phoneNumber = '';
  bool _isCorporate = false;
  String _companyName = '';
  String _gstNumber = '';

  // Step 2: Vehicle Information (Driver)
  String _vehicleType = 'Sedan';
  String _carModel = '';
  String _color = '';
  String _registrationNumber = '';

  // Step 3: Document Uploads (URLs from Cloudflare R2)
  String? _drivingLicenseUrl;
  String? _rcBookUrl;
  String? _insuranceUrl;
  String? _vehiclePhotoUrl;
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

  String get vehicleType => _vehicleType;
  String get carModel => _carModel;
  String get color => _color;
  String get registrationNumber => _registrationNumber;
  String get companyName => _companyName;
  String get gstNumber => _gstNumber;

  String? get drivingLicenseUrl => _drivingLicenseUrl;
  String? get rcBookUrl => _rcBookUrl;
  String? get insuranceUrl => _insuranceUrl;
  String? get vehiclePhotoUrl => _vehiclePhotoUrl;
  String? get selfieUrl => _selfieUrl;

  int get uploadedDocumentsCount {
    int count = 0;
    if (_drivingLicenseUrl != null) count++;
    if (_rcBookUrl != null) count++;
    if (_insuranceUrl != null) count++;
    if (_vehiclePhotoUrl != null) count++;
    return count;
  }

  bool get areAllDocumentsUploaded => uploadedDocumentsCount >= 4;

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
    String? companyName,
    bool? isCorporate,
  }) {
    if (fullName != null) _fullName = fullName;
    if (dateOfBirth != null) _dateOfBirth = dateOfBirth;
    if (gender != null) _gender = gender;
    if (email != null) _email = email;
    if (phone != null) _phoneNumber = phone;
    if (companyName != null) _companyName = companyName;
    if (isCorporate != null) _isCorporate = isCorporate;
    notifyListeners();
  }

  void setVehicleDetails({
    required String vehicleType,
    required String carModel,
    required String color,
    required String registrationNumber,
  }) {
    _vehicleType = vehicleType;
    _carModel = carModel;
    _color = color;
    _registrationNumber = registrationNumber;
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
      case 'DRIVING_LICENSE':
        _drivingLicenseUrl = url;
        break;
      case 'RC_BOOK':
        _rcBookUrl = url;
        break;
      case 'INSURANCE':
        _insuranceUrl = url;
        break;
      case 'VEHICLE_PHOTO':
        _vehiclePhotoUrl = url;
        break;
      case 'SELFIE':
        _selfieUrl = url;
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
    _isCorporate = false;
    _vehicleType = 'Sedan';
    _carModel = '';
    _color = '';
    _registrationNumber = '';
    _companyName = '';
    _gstNumber = '';
    _drivingLicenseUrl = null;
    _rcBookUrl = null;
    _insuranceUrl = null;
    _vehiclePhotoUrl = null;
    _selfieUrl = null;
    notifyListeners();
  }
}
