import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '7001', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  appUrl: process.env.APP_URL || 'https://api.adhocx.com',
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : [
        'https://app.adhocx.com',
        'https://admin.adhocx.com',
        'https://adhocx.com',
        'https://www.adhocx.com',
        'https://api.adhocx.com',
        'http://3.110.42.191',
        'http://localhost:7002',
        'http://localhost:7003',
        'http://localhost:3000',
        'http://localhost:3001',
      ],
}));
