import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';

import { AppModule } from './app.module';
import { CustomValidationPipe } from './common/pipes';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger:
      process.env['NODE_ENV'] === 'production'
        ? ['error', 'warn']
        : ['log', 'debug', 'error', 'verbose', 'warn'],
  });

  const configService = app.get(ConfigService);

  // Get configuration values
  const port = configService.get<number>('app.port', 3000);
  const environment = configService.get<string>('app.environment', 'development');
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api/v1');
  const corsOrigin = configService.get<string | boolean>('app.cors.origin', true);
  const corsCredentials = configService.get<boolean>('app.cors.credentials', true);

  // Security - Helmet
  if (configService.get<boolean>('app.security.helmet.enabled', true)) {
    app.use(
      helmet({
        crossOriginEmbedderPolicy: false,
        contentSecurityPolicy: environment === 'production' ? undefined : false,
      }),
    );
  }

  // Compression
  app.use(compression());

  // Global prefix
  app.setGlobalPrefix(apiPrefix);

  // API Versioning - Disabled for now to simplify routing
  // app.enableVersioning({
  //   type: VersioningType.URI,
  //   defaultVersion: '1',
  // });

  // CORS
  app.enableCors({
    origin: corsOrigin,
    credentials: corsCredentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Request-ID'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new CustomValidationPipe({
      whitelist: true, // Strip non-decorated properties
      transform: true, // Transform payloads to DTO instances
      forbidNonWhitelisted: true, // Throw error for non-whitelisted properties
      disableErrorMessages: environment === 'production',
      validateCustomDecorators: true,
    }),
  );

  // Swagger Documentation
  if (configService.get<boolean>('app.swagger.enabled', true)) {
    const config = new DocumentBuilder()
      .setTitle('E-Commerce Async Resilient System')
      .setDescription(
        `
        Sistema de procesamiento de órdenes asíncrono y resiliente para e-commerce.
        
        Implementa patrones avanzados como:
        - Event Sourcing
        - CQRS (Command Query Responsibility Segregation)
        - Outbox Pattern
        - Saga Pattern
        - Circuit Breaker Pattern
        - Retry Pattern con Exponential Backoff
        
        Tecnologías utilizadas:
        - NestJS con TypeScript
        - PostgreSQL con TypeORM
        - Redis con Bull Queues
        - JWT Authentication
        - Winston Logging
        - Terminus Health Checks
      `,
      )
      .setVersion('1.0.0')
      .setContact(
        'Sistema E-commerce Async',
        'https://github.com/tu-usuario/ecommerce-async-resilient-system',
        'tu-email@ejemplo.com',
      )
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('Authentication', 'Endpoints de autenticación y autorización')
      .addTag('Users', 'Gestión de usuarios')
      .addTag('Products', 'Gestión de productos y catálogo')
      .addTag('Orders', 'Procesamiento de órdenes')
      .addTag('Inventory', 'Control de inventario')
      .addTag('Payments', 'Procesamiento de pagos')
      .addTag('Notifications', 'Sistema de notificaciones')
      .addTag('Events', 'Event Sourcing y mensajería')
      .addTag('Health', 'Monitoreo y health checks')
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    });

    const swaggerPath = configService.get<string>('app.swagger.path', 'api/docs');
    SwaggerModule.setup(swaggerPath, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'none',
        filter: true,
        showRequestHeaders: true,
      },
      customSiteTitle: 'E-commerce Async System - API Documentation',
    });

    logger.log(`📚 Swagger documentation available at: http://localhost:${port}/${swaggerPath}`);
  }

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.log('SIGINT received, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  // Start server
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`🌍 Environment: ${environment}`);
  logger.log(`📡 API Prefix: /${apiPrefix}`);
  logger.log(`🛡️  Authentication: JWT with Bearer token`);
  logger.log(`� Health Check: http://localhost:${port}/health`);

  if (environment === 'development') {
    logger.log(`🔧 Development mode enabled`);
  }
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('❌ Error starting application', error.stack);
  process.exit(1);
});
