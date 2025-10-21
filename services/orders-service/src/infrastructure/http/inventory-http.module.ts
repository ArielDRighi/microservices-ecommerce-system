import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InventoryHttpClient } from './inventory.client';

/**
 * Módulo HTTP para comunicación con Inventory Service
 * Implementa ADR-028: REST Synchronous Communication Strategy
 *
 * Características:
 * - Timeouts dinámicos (5s read, 10s write)
 * - Retry automático con exponential backoff
 * - Circuit breaker para fail-fast
 * - Observabilidad (logging + métricas)
 */
@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        baseURL: configService.get<string>(
          'INVENTORY_SERVICE_URL',
          'http://inventory-service:8080',
        ),
        timeout: 5000, // Default timeout (overridden per request)
        maxRedirects: 5,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'orders-service/1.0.0',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [InventoryHttpClient],
  exports: [InventoryHttpClient],
})
export class InventoryHttpModule {}
