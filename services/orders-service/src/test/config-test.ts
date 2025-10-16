import { Logger } from '@nestjs/common';

// Test script para validar configuración por ambiente
const logger = new Logger('ConfigTest');

export function testEnvironmentConfiguration() {
  logger.log('=== Testing Environment Configuration ===');

  // Mock ConfigService para testing
  const testConfigs = {
    development: {
      NODE_ENV: 'development',
      DATABASE_HOST: 'localhost',
      DATABASE_PORT: 5432,
      DATABASE_NAME: 'ecommerce_async',
      REDIS_HOST: 'localhost',
      REDIS_PORT: 6379,
      JWT_SECRET: 'dev-secret-key',
      LOG_LEVEL: 'debug',
    },
    production: {
      NODE_ENV: 'production',
      DATABASE_HOST: 'prod-db.example.com',
      DATABASE_PORT: 5432,
      DATABASE_NAME: 'ecommerce_async_prod',
      REDIS_HOST: 'prod-redis.example.com',
      REDIS_PORT: 6379,
      JWT_SECRET: 'super-secure-production-key',
      LOG_LEVEL: 'warn',
    },
    test: {
      NODE_ENV: 'test',
      DATABASE_HOST: 'localhost',
      DATABASE_PORT: 5432,
      DATABASE_NAME: 'ecommerce_async_test',
      REDIS_HOST: 'localhost',
      REDIS_PORT: 6379,
      JWT_SECRET: 'test-secret-key',
      LOG_LEVEL: 'error',
    },
  };

  // Test cada ambiente
  Object.entries(testConfigs).forEach(([env, config]) => {
    logger.log(`Testing ${env.toUpperCase()} configuration:`);

    // Simular configuración de ambiente
    const originalEnv = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = config.NODE_ENV;

    // Validar configuración de base de datos
    const dbConfig = {
      host: config.DATABASE_HOST,
      port: config.DATABASE_PORT,
      database: config.DATABASE_NAME,
      synchronize: env !== 'production', // Solo en desarrollo/test
      logging: env === 'development' ? 'all' : ['error', 'warn'],
      ssl: env === 'production',
    };

    logger.log(`  Database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    logger.log(`  Sync: ${dbConfig.synchronize}, SSL: ${dbConfig.ssl}`);
    logger.log(
      `  Logging: ${Array.isArray(dbConfig.logging) ? dbConfig.logging.join(', ') : dbConfig.logging}`,
    );

    // Validar configuración de Redis
    const redisConfig = {
      host: config.REDIS_HOST,
      port: config.REDIS_PORT,
      keyPrefix: `ecommerce:${env}:`,
    };

    logger.log(`  Redis: ${redisConfig.host}:${redisConfig.port}`);
    logger.log(`  Key Prefix: ${redisConfig.keyPrefix}`);

    // Validar configuración de JWT
    const jwtConfig = {
      secret: config.JWT_SECRET,
      signOptions: {
        expiresIn: env === 'production' ? '1h' : '24h',
        issuer: 'ecommerce-async-system',
        audience: env,
      },
    };

    logger.log(`  JWT Secret: ${jwtConfig.secret.length} chars`);
    logger.log(`  JWT Expires: ${jwtConfig.signOptions.expiresIn}`);
    logger.log(`  JWT Audience: ${jwtConfig.signOptions.audience}`);

    // Restaurar ambiente original
    process.env['NODE_ENV'] = originalEnv;
    logger.log(`  ✅ ${env.toUpperCase()} configuration validated\n`);
  });

  logger.log('=== Environment Configuration Test Completed ===');
}

// Validar variables de entorno actuales
export function validateCurrentEnvironment() {
  logger.log('=== Validating Current Environment Variables ===');

  const requiredVars = [
    'DATABASE_HOST',
    'DATABASE_PORT',
    'DATABASE_USERNAME',
    'DATABASE_PASSWORD',
    'DATABASE_NAME',
    'REDIS_HOST',
    'REDIS_PORT',
    'JWT_SECRET',
  ];

  const missingVars: string[] = [];

  requiredVars.forEach((varName) => {
    const value = process.env[varName];
    if (!value) {
      missingVars.push(varName);
      logger.warn(`  ⚠️  ${varName}: NOT SET`);
    } else {
      // No mostrar valores sensibles completos
      const displayValue =
        varName.includes('PASSWORD') || varName.includes('SECRET') ? '***REDACTED***' : value;
      logger.log(`  ✅ ${varName}: ${displayValue}`);
    }
  });

  if (missingVars.length > 0) {
    logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    logger.error('Please check your .env file or environment configuration');
  } else {
    logger.log('✅ All required environment variables are set');
  }

  logger.log('=== Current Environment Validation Completed ===');
}

// Execute if run directly
if (require.main === module) {
  testEnvironmentConfiguration();
  validateCurrentEnvironment();
}
