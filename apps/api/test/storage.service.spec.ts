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

  it('should reject invalid MIME types', async () => {
    const invalidFile = {
      buffer: Buffer.from('executable binary data'),
      originalname: 'malicious.exe',
      mimetype: 'application/x-msdownload',
      size: 1024,
    };

    await expect(service.saveFile(invalidFile)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should reject files exceeding 5MB limit', async () => {
    const oversizedFile = {
      buffer: Buffer.alloc(6 * 1024 * 1024), // 6MB
      originalname: 'huge_document.pdf',
      mimetype: 'application/pdf',
      size: 6 * 1024 * 1024,
    };

    await expect(service.saveFile(oversizedFile)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should save valid PDF file and compute checksum', async () => {
    const validFile = {
      buffer: Buffer.from('%PDF-1.4 valid test pdf content'),
      originalname: 'driving_license.pdf',
      mimetype: 'application/pdf',
      size: 32,
    };

    const result = await service.saveFile(validFile);

    expect(result.url).toContain('/uploads/');
    expect(result.originalName).toBe('driving_license.pdf');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.checksum).toBeDefined();
    expect(result.checksum.length).toBe(64); // SHA-256

    // Clean up
    await service.deleteFile(result.filename);
  });
});
