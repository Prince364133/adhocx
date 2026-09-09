import 'package:flutter/material.dart';

class RequirementDraftProvider extends ChangeNotifier {
  // Step 1: Category & Vehicle & Quantity & Bidding Config
  String _fulfillmentMode = 'DIRECT_DISPATCH';
  String _vehicleType = 'Sedan';
  int _quantity = 10;
  String _specialRequests = '';
  double _suggestedBudget = 3500.0;
  double _maxBudgetCap = 4500.0;
  int _biddingWindowMinutes = 30;
  String _biddingPreferences = 'Verified AC Commercial Vehicles';

  // Step 2: Locations & Route
  String _tripType = 'One Way';
  String _pickupAddress = 'DLF Cyber City, Gurugram';
  double _pickupLat = 28.4950;
  double _pickupLng = 77.0895;
  String _pickupInstructions = '';

  String _dropAddress = 'Indira Gandhi International Airport, Delhi';
  double _dropLat = 28.5562;
  double _dropLng = 77.1000;
  String _dropInstructions = '';

  // Step 3: Date & Time Schedule
  String _pickupDate = '';
  String _pickupTime = '';
  bool _hasReturn = false;
  String? _returnDate;
  String? _returnTime;
  DateTime _reportingDateTime = DateTime.now().add(const Duration(hours: 4));

  // Step 4: Passengers & Luggage & Notes
  int _passengers = 1;
  String? _selectedLuggage = 'Standard (2 Suitcases)';
  String _additionalInfo = '';
  List<String> _additionalStops = [];

  RequirementDraftProvider() {
    _initDefaultDateTime();
  }

  void _initDefaultDateTime() {
    final now = DateTime.now().add(const Duration(hours: 4));
    _reportingDateTime = now;
    _pickupDate = '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
    final hour = now.hour;
    final minute = now.minute.toString().padLeft(2, '0');
    final period = hour >= 12 ? 'PM' : 'AM';
    final displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
    _pickupTime = '${displayHour.toString().padLeft(2, '0')}:$minute $period';
  }

  // Getters
  String get fulfillmentMode => _fulfillmentMode;
  bool get isBiddingMode => _fulfillmentMode == 'BIDDING';
  String get vehicleType => _vehicleType;
  int get quantity => _quantity;
  String get specialRequests => _specialRequests;
  String get specialInstructions => _specialRequests;
  double get suggestedBudget => _suggestedBudget;
  double get targetBudget => _suggestedBudget;
  double get maxBudgetCap => _maxBudgetCap;
  int get biddingWindowMinutes => _biddingWindowMinutes;
  String get biddingPreferences => _biddingPreferences;

  String get tripType => _tripType;
  String get pickupAddress => _pickupAddress;
  String get pickupLocation => _pickupAddress;
  double get pickupLat => _pickupLat;
  double get pickupLng => _pickupLng;
  String get pickupInstructions => _pickupInstructions;

  String get dropAddress => _dropAddress;
  String get dropLocation => _dropAddress;
  double get dropLat => _dropLat;
  double get dropLng => _dropLng;
  String get dropInstructions => _dropInstructions;

  String get pickupDate => _pickupDate;
  String get pickupTime => _pickupTime;
  bool get hasReturn => _hasReturn;
  String? get returnDate => _returnDate;
  String? get returnTime => _returnTime;
  DateTime get reportingDateTime => _reportingDateTime;

  int get passengers => _passengers;
  String? get selectedLuggage => _selectedLuggage;
  String get luggage => _selectedLuggage ?? 'Standard (2 Suitcases)';
  String get additionalInfo => _additionalInfo;
  List<String> get additionalStops => _additionalStops;

  // Setters / Updates
  void updateStep1({
    required String fulfillmentMode,
    required String vehicleType,
    required int quantity,
    String? specialRequests,
    double? suggestedBudget,
    double? maxBudgetCap,
    int? biddingWindowMinutes,
    String? biddingPreferences,
  }) {
    _fulfillmentMode = fulfillmentMode;
    _vehicleType = vehicleType;
    _quantity = quantity;
    if (specialRequests != null) _specialRequests = specialRequests;
    if (suggestedBudget != null) _suggestedBudget = suggestedBudget;
    if (maxBudgetCap != null) _maxBudgetCap = maxBudgetCap;
    if (biddingWindowMinutes != null) _biddingWindowMinutes = biddingWindowMinutes;
    if (biddingPreferences != null) _biddingPreferences = biddingPreferences;
    notifyListeners();
  }

  void setStep1({
    required String fulfillmentMode,
    required String vehicleType,
    required int quantity,
    String? specialRequests,
  }) => updateStep1(
    fulfillmentMode: fulfillmentMode,
    vehicleType: vehicleType,
    quantity: quantity,
    specialRequests: specialRequests,
  );

  void updateStep2({
    required String pickupLocation,
    String? pickupInstructions,
    required String dropLocation,
    String? dropInstructions,
    String? tripType,
    double? pickupLat,
    double? pickupLng,
    double? dropLat,
    double? dropLng,
  }) {
    _pickupAddress = pickupLocation;
    if (pickupInstructions != null) _pickupInstructions = pickupInstructions;
    _dropAddress = dropLocation;
    if (dropInstructions != null) _dropInstructions = dropInstructions;
    if (tripType != null) _tripType = tripType;
    if (pickupLat != null) _pickupLat = pickupLat;
    if (pickupLng != null) _pickupLng = pickupLng;
    if (dropLat != null) _dropLat = dropLat;
    if (dropLng != null) _dropLng = dropLng;
    notifyListeners();
  }

  void setStep2({
    required String pickupAddress,
    required double pickupLat,
    required double pickupLng,
    String? pickupInstructions,
    required String dropAddress,
    required double dropLat,
    required double dropLng,
    String? dropInstructions,
    String? tripType,
  }) => updateStep2(
    pickupLocation: pickupAddress,
    pickupInstructions: pickupInstructions,
    dropLocation: dropAddress,
    dropInstructions: dropInstructions,
    tripType: tripType,
    pickupLat: pickupLat,
    pickupLng: pickupLng,
    dropLat: dropLat,
    dropLng: dropLng,
  );

  void updateStep3({
    required String pickupDate,
    required String pickupTime,
    required bool hasReturn,
    String? returnDate,
    String? returnTime,
    DateTime? reportingDateTime,
  }) {
    _pickupDate = pickupDate;
    _pickupTime = pickupTime;
    _hasReturn = hasReturn;
    _returnDate = returnDate;
    _returnTime = returnTime;
    if (reportingDateTime != null) {
      _reportingDateTime = reportingDateTime;
    } else {
      // Try to parse reporting date time
      try {
        final dateParts = _pickupDate.split('-');
        if (dateParts.length == 3) {
          final year = int.parse(dateParts[0]);
          final month = int.parse(dateParts[1]);
          final day = int.parse(dateParts[2]);
          int hour = 12;
          int minute = 0;
          if (_pickupTime.contains(':')) {
            final timeClean = _pickupTime.replaceAll(RegExp(r'[APMapm\s]'), '');
            final timeParts = timeClean.split(':');
            hour = int.parse(timeParts[0]);
            minute = int.parse(timeParts[1]);
            if (_pickupTime.toUpperCase().contains('PM') && hour < 12) hour += 12;
            if (_pickupTime.toUpperCase().contains('AM') && hour == 12) hour = 0;
          }
          _reportingDateTime = DateTime(year, month, day, hour, minute);
        }
      } catch (_) {}
    }
    notifyListeners();
  }

  void setStep3({required DateTime reportingDateTime}) {
    _reportingDateTime = reportingDateTime;
    _pickupDate = '${reportingDateTime.year}-${reportingDateTime.month.toString().padLeft(2, '0')}-${reportingDateTime.day.toString().padLeft(2, '0')}';
    final hour = reportingDateTime.hour;
    final minute = reportingDateTime.minute.toString().padLeft(2, '0');
    final period = hour >= 12 ? 'PM' : 'AM';
    final displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
    _pickupTime = '${displayHour.toString().padLeft(2, '0')}:$minute $period';
    notifyListeners();
  }

  void updateStep4({
    required int passengers,
    String? selectedLuggage,
    String? additionalInfo,
    List<String>? additionalStops,
  }) {
    _passengers = passengers;
    if (selectedLuggage != null) _selectedLuggage = selectedLuggage;
    if (additionalInfo != null) _additionalInfo = additionalInfo;
    if (additionalStops != null) _additionalStops = additionalStops;
    notifyListeners();
  }

  void setStep4({
    required int passengers,
    String? luggage,
    String? specialInstructions,
  }) => updateStep4(
    passengers: passengers,
    selectedLuggage: luggage,
    additionalInfo: specialInstructions,
  );

  void reset() {
    _fulfillmentMode = 'DIRECT_DISPATCH';
    _vehicleType = 'Sedan';
    _quantity = 10;
    _specialRequests = '';
    _tripType = 'One Way';
    _pickupAddress = 'DLF Cyber City, Gurugram';
    _pickupLat = 28.4950;
    _pickupLng = 77.0895;
    _pickupInstructions = '';
    _dropAddress = 'Indira Gandhi International Airport, Delhi';
    _dropLat = 28.5562;
    _dropLng = 77.1000;
    _dropInstructions = '';
    _hasReturn = false;
    _returnDate = null;
    _returnTime = null;
    _passengers = 1;
    _selectedLuggage = 'Standard (2 Suitcases)';
    _additionalInfo = '';
    _additionalStops = [];
    _initDefaultDateTime();
    notifyListeners();
  }
}
