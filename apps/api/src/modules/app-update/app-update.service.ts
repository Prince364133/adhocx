import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppVersionQueryDto, AppVersionResponseDto } from './dto/app-version.dto';

@Injectable()
export class AppUpdateService {
  constructor(private readonly configService: ConfigService) {}

  getVersionInfo(query?: AppVersionQueryDto): AppVersionResponseDto {
    const latestVersion =
      this.configService.get<string>('MOBILE_LATEST_VERSION_NAME') ||
      process.env.MOBILE_LATEST_VERSION_NAME ||
      '1.0.25';

    const latestVersionCode = parseInt(
      this.configService.get<string>('MOBILE_LATEST_VERSION_CODE') ||
        process.env.MOBILE_LATEST_VERSION_CODE ||
        '32',
      10,
    );

    const minSupportedVersionCode = parseInt(
      this.configService.get<string>('MOBILE_MIN_VERSION_CODE') ||
        process.env.MOBILE_MIN_VERSION_CODE ||
        '25',
      10,
    );

    const forceUpdateConfig =
      this.configService.get<string>('MOBILE_FORCE_UPDATE') === 'true' ||
      process.env.MOBILE_FORCE_UPDATE === 'true';

    const playStoreUrl =
      this.configService.get<string>('MOBILE_PLAY_STORE_URL') ||
      process.env.MOBILE_PLAY_STORE_URL ||
      'market://details?id=com.adhocx.app';

    const webFallbackUrl =
      this.configService.get<string>('MOBILE_WEB_FALLBACK_URL') ||
      process.env.MOBILE_WEB_FALLBACK_URL ||
      'https://play.google.com/store/apps/details?id=com.adhocx.app';

    const apkUrl =
      this.configService.get<string>('MOBILE_APK_URL') ||
      process.env.MOBILE_APK_URL ||
      'https://pub-6b0e7f5bbf684bc7aa7bb5f04e679bf7.r2.dev/releases/adhocx-release-latest.apk';

    const clientVersionCode = query?.current_version_code;
    const hasUpdate =
      clientVersionCode != null && !isNaN(clientVersionCode)
        ? clientVersionCode < latestVersionCode
        : false;

    const forceUpdate =
      forceUpdateConfig ||
      (clientVersionCode != null && !isNaN(clientVersionCode)
        ? clientVersionCode < minSupportedVersionCode
        : false);

    return {
      latestVersion,
      latestVersionCode,
      minSupportedVersionCode,
      hasUpdate,
      forceUpdate,
      title: 'AdhocX Update Available',
      message: `A new version of AdhocX Driver (${latestVersion}) is available on Google Play.`,
      releaseNotes: [
        'Floating Assistive Driver HUD & Incoming Dispatch Alert Overlay',
        'Continuous attention sound & vibration patterns for incoming bookings',
        'Direct Google Maps turn-by-turn navigation shortcut',
        'Official Google Play App Signing key security synchronization',
        'Optimized GPS location tracking & fleet dispatch matching',
      ],
      playStoreUrl,
      webFallbackUrl,
      apkUrl,
      publishedAt: new Date().toISOString(),
    };
  }
}
