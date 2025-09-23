import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// Configuration
import { appConfig, databaseConfig, bullConfig, jwtConfig } from './config';

// Common providers
import {
  AllExceptionsFilter,
  ResponseInterceptor,
  LoggingInterceptor,
  JwtAuthGuard,
} from './common';

// Modules (to be added as we develop them)
// import { AuthModule } from './modules/auth/auth.module';
// import { UsersModule } from './modules/users/users.module';
// import { ProductsModule } from './modules/products/products.module';
// import { OrdersModule } from './modules/orders/orders.module';
// import { InventoryModule } from './modules/inventory/inventory.module';
// import { PaymentsModule } from './modules/payments/payments.module';
// import { NotificationsModule } from './modules/notifications/notifications.module';
// import { EventsModule } from './modules/events/events.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, bullConfig, jwtConfig],
      envFilePath: ['.env.local', '.env'],
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

    // TODO: Add modules as they are developed
    // AuthModule,
    // UsersModule,
    // ProductsModule,
    // OrdersModule,
    // InventoryModule,
    // PaymentsModule,
    // NotificationsModule,
    // EventsModule,
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

    // Global JWT guard
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
