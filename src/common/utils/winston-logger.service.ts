import { Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import { Request, Response } from 'express';

export interface LogMetadata {
  [key: string]: string | number | boolean | object | null | undefined;
}

export interface RequestLogData {
  correlationId: string;
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
  body?: unknown;
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
}

export interface ResponseLogData {
  correlationId: string;
  statusCode: number;
  responseTime: number;
  responseSize?: number;
}

interface CustomRequest extends Request {
  correlationId?: string;
  user?: {
    id?: string | number;
    [key: string]: unknown;
  };
}

@Injectable()
export class WinstonLoggerService implements LoggerService {
  private readonly logger: winston.Logger;
  private readonly context: string = 'Application';

  constructor(private readonly configService: ConfigService) {
    this.logger = this.createLogger();
  }

  private createLogger(): winston.Logger {
    const environment = this.configService.get<string>('app.environment');
    const logLevel = this.configService.get<string>('app.logging.level');
    const logToFile = this.configService.get<boolean>('app.logging.toFile');
    const logDir = this.configService.get<string>('app.logging.dir');
    const logColorize = this.configService.get<boolean>('app.logging.colorize');

    const transports: winston.transport[] = [];

    // Console transport
    if (environment === 'development' || environment === 'test') {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.ms(),
            logColorize ? winston.format.colorize() : winston.format.uncolorize(),
            nestWinstonModuleUtilities.format.nestLike('App', {
              colors: logColorize,
              prettyPrint: true,
            }),
          ),
        }),
      );
    } else {
      // Production console format (JSON)
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json(),
          ),
        }),
      );
    }

    // File transports for production and when explicitly enabled
    if (logToFile || environment === 'production') {
      // Error logs
      transports.push(
        new DailyRotateFile({
          filename: `${logDir}/error-%DATE%.log`,
          datePattern: this.configService.get<string>('app.logging.datePattern'),
          zippedArchive: this.configService.get<boolean>('app.logging.zippedArchive'),
          maxSize: this.configService.get<string>('app.logging.maxSize'),
          maxFiles: this.configService.get<string>('app.logging.maxFiles'),
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json(),
          ),
        }),
      );

      // Combined logs (all levels)
      transports.push(
        new DailyRotateFile({
          filename: `${logDir}/combined-%DATE%.log`,
          datePattern: this.configService.get<string>('app.logging.datePattern'),
          zippedArchive: this.configService.get<boolean>('app.logging.zippedArchive'),
          maxSize: this.configService.get<string>('app.logging.maxSize'),
          maxFiles: this.configService.get<string>('app.logging.maxFiles'),
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json(),
          ),
        }),
      );
    }

    return winston.createLogger({
      level: logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      defaultMeta: {
        service: this.configService.get<string>('app.name'),
        version: this.configService.get<string>('app.version'),
        environment: this.configService.get<string>('app.environment'),
      },
      transports,
      exitOnError: false,
    });
  }

  log(message: string, context?: string, meta?: LogMetadata): void {
    const logContext = context || this.context;
    this.logger.info(message, {
      context: logContext,
      ...meta,
    });
  }

  error(message: string, trace?: string, context?: string, meta?: LogMetadata): void {
    const logContext = context || this.context;
    this.logger.error(message, {
      context: logContext,
      trace,
      ...meta,
    });
  }

  warn(message: string, context?: string, meta?: LogMetadata): void {
    const logContext = context || this.context;
    this.logger.warn(message, {
      context: logContext,
      ...meta,
    });
  }

  debug(message: string, context?: string, meta?: LogMetadata): void {
    const logContext = context || this.context;
    this.logger.debug(message, {
      context: logContext,
      ...meta,
    });
  }

  verbose(message: string, context?: string, meta?: LogMetadata): void {
    const logContext = context || this.context;
    this.logger.verbose(message, {
      context: logContext,
      ...meta,
    });
  }

  // Utility methods for structured logging
  logRequest(req: CustomRequest, context?: string): void {
    this.log('Incoming request', context || 'HTTP', {
      method: req.method,
      url: req.url,
      userAgent: req.get('user-agent'),
      ip: req.ip,
      correlationId: req.correlationId,
    });
  }

  logResponse(req: CustomRequest, res: Response, responseTime: number, context?: string): void {
    this.log('Outgoing response', context || 'HTTP', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      correlationId: req.correlationId,
    });
  }

  logError(error: Error, req?: CustomRequest, context?: string): void {
    this.error(error.message, error.stack, context || 'Exception', {
      name: error.name,
      method: req?.method,
      url: req?.url,
      correlationId: req?.correlationId,
      userId: req?.user?.id,
    });
  }

  // Raw winston logger access for advanced use cases
  getWinstonLogger(): winston.Logger {
    return this.logger;
  }
}
