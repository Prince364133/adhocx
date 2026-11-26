import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class EmployeeAddress {
  final String houseNumber;
  final String building;
  final String locality;
  final String landmark;
  final String city;
  final String state;
  final String pinCode;
  final String additionalDetails;

  const EmployeeAddress({
    this.houseNumber = '',
    this.building = '',
    this.locality = '',
    this.landmark = '',
    this.city = '',
    this.state = '',
    this.pinCode = '',
    this.additionalDetails = '',
  });

  factory EmployeeAddress.initial() => const EmployeeAddress(
        houseNumber: '42',
        building: 'Greenwood Apartments',
        locality: 'Whitefield',
        landmark: 'Near Phoenix Marketcity',
        city: 'Bengaluru',
        state: 'Karnataka',
        pinCode: '560066',
      );

  String get fullAddress => [
        houseNumber,
        building,
        locality,
        landmark,
        city,
        state,
        pinCode,
      ].where((value) => value.trim().isNotEmpty).join(', ');

  Map<String, dynamic> toJson() => {
        'houseNumber': houseNumber,
        'building': building,
        'locality': locality,
        'landmark': landmark,
        'city': city,
        'state': state,
        'pinCode': pinCode,
        'additionalDetails': additionalDetails,
      };

  factory EmployeeAddress.fromJson(Map<String, dynamic>? json) =>
      EmployeeAddress(
        houseNumber: json?['houseNumber']?.toString() ?? '',
        building: json?['building']?.toString() ?? '',
        locality: json?['locality']?.toString() ?? '',
        landmark: json?['landmark']?.toString() ?? '',
        city: json?['city']?.toString() ?? '',
        state: json?['state']?.toString() ?? '',
        pinCode: json?['pinCode']?.toString() ?? '',
        additionalDetails: json?['additionalDetails']?.toString() ?? '',
      );

  EmployeeAddress copyWith({
    String? houseNumber,
    String? building,
    String? locality,
    String? landmark,
    String? city,
    String? state,
    String? pinCode,
    String? additionalDetails,
  }) =>
      EmployeeAddress(
        houseNumber: houseNumber ?? this.houseNumber,
        building: building ?? this.building,
        locality: locality ?? this.locality,
        landmark: landmark ?? this.landmark,
        city: city ?? this.city,
        state: state ?? this.state,
        pinCode: pinCode ?? this.pinCode,
        additionalDetails: additionalDetails ?? this.additionalDetails,
      );
}

class PickupPointOption {
  final String id;
  final String name;
  final String description;
  final String landmark;
  final String distance;
  final double x;
  final double y;

  const PickupPointOption({
    required this.id,
    required this.name,
    required this.description,
    required this.landmark,
    required this.distance,
    required this.x,
    required this.y,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'description': description,
        'landmark': landmark,
        'distance': distance,
        'x': x,
        'y': y,
      };

  factory PickupPointOption.fromJson(Map<String, dynamic> json) =>
      PickupPointOption(
        id: json['id']?.toString() ?? '',
        name: json['name']?.toString() ?? '',
        description: json['description']?.toString() ?? '',
        landmark: json['landmark']?.toString() ?? '',
        distance: json['distance']?.toString() ?? '',
        x: (json['x'] is num) ? (json['x'] as num).toDouble() : 0.5,
        y: (json['y'] is num) ? (json['y'] as num).toDouble() : 0.5,
      );
}

class EmployeeFeatureProvider extends ChangeNotifier {
  static const _noShowKey = 'employee_feature_no_show_v1';
  static const _addressKey = 'employee_feature_address_v1';
  static const _pickupKey = 'employee_feature_pickup_v1';
  static const _notificationKey = 'employee_feature_notifications_v1';

  final SharedPreferences? _preferences;
  bool _loading = true;

  int noShowCount = 0;
  List<Map<String, dynamic>> noShowHistory = const [];
  String? reactivationStatus;
  String? reactivationReason;
  String? reactivationRemarks;

  EmployeeAddress registeredAddress = EmployeeAddress.initial();
  List<Map<String, dynamic>> addressRequests = const [];

  String? confirmedPickupPointId;
  String? selectedPickupPointId;
  List<PickupPointOption> nearbyPickupPoints = const [];
  List<Map<String, dynamic>> featureNotifications = const [];

  bool get isLoading => _loading;
  bool get transportationBlocked => noShowCount >= 3;

  EmployeeFeatureProvider({SharedPreferences? preferences})
      : _preferences = preferences {
    nearbyPickupPoints = const [
      PickupPointOption(
        id: 'gateway',
        name: 'Metro Station Main Gate',
        description: 'Wide pickup bay near the main road',
        landmark: 'Main entrance, Gate 1',
        distance: '280 m',
        x: 0.30,
        y: 0.38,
      ),
      PickupPointOption(
        id: 'mall',
        name: 'Phoenix Plaza East Bay',
        description: 'Safe roadside pickup near the eastern entrance',
        landmark: 'Opposite food court entrance',
        distance: '420 m',
        x: 0.72,
        y: 0.30,
      ),
      PickupPointOption(
        id: 'pharmacy',
        name: 'Apollo Signal Pickup',
        description: 'Cab-friendly point beside the signal',
        landmark: 'Near Apollo Pharmacy',
        distance: '610 m',
        x: 0.58,
        y: 0.72,
      ),
    ];
    _initialize();
  }

  Future<void> _initialize() async {
    final prefs = _preferences ?? await SharedPreferences.getInstance();

    final noShowJson = prefs.getString(_noShowKey);
    if (noShowJson != null) {
      final data = jsonDecode(noShowJson) as Map<String, dynamic>;
      noShowCount = (data['count'] as num?)?.toInt() ?? 0;
      noShowHistory = (data['history'] as List?)
              ?.whereType<Map>()
              .map((item) => Map<String, dynamic>.from(item))
              .toList() ??
          const [];
      reactivationStatus = data['reactivationStatus']?.toString();
      reactivationReason = data['reactivationReason']?.toString();
      reactivationRemarks = data['reactivationRemarks']?.toString();
    } else {
      noShowHistory = [
        {
          'number': 1,
          'date': '2026-11-18',
          'time': '08:10',
          'tripType': 'Morning Pickup',
          'tripReference': 'AX-PK-1842',
          'status': 'Confirmed',
        },
        {
          'number': 2,
          'date': '2026-11-24',
          'time': '18:48',
          'tripType': 'Evening Logout',
          'tripReference': 'AX-LG-2316',
          'status': 'Confirmed',
        },
      ];
      noShowCount = 2;
      await _saveNoShow(prefs);
    }

    final addressJson = prefs.getString(_addressKey);
    if (addressJson != null) {
      final data = jsonDecode(addressJson) as Map<String, dynamic>;
      registeredAddress =
          EmployeeAddress.fromJson(data['registeredAddress'] as Map<String, dynamic>?);
      addressRequests = (data['requests'] as List?)
              ?.whereType<Map>()
              .map((item) => Map<String, dynamic>.from(item))
              .toList() ??
          const [];
    } else {
      registeredAddress = EmployeeAddress.initial();
      addressRequests = [
        {
          'id': 'addr-100',
          'requestDate': '2026-11-20',
          'previousAddress': EmployeeAddress.initial().fullAddress,
          'proposedAddress':
              '56, Lakeview Residency, Brookfield, Bengaluru, Karnataka, 560037',
          'status': 'Approved',
          'decisionDate': '2026-11-21',
          'remarks': 'Frontend simulation: approved for demonstration.',
        },
      ];
      await _saveAddress(prefs);
    }

    final pickupJson = prefs.getString(_pickupKey);
    if (pickupJson != null) {
      final data = jsonDecode(pickupJson) as Map<String, dynamic>;
      confirmedPickupPointId = data['confirmedId']?.toString();
      selectedPickupPointId =
          data['selectedId']?.toString() ?? confirmedPickupPointId;
    }

    final notificationJson = prefs.getString(_notificationKey);
    if (notificationJson != null) {
      featureNotifications = (jsonDecode(notificationJson) as List)
          .whereType<Map>()
          .map((item) => Map<String, dynamic>.from(item))
          .toList();
    }

    _loading = false;
    notifyListeners();
  }

  Future<void> _saveNoShow(SharedPreferences prefs) async {
    await prefs.setString(
      _noShowKey,
      jsonEncode({
        'count': noShowCount,
        'history': noShowHistory,
        'reactivationStatus': reactivationStatus,
        'reactivationReason': reactivationReason,
        'reactivationRemarks': reactivationRemarks,
      }),
    );
  }

  Future<void> _saveAddress(SharedPreferences prefs) async {
    await prefs.setString(
      _addressKey,
      jsonEncode({
        'registeredAddress': registeredAddress.toJson(),
        'requests': addressRequests,
      }),
    );
  }

  Future<void> _savePickup(SharedPreferences prefs) async {
    await prefs.setString(
      _pickupKey,
      jsonEncode({
        'confirmedId': confirmedPickupPointId,
        'selectedId': selectedPickupPointId,
      }),
    );
  }

  Future<void> _saveNotifications(SharedPreferences prefs) async {
    await prefs.setString(_notificationKey, jsonEncode(featureNotifications));
  }

  void setLoading(bool value) {
    _loading = value;
    notifyListeners();
  }

  Future<void> recordNoShow({
    required String tripType,
    String? tripReference,
  }) async {
    if (noShowCount >= 3) return;
    final next = noShowCount + 1;
    final now = DateTime.now();
    noShowCount = next;
    noShowHistory = [
      ...noShowHistory,
      {
        'number': next,
        'date':
            '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}',
        'time':
            '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}',
        'tripType': tripType,
        'tripReference': tripReference ?? 'AX-NEW-$next',
        'status': 'Confirmed',
      },
    ];
    reactivationStatus = null;
    await _saveNoShow(_preferences ?? await SharedPreferences.getInstance());
    notifyListeners();
  }

  Future<void> submitReactivation(String reason) async {
    if (noShowCount < 3 || reactivationStatus == 'PENDING') return;
    reactivationStatus = 'PENDING';
    reactivationReason = reason;
    reactivationRemarks = null;
    await _saveNoShow(_preferences ?? await SharedPreferences.getInstance());
    _addNotification(
      'Reactivation Request Submitted',
      'Your request is awaiting manager approval. This result is a frontend simulation.',
    );
  }

  Future<void> simulateReactivationDecision(bool approved) async {
    if (reactivationStatus != 'PENDING') return;
    reactivationStatus = approved ? 'APPROVED' : 'REJECTED';
    reactivationRemarks = approved
        ? 'Frontend simulation: transportation access reactivated.'
        : 'Frontend simulation: one more review is required.';
    if (approved) noShowCount = 0;
    await _saveNoShow(_preferences ?? await SharedPreferences.getInstance());
    _addNotification(
      approved ? 'Transportation Reactivated' : 'Reactivation Rejected',
      approved
          ? 'Your transportation access is active. This was a frontend simulation.'
          : 'Transportation remains blocked. You may submit another request.',
    );
  }

  Future<void> submitAddressRequest({
    required EmployeeAddress proposedAddress,
    required String reason,
  }) async {
    if (addressRequests.any((request) =>
        request['status']?.toString().toUpperCase() == 'PENDING')) {
      return;
    }
    final now = DateTime.now();
    addressRequests = [
      ...addressRequests,
      {
        'id': 'addr-${now.millisecondsSinceEpoch}',
        'requestDate':
            '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}',
        'previousAddress': registeredAddress.fullAddress,
        'proposedAddress': proposedAddress.fullAddress,
        'proposedAddressJson': proposedAddress.toJson(),
        'reason': reason,
        'status': 'Pending',
        'decisionDate': null,
        'remarks': null,
      },
    ];
    await _saveAddress(_preferences ?? await SharedPreferences.getInstance());
    _addNotification(
      'Address Request Submitted',
      'Your address update request is awaiting manager approval.',
    );
  }

  Future<void> simulateAddressDecision(String requestId, bool approved) async {
    final index =
        addressRequests.indexWhere((request) => request['id'] == requestId);
    if (index < 0) return;
    final request = Map<String, dynamic>.from(addressRequests[index]);
    final status = approved ? 'Approved' : 'Rejected';
    request['status'] = status;
    request['decisionDate'] = DateTime.now().toIso8601String().substring(0, 10);
    request['remarks'] = approved
        ? 'Frontend simulation: approved by a demonstration manager.'
        : 'Frontend simulation: the proposed address needs verification.';
    addressRequests = [
      ...addressRequests.take(index),
      request,
      ...addressRequests.skip(index + 1),
    ];
    if (approved &&
        request['proposedAddressJson'] is Map<String, dynamic>) {
      registeredAddress =
          EmployeeAddress.fromJson(request['proposedAddressJson'] as Map<String, dynamic>);
    } else if (approved &&
        request['proposedAddressJson'] is Map) {
      registeredAddress = EmployeeAddress.fromJson(
        Map<String, dynamic>.from(request['proposedAddressJson'] as Map),
      );
    }
    await _saveAddress(_preferences ?? await SharedPreferences.getInstance());
    _addNotification(
      approved ? 'Address Request Approved' : 'Address Request Rejected',
      approved
          ? 'Your registered address has been updated in this frontend simulation.'
          : 'Your existing registered address remains unchanged.',
    );
  }

  void selectPickupPoint(String id) {
    selectedPickupPointId = id;
    notifyListeners();
  }

  Future<void> confirmPickupPoint() async {
    if (selectedPickupPointId == null) return;
    final wasConfirmed = confirmedPickupPointId != null;
    confirmedPickupPointId = selectedPickupPointId;
    await _savePickup(_preferences ?? await SharedPreferences.getInstance());
    _addNotification(
      wasConfirmed ? 'Pickup Point Updated' : 'Pickup Point Confirmed',
      wasConfirmed
          ? 'Your pickup point has been updated successfully.'
          : 'Your pickup point selection has been saved successfully.',
    );
  }

  PickupPointOption? get confirmedPickupPoint {
    if (confirmedPickupPointId == null) return null;
    for (final point in nearbyPickupPoints) {
      if (point.id == confirmedPickupPointId) return point;
    }
    return null;
  }

  PickupPointOption? get selectedPickupPoint {
    if (selectedPickupPointId == null) return null;
    for (final point in nearbyPickupPoints) {
      if (point.id == selectedPickupPointId) return point;
    }
    return null;
  }

  void _addNotification(String title, String message) {
    featureNotifications = [
      {
        'id': 'local-${DateTime.now().millisecondsSinceEpoch}',
        'title': title,
        'message': message,
        'timestamp': DateTime.now().toIso8601String(),
        'type': 'FEATURE_UPDATE',
        'read': false,
        'frontendSimulation': true,
      },
      ...featureNotifications,
    ];
    if (_preferences != null) {
      _saveNotifications(_preferences);
    } else {
      SharedPreferences.getInstance().then(_saveNotifications);
    }
    notifyListeners();
  }
}
