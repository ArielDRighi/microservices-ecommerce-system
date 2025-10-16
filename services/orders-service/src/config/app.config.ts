import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  name: process.env['APP_NAME'] || 'ecommerce-async-resilient-system',
  version: process.env['APP_VERSION'] || '1.0.0',
  port: parseInt(process.env['PORT'] || '3000', 10),
  environment: process.env['NODE_ENV'] || 'development',
  apiPrefix: process.env['API_PREFIX'] || 'api/v1',
  cors: {
    origin: process.env['CORS_ORIGIN'] || true,
    credentials: process.env['CORS_CREDENTIALS'] === 'true',
  },
  swagger: {
    enabled: process.env['ENABLE_SWAGGER'] !== 'false',
    path: process.env['SWAGGER_PATH'] || 'api/docs',
  },
  productionUrl: process.env['PRODUCTION_URL'] || 'https://api.production.com',
  security: {
    helmet: {
      enabled: process.env['HELMET_ENABLED'] !== 'false',
    },
    rateLimit: {
      windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000', 10), // 15 minutes
      max: parseInt(process.env['RATE_LIMIT_MAX'] || '1000', 10), // limit each IP to 1000 requests per windowMs
    },
  },
  logging: {
    level: process.env['LOG_LEVEL'] || 'info',
    format: process.env['LOG_FORMAT'] || 'json',
    toFile: process.env['LOG_TO_FILE'] === 'true',
    dir: process.env['LOG_DIR'] || './logs',
    maxSize: process.env['LOG_MAX_SIZE'] || '20m',
    maxFiles: process.env['LOG_MAX_FILES'] || '14d',
    colorize: process.env['LOG_COLORIZE'] !== 'false',
    datePattern: process.env['LOG_DATE_PATTERN'] || 'YYYY-MM-DD',
    zippedArchive: process.env['LOG_ZIPPED_ARCHIVE'] === 'true',
    errorFileLevel: process.env['LOG_ERROR_FILE_LEVEL'] || 'warn',
  },
  request: {
    timeout: parseInt(process.env['REQUEST_TIMEOUT'] || '30000', 10), // 30 seconds
  },
}));
