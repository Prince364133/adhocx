import { BadRequestException } from '@nestjs/common';
import { StorageService } from '../src/common/storage/storage.service';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    service = new StorageService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reject invalid / unverified MIME types', async () => {
    const invalidFile = {
      buffer: Buffer.from('executable binary data non magic header'),
      originalname: 'malicious.exe',
      mimetype: 'application/x-msdownload',
      size: 1024,
    };

    await expect(service.saveFile(invalidFile)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should reject files exceeding maximum limit', async () => {
    const oversizedFile = {
      buffer: Buffer.concat([
        Buffer.from('%PDF-1.4\n'),
        Buffer.alloc(11 * 1024 * 1024), // 11MB
      ]),
      originalname: 'huge_document.pdf',
      mimetype: 'application/pdf',
      size: 11 * 1024 * 1024,
    };

    await expect(service.saveFile(oversizedFile)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should save valid PDF file and compute SHA-256 checksum', async () => {
    const validFile = {
      buffer: Buffer.from('%PDF-1.4 valid test pdf content for kyc verification'),
      originalname: 'driving_license.pdf',
      mimetype: 'application/pdf',
      size: 52,
    };

    const result = await service.saveFile(validFile);

    expect(result.url).toBeDefined();
    expect(result.originalName).toBe('driving_license.pdf');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.checksum).toBeDefined();
    expect(result.checksum.length).toBe(64); // SHA-256

    // Clean up
    await service.deleteFile(result.filename);
  });

  it('should sanitize and accept JPEG even when client reports application/octet-stream', async () => {
    const validJpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb,
    ]);

    const result = await service.saveFile({
      buffer: validJpeg,
      originalname: 'pan_card.jpg',
      mimetype: 'application/octet-stream',
    });

    expect(result.mimeType).toBe('image/jpeg');
    expect(result.detectedType).toBe('JPEG');
    expect(result.checksum).toBeDefined();

    await service.deleteFile(result.filename);
  });
});
