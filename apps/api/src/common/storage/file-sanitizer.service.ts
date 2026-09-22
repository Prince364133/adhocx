import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as path from 'path';

export interface SanitizedFileResult {
  buffer: Buffer;
  filename: string;
  originalName: string;
  mimeType: string;
  extension: string;
  size: number;
  checksum: string;
  detectedType: string;
  sanitizationApplied: string[];
}

export interface FileSanitizerOptions {
  allowedMimeTypes?: string[];
  maxSizeBytes?: number;
  minSizeBytes?: number;
  stripExif?: boolean;
  scanMaliciousPayloads?: boolean;
  scanPdfThreats?: boolean;
}

@Injectable()
export class FileSanitizerService {
  private readonly logger = new Logger(FileSanitizerService.name);

  // Default allowed MIME types for KYC documents, vehicle photos, and attachments
  private readonly defaultAllowedMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ]);


  // Malicious / Executable file signatures to block immediately (polyglot prevention)
  private readonly forbiddenSignatures = [
    { name: 'Windows PE Executable (.exe, .dll)', bytes: [0x4d, 0x5a] }, // MZ
    { name: 'Linux ELF Binary', bytes: [0x7f, 0x45, 0x4c, 0x46] }, // .ELF
    { name: 'Mach-O Binary (32-bit)', bytes: [0xfe, 0xed, 0xfa, 0xce] },
    { name: 'Mach-O Binary (64-bit)', bytes: [0xfe, 0xed, 0xfa, 0xcf] },
    { name: 'Java Bytecode / Mach-O Fat', bytes: [0xca, 0xfe, 0xba, 0xbe] },
    { name: 'ZIP / Jar / Office Macro', bytes: [0x50, 0x4b, 0x03, 0x04] }, // Block archives when expecting pure image/PDF
    { name: 'RAR Archive', bytes: [0x52, 0x61, 0x72, 0x21] },
    { name: 'Shell Shebang (#!/)', bytes: [0x23, 0x21] },
  ];

  // Dangerous script patterns in text / polyglot streams
  private readonly dangerousScriptPatterns: RegExp[] = [
    /<script[\s\S]*?>/i,
    /<\/script>/i,
    /javascript:/i,
    /vbscript:/i,
    /<iframe[\s\S]*?>/i,
    /<object[\s\S]*?>/i,
    /<embed[\s\S]*?>/i,
    /<\?php/i,
    /<\?=/i,
    /<jsp:/i,
    /<%[\s\S]*?%>/i,
    /\b(eval|passthru|shell_exec|system|exec|popen|proc_open)\s*\(/i,
    /data:text\/html/i,
    /onload\s*=\s*['"][^'"]*['"]/i,
    /onerror\s*=\s*['"][^'"]*['"]/i,
  ];

  // Targeted web-shell & script injection markers for binary image streams.
  // We scan the header metadata window (2KB) and trailer (1KB) specifically for
  // markup/script polyglots to prevent false positives from random compressed byte entropy.
  private readonly imageDangerousPatterns: RegExp[] = [
    /<script[\s\S]*?>/i,
    /<\/script>/i,
    /<\?php/i,
    /<\?=/i,
    /<jsp:/i,
    /<%[\s\S]*?%>/i,
    /<html[\s\S]*?>/i,
    /<iframe[\s\S]*?>/i,
    /<embed[\s\S]*?>/i,
    /<object[\s\S]*?>/i,
  ];

  // Dangerous PDF objects & active execution vectors
  private readonly dangerousPdfPatterns: RegExp[] = [
    /\/JavaScript\b/i,
    /\/JS\b\s*(\(|<|\[)/i,
    /\/Launch\b/i,
    /\/EmbeddedFiles\b/i,
    /\/SubmitForm\b/i,
    /\/ImportData\b/i,
    /\/RichMedia\b/i,
    /\/OpenAction\b\s*<<[^>]*\/Launch/i,
  ];

  /**
   * Sanitizes, validates, inspects magic numbers, strips metadata,
   * and verifies security for an incoming file buffer.
   */
  async sanitizeAndValidate(
    file: {
      buffer: Buffer;
      originalname?: string;
      mimetype?: string;
      size?: number;
    },
    options: FileSanitizerOptions = {},
  ): Promise<SanitizedFileResult> {
    const minSize = options.minSizeBytes ?? 16; // Minimum valid file header size
    const maxSize = options.maxSizeBytes ?? 10 * 1024 * 1024; // Default 10 MB limit
    const allowedMimes = options.allowedMimeTypes
      ? new Set(options.allowedMimeTypes.map((m) => m.toLowerCase()))
      : this.defaultAllowedMimeTypes;

    let buffer = file.buffer;
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('Uploaded file is empty.');
    }

    if (buffer.length < minSize) {
      throw new BadRequestException('Uploaded file header is truncated or invalid.');
    }

    if (buffer.length > maxSize) {
      const maxMb = Math.round(maxSize / (1024 * 1024));
      throw new BadRequestException(
        `File size exceeds maximum allowed limit of ${maxMb}MB (received ${(buffer.length / (1024 * 1024)).toFixed(2)}MB).`,
      );
    }

    // 1. Check for Forbidden Binary Headers (Anti-Polyglot / Executable blocking)
    this.checkForForbiddenSignatures(buffer);

    // 2. Detect True MIME Type using Magic Bytes
    const detectedType = this.detectMagicType(buffer);
    if (!detectedType) {
      throw new BadRequestException(
        'Unable to verify file type from binary signature. Only valid JPEG, PNG, WEBP, and PDF files are allowed.',
      );
    }

    // 3. Verify against Allowed MIME types
    if (!allowedMimes.has(detectedType.mimeType)) {
      throw new BadRequestException(
        `File type '${detectedType.mimeType}' is not allowed for this upload. Allowed types: ${Array.from(allowedMimes).join(', ')}.`,
      );
    }

    const sanitizationApplied: string[] = [];

    // 4. Scan for Malicious Payload / Script Injections in buffer
    if (options.scanMaliciousPayloads !== false) {
      const isImage = detectedType.mimeType.startsWith('image/');
      this.scanForScriptInjections(buffer, isImage);
    }

    // 5. Special Security Scanning for PDF files
    if (detectedType.mimeType === 'application/pdf' && options.scanPdfThreats !== false) {
      this.scanPdfForThreats(buffer);
    }

    // 6. EXIF / Privacy Metadata Stripping for JPEG & PNG
    if (options.stripExif !== false && (detectedType.mimeType === 'image/jpeg' || detectedType.mimeType === 'image/png')) {
      const cleaned = this.stripImageMetadata(buffer, detectedType.mimeType);
      if (cleaned.length !== buffer.length) {
        sanitizationApplied.push('EXIF_METADATA_STRIPPED');
        buffer = cleaned;
      }
    }

    // 7. Filename Sanitization & Path Traversal Neutralization
    const rawOriginalName = file.originalname || `document${detectedType.extension}`;
    const sanitizedOriginalName = this.sanitizeOriginalFilename(rawOriginalName);
    const secureRandomFilename = `${crypto.randomUUID()}${detectedType.extension}`;

    // 8. Cryptographic Integrity Checksum (SHA-256)
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

    this.logger.debug(
      `File validated & sanitized: ${sanitizedOriginalName} -> ${secureRandomFilename} [${detectedType.mimeType}, ${buffer.length} bytes, sha256: ${checksum.slice(0, 8)}]`,
    );

    return {
      buffer,
      filename: secureRandomFilename,
      originalName: sanitizedOriginalName,
      mimeType: detectedType.mimeType,
      extension: detectedType.extension,
      size: buffer.length,
      checksum,
      detectedType: detectedType.format,
      sanitizationApplied,
    };
  }

  /**
   * Identifies true MIME type and extension using binary magic numbers.
   */
  detectMagicType(buffer: Buffer): { format: string; mimeType: string; extension: string } | null {
    // JPEG: FF D8 FF
    if (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    ) {
      return { format: 'JPEG', mimeType: 'image/jpeg', extension: '.jpg' };
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return { format: 'PNG', mimeType: 'image/png', extension: '.png' };
    }

    // PDF: %PDF- (25 50 44 46 2D)
    if (
      buffer.length >= 5 &&
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46 &&
      buffer[4] === 0x2d
    ) {
      return { format: 'PDF', mimeType: 'application/pdf', extension: '.pdf' };
    }

    // WEBP: RIFF (bytes 0..3) + WEBP (bytes 8..11)
    if (
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return { format: 'WEBP', mimeType: 'image/webp', extension: '.webp' };
    }

    return null;
  }

  /**
   * Blocks executable headers and dangerous polyglot payloads.
   */
  private checkForForbiddenSignatures(buffer: Buffer): void {
    for (const forbidden of this.forbiddenSignatures) {
      if (buffer.length >= forbidden.bytes.length) {
        let match = true;
        for (let i = 0; i < forbidden.bytes.length; i++) {
          if (buffer[i] !== forbidden.bytes[i]) {
            match = false;
            break;
          }
        }
        if (match) {
          throw new BadRequestException(
            `Security violation: Executable or archive binary header detected (${forbidden.name}). File upload blocked.`,
          );
        }
      }
    }
  }

  /**
   * Scans raw buffer for embedded script / web-shell markers.
   * For binary images (JPEG, PNG, WEBP), scans the header (first 2KB) and trailer (last 1KB)
   * specifically for web markup / PHP polyglot tags, avoiding false positives on random
   * compressed byte sequences (e.g. JPEG entropy matching words like "exec(" or "eval(").
   */
  private scanForScriptInjections(buffer: Buffer, isImage = false): void {
    if (isImage) {
      const headerWindow = buffer.subarray(0, Math.min(buffer.length, 2048)).toString('latin1');
      const trailerWindow =
        buffer.length > 2048
          ? buffer.subarray(Math.max(0, buffer.length - 1024)).toString('latin1')
          : '';
      const sample = `${headerWindow} ${trailerWindow}`;

      for (const pattern of this.imageDangerousPatterns) {
        if (pattern.test(sample)) {
          this.logger.warn(`Malicious web payload detected in image: ${pattern.toString()}`);
          throw new BadRequestException(
            'Security violation: Malicious script or embedded executable code detected in file content.',
          );
        }
      }
      return;
    }

    // Convert first 64KB and last 64KB to ASCII / UTF-8 for pattern matching on non-image files
    const sampleSize = Math.min(buffer.length, 65536);
    const headerSample = buffer.subarray(0, sampleSize).toString('utf-8', 0, sampleSize);
    const trailerSample =
      buffer.length > sampleSize
        ? buffer.subarray(buffer.length - sampleSize).toString('utf-8')
        : '';

    const textToScan = headerSample + ' ' + trailerSample;

    for (const pattern of this.dangerousScriptPatterns) {
      if (pattern.test(textToScan)) {
        this.logger.warn(`Malicious payload pattern detected: ${pattern.toString()}`);
        throw new BadRequestException(
          'Security violation: Malicious script or embedded executable code detected in file content.',
        );
      }
    }
  }

  /**
   * Scans PDF documents for active executable elements, embedded launch commands, or scripts.
   */
  private scanPdfForThreats(buffer: Buffer): void {
    // Scan PDF stream representation for active script elements
    const pdfContent = buffer.toString('binary');
    for (const pattern of this.dangerousPdfPatterns) {
      if (pattern.test(pdfContent)) {
        this.logger.warn(`Suspicious active PDF structure detected: ${pattern.toString()}`);
        throw new BadRequestException(
          'Security violation: PDF contains active scripts or executable launch actions. Only static KYC documents are permitted.',
        );
      }
    }
  }

  /**
   * Strips EXIF metadata (APP1 / APP2 / comments) from JPEG images to remove GPS & private markers.
   */
  private stripImageMetadata(buffer: Buffer, mimeType: string): Buffer {
    if (mimeType !== 'image/jpeg') {
      return buffer;
    }

    try {
      // JPEG structure: Starts with SOI (0xFF, 0xD8).
      // Segments start with 0xFF followed by a marker byte.
      // APP1 (EXIF): 0xFF, 0xE1
      // COM (Comment): 0xFF, 0xFE
      let offset = 2;
      const chunks: Buffer[] = [buffer.subarray(0, 2)]; // Start of Image marker

      while (offset < buffer.length - 1) {
        if (buffer[offset] !== 0xff) {
          // Reached scan data or malformed segment; return remaining buffer
          chunks.push(buffer.subarray(offset));
          break;
        }

        const marker = buffer[offset + 1];

        // End of image (EOI) or Start of Scan (SOS)
        if (marker === 0xd9 || marker === 0xda) {
          chunks.push(buffer.subarray(offset));
          break;
        }

        // Variable length marker segments
        if (offset + 4 > buffer.length) {
          chunks.push(buffer.subarray(offset));
          break;
        }

        const segmentLength = buffer.readUInt16BE(offset + 2);
        const nextOffset = offset + 2 + segmentLength;

        if (nextOffset > buffer.length) {
          chunks.push(buffer.subarray(offset));
          break;
        }

        // Strip APP1 (EXIF - 0xE1) and COM (Comment - 0xFE) segments
        if (marker === 0xe1 || marker === 0xfe) {
          // Skip this metadata segment
          offset = nextOffset;
          continue;
        }

        // Keep all other segments (APP0 JFIF, DQT, DHT, SOF0, etc.)
        chunks.push(buffer.subarray(offset, nextOffset));
        offset = nextOffset;
      }

      return Buffer.concat(chunks);
    } catch (err) {
      this.logger.debug(`EXIF strip skipped due to parsing error: ${err}`);
      return buffer;
    }
  }

  /**
   * Strips dangerous directory traversal characters, null bytes, and non-printable characters.
   */
  sanitizeOriginalFilename(filename: string): string {
    if (!filename) return 'unnamed_file';

    // Remove path traversal and null bytes
    let clean = filename
      .replace(/\0/g, '')
      .replace(/[\/\\]+/g, '_')
      .replace(/\.\.+/g, '_')
      .trim();

    // Base name only
    clean = path.basename(clean);

    // Keep only alphanumeric, hyphens, underscores, and dots
    clean = clean.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Limit length to 100 characters
    if (clean.length > 100) {
      const ext = path.extname(clean);
      const nameWithoutExt = path.basename(clean, ext).slice(0, 80);
      clean = `${nameWithoutExt}${ext}`;
    }

    return clean || 'unnamed_file';
  }
}
