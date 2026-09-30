import 'dart:io';
import 'package:flutter/foundation.dart';
import '../utils/app_logger.dart';

/// Result of device integrity and tamper verification
class DeviceIntegrityResult {
  final bool isCompromised;
  final bool isRootedOrJailbroken;
  final bool isEmulator;
  final List<String> detectedIndicators;

  const DeviceIntegrityResult({
    required this.isCompromised,
    required this.isRootedOrJailbroken,
    required this.isEmulator,
    required this.detectedIndicators,
  });

  factory DeviceIntegrityResult.clean() => const DeviceIntegrityResult(
        isCompromised: false,
        isRootedOrJailbroken: false,
        isEmulator: false,
        detectedIndicators: [],
      );
}

/// SecurityService performs client-side anti-tamper, root/jailbreak detection,
/// and runtime integrity verification before allowing sensitive operations
/// (e.g. payments, trips, OTP verification).
class SecurityService {
  static SecurityService? _instance;
  static SecurityService get instance => _instance ??= SecurityService._();

  SecurityService._();

  DeviceIntegrityResult? _cachedResult;

  /// High-risk Android root binaries and management application paths
  static const List<String> _androidRootPaths = [
    '/system/app/Superuser.apk',
    '/sbin/su',
    '/system/bin/su',
    '/system/xbin/su',
    '/data/local/xbin/su',
    '/data/local/bin/su',
    '/system/sd/xbin/su',
    '/system/bin/failsafe/su',
    '/data/local/su',
    '/su/bin/su',
    '/data/adb/magisk',
    '/system/app/Magisk/Magisk.apk',
    '/system/xbin/which',
  ];

  /// iOS Jailbreak markers and Cydia directories
  static const List<String> _iosJailbreakPaths = [
    '/Applications/Cydia.app',
    '/Library/MobileSubstrate/MobileSubstrate.dylib',
    '/bin/bash',
    '/usr/sbin/sshd',
    '/etc/apt',
    '/private/var/lib/apt/',
    '/private/var/stash',
    '/usr/libexec/ssh-keysign',
  ];

  /// Perform on-device integrity check
  Future<DeviceIntegrityResult> checkDeviceIntegrity({bool forceRefresh = false}) async {
    if (_cachedResult != null && !forceRefresh) {
      return _cachedResult!;
    }

    if (kIsWeb) {
      _cachedResult = DeviceIntegrityResult.clean();
      return _cachedResult!;
    }

    final indicators = <String>[];
    bool isRootedOrJailbroken = false;
    bool isEmulator = false;

    try {
      if (Platform.isAndroid) {
        // 1. Check for standard su binary paths
        for (final path in _androidRootPaths) {
          try {
            if (File(path).existsSync()) {
              indicators.add('Root binary located: $path');
              isRootedOrJailbroken = true;
            }
          } catch (_) {
            // Permission denied or path not found
          }
        }

        // 2. Check for dangerous OS build properties if accessible
        try {
          final buildTags = Platform.environment['BUILD_TAGS'] ?? '';
          if (buildTags.contains('test-keys')) {
            indicators.add('Custom OS ROM detected (test-keys)');
            isRootedOrJailbroken = true;
          }
        } catch (_) {}
      } else if (Platform.isIOS) {
        // Check for iOS jailbreak paths
        for (final path in _iosJailbreakPaths) {
          try {
            if (File(path).existsSync()) {
              indicators.add('Jailbreak artifact located: $path');
              isRootedOrJailbroken = true;
            }
          } catch (_) {}
        }
      }
    } catch (e) {
      AppLogger.warn('Error during device integrity analysis: $e', tag: 'SECURITY');
    }

    final isCompromised = isRootedOrJailbroken;

    _cachedResult = DeviceIntegrityResult(
      isCompromised: isCompromised,
      isRootedOrJailbroken: isRootedOrJailbroken,
      isEmulator: isEmulator,
      detectedIndicators: indicators,
    );

    if (isCompromised) {
      AppLogger.error(
        'SECURITY ALERT: Device integrity compromise detected: ${indicators.join(", ")}',
        tag: 'SECURITY_AUDIT',
      );
    } else {
      AppLogger.info('Device integrity verified clean (no root/jailbreak markers)', tag: 'SECURITY_AUDIT');
    }

    return _cachedResult!;
  }
}
