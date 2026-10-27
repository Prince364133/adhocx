import 'package:flutter/foundation.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/networking/api_client.dart';
import './local_notification_service.dart';

/// Metadata model for app version information returned by the authoritative backend
class AppUpdateInfo {
  final String latestVersion;
  final int latestVersionCode;
  final int minSupportedVersionCode;
  final bool hasUpdate;
  final bool forceUpdate;
  final String title;
  final String message;
  final List<String> releaseNotes;
  final String playStoreUrl;
  final String webFallbackUrl;
  final String apkUrl;
  final String? publishedAt;

  AppUpdateInfo({
    required this.latestVersion,
    required this.latestVersionCode,
    required this.minSupportedVersionCode,
    required this.hasUpdate,
    required this.forceUpdate,
    required this.title,
    required this.message,
    required this.releaseNotes,
    required this.playStoreUrl,
    required this.webFallbackUrl,
    required this.apkUrl,
    this.publishedAt,
  });

  factory AppUpdateInfo.fromJson(Map<String, dynamic> json) {
    final notes = json['releaseNotes'];
    List<String> parsedNotes = [];
    if (notes is List) {
      parsedNotes = notes.map((e) => e.toString()).toList();
    }

    return AppUpdateInfo(
      latestVersion: json['latestVersion']?.toString() ?? '1.0.24',
      latestVersionCode: int.tryParse(json['latestVersionCode']?.toString() ?? '31') ?? 31,
      minSupportedVersionCode: int.tryParse(json['minSupportedVersionCode']?.toString() ?? '25') ?? 25,
      hasUpdate: json['hasUpdate'] == true,
      forceUpdate: json['forceUpdate'] == true,
      title: json['title']?.toString() ?? 'AdhocX Update Available',
      message: json['message']?.toString() ?? 'A new version of AdhocX Driver is available on Google Play.',
      releaseNotes: parsedNotes,
      playStoreUrl: json['playStoreUrl']?.toString() ?? 'market://details?id=com.adhocx.app',
      webFallbackUrl: json['webFallbackUrl']?.toString() ?? 'https://play.google.com/store/apps/details?id=com.adhocx.app',
      apkUrl: json['apkUrl']?.toString() ?? '',
      publishedAt: json['publishedAt']?.toString(),
    );
  }
}

/// Service that automatically detects when a newer app version is published
/// on Google Play Store or APK build, prompts the user via a subtle in-app pill banner
/// and calm system notification, and opens the Play Store on tap.
class AppUpdateService extends ChangeNotifier {
  AppUpdateService._();
  static final AppUpdateService instance = AppUpdateService._();

  AppUpdateInfo? _updateInfo;
  bool _isDismissed = false;
  bool _isChecking = false;
  DateTime? _lastCheckedAt;
  DateTime? _lastSystemNotificationAt;

  int? _installedVersionCode;
  String? _installedVersionName;

  AppUpdateInfo? get updateInfo => _updateInfo;
  bool get hasUpdate => (_updateInfo?.hasUpdate ?? false) && !_isDismissed;
  bool get isForceUpdate => _updateInfo?.forceUpdate ?? false;
  bool get isDismissed => _isDismissed;
  bool get isChecking => _isChecking;
  int? get installedVersionCode => _installedVersionCode;
  String? get installedVersionName => _installedVersionName;

  /// Check for updates against the authoritative backend registry.
  /// Throttled by default to prevent excessive network calls on frequent screen navigation.
  Future<AppUpdateInfo?> checkForUpdate({
    bool force = false,
    bool notifySystem = true,
  }) async {
    // If checked within the last 5 minutes and not forced, return cached state
    if (!force && _lastCheckedAt != null && DateTime.now().difference(_lastCheckedAt!) < const Duration(minutes: 5)) {
      return _updateInfo;
    }

    if (_isChecking) return _updateInfo;
    _isChecking = true;

    try {
      // 1. Resolve installed package version from Android/iOS platform
      await _resolveInstalledVersion();

      final currentCode = _installedVersionCode ?? 30;
      final currentName = _installedVersionName ?? '1.0.23';

      debugPrint('🔍 [AppUpdateService] Checking updates. Installed: v$currentName ($currentCode)...');

      // 2. Query authoritative backend endpoint
      final response = await ApiClient.instance.get(
        '/app/version',
        queryParameters: {
          'platform': kIsWeb ? 'web' : (defaultTargetPlatform == TargetPlatform.android ? 'android' : 'ios'),
          'current_version_code': currentCode,
          'current_version_name': currentName,
        },
        force: force,
      );

      _lastCheckedAt = DateTime.now();

      Map<String, dynamic>? data;
      if (response is Map<String, dynamic>) {
        if (response.containsKey('data') && response['data'] is Map<String, dynamic>) {
          data = response['data'] as Map<String, dynamic>;
        } else {
          data = response;
        }
      }

      if (data != null) {
        final info = AppUpdateInfo.fromJson(data);
        _updateInfo = info;

        // If a new update is found and user has not dismissed this specific version code
        if (info.hasUpdate) {
          debugPrint('🚀 [AppUpdateService] New update available: v${info.latestVersion} (Code: ${info.latestVersionCode})');

          // Trigger a calm, standard local notification if not notified in the last 12 hours
          if (notifySystem && !kIsWeb) {
            final now = DateTime.now();
            if (_lastSystemNotificationAt == null || now.difference(_lastSystemNotificationAt!) > const Duration(hours: 12)) {
              _lastSystemNotificationAt = now;
              await LocalNotificationService.instance.showAppUpdateNotification(
                title: info.title,
                body: info.message,
                payload: '{"action":"app_update"}',
              );
            }
          }
        } else {
          debugPrint('✅ [AppUpdateService] App is up to date (Code: $currentCode).');
          if (!kIsWeb) {
            await LocalNotificationService.instance.cancelAppUpdateNotification();
          }
        }

        notifyListeners();
        return _updateInfo;
      }
    } catch (e) {
      debugPrint('⚠️ [AppUpdateService] Error checking for app update: $e');
    } finally {
      _isChecking = false;
    }

    return _updateInfo;
  }

  /// Launch Google Play Store directly to update the app.
  /// Falls back to Web Play Store URL or APK download link if Play Store app is absent.
  Future<void> openPlayStoreUpdate() async {
    final playStoreScheme = _updateInfo?.playStoreUrl ?? 'market://details?id=com.adhocx.app';
    final webFallback = _updateInfo?.webFallbackUrl ?? 'https://play.google.com/store/apps/details?id=com.adhocx.app';

    try {
      final marketUri = Uri.parse(playStoreScheme);
      if (await canLaunchUrl(marketUri)) {
        await launchUrl(marketUri, mode: LaunchMode.externalApplication);
        return;
      }

      final webUri = Uri.parse(webFallback);
      if (await canLaunchUrl(webUri)) {
        await launchUrl(webUri, mode: LaunchMode.externalApplication);
        return;
      }

      // Sideload APK fallback if available
      final apkUrl = _updateInfo?.apkUrl;
      if (apkUrl != null && apkUrl.isNotEmpty) {
        final apkUri = Uri.parse(apkUrl);
        if (await canLaunchUrl(apkUri)) {
          await launchUrl(apkUri, mode: LaunchMode.externalApplication);
        }
      }
    } catch (e) {
      debugPrint('⚠️ [AppUpdateService] Failed to launch update URL: $e');
    }
  }

  /// Dismiss the in-app pill banner for the current active session
  void dismissForSession() {
    _isDismissed = true;
    notifyListeners();
  }

  /// Reset session dismissal (e.g. on new day or app restart)
  void resetDismissal() {
    _isDismissed = false;
    notifyListeners();
  }

  Future<void> _resolveInstalledVersion() async {
    if (_installedVersionCode != null && _installedVersionName != null) return;
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      _installedVersionName = packageInfo.version;
      _installedVersionCode = int.tryParse(packageInfo.buildNumber) ?? 31;
    } catch (_) {
      // Fallback defaults matching pubspec.yaml
      _installedVersionName ??= '1.0.24';
      _installedVersionCode ??= 31;
    }
  }
}
