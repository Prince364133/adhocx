import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
  FileSanitizerService,
  FileSanitizerOptions,
  SanitizedFileResult,
} from './file-sanitizer.service';

/** How long a signed identity-document link stays valid. */
export const DOCUMENT_LINK_TTL_SECONDS = 15 * 60;

/** Secret for signing local /uploads links (falls back to the JWT access secret). */
export function uploadSigningSecret(): string | null {
  return process.env.DOCUMENT_URL_SECRET || process.env.JWT_ACCESS_SECRET || null;
}

/** HMAC over `<filename>:<expiry>` for local /uploads links. */
export function signUploadPath(filename: string, expiresAtSec: number, secret: string): string {
  return crypto.createHmac('sha256', secret).update(`${filename}:${expiresAtSec}`).digest('hex');
}

/** Verifies a signed local /uploads link (constant time, not expired). */
export function verifyUploadSignature(
  filename: string,
  exp: string | undefined,
  sig: string | undefined,
  nowSec: number = Math.floor(Date.now() / 1000),
): boolean {
  const secret = uploadSigningSecret();
  const expNum = Number(exp);
  if (!secret || !sig || !Number.isInteger(expNum) || expNum < nowSec) return false;
  const expected = Buffer.from(signUploadPath(filename, expNum, secret));
  const given = Buffer.from(String(sig));
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

function signPrivateUploadPath(filename: string, provider: string, expiresAtSec: number, secret: string): string {
  return crypto.createHmac('sha256', secret).update(`${provider}:${filename}:${expiresAtSec}`).digest('hex');
}

export function verifyPrivateUploadSignature(
  filename: string,
  provider: string | undefined,
  exp: string | undefined,
  sig: string | undefined,
  nowSec: number = Math.floor(Date.now() / 1000),
): boolean {
  const secret = uploadSigningSecret();
  const expNum = Number(exp);
  if (!secret || !sig || !['r2', 'local'].includes(provider ?? '') || !Number.isInteger(expNum) || expNum < nowSec) return false;
  const expected = Buffer.from(signPrivateUploadPath(filename, provider!, expNum, secret));
  const given = Buffer.from(String(sig));
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

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

  /**
   * Short-lived link to an identity document (Aadhaar, PAN, licence, RC...). Documents stored in our
   * R2 bucket get a presigned GET (works once the bucket's public access is turned off); documents
   * on local disk get an HMAC-signed /uploads link. Links expire after DOCUMENT_LINK_TTL_SECONDS.
   * External URLs and data: URIs are returned unchanged.
   */
  async getDocumentAccessUrl(stored?: string | null, ttlSeconds = DOCUMENT_LINK_TTL_SECONDS): Promise<string> {
    if (!stored || typeof stored !== 'string') return '';
    const value = stored.trim();
    if (!value || value === 'null' || value === 'undefined' || value.startsWith('data:')) return value === 'null' || value === 'undefined' ? '' : value;

    const r2Key = this.r2KeyOf(value);
    if (r2Key && this.s3Client) {
      try {
        // `as any`: duplicate @smithy/types copies in node_modules make the two SDK packages' client
        // types nominally different; the runtime objects are the same S3 client.
        return await getSignedUrl(this.s3Client as any, new GetObjectCommand({ Bucket: this.bucketName, Key: r2Key }) as any, {
          expiresIn: ttlSeconds,
        });
      } catch (err: unknown) {
        this.logger.warn(`Presigning ${r2Key} failed: ${err instanceof Error ? err.message : String(err)}`);
        return '';
      }

    }

    const localFile = this.localUploadNameOf(value);
    if (localFile) {
      const secret = uploadSigningSecret();
      const base = this.getPublicUrl(`/uploads/${localFile}`);
      if (!secret) return base;
      const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
      return `${base}?exp=${exp}&sig=${signUploadPath(localFile, exp, secret)}`;
    }

    return this.getPublicUrl(value);
  }

  async getPrivateDocumentAccessUrl(stored?: string | null, ttlSeconds = DOCUMENT_LINK_TTL_SECONDS): Promise<string> {
    if (!stored) return '';
    const r2Key = this.r2KeyOf(stored);
    const localName = this.localUploadNameOf(stored);
    const provider = r2Key ? 'r2' : localName ? 'local' : null;
    const filename = r2Key ? path.basename(r2Key) : localName;
    const secret = uploadSigningSecret();
    if (!provider || !filename || !secret) {
      throw new Error('Private attachment links require managed storage and a configured upload signing secret');
    }
    const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
    const signature = signPrivateUploadPath(filename, provider, expiresAt, secret);
    const base = this.getPublicUrl(`/api/v1/private-uploads/${encodeURIComponent(filename)}`);
    return `${base}?provider=${provider}&exp=${expiresAt}&sig=${signature}`;
  }

  async getPrivateFileBuffer(
    filename: string,
    provider: string,
  ): Promise<{ buffer: Buffer; mimeType: string; filename: string } | null> {
    const safeFilename = path.basename(filename);
    if (!safeFilename || safeFilename !== filename || !['r2', 'local'].includes(provider)) return null;
    return this.getFileBuffer(provider === 'r2' ? `documents/${safeFilename}` : `/uploads/${safeFilename}`);
  }

  /** `documents/<file>` key when the URL points into our R2 bucket (public or bare key form). */
  private r2KeyOf(value: string): string | null {
    const bare = value.replace(/^\/+/, '');
    if (bare.startsWith('documents/')) return bare;
    if (this.publicUrl && value.startsWith(`${this.publicUrl}/`)) return value.slice(this.publicUrl.length + 1).split('?')[0];
    return null;
  }

  /** File name when the value is a local /uploads path or URL. */
  private localUploadNameOf(value: string): string | null {
    const m = value.split('?')[0].match(/(?:^|\/)uploads\/([^/]+)$/);
    return m ? path.basename(m[1]) : null;
  }

  /**
   * Read raw file bytes from R2 or local /uploads (or fetch HTTP/data URI fallback)
   * so server-side verification pipelines (e.g. Digio OCR, FaceMatch, Aadhaar Masking)
   * can process stored documents safely without relying on public URLs.
   */
  async getFileBuffer(
    stored?: string | null,
  ): Promise<{ buffer: Buffer; mimeType: string; filename: string } | null> {
    if (!stored || typeof stored !== 'string') return null;
    const value = stored.trim();
    if (!value || value === 'null' || value === 'undefined') return null;

    const inferMime = (name: string, contentType?: string | null): string => {
      if (contentType && contentType !== 'application/octet-stream') return contentType;
      const ext = path.extname(name.split('?')[0]).toLowerCase();
      if (ext === '.png') return 'image/png';
      if (ext === '.webp') return 'image/webp';
      if (ext === '.pdf') return 'application/pdf';
      return 'image/jpeg';
    };

    if (value.startsWith('data:')) {
      const m = value.match(/^data:([^;]+);base64,(.+)$/);
      if (!m) return null;
      return {
        buffer: Buffer.from(m[2], 'base64'),
        mimeType: m[1],
        filename: 'document',
      };
    }

    const r2Key = this.r2KeyOf(value);
    if (r2Key && this.s3Client) {
      try {
        const res = await this.s3Client.send(
          new GetObjectCommand({ Bucket: this.bucketName, Key: r2Key }) as any,
        );
        const body: any = (res as any)?.Body;
        if (body?.transformToByteArray) {
          const arr = await body.transformToByteArray();
          return {
            buffer: Buffer.from(arr),
            mimeType: inferMime(r2Key, (res as any)?.ContentType),
            filename: path.basename(r2Key),
          };
        }
        if (body && typeof body[Symbol.asyncIterator] === 'function') {
          const chunks: Buffer[] = [];
          for await (const chunk of body) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          return {
            buffer: Buffer.concat(chunks),
            mimeType: inferMime(r2Key, (res as any)?.ContentType),
            filename: path.basename(r2Key),
          };
        }
      } catch (err: unknown) {
        this.logger.warn(
          `R2 read ${r2Key} failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    const localFile = this.localUploadNameOf(value);
    if (localFile) {
      const filePath = path.join(this.uploadDir, localFile);
      if (fs.existsSync(filePath)) {
        const buffer = await fs.promises.readFile(filePath);
        return {
          buffer,
          mimeType: inferMime(localFile),
          filename: localFile,
        };
      }
    }

    if (value.startsWith('http://') || value.startsWith('https://')) {
      try {
        const resp = await fetch(value);
        if (!resp.ok) return null;
        const arr = await resp.arrayBuffer();
        const urlName = path.basename(value.split('?')[0]) || 'document.jpg';
        return {
          buffer: Buffer.from(arr),
          mimeType: inferMime(urlName, resp.headers.get('content-type')),
          filename: urlName,
        };
      } catch (err: unknown) {
        this.logger.warn(
          `HTTP document fetch failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return null;
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

  async deleteStoredFile(storedReference: string): Promise<void> {
    const localName = this.localUploadNameOf(storedReference);
    const r2Key = this.r2KeyOf(storedReference);
    const filename = localName ?? (r2Key ? path.basename(r2Key) : null);
    if (!filename) {
      throw new Error('Stored file reference is not managed by this storage service');
    }
    await this.deleteFile(filename);
  }
}
