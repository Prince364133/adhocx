import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL || 'postgresql://adhocx_user:adhocx_password@localhost:5432/adhocx_db?schema=public',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'adhocx_user',
  password: process.env.DB_PASSWORD || 'adhocx_password',
  database: process.env.DB_NAME || 'adhocx_db',
}));
