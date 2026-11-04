import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;

/// Centralized service to load and provide mock data from JSON assets.
/// Eliminates hardcoded data strings across employee app screens.
class MockDataService {
  MockDataService._();

  static Map<String, dynamic>? _cachedData;

  /// Loads the main JSON mock data bundle
  static Future<Map<String, dynamic>> loadData() async {
    if (_cachedData != null) return _cachedData!;

    try {
      final jsonString = await rootBundle.loadString('assets/data/mock_data.json');
      _cachedData = json.decode(jsonString) as Map<String, dynamic>;
    } catch (_) {
      // Fallback empty map if bundle is not yet mounted
      _cachedData = {};
    }
    return _cachedData!;
  }

  /// Get employee commuter profile
  static Future<Map<String, dynamic>> getEmployeeProfile() async {
    final data = await loadData();
    return data['employee'] as Map<String, dynamic>? ?? {
      'employeeId': 'EMP10294',
      'name': 'Ravi Kumar',
      'organization': 'Estemporaneo Tech Pvt. Ltd.',
      'office': 'HITEC City Office, Hyderabad',
    };
  }

  /// Get specific trip by status key (e.g. 'upcoming_pickup', 'assigned', 'completed')
  static Future<Map<String, dynamic>?> getTrip(String statusKey) async {
    final data = await loadData();
    final trips = data['trips'] as Map<String, dynamic>?;
    return trips?[statusKey] as Map<String, dynamic>?;
  }

  /// Get schedules data (today, weekly, monthly, shift details)
  static Future<Map<String, dynamic>> getSchedules() async {
    final data = await loadData();
    return data['schedules'] as Map<String, dynamic>? ?? {};
  }

  /// Get driver and vehicle assignment data
  static Future<Map<String, dynamic>> getDriverAssignment() async {
    final data = await loadData();
    return data['driver_assignment'] as Map<String, dynamic>? ?? {};
  }

  /// Get live telemetry, navigation & walking directions
  static Future<Map<String, dynamic>> getLiveTracking() async {
    final data = await loadData();
    return data['live_tracking'] as Map<String, dynamic>? ?? {};
  }

  /// Get boarding & completion flow data (OTP, QR, feedback)
  static Future<Map<String, dynamic>> getBoardingData() async {
    final data = await loadData();
    return data['boarding_completion'] as Map<String, dynamic>? ?? {};
  }

  /// Get safety, SOS & helpdesk data (Batch 07)
  static Future<Map<String, dynamic>> getSafetyData() async {
    final data = await loadData();
    return data['safety_sos_helpdesk'] as Map<String, dynamic>? ?? {};
  }

  /// Get history, analytics, notifications & profile data (Batch 08)
  static Future<Map<String, dynamic>> getHistoryProfileData() async {
    final data = await loadData();
    return data['history_notifications_profile'] as Map<String, dynamic>? ?? {};
  }
}

