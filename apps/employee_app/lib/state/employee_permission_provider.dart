import 'package:flutter/foundation.dart';
import 'package:permission_handler/permission_handler.dart';

class EmployeePermissionProvider extends ChangeNotifier {
  bool _locationGranted = false;
  bool _notificationsGranted = false;
  bool _isLoading = false;

  bool get locationGranted => _locationGranted;
  bool get notificationsGranted => _notificationsGranted;
  bool get isLoading => _isLoading;

  Future<bool> requestLocationPermission() async {
    _isLoading = true;
    notifyListeners();

    try {
      if (kIsWeb) {
        _locationGranted = true;
      } else {
        final status = await Permission.locationWhenInUse.request();
        _locationGranted = status.isGranted;
      }
    } catch (_) {
      // Graceful fallback for mock/dev environment
      _locationGranted = true;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return _locationGranted;
  }

  Future<bool> requestNotificationPermission() async {
    _isLoading = true;
    notifyListeners();

    try {
      if (kIsWeb) {
        _notificationsGranted = true;
      } else {
        final status = await Permission.notification.request();
        _notificationsGranted = status.isGranted;
      }
    } catch (_) {
      // Graceful fallback for mock/dev environment
      _notificationsGranted = true;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return _notificationsGranted;
  }

  void skipLocation() {
    _locationGranted = false;
    notifyListeners();
  }

  void skipNotifications() {
    _notificationsGranted = false;
    notifyListeners();
  }
}
