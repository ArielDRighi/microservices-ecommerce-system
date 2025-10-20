import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// Configuration
import { appConfig, databaseConfig, bullConfig, jwtConfig } from './config';
import { validate } from './config/env.validation';

// Common providers
import { AllExceptionsFilter, ResponseInterceptor, LoggingInterceptor } from './common';

// Logger module
import { LoggerModule } from './common/utils/logger.module';

// Modules (to be added as we develop them)
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { OrdersModule } from './modules/orders/orders.module';
// import { InventoryModule } from './modules/inventory/inventory.module'; // ❌ REMOVED Epic 1.6 - Delegated to Inventory Service
// import { PaymentsModule } from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { EventsModule } from './modules/events/events.module';
import { HealthModule } from './health/health.module';

// Queue Module
import { QueueModule } from './queues/queue.module';

@Module({
  imports: [
    // Configuration with validation
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, bullConfig, jwtConfig],
      envFilePath: ['.env.local', '.env.development', '.env', '.env.test'],
      validate,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    // Winston Logger Module (Global)
    LoggerModule,

    // Prometheus Metrics Module
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
      },
      path: '/metrics',
    }),

    // Rate Limiting (Throttler) - Higher limits in test environment
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isTest = configService.get<string>('NODE_ENV') === 'test';
        return [
          {
            name: 'default',
            ttl: 60000, // 60 seconds
            limit: isTest ? 10000 : 10, // Much higher limit in tests to avoid blocking
          },
        ];
      },
    }),

    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => configService.get('database')!,
    }),

    // Redis & Bull Queue
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => configService.get('bull')!,
    }),

    // JWT
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: configService.get('jwt.signOptions'),
      }),
      global: true,
    }),

    // Feature Modules
    HealthModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    // InventoryModule, // ❌ REMOVED Epic 1.6 - Delegated to Inventory Service (Go)
    OrdersModule,
    EventsModule,
    NotificationsModule,

    // Queue Module (Global)
    QueueModule,

    // TODO: Add modules as they are developed
    // PaymentsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },

    // Global response interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },

    // Global logging interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },

    // Global throttler guard (rate limiting) - Disabled in test environment
    ...(process.env['NODE_ENV'] !== 'test'
      ? [
          {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
          },
        ]
      : []),

    // Global JWT guard (commented out for now until auth is implemented)
    // {
    //   provide: APP_GUARD,
    //   useClass: JwtAuthGuard,
    // },
  ],
})
export class AppModule {}
