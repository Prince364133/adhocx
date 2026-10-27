import 'package:flutter_test/flutter_test.dart';
import 'package:adhocx/services/app_update_service.dart';

void main() {
  group('AppUpdateInfo Model Tests', () {
    test('Correctly parses full JSON payload from backend API', () {
      final json = {
        'latestVersion': '1.0.24',
        'latestVersionCode': 31,
        'minSupportedVersionCode': 28,
        'hasUpdate': true,
        'forceUpdate': false,
        'title': 'AdhocX Fleet Update',
        'message': 'Performance upgrades and bug fixes.',
        'releaseNotes': [
          'Driver HUD bubble optimization',
          'Fast GPS location tracking',
        ],
        'playStoreUrl': 'market://details?id=com.adhocx.app',
        'webFallbackUrl': 'https://play.google.com/store/apps/details?id=com.adhocx.app',
        'apkUrl': 'https://r2.dev/releases/adhocx.apk',
        'publishedAt': '2026-10-27T10:00:00Z',
      };

      final info = AppUpdateInfo.fromJson(json);

      expect(info.latestVersion, equals('1.0.24'));
      expect(info.latestVersionCode, equals(31));
      expect(info.minSupportedVersionCode, equals(28));
      expect(info.hasUpdate, isTrue);
      expect(info.forceUpdate, isFalse);
      expect(info.title, equals('AdhocX Fleet Update'));
      expect(info.message, contains('Performance upgrades'));
      expect(info.releaseNotes.length, equals(2));
      expect(info.releaseNotes.first, equals('Driver HUD bubble optimization'));
      expect(info.playStoreUrl, equals('market://details?id=com.adhocx.app'));
      expect(info.webFallbackUrl, contains('com.adhocx.app'));
    });

    test('Gracefully handles empty or partial JSON with resilient defaults', () {
      final info = AppUpdateInfo.fromJson({});

      expect(info.latestVersion, equals('1.0.24'));
      expect(info.latestVersionCode, equals(31));
      expect(info.hasUpdate, isFalse);
      expect(info.forceUpdate, isFalse);
      expect(info.releaseNotes, isEmpty);
      expect(info.playStoreUrl, contains('com.adhocx.app'));
    });
  });

  group('AppUpdateService Session State Tests', () {
    test('Session dismissal flag toggles properly', () {
      final service = AppUpdateService.instance;

      expect(service.isDismissed, isFalse);

      service.dismissForSession();
      expect(service.isDismissed, isTrue);

      service.resetDismissal();
      expect(service.isDismissed, isFalse);
    });
  });
}
