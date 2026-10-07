import 'package:flutter/material.dart';
import 'models/cab_cart_item.dart';
import 'models/fleet_template_model.dart';

class RequirementDraftProvider extends ChangeNotifier {
  // Step 1: Category & Vehicle & Quantity & Bidding Config
  String _fulfillmentMode = 'DIRECT_DISPATCH';
  String _vehicleType = 'Sedan';
  int _quantity = 5;
  String _specialRequests = '';
  double _suggestedBudget = 3500.0;
  double _maxBudgetCap = 4500.0;
  int _biddingWindowMinutes = 30;
  String _biddingPreferences = 'Verified AC Commercial Vehicles';

  // Step 2: Locations & Route
  String _tripType = 'One Way';
  String _pickupAddress = '';
  double _pickupLat = 0.0;
  double _pickupLng = 0.0;
  String _pickupInstructions = '';

  String _dropAddress = '';
  double _dropLat = 0.0;
  double _dropLng = 0.0;
  String _dropInstructions = '';

  // Step 3: Date & Time Schedule
  String _pickupDate = '';
  String _pickupTime = '';
  bool _hasReturn = false;
  String? _returnDate;
  String? _returnTime;
  DateTime _reportingDateTime = DateTime.now().add(const Duration(hours: 4));

  // Step 4 / Additional Options: Passengers & Stops & Notes
  int _passengers = 4;
  String? _selectedLuggage;
  String _additionalInfo = '';
  List<String> _additionalStops = [];

  // Road Routing Telemetry via OpenStreetMap (OSRM)
  double _roadDistanceKm = 0.0;
  int _estimatedDurationMinutes = 0;
  String _formattedEta = '';
  String _formattedDistance = '';

  // Corporate Zonal Rate Card Configuration (Hyderabad 2026)
  bool _zonalEnabled = false;
  String _zonalOfficeHubId = 'HITEC_NANAKRAMGUDA';
  String _zonalDirection = 'OUTBOUND_FROM_OFFICE'; // 'OUTBOUND_FROM_OFFICE' (office -> home) or 'INBOUND_TO_OFFICE' (home -> office)
  Map<String, dynamic>? _zonalLocality;
  bool _zonalHasEscort = false;
  Map<String, dynamic>? _zonalQuote;


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

  double get roadDistanceKm => _roadDistanceKm;
  int get estimatedDurationMinutes => _estimatedDurationMinutes;
  String get formattedEta => _formattedEta;
  String get formattedDistance => _formattedDistance;

  // Corporate Zonal Getters
  bool get zonalEnabled => _zonalEnabled;
  String get zonalOfficeHubId => _zonalOfficeHubId;
  String get zonalDirection => _zonalDirection;
  Map<String, dynamic>? get zonalLocality => _zonalLocality;
  bool get zonalHasEscort => _zonalHasEscort;
  Map<String, dynamic>? get zonalQuote => _zonalQuote;
  String? get zonalQuoteId => (_zonalEnabled && _zonalQuote != null && _zonalQuote!['canAutoQuote'] == true)
      ? _zonalQuote!['quoteId'] as String?
      : null;
  double? get zonalTotalAmount => (_zonalEnabled && _zonalQuote != null && _zonalQuote!['canAutoQuote'] == true)
      ? (_zonalQuote!['totalAmount'] as num?)?.toDouble()
      : null;


  // Setters / Updates
  void updateStep1({
    required String fulfillmentMode,
    required String vehicleType,
    required int quantity,
    int? passengers,
    String? specialRequests,
    double? suggestedBudget,
    double? maxBudgetCap,
    int? biddingWindowMinutes,
    String? biddingPreferences,
  }) {
    _fulfillmentMode = fulfillmentMode;
    _vehicleType = vehicleType;
    _quantity = quantity;
    if (passengers != null) _passengers = passengers;
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
    int? passengers,
    String? specialRequests,
  }) => updateStep1(
    fulfillmentMode: fulfillmentMode,
    vehicleType: vehicleType,
    quantity: quantity,
    passengers: passengers,
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
    List<String>? additionalStops,
    String? additionalInfo,
  }) {
    _pickupDate = pickupDate;
    _pickupTime = pickupTime;
    _hasReturn = hasReturn;
    _returnDate = returnDate;
    _returnTime = returnTime;
    if (additionalStops != null) _additionalStops = additionalStops;
    if (additionalInfo != null) _additionalInfo = additionalInfo;
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

  void setRoadRoute({
    required double distanceKm,
    required int durationMinutes,
    String? formattedDistance,
    String? formattedEta,
  }) {
    _roadDistanceKm = distanceKm;
    _estimatedDurationMinutes = durationMinutes;
    _formattedDistance = formattedDistance ?? (distanceKm < 1 ? '${(distanceKm * 1000).round()} m' : '${distanceKm.toStringAsFixed(1)} km');
    _formattedEta = formattedEta ?? (durationMinutes < 60 ? '$durationMinutes mins' : '${durationMinutes ~/ 60}h ${durationMinutes % 60}m');
    notifyListeners();
  }

  void clearRoadRoute() {
    _roadDistanceKm = 0.0;
    _estimatedDurationMinutes = 0;
    _formattedDistance = '';
    _formattedEta = '';
    notifyListeners();
  }

  void reset() {
    _fulfillmentMode = 'DIRECT_DISPATCH';
    _vehicleType = 'Sedan';
    _quantity = 5;
    _specialRequests = '';
    _tripType = 'One Way';
    _pickupAddress = '';
    _pickupLat = 0.0;
    _pickupLng = 0.0;
    _pickupInstructions = '';
    _dropAddress = '';
    _dropLat = 0.0;
    _dropLng = 0.0;
    _dropInstructions = '';
    _hasReturn = false;
    _returnDate = null;
    _returnTime = null;
    _passengers = 4;
    _selectedLuggage = null;
    _additionalInfo = '';
    _additionalStops = [];
    _roadDistanceKm = 0.0;
    _estimatedDurationMinutes = 0;
    _formattedEta = '';
    _formattedDistance = '';
    _zonalEnabled = false;
    _zonalOfficeHubId = 'HITEC_NANAKRAMGUDA';
    _zonalDirection = 'OUTBOUND_FROM_OFFICE';
    _zonalLocality = null;
    _zonalHasEscort = false;
    _zonalQuote = null;
    _cabs.clear();
    _initDefaultDateTime();
    notifyListeners();
  }

  void setZonalConfig({
    bool? enabled,
    String? officeHubId,
    String? direction,
    Map<String, dynamic>? locality,
    bool? hasEscort,
    Map<String, dynamic>? quote,
  }) {
    if (enabled != null) _zonalEnabled = enabled;
    if (officeHubId != null) _zonalOfficeHubId = officeHubId;
    if (direction != null) _zonalDirection = direction;
    if (locality != null) _zonalLocality = locality;
    if (hasEscort != null) _zonalHasEscort = hasEscort;
    if (quote != null) _zonalQuote = quote;
    notifyListeners();
  }

  // ── Multi-Cab Cart / Booking Manifest ─────────────────────────────────────
  final List<CabCartItem> _cabs = [];
  String _cartName = 'Corporate Fleet Manifest';

  List<CabCartItem> get cabs => List.unmodifiable(_cabs);
  int get totalCabsCount => _cabs.length;
  bool get hasCabs => _cabs.isNotEmpty;
  String get cartName => _cartName;

  void setCartName(String name) {
    _cartName = name.trim().isNotEmpty ? name.trim() : 'Corporate Fleet Manifest';
    notifyListeners();
  }

  double get cartTotalEstimatedFare =>
      _cabs.fold(0.0, (sum, cab) => sum + cab.estimatedFare);

  void addCab(CabCartItem cab) {
    _cabs.add(cab);
    notifyListeners();
  }

  void updateCab(int index, CabCartItem cab) {
    if (index >= 0 && index < _cabs.length) {
      _cabs[index] = cab;
      notifyListeners();
    }
  }

  void removeCab(int index) {
    if (index >= 0 && index < _cabs.length) {
      _cabs.removeAt(index);
      notifyListeners();
    }
  }

  void toggleCabExpanded(int index) {
    if (index >= 0 && index < _cabs.length) {
      _cabs[index].isExpanded = !_cabs[index].isExpanded;
      notifyListeners();
    }
  }

  void clearCart() {
    _cabs.clear();
    _cartName = 'Corporate Fleet Manifest';
    notifyListeners();
  }

  /// Loads cabs from a saved template, automatically adjusting date to today
  /// so users can run it daily with 1 click.
  void loadCartFromTemplate(FleetTemplate template, {bool adjustToToday = true}) {
    _cabs.clear();
    _cartName = template.name;

    final targetDate = DateTime.now();
    for (int i = 0; i < template.cabs.length; i++) {
      final item = template.cabs[i];
      if (adjustToToday) {
        _cabs.add(item.copyForDate(targetDate, index: i));
      } else {
        _cabs.add(item.copyWith(id: 'cab_${DateTime.now().millisecondsSinceEpoch}_$i', isExpanded: false));
      }
    }
    notifyListeners();
  }
}
