import 'package:flutter/material.dart';
import 'permission_service.dart';

/// Centralized Manager controlling and simulating system edge cases:
/// 1. Location Permission Required
/// 2. Location Unavailable
/// 3. Network Offline
/// 4. Session Expired
class EdgeCaseManager extends ChangeNotifier {
  static final EdgeCaseManager instance = EdgeCaseManager._internal();
  EdgeCaseManager._internal();

  bool _isLocationPermissionGranted = true;
  bool _isLocationAvailable = true;
  bool _isNetworkOnline = true;
  bool _isSessionValid = true;

  bool get isLocationPermissionGranted => _isLocationPermissionGranted;
  bool get isLocationAvailable => _isLocationAvailable;
  bool get isNetworkOnline => _isNetworkOnline;
  bool get isSessionValid => _isSessionValid;

  /// Initialize with real device permission states.
  /// Called at app startup to determine actual permission status.
  Future<void> initializeRealPermissions() async {
    try {
      final locGranted = await PermissionService.instance.isLocationPermissionGranted();
      final locAvailable = await PermissionService.instance.isLocationServiceEnabled();

      _isLocationPermissionGranted = locGranted;
      _isLocationAvailable = locAvailable;
      notifyListeners();

      debugPrint('🔑 [EdgeCaseManager] Permissions initialized: '
          'locPermission=$locGranted, locAvailable=$locAvailable');
    } catch (e) {
      debugPrint('🔑 [EdgeCaseManager] Permission check error: $e');
      // Default to true to avoid blocking the UI if permission check fails
      _isLocationPermissionGranted = true;
      _isLocationAvailable = true;
      notifyListeners();
    }
  }

  void toggleLocationPermission([bool? value]) {
    _isLocationPermissionGranted = value ?? !_isLocationPermissionGranted;
    notifyListeners();
  }

  void toggleLocationAvailability([bool? value]) {
    _isLocationAvailable = value ?? !_isLocationAvailable;
    notifyListeners();
  }

  void toggleNetworkOnline([bool? value]) {
    _isNetworkOnline = value ?? !_isNetworkOnline;
    notifyListeners();
  }

  void toggleSessionValid([bool? value]) {
    _isSessionValid = value ?? !_isSessionValid;
    notifyListeners();
  }

  void grantLocationPermission() {
    _isLocationPermissionGranted = true;
    _isLocationAvailable = true;
    notifyListeners();
  }

  void retryLocationFix() {
    _isLocationAvailable = true;
    notifyListeners();
  }

  void retryNetworkConnection() {
    _isNetworkOnline = true;
    notifyListeners();
  }
}
