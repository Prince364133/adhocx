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

  /// Request essential permissions.
  /// NOTE: Google Play Developer Policy strictly mandates:
  /// 1. Location permission MUST ONLY be requested after prominent disclosure affirmative consent.
  /// 2. Camera permission MUST ONLY be requested in-context when capturing KYC selfies or vehicle photos.
  Future<Map<String, bool>> requestAllEssentialPermissions() async {
    if (kIsWeb) {
      return {'location': true, 'notification': true, 'camera': true};
    }

    final results = <String, bool>{};

    // 1. Check if location is already granted (do NOT prompt without disclosure)
    results['location'] = await isLocationPermissionGranted();

    // 2. Notification Permission (Android 13+ requires explicit POST_NOTIFICATIONS)
    results['notification'] = await requestNotificationPermission();

    // 3. Camera Permission is deferred to KYC action (Contextual Permission)
    results['camera'] = false;

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
      final permission = await Geolocator.checkPermission();
      return permission == LocationPermission.always ||
          permission == LocationPermission.whileInUse;
    } catch (_) {
      try {
        final status = await Permission.locationWhenInUse.status;
        return status.isGranted;
      } catch (_) {
        return false;
      }
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
  /// If [requestIfDenied] is true, prompts OS permission dialog if not yet granted.
  /// Uses [Geolocator.getLastKnownPosition] as an instant fallback if high-accuracy GPS fix times out.
  Future<Position?> getCurrentPosition({bool requestIfDenied = true}) async {
    if (kIsWeb) return null;
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        debugPrint('📍 [PermissionService] Location service (GPS) is disabled on device');
        return null;
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied && requestIfDenied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        debugPrint('📍 [PermissionService] Location permission not granted: $permission');
        return null;
      }

      // 1. Try fast last known position first as immediate candidate
      Position? lastPosition;
      try {
        lastPosition = await Geolocator.getLastKnownPosition();
      } catch (e) {
        debugPrint('📍 [PermissionService] getLastKnownPosition error: $e');
      }

      // 2. Fetch fresh high-accuracy GPS fix with a 6-second timeout
      try {
        final currentPosition = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.high,
            timeLimit: Duration(seconds: 6),
          ),
        );
        return currentPosition;
      } catch (timeoutOrError) {
        debugPrint('📍 [PermissionService] High accuracy fix timed out, checking fallback: $timeoutOrError');
        if (lastPosition != null) {
          return lastPosition;
        }

        // 3. Fallback to medium/network accuracy
        return await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.medium,
            timeLimit: Duration(seconds: 4),
          ),
        );
      }
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
