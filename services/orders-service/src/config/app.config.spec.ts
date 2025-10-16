import { appConfig } from './app.config';

describe('appConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return default config when no env variables are set', () => {
    // Clear all app-related env variables
    delete process.env['APP_NAME'];
    delete process.env['APP_VERSION'];
    delete process.env['PORT'];
    delete process.env['NODE_ENV'];
    delete process.env['API_PREFIX'];
    delete process.env['CORS_ORIGIN'];
    delete process.env['CORS_CREDENTIALS'];
    delete process.env['ENABLE_SWAGGER'];
    delete process.env['SWAGGER_PATH'];
    delete process.env['HELMET_ENABLED'];
    delete process.env['RATE_LIMIT_WINDOW_MS'];
    delete process.env['RATE_LIMIT_MAX'];
    delete process.env['LOG_LEVEL'];
    delete process.env['LOG_FORMAT'];
    delete process.env['LOG_TO_FILE'];
    delete process.env['LOG_DIR'];
    delete process.env['LOG_MAX_SIZE'];
    delete process.env['LOG_MAX_FILES'];
    delete process.env['LOG_COLORIZE'];
    delete process.env['LOG_DATE_PATTERN'];
    delete process.env['LOG_ZIPPED_ARCHIVE'];
    delete process.env['LOG_ERROR_FILE_LEVEL'];
    delete process.env['REQUEST_TIMEOUT'];

    const config = appConfig();

    expect(config.name).toBe('ecommerce-async-resilient-system');
    expect(config.version).toBe('1.0.0');
    expect(config.port).toBe(3000);
    expect(config.environment).toBe('development');
    expect(config.apiPrefix).toBe('api/v1');
    expect(config.cors.origin).toBe(true);
    expect(config.cors.credentials).toBe(false);
    expect(config.swagger.enabled).toBe(true);
    expect(config.swagger.path).toBe('api/docs');
    expect(config.security.helmet.enabled).toBe(true);
    expect(config.security.rateLimit.windowMs).toBe(900000);
    expect(config.security.rateLimit.max).toBe(1000);
    expect(config.logging.level).toBe('info');
    expect(config.logging.format).toBe('json');
    expect(config.logging.toFile).toBe(false);
    expect(config.logging.dir).toBe('./logs');
    expect(config.logging.maxSize).toBe('20m');
    expect(config.logging.maxFiles).toBe('14d');
    expect(config.logging.colorize).toBe(true);
    expect(config.logging.datePattern).toBe('YYYY-MM-DD');
    expect(config.logging.zippedArchive).toBe(false);
    expect(config.logging.errorFileLevel).toBe('warn');
    expect(config.request.timeout).toBe(30000);
  });

  it('should use env variables when provided', () => {
    process.env['APP_NAME'] = 'test-app';
    process.env['APP_VERSION'] = '2.0.0';
    process.env['PORT'] = '4000';
    process.env['NODE_ENV'] = 'production';
    process.env['API_PREFIX'] = 'api/v2';
    process.env['CORS_ORIGIN'] = 'https://example.com';
    process.env['CORS_CREDENTIALS'] = 'true';
    process.env['ENABLE_SWAGGER'] = 'false';
    process.env['SWAGGER_PATH'] = 'docs';
    process.env['HELMET_ENABLED'] = 'false';
    process.env['RATE_LIMIT_WINDOW_MS'] = '600000';
    process.env['RATE_LIMIT_MAX'] = '500';
    process.env['LOG_LEVEL'] = 'debug';
    process.env['LOG_FORMAT'] = 'text';
    process.env['LOG_TO_FILE'] = 'true';
    process.env['LOG_DIR'] = './custom-logs';
    process.env['LOG_MAX_SIZE'] = '50m';
    process.env['LOG_MAX_FILES'] = '30d';
    process.env['LOG_COLORIZE'] = 'false';
    process.env['LOG_DATE_PATTERN'] = 'YYYY-MM';
    process.env['LOG_ZIPPED_ARCHIVE'] = 'true';
    process.env['LOG_ERROR_FILE_LEVEL'] = 'error';
    process.env['REQUEST_TIMEOUT'] = '60000';

    const config = appConfig();

    expect(config.name).toBe('test-app');
    expect(config.version).toBe('2.0.0');
    expect(config.port).toBe(4000);
    expect(config.environment).toBe('production');
    expect(config.apiPrefix).toBe('api/v2');
    expect(config.cors.origin).toBe('https://example.com');
    expect(config.cors.credentials).toBe(true);
    expect(config.swagger.enabled).toBe(false);
    expect(config.swagger.path).toBe('docs');
    expect(config.security.helmet.enabled).toBe(false);
    expect(config.security.rateLimit.windowMs).toBe(600000);
    expect(config.security.rateLimit.max).toBe(500);
    expect(config.logging.level).toBe('debug');
    expect(config.logging.format).toBe('text');
    expect(config.logging.toFile).toBe(true);
    expect(config.logging.dir).toBe('./custom-logs');
    expect(config.logging.maxSize).toBe('50m');
    expect(config.logging.maxFiles).toBe('30d');
    expect(config.logging.colorize).toBe(false);
    expect(config.logging.datePattern).toBe('YYYY-MM');
    expect(config.logging.zippedArchive).toBe(true);
    expect(config.logging.errorFileLevel).toBe('error');
    expect(config.request.timeout).toBe(60000);
  });

  it('should handle invalid port number', () => {
    process.env['PORT'] = 'invalid';

    const config = appConfig();

    expect(config.port).toBeNaN();
  });

  it('should handle cors.credentials with non-true value', () => {
    process.env['CORS_CREDENTIALS'] = 'false';

    const config = appConfig();

    expect(config.cors.credentials).toBe(false);
  });

  it('should handle log.toFile with non-true value', () => {
    process.env['LOG_TO_FILE'] = 'false';

    const config = appConfig();

    expect(config.logging.toFile).toBe(false);
  });
});
