import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WinstonLoggerService } from '../common/utils/winston-logger.service';
import { appConfig } from '../config/app.config';
import * as winston from 'winston';

describe('WinstonLoggerService', () => {
  let service: WinstonLoggerService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [appConfig],
          isGlobal: true,
        }),
      ],
      providers: [WinstonLoggerService],
    }).compile();

    service = module.get<WinstonLoggerService>(WinstonLoggerService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create winston logger with correct configuration', () => {
    const winstonLogger = service.getWinstonLogger();
    expect(winstonLogger).toBeInstanceOf(winston.Logger);
  });

  describe('logging methods', () => {
    let logSpy: jest.SpyInstance;
    let errorSpy: jest.SpyInstance;
    let warnSpy: jest.SpyInstance;
    let debugSpy: jest.SpyInstance;

    beforeEach(() => {
      const winstonLogger = service.getWinstonLogger();
      logSpy = jest.spyOn(winstonLogger, 'info');
      errorSpy = jest.spyOn(winstonLogger, 'error');
      warnSpy = jest.spyOn(winstonLogger, 'warn');
      debugSpy = jest.spyOn(winstonLogger, 'debug');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should log info messages with context', () => {
      const message = 'Test info message';
      const context = 'TestContext';
      const meta = { key: 'value' };

      service.log(message, context, meta);

      expect(logSpy).toHaveBeenCalledWith(message, {
        context,
        ...meta,
      });
    });

    it('should log error messages with stack trace', () => {
      const message = 'Test error message';
      const trace = 'Error stack trace';
      const context = 'ErrorContext';
      const meta = { errorCode: 500 };

      service.error(message, trace, context, meta);

      expect(errorSpy).toHaveBeenCalledWith(message, {
        context,
        trace,
        ...meta,
      });
    });

    it('should log warning messages', () => {
      const message = 'Test warning message';
      const context = 'WarnContext';

      service.warn(message, context);

      expect(warnSpy).toHaveBeenCalledWith(message, {
        context,
      });
    });

    it('should log debug messages', () => {
      const message = 'Test debug message';
      const context = 'DebugContext';

      service.debug(message, context);

      expect(debugSpy).toHaveBeenCalledWith(message, {
        context,
      });
    });
  });

  describe('configuration-based behavior', () => {
    it('should use correct log level from configuration', () => {
      const logLevel = configService.get('app.logging.level');
      const winstonLogger = service.getWinstonLogger();

      expect(winstonLogger.level).toBe(logLevel);
    });

    it('should include service metadata in logs', () => {
      const winstonLogger = service.getWinstonLogger();
      const defaultMeta = winstonLogger.defaultMeta;

      expect(defaultMeta).toEqual({
        service: configService.get('app.name'),
        version: configService.get('app.version'),
        environment: configService.get('app.environment'),
      });
    });
  });
});
