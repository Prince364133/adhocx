import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import {
  FileSanitizerService,
  FileSanitizerOptions,
  SanitizedFileResult,
} from './file-sanitizer.service';

export interface StoredFileResult {
  url: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  checksum: string;
  storageProvider: 'r2' | 'local';
  detectedType: string;
  sanitizationApplied: string[];
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir = path.resolve(process.cwd(), 'uploads');

  private s3Client: S3Client | null = null;
  private bucketName: string = '';
  private publicUrl: string = '';

  constructor(
    private readonly configService?: ConfigService,
    private readonly sanitizer: FileSanitizerService = new FileSanitizerService(),
  ) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    this.initializeR2Client();
  }

  private initializeR2Client() {
    try {
      const accessKeyId =
        this.configService?.get<string>('storage.r2.accessKeyId') ||
        process.env.R2_ACCESS_KEY_ID;
      const secretAccessKey =
        this.configService?.get<string>('storage.r2.secretAccessKey') ||
        process.env.R2_SECRET_ACCESS_KEY;
      const endpoint =
        this.configService?.get<string>('storage.r2.endpoint') ||
        process.env.R2_ENDPOINT;
      this.bucketName =
        this.configService?.get<string>('storage.r2.bucketName') ||
        process.env.R2_BUCKET_NAME ||
        'adhocx';
      this.publicUrl = (
        this.configService?.get<string>('storage.r2.publicUrl') ||
        process.env.R2_PUBLIC_URL ||
        'https://pub-6b0e7f5bbf684bc7aa7bb5f04e679bf7.r2.dev'
      ).replace(/\/+$/, '');

      if (accessKeyId && secretAccessKey && endpoint) {
        this.s3Client = new S3Client({
          region: 'auto',
          endpoint,
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        });
        this.logger.log(
          `Cloudflare R2 storage initialized (Bucket: ${this.bucketName})`,
        );
      } else {
        this.logger.log('Using local disk storage for uploads.');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Cloudflare R2 client init fallback to local: ${errorMsg}`,
      );
      this.s3Client = null;
    }
  }

  /**
   * Validate, sanitize, and save an uploaded file buffer to Cloudflare R2 or local disk.
   */
  async saveFile(
    file: {
      buffer: Buffer;
      originalname?: string;
      mimetype?: string;
      size?: number;
    },
    options?: FileSanitizerOptions,
  ): Promise<StoredFileResult> {
    // 1. Sanitize, scan magic bytes, detect true mime type, strip EXIF metadata
    const sanitized: SanitizedFileResult = await this.sanitizer.sanitizeAndValidate(
      file,
      options,
    );

    const safeFilename = sanitized.filename;
    const key = `documents/${safeFilename}`;

    // 2. Upload to Cloudflare R2 if client is configured
    if (this.s3Client) {
      try {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            Body: sanitized.buffer,
            ContentType: sanitized.mimeType,
            Metadata: {
              originalName: encodeURIComponent(sanitized.originalName),
              checksum: sanitized.checksum,
              detectedType: sanitized.detectedType,
            },
          }),
        );

        const r2Url = `${this.publicUrl}/${key}`;
        this.logger.log(
          `File sanitized & uploaded to Cloudflare R2: ${r2Url} (${sanitized.size} bytes, sha256: ${sanitized.checksum.slice(0, 8)})`,
        );

        return {
          url: r2Url,
          filename: safeFilename,
          originalName: sanitized.originalName,
          mimeType: sanitized.mimeType,
          size: sanitized.size,
          checksum: sanitized.checksum,
          storageProvider: 'r2',
          detectedType: sanitized.detectedType,
          sanitizationApplied: sanitized.sanitizationApplied,
        };
      } catch (r2Error: unknown) {
        const msg = r2Error instanceof Error ? r2Error.message : String(r2Error);
        this.logger.warn(`Cloudflare R2 upload failed (${msg}), falling back to local.`);
      }
    }

    // 3. Local Disk Fallback
    const destinationPath = path.join(this.uploadDir, safeFilename);
    await fs.promises.writeFile(destinationPath, sanitized.buffer);
    this.logger.log(
      `File sanitized & saved locally: ${safeFilename} (${sanitized.size} bytes, sha256: ${sanitized.checksum.slice(0, 8)})`,
    );

    const publicUrl = this.getPublicUrl(`/uploads/${safeFilename}`);

    return {
      url: publicUrl,
      filename: safeFilename,
      originalName: sanitized.originalName,
      mimeType: sanitized.mimeType,
      size: sanitized.size,
      checksum: sanitized.checksum,
      storageProvider: 'local',
      detectedType: sanitized.detectedType,
      sanitizationApplied: sanitized.sanitizationApplied,
    };
  }

  getPublicUrl(relativePathOrUrl?: string | null): string {
    if (!relativePathOrUrl || typeof relativePathOrUrl !== 'string') return '';
    const trimmed = relativePathOrUrl.trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
      return trimmed;
    }
    const clean = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    const base = (
      this.configService?.get<string>('app.url') ||
      process.env.APP_URL ||
      'https://api.adhocx.com'
    ).replace(/\/+$/, '');
    return `${base}${clean}`;
  }

  async deleteFile(filename: string): Promise<void> {
    const safeFilename = path.basename(filename);

    if (this.s3Client) {
      try {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: `documents/${safeFilename}`,
          }),
        );
        this.logger.log(`File deleted from Cloudflare R2: ${safeFilename}`);
        return;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`R2 delete error: ${msg}`);
      }
    }

    const filePath = path.join(this.uploadDir, safeFilename);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      this.logger.log(`File deleted locally: ${safeFilename}`);
    }
  }
}
