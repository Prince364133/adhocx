import { ForbiddenException } from '@nestjs/common';
import {
  StorageService,
  signUploadPath,
  verifyUploadSignature,
} from '../src/common/storage/storage.service';
import { UploadsController } from '../src/common/storage/uploads.controller';

/**
 * Identity documents (Aadhaar, PAN, licence, RC) were served at permanent public URLs. They are now
 * handed out as links that expire: R2 presigned GETs, or HMAC-signed local /uploads links.
 */
const ENV = ['DOCUMENT_URL_SECRET', 'JWT_ACCESS_SECRET', 'APP_URL', 'STORAGE_REQUIRE_SIGNED_UPLOADS',
  'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_ENDPOINT', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL'] as const;
const saved: Record<string, string | undefined> = {};
beforeEach(() => {
  ENV.forEach((k) => ((saved[k] = process.env[k]), delete process.env[k]));
  process.env.DOCUMENT_URL_SECRET = 'doc-link-secret';
  process.env.APP_URL = 'https://api.example.test';
});
afterEach(() => ENV.forEach((k) => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k]))));

describe('local /uploads documents', () => {
  it('get a signed link that expires', async () => {
    const storage = new StorageService();
    const url = new URL(await storage.getDocumentAccessUrl('/uploads/abc-123.jpg'));
    expect(url.origin + url.pathname).toBe('https://api.example.test/uploads/abc-123.jpg');
    const exp = url.searchParams.get('exp')!;
    const sig = url.searchParams.get('sig')!;
    expect(Number(exp) - Date.now() / 1000).toBeGreaterThan(14 * 60);
    expect(Number(exp) - Date.now() / 1000).toBeLessThanOrEqual(15 * 60);
    expect(verifyUploadSignature('abc-123.jpg', exp, sig)).toBe(true);
    expect(verifyUploadSignature('other.jpg', exp, sig)).toBe(false);
  });

  it('expired, forged or missing signatures do not verify', () => {
    const now = Math.floor(Date.now() / 1000);
    const past = now - 1;
    expect(verifyUploadSignature('a.jpg', String(past), signUploadPath('a.jpg', past, 'doc-link-secret'))).toBe(false);
    expect(verifyUploadSignature('a.jpg', String(now + 60), 'f'.repeat(64))).toBe(false);
    expect(verifyUploadSignature('a.jpg', undefined, undefined)).toBe(false);
  });

  it('external URLs and empty values pass through', async () => {
    const storage = new StorageService();
    expect(await storage.getDocumentAccessUrl('https://elsewhere.example/a.png')).toBe('https://elsewhere.example/a.png');
    expect(await storage.getDocumentAccessUrl(null)).toBe('');
    expect(await storage.getDocumentAccessUrl('undefined')).toBe('');
  });
});

describe('GET /uploads/:filename', () => {
  const ctrl = new UploadsController(new StorageService());
  const res: any = { setHeader: jest.fn(), sendFile: jest.fn() };

  it('refuses a link whose signature is wrong or expired', async () => {
    const past = Math.floor(Date.now() / 1000) - 10;
    await expect(ctrl.getUploadedFile('a.jpg', res, String(past), signUploadPath('a.jpg', past, 'doc-link-secret'))).rejects.toThrow(ForbiddenException);
    await expect(ctrl.getUploadedFile('a.jpg', res, String(past + 3600), 'bad')).rejects.toThrow(ForbiddenException);
  });

  it('with STORAGE_REQUIRE_SIGNED_UPLOADS=true, unsigned requests are refused', async () => {
    process.env.STORAGE_REQUIRE_SIGNED_UPLOADS = 'true';
    await expect(ctrl.getUploadedFile('a.jpg', res)).rejects.toThrow(/signed link is required/);
  });

  it('still rejects path traversal', async () => {
    await expect(ctrl.getUploadedFile('../.env', res)).rejects.toThrow(/Invalid filename/);
  });
});

describe('R2 documents', () => {
  it('stored public R2 URLs are turned into presigned, expiring GET links', async () => {
    process.env.R2_ACCESS_KEY_ID = 'AKIDEXAMPLE';
    process.env.R2_SECRET_ACCESS_KEY = 'secretexample';
    process.env.R2_ENDPOINT = 'https://acct.r2.cloudflarestorage.com';
    process.env.R2_BUCKET_NAME = 'adhocx';
    process.env.R2_PUBLIC_URL = 'https://pub-123.r2.dev';
    const storage = new StorageService();
    const url = new URL(await storage.getDocumentAccessUrl('https://pub-123.r2.dev/documents/aadhaar-1.jpg'));
    expect(url.host).toContain('r2.cloudflarestorage.com');
    expect(url.pathname).toContain('documents/aadhaar-1.jpg');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('900');
    expect(url.searchParams.get('X-Amz-Signature')).toBeTruthy();
  });
});
