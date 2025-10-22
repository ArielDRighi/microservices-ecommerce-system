import winston from 'winston';
import { config } from './config';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'api-gateway' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          ({ timestamp, level, message, service, ...meta }) =>
            `${timestamp} [${service}] ${level}: ${message} ${
              Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
            }`,
        ),
      ),
    }),
  ],
});

export { logger };
