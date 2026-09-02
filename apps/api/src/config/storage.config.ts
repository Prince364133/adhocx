import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  driver: process.env.STORAGE_DRIVER || (process.env.R2_ACCESS_KEY_ID ? 'r2' : 'local'),
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || 'e2d2bf9eb658189a975bb2edfc73b377',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucketName: process.env.R2_BUCKET_NAME || 'adhocx',
    endpoint: process.env.R2_ENDPOINT || 'https://e2d2bf9eb658189a975bb2edfc73b377.r2.cloudflarestorage.com',
    publicUrl: process.env.R2_PUBLIC_URL || 'https://pub-6b0e7f5bbf684bc7aa7bb5f04e679bf7.r2.dev',
    apiToken: process.env.R2_API_TOKEN || '',
  },
}));
