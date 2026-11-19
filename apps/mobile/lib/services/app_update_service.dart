import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../core/networking/api_client.dart';
import '../theme/app_colors.dart';
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
      latestVersion: json['latestVersion']?.toString() ?? '1.0.25',
      latestVersionCode: int.tryParse(json['latestVersionCode']?.toString() ?? '32') ?? 32,
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

  static const MethodChannel _foregroundChannel = MethodChannel('com.adhocx.app/foreground');

  AppUpdateInfo? _updateInfo;
  bool _isDismissed = false;
  bool _isChecking = false;
  bool _isDialogOpen = false;
  int? _lastPromptedVersionCode;
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

  /// Queries Google Play Core AppUpdateManager directly on Android to detect
  /// live updates published on Google Play Store without waiting on backend config.
  Future<Map<String, dynamic>?> _checkGooglePlayStoreNative() async {
    if (kIsWeb || defaultTargetPlatform != TargetPlatform.android) return null;
    try {
      final raw = await _foregroundChannel
          .invokeMethod('checkPlayStoreUpdate')
          .timeout(const Duration(seconds: 5));
      if (raw is Map) {
        return Map<String, dynamic>.from(raw);
      }
    } catch (e) {
      debugPrint('ℹ️ [AppUpdateService] Native Play Store check skipped: $e');
    }
    return null;
  }

  /// Check for updates against BOTH Google Play Store (Play Core) and backend registry.
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

      final currentCode = _installedVersionCode ?? 52;
      final currentName = _installedVersionName ?? '1.0.45';

      debugPrint('🔍 [AppUpdateService] Checking updates. Installed: v$currentName ($currentCode)...');

      // 2. Check Google Play Store directly (Play Core AppUpdateManager)
      final playStoreResult = await _checkGooglePlayStoreNative();
      final playStoreAvailable = playStoreResult?['updateAvailable'] == true;
      final playStoreVersionCode = int.tryParse(
            playStoreResult?['availableVersionCode']?.toString() ?? '0',
          ) ??
          0;

      // 3. Query authoritative backend endpoint (for release notes, forceUpdate, and fallback)
      AppUpdateInfo? backendInfo;
      try {
        final response = await ApiClient.instance.get(
          '/app/version',
          queryParameters: {
            'platform': kIsWeb ? 'web' : (defaultTargetPlatform == TargetPlatform.android ? 'android' : 'ios'),
            'current_version_code': currentCode,
            'current_version_name': currentName,
          },
          force: force,
        );

        Map<String, dynamic>? data;
        if (response is Map<String, dynamic>) {
          if (response.containsKey('data') && response['data'] is Map<String, dynamic>) {
            data = response['data'] as Map<String, dynamic>;
          } else {
            data = response;
          }
        }
        if (data != null) {
          backendInfo = AppUpdateInfo.fromJson(data);
        }
      } catch (e) {
        debugPrint('⚠️ [AppUpdateService] Backend version check error: $e');
      }

      _lastCheckedAt = DateTime.now();

      final hasBackendUpdate = backendInfo?.hasUpdate == true ||
          (backendInfo != null && backendInfo.latestVersionCode > currentCode);
      final hasPlayStoreUpdate = playStoreAvailable &&
          (playStoreVersionCode == 0 || playStoreVersionCode > currentCode);

      if (hasPlayStoreUpdate || hasBackendUpdate) {
        final resolvedVersionCode = playStoreVersionCode > (backendInfo?.latestVersionCode ?? 0)
            ? playStoreVersionCode
            : (backendInfo?.latestVersionCode ?? currentCode + 1);
        final resolvedVersionName = (hasPlayStoreUpdate &&
                backendInfo != null &&
                playStoreVersionCode > backendInfo.latestVersionCode)
            ? 'New Version'
            : (backendInfo?.latestVersion ?? 'Latest');

        final info = AppUpdateInfo(
          latestVersion: resolvedVersionName,
          latestVersionCode: resolvedVersionCode,
          minSupportedVersionCode: backendInfo?.minSupportedVersionCode ?? 25,
          hasUpdate: true,
          forceUpdate: backendInfo?.forceUpdate ?? false,
          title: backendInfo?.title ?? 'AdhocX Update Available',
          message: hasPlayStoreUpdate
              ? 'A newer version of AdhocX is available on Google Play Store. Please update now for the latest fixes and improvements.'
              : (backendInfo?.message ??
                  'A new version of AdhocX is available on Google Play Store.'),
          releaseNotes: backendInfo?.releaseNotes ?? const [],
          playStoreUrl: backendInfo?.playStoreUrl ?? 'market://details?id=com.adhocx.app',
          webFallbackUrl: backendInfo?.webFallbackUrl ??
              'https://play.google.com/store/apps/details?id=com.adhocx.app',
          apkUrl: backendInfo?.apkUrl ?? '',
          publishedAt: backendInfo?.publishedAt,
        );

        _updateInfo = info;
        debugPrint(
          '🚀 [AppUpdateService] Update available (PlayStore=$hasPlayStoreUpdate, Backend=$hasBackendUpdate, Code=$resolvedVersionCode)',
        );

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
        notifyListeners();
        return _updateInfo;
      } else if (backendInfo != null) {
        _updateInfo = backendInfo;
        debugPrint('✅ [AppUpdateService] App is up to date (Code: $currentCode).');
        if (!kIsWeb) {
          await LocalNotificationService.instance.cancelAppUpdateNotification();
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

  /// Check for updates and immediately present a Play Store update prompt dialog
  /// whenever a newer version is available on Google Play Store.
  Future<void> checkForUpdateAndPrompt(
    BuildContext? context, {
    bool force = false,
  }) async {
    final info = await checkForUpdate(force: force);
    if (info == null || !info.hasUpdate) return;
    if (context == null || !context.mounted) return;
    await showUpdatePromptIfAvailable(context);
  }

  /// Displays a clean Play Store update prompt dialog that redirects directly to Google Play Store.
  Future<void> showUpdatePromptIfAvailable(BuildContext context) async {
    final info = _updateInfo;
    if (info == null || !info.hasUpdate || _isDialogOpen) return;
    if (!info.forceUpdate && (_isDismissed || _lastPromptedVersionCode == info.latestVersionCode)) {
      return;
    }
    if (!context.mounted) return;

    _isDialogOpen = true;
    _lastPromptedVersionCode = info.latestVersionCode;

    try {
      await showDialog<void>(
        context: context,
        barrierDismissible: !info.forceUpdate,
        builder: (dialogCtx) {
          final isDark = Theme.of(dialogCtx).brightness == Brightness.dark;
          return PopScope(
            canPop: !info.forceUpdate,
            child: AlertDialog(
              backgroundColor: isDark ? AppColors.surfaceDark : Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              titlePadding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
              contentPadding: const EdgeInsets.fromLTRB(24, 8, 24, 16),
              actionsPadding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
              title: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.system_update_rounded,
                      color: AppColors.primary,
                      size: 26,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          info.title,
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                            color: isDark ? Colors.white : const Color(0xFF18181B),
                          ),
                        ),
                        if (info.latestVersion.isNotEmpty && info.latestVersion != 'New Version')
                          Text(
                            'Version ${info.latestVersion} on Play Store',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primary,
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    info.message,
                    style: TextStyle(
                      fontSize: 14,
                      height: 1.45,
                      color: isDark ? const Color(0xFFD4D4D8) : const Color(0xFF52525B),
                    ),
                  ),
                  if (info.releaseNotes.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF1F1F24) : const Color(0xFFF4F4F5),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "What's New",
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: isDark ? Colors.white : const Color(0xFF27272A),
                            ),
                          ),
                          const SizedBox(height: 6),
                          ...info.releaseNotes.take(3).map(
                                (note) => Padding(
                                  padding: const EdgeInsets.only(bottom: 4),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text('• ', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
                                      Expanded(
                                        child: Text(
                                          note,
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF52525B),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
              actions: [
                if (!info.forceUpdate)
                  TextButton(
                    onPressed: () {
                      Navigator.of(dialogCtx).pop();
                    },
                    child: Text(
                      'Later',
                      style: TextStyle(
                        color: isDark ? const Color(0xFFA1A1AA) : const Color(0xFF71717A),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ElevatedButton.icon(
                  onPressed: () async {
                    if (!info.forceUpdate) {
                      Navigator.of(dialogCtx).pop();
                    }
                    await openPlayStoreUpdate();
                  },
                  icon: const Icon(Icons.shop_rounded, size: 18),
                  label: const Text(
                    'Update on Play Store',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ],
            ),
          );
        },
      );
    } finally {
      _isDialogOpen = false;
    }
  }

  /// Launch Google Play Store directly to update the app.
  /// Uses native Android Intent targeting Google Play (com.android.vending) first,
  /// then falls back to market:// or https://play.google.com/store/apps/details?id=com.adhocx.app.
  Future<void> openPlayStoreUpdate() async {
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      try {
        final opened = await _foregroundChannel
            .invokeMethod('openPlayStore')
            .timeout(const Duration(seconds: 3));
        if (opened == true) return;
      } catch (e) {
        debugPrint('⚠️ [AppUpdateService] Native openPlayStore fallback: $e');
      }
    }

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
    _lastPromptedVersionCode = null;
    notifyListeners();
  }

  Future<void> _resolveInstalledVersion() async {
    if (_installedVersionCode != null && _installedVersionName != null) return;
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      _installedVersionName = packageInfo.version;
      _installedVersionCode = int.tryParse(packageInfo.buildNumber) ?? 52;
    } catch (_) {
      // Fallback defaults matching pubspec.yaml
      _installedVersionName ??= '1.0.45';
      _installedVersionCode ??= 52;
    }
  }
}
