import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface StoredFileResult {
  url: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  checksum: string;
  storageProvider: 'r2' | 'local';
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir = path.resolve(process.cwd(), 'uploads');
  private readonly allowedMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ]);
  private readonly maxSizeBytes = 5 * 1024 * 1024; // 5 MB


  private s3Client: S3Client | null = null;
  private bucketName: string = '';
  private publicUrl: string = '';

  constructor(private readonly configService?: ConfigService) {
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
   * Validate and save an uploaded file buffer to Cloudflare R2 or local disk.
   */
  async saveFile(file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  }): Promise<StoredFileResult> {
    // 1. Validate MIME type
    if (!this.allowedMimeTypes.has(file.mimetype.toLowerCase())) {
      throw new BadRequestException(
        `Invalid file type '${file.mimetype}'. Allowed types: JPEG, PNG, WEBP, PDF.`,
      );
    }

    // 2. Validate file size
    if (file.size > this.maxSizeBytes || file.buffer.length > this.maxSizeBytes) {
      throw new BadRequestException('File size exceeds the 10MB limit.');
    }

    // 3. Prevent directory traversal and generate safe random filename
    const ext =
      path.extname(file.originalname).toLowerCase() ||
      this.mimeToExt(file.mimetype);
    const randomId = crypto.randomUUID();
    const safeFilename = `${randomId}${ext}`;

    // 4. Compute SHA256 checksum
    const checksum = crypto
      .createHash('sha256')
      .update(file.buffer)
      .digest('hex');

    // 5. Upload to Cloudflare R2 if client is configured
    if (this.s3Client) {
      try {
        const key = `documents/${safeFilename}`;
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
            Metadata: {
              originalName: encodeURIComponent(file.originalname),
              checksum,
            },
          }),
        );

        const r2Url = `${this.publicUrl}/${key}`;
        this.logger.log(
          `File uploaded to Cloudflare R2: ${r2Url} (${file.size} bytes, sha256: ${checksum.slice(0, 8)})`,
        );

        return {
          url: r2Url,
          filename: safeFilename,
          originalName: path.basename(file.originalname),
          mimeType: file.mimetype,
          size: file.size,
          checksum,
          storageProvider: 'r2',
        };
      } catch (r2Error: unknown) {
        const msg = r2Error instanceof Error ? r2Error.message : String(r2Error);
        this.logger.warn(`Cloudflare R2 upload failed (${msg}), falling back to local.`);
      }
    }

    // Local Disk Fallback
    const destinationPath = path.join(this.uploadDir, safeFilename);
    await fs.promises.writeFile(destinationPath, file.buffer);
    this.logger.log(
      `File saved locally: ${safeFilename} (${file.size} bytes, sha256: ${checksum.slice(0, 8)})`,
    );

    return {
      url: `/uploads/${safeFilename}`,
      filename: safeFilename,
      originalName: path.basename(file.originalname),
      mimeType: file.mimetype,
      size: file.size,
      checksum,
      storageProvider: 'local',
    };
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

  private mimeToExt(mime: string): string {
    switch (mime.toLowerCase()) {
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      case 'application/pdf':
        return '.pdf';
      default:
        return '.bin';
    }
  }
}
