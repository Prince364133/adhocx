import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'edge_case_manager.dart';
import 'driver_service.dart';

/// Monitors device GPS state and enforces mandatory location for online drivers.
/// When GPS is turned off while the driver is online, automatically switches to OFFLINE.
class LocationMonitorService {
  LocationMonitorService._();
  static final LocationMonitorService instance = LocationMonitorService._();

  StreamSubscription<ServiceStatus>? _serviceStatusSub;
  bool _isMonitoring = false;
  VoidCallback? _onAutoOffline;

  bool get isMonitoring => _isMonitoring;

  /// Start monitoring GPS service status.
  /// [onAutoOffline] is called when the driver is auto-switched to offline due to GPS being disabled.
  void startMonitoring({VoidCallback? onAutoOffline}) {
    if (kIsWeb || _isMonitoring) return;

    _onAutoOffline = onAutoOffline;
    _isMonitoring = true;

    try {
      _serviceStatusSub = Geolocator.getServiceStatusStream().listen(
        (ServiceStatus status) {
          debugPrint('📍 [LocationMonitor] GPS Service Status: $status');

          if (status == ServiceStatus.disabled) {
            _handleLocationDisabled();
          } else if (status == ServiceStatus.enabled) {
            _handleLocationEnabled();
          }
        },
        onError: (e) {
          debugPrint('📍 [LocationMonitor] Stream error: $e');
        },
      );
      debugPrint('📍 [LocationMonitor] Started GPS state monitoring');
    } catch (e) {
      debugPrint('📍 [LocationMonitor] Failed to start monitoring: $e');
    }
  }

  /// Stop monitoring GPS state.
  void stopMonitoring() {
    _serviceStatusSub?.cancel();
    _serviceStatusSub = null;
    _isMonitoring = false;
    _onAutoOffline = null;
    debugPrint('📍 [LocationMonitor] Stopped GPS state monitoring');
  }

  /// Handle GPS being disabled — auto-offline the driver.
  void _handleLocationDisabled() {
    EdgeCaseManager.instance.toggleLocationAvailability(false);

    // Auto-switch driver to OFFLINE
    _autoSetDriverOffline();
  }

  /// Handle GPS being re-enabled.
  void _handleLocationEnabled() {
    EdgeCaseManager.instance.toggleLocationAvailability(true);
  }

  /// Automatically set the driver to OFFLINE when GPS is disabled.
  Future<void> _autoSetDriverOffline() async {
    try {
      await DriverService.instance.updateAvailability('OFFLINE');
      debugPrint('📍 [LocationMonitor] Auto-switched driver to OFFLINE (GPS disabled)');
    } catch (e) {
      debugPrint('📍 [LocationMonitor] Failed to auto-offline: $e');
    }

    // Notify HomeScreen to update UI
    _onAutoOffline?.call();
  }

  /// Check if location is currently available (GPS on + permission granted).
  Future<bool> isLocationReady() async {
    if (kIsWeb) return true;
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return false;

      final permission = await Geolocator.checkPermission();
      return permission == LocationPermission.whileInUse ||
             permission == LocationPermission.always;
    } catch (_) {
      return false;
    }
  }
}
