import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class AppVersionQueryDto {
  @ApiPropertyOptional({ description: 'Platform identifier (android, ios, web)', example: 'android' })
  @IsOptional()
  @IsString()
  platform?: string = 'android';

  @ApiPropertyOptional({ description: 'Client current installed version code', example: 29 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  current_version_code?: number;

  @ApiPropertyOptional({ description: 'Client current installed version name', example: '1.0.22' })
  @IsOptional()
  @IsString()
  current_version_name?: string;
}

export class AppVersionResponseDto {
  @ApiProperty({ example: '1.0.23' })
  latestVersion!: string;

  @ApiProperty({ example: 30 })
  latestVersionCode!: number;

  @ApiProperty({ example: 25 })
  minSupportedVersionCode!: number;

  @ApiProperty({ example: true })
  hasUpdate!: boolean;

  @ApiProperty({ example: false })
  forceUpdate!: boolean;

  @ApiProperty({ example: 'AdhocX Update Available' })
  title!: string;

  @ApiProperty({ example: 'A new version (v1.0.23) is available on Google Play Store.' })
  message!: string;

  @ApiProperty({ example: ['Performance and dispatch improvements', 'Floating driver HUD'] })
  releaseNotes!: string[];

  @ApiProperty({ example: 'market://details?id=com.adhocx.app' })
  playStoreUrl!: string;

  @ApiProperty({ example: 'https://play.google.com/store/apps/details?id=com.adhocx.app' })
  webFallbackUrl!: string;

  @ApiProperty({ example: 'https://pub-6b0e7f5bbf684bc7aa7bb5f04e679bf7.r2.dev/releases/adhocx-release-latest.apk' })
  apkUrl!: string;

  @ApiProperty({ example: '2026-10-27T15:20:00.000Z' })
  publishedAt!: string;
}
