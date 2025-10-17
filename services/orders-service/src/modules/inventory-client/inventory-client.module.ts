import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { InventoryServiceClient } from './inventory-client.service';

/**
 * InventoryClientModule
 *
 * Epic 1.6 - Refactoring del Orders Service para Microservicios
 *
 * Módulo que configura el cliente HTTP para comunicación con Inventory Service.
 *
 * Exporta:
 * - InventoryServiceClient: Cliente HTTP con retry y timeout
 *
 * Configuración:
 * - Usa HttpModule de @nestjs/axios
 * - Requiere ConfigModule para variables de entorno
 *
 * @author Ariel D. Righi
 * @date 2025-10-17
 */
@Module({
  imports: [
    HttpModule.register({
      timeout: 5000, // Default timeout (overrideable via config)
      maxRedirects: 5,
    }),
    ConfigModule,
  ],
  providers: [InventoryServiceClient],
  exports: [InventoryServiceClient],
})
export class InventoryClientModule {}
