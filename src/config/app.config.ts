import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
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
  },
}));
