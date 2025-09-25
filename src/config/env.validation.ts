import { plainToClass, Transform } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsIn,
  IsBoolean,
  validateSync,
  Min,
  Max,
} from 'class-validator';

export class EnvironmentVariables {
  @IsString()
  @IsOptional()
  APP_NAME: string = 'ecommerce-async-resilient-system';

  @IsString()
  @IsOptional()
  APP_VERSION: string = '1.0.0';

  @IsString()
  @IsIn(['development', 'staging', 'production', 'test'])
  NODE_ENV: string = 'development';

  @IsNumber()
  @Min(1)
  @Max(65535)
  @Transform(({ value }) => parseInt(value, 10))
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  API_PREFIX: string = 'api/v1';

  @IsString()
  @IsIn(['error', 'warn', 'info', 'debug'])
  LOG_LEVEL: string = 'info';

  @IsString()
  @IsIn(['json', 'simple', 'combined'])
  LOG_FORMAT: string = 'json';

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  LOG_TO_FILE: boolean = false;

  @IsString()
  @IsOptional()
  LOG_DIR: string = './logs';

  @IsString()
  @IsOptional()
  LOG_MAX_SIZE: string = '20m';

  @IsString()
  @IsOptional()
  LOG_MAX_FILES: string = '14d';

  @IsString()
  @IsIn(['error', 'warn'])
  @IsOptional()
  LOG_ERROR_FILE_LEVEL: string = 'warn';

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  LOG_COLORIZE: boolean = true;

  @IsString()
  @IsOptional()
  LOG_DATE_PATTERN: string = 'YYYY-MM-DD';

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  LOG_ZIPPED_ARCHIVE: boolean = false;

  @IsString()
  @IsOptional()
  CORS_ORIGIN: string = '*';

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  CORS_CREDENTIALS: boolean = false;

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  ENABLE_SWAGGER: boolean = true;

  @IsString()
  @IsOptional()
  SWAGGER_PATH: string = 'api/docs';

  @IsNumber()
  @Min(1000)
  @Max(300000) // 5 minutes max
  @Transform(({ value }) => parseInt(value, 10))
  REQUEST_TIMEOUT: number = 30000;

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  HELMET_ENABLED: boolean = true;

  @IsNumber()
  @Min(60000) // 1 minute min
  @Transform(({ value }) => parseInt(value, 10))
  RATE_LIMIT_WINDOW_MS: number = 900000; // 15 minutes

  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  RATE_LIMIT_MAX: number = 1000;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Configuration validation error: ${errors.toString()}`);
  }

  return validatedConfig;
}
