import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:geolocator/geolocator.dart';

/// Centralized Permission Service for AdhocX Driver App.
/// Requests and monitors device-level permissions following industry best practices:
/// - Location (Always) — mandatory for driver tracking & dispatch matching
/// - Notifications — for trip alerts (Android 13+ / API 33+)
/// - Camera — for KYC selfies & vehicle photo capture
/// - System Alert Window — for floating dispatch overlays over navigation apps
class PermissionService {
  PermissionService._();
  static final PermissionService instance = PermissionService._();

  /// Request all essential permissions at app launch.
  /// Called once after login / first app open.
  Future<Map<String, bool>> requestAllEssentialPermissions() async {
    if (kIsWeb) {
      return {'location': true, 'notification': true, 'camera': true};
    }

    final results = <String, bool>{};

    // 1. Location Permission (When In Use → Always for background tracking)
    results['location'] = await requestLocationPermission();

    // 2. Notification Permission (Android 13+ requires explicit POST_NOTIFICATIONS)
    results['notification'] = await requestNotificationPermission();

    // 3. Camera Permission (for KYC selfie capture)
    results['camera'] = await requestCameraPermission();

    return results;
  }

  /// Request location permission — first WhenInUse, then upgrade to Always.
  /// Request location permission — first WhenInUse, then upgrade to Always.
  Future<bool> requestLocationPermission() async {
    if (kIsWeb) return true;

    try {
      // 1. Always request runtime permission from the OS first
      var status = await Permission.locationWhenInUse.request();
      if (status.isDenied || status.isPermanentlyDenied) {
        debugPrint('📍 [PermissionService] Location WhenInUse denied: $status');
        return false;
      }

      // 2. Upgrade to Always for background tracking (Android & iOS)
      if (!kIsWeb && (Platform.isAndroid || Platform.isIOS)) {
        try {
          final alwaysStatus = await Permission.locationAlways.request();
          if (alwaysStatus.isGranted) {
            debugPrint('📍 [PermissionService] Location Always granted');
          } else {
            debugPrint('📍 [PermissionService] Location Always not granted, using WhenInUse');
          }
        } catch (e) {
          debugPrint('📍 [PermissionService] Location Always request skipped: $e');
        }
      }

      // 3. Check if GPS hardware / location service is enabled on the device
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        debugPrint('📍 [PermissionService] Location services (GPS) disabled on device');
        return false;
      }

      return true;
    } catch (e) {
      debugPrint('📍 [PermissionService] Location permission error: $e');
      return false;
    }
  }

  /// Open device GPS location settings
  Future<bool> openLocationSettings() async {
    if (kIsWeb) return false;
    try {
      return await Geolocator.openLocationSettings();
    } catch (_) {
      return false;
    }
  }

  /// Request notification permission (required on Android 13+ / API 33+).
  Future<bool> requestNotificationPermission() async {
    if (kIsWeb) return true;

    try {
      final status = await Permission.notification.request();
      debugPrint('🔔 [PermissionService] Notification permission: $status');
      return status.isGranted || status.isProvisional;
    } catch (e) {
      debugPrint('🔔 [PermissionService] Notification permission error: $e');
      return true; // Non-critical, don't block
    }
  }

  /// Request camera permission (for KYC selfie / vehicle photos).
  Future<bool> requestCameraPermission() async {
    if (kIsWeb) return true;

    try {
      final status = await Permission.camera.request();
      debugPrint('📷 [PermissionService] Camera permission: $status');
      return status.isGranted;
    } catch (e) {
      debugPrint('📷 [PermissionService] Camera permission error: $e');
      return false;
    }
  }

  /// Check if location permission is currently granted.
  Future<bool> isLocationPermissionGranted() async {
    if (kIsWeb) return true;
    try {
      final status = await Permission.locationWhenInUse.status;
      return status.isGranted;
    } catch (_) {
      return true;
    }
  }

  /// Check if GPS / location services are enabled on the device.
  Future<bool> isLocationServiceEnabled() async {
    if (kIsWeb) return true;
    try {
      return await Geolocator.isLocationServiceEnabled();
    } catch (_) {
      return true;
    }
  }

  /// Get current device GPS position.
  /// Returns null if location is unavailable or permission denied.
  Future<Position?> getCurrentPosition() async {
    if (kIsWeb) return null;
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return null;

      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        return null;
      }

      return await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );
    } catch (e) {
      debugPrint('📍 [PermissionService] getCurrentPosition error: $e');
      return null;
    }
  }

  /// Check if overlay (SYSTEM_ALERT_WINDOW) permission is granted.
  Future<bool> isOverlayPermissionGranted() async {
    if (kIsWeb) return true;
    try {
      final status = await Permission.systemAlertWindow.status;
      return status.isGranted;
    } catch (_) {
      return true;
    }
  }
}
