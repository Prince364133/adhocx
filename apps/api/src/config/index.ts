import appConfig from './app.config';
import databaseConfig from './database.config';
import redisConfig from './redis.config';
import authConfig from './auth.config';
import storageConfig from './storage.config';

export const configs = [
  appConfig,
  databaseConfig,
  redisConfig,
  authConfig,
  storageConfig,
];

export {
  appConfig,
  databaseConfig,
  redisConfig,
  authConfig,
  storageConfig,
};
