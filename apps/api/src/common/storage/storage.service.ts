import { Injectable, BadRequestException, Logger } from '@nestjs/common';
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

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Validate and save an uploaded file buffer to the uploads directory.
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
      throw new BadRequestException('File size exceeds the 5MB limit.');
    }

    // 3. Prevent directory traversal and generate safe random filename
    const ext = path.extname(file.originalname).toLowerCase() || this.mimeToExt(file.mimetype);
    const randomId = crypto.randomUUID();
    const safeFilename = `${randomId}${ext}`;
    const destinationPath = path.join(this.uploadDir, safeFilename);

    // 4. Compute SHA256 checksum
    const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // 5. Write file
    await fs.promises.writeFile(destinationPath, file.buffer);
    this.logger.log(`File saved: ${safeFilename} (${file.size} bytes, sha256: ${checksum.slice(0, 8)})`);

    return {
      url: `/uploads/${safeFilename}`,
      filename: safeFilename,
      originalName: path.basename(file.originalname),
      mimeType: file.mimetype,
      size: file.size,
      checksum,
    };
  }

  async deleteFile(filename: string): Promise<void> {
    // Sanitize to prevent path traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(this.uploadDir, safeFilename);

    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      this.logger.log(`File deleted: ${safeFilename}`);
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
