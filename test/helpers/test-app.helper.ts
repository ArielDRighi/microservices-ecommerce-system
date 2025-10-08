import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';
import { ResponseInterceptor } from '../../src/common/interceptors/response.interceptor';
import { WinstonLoggerService } from '../../src/common/utils/winston-logger.service';
import { QueueService } from '../../src/queues/queue.service';
import { DatabaseHelper } from './database.helper';
import { JwtService } from '@nestjs/jwt';
import { UserFactory } from './factories/user.factory';
import { User } from '../../src/modules/users/entities/user.entity';

/**
 * Helper para crear y configurar la aplicación NestJS para tests E2E
 * Usa la configuración EXACTA de main.ts con dependencias REALES
 */
export class TestAppHelper {
  /**
   * Crea y configura una nueva instancia de la aplicación con dependencias REALES
   */
  static async createTestApp(): Promise<INestApplication> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule], // ✅ USA DEPENDENCIAS REALES - NO MOCKS
    }).compile();

    const app = moduleFixture.createNestApplication();

    // Configurar ValidationPipe (igual que en main.ts)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // Configurar filtros globales (necesita WinstonLoggerService)
    const logger = app.get(WinstonLoggerService);
    app.useGlobalFilters(new AllExceptionsFilter(logger));

    // Configurar interceptores globales
    app.useGlobalInterceptors(new ResponseInterceptor());

    await app.init();

    return app;
  }

  /**
   * Método alternativo para tests que requieren configuración específica
   * Mantiene el nombre del método original para compatibilidad
   */
  static async createApp(): Promise<INestApplication> {
    return await this.createTestApp();
  }

  /**
   * Carga fixtures en la base de datos REAL
   * @param app - Instancia de la aplicación NestJS
   * @param fixtures - Array de fixtures a cargar
   */
  static async seedDatabase(app: INestApplication, fixtures: any[]): Promise<void> {
    const dataSource = app.get(DataSource);
    
    for (const fixture of fixtures) {
      if (fixture.users) {
        const userRepository = dataSource.getRepository(User);
        for (const userData of fixture.users) {
          await UserFactory.create(userRepository, userData);
        }
      }
      // Agregar más tipos de fixtures según necesidad
    }
  }

  /**
   * Limpia la base de datos REAL entre tests
   * @param app - Instancia de la aplicación NestJS
   */
  static async cleanDatabase(app: INestApplication): Promise<void> {
    const databaseHelper = new DatabaseHelper(app);
    await databaseHelper.cleanDatabase();
  }

  /**
   * Espera a que un job de cola se complete (para tests async)
   * @param app - Instancia de la aplicación NestJS
   * @param queueName - Nombre de la cola
   * @param timeout - Tiempo máximo de espera en ms
   */
  static async waitForQueueJob(
    app: INestApplication,
    queueName: string,
    timeout: number = 30000,
  ): Promise<void> {
    const queueService = app.get(QueueService);
    await queueService.waitForActiveJobs(timeout);
  }

  /**
   * Genera un token JWT válido para tests
   * @param app - Instancia de la aplicación NestJS
   * @param userId - ID del usuario
   * @param payload - Payload adicional para el token
   */
  static async getTestToken(
    app: INestApplication,
    userId: string,
    payload: any = {},
  ): Promise<string> {
    const jwtService = app.get(JwtService);
    
    const tokenPayload = {
      sub: userId,
      userId,
      ...payload,
    };

    return await jwtService.signAsync(tokenPayload);
  }

  /**
   * Cierra la aplicación de manera segura, esperando a que terminen los jobs de cola
   * Esto previene errores "Driver not Connected" por sagas que continúan ejecutándose
   *
   * @param app - Instancia de la aplicación NestJS
   * @param timeout - Tiempo máximo de espera en milisegundos (default: 10000ms)
   */
  static async closeApp(app: INestApplication, timeout: number = 10000): Promise<void> {
    try {
      const queueService = app.get(QueueService);
      await queueService.waitForActiveJobs(timeout);
    } catch (error) {
      // Si falla obtener QueueService o waitForActiveJobs, solo loguear warning
      console.warn(
        'Warning: Could not wait for queue jobs:',
        error instanceof Error ? error.message : String(error),
      );
    }

    await app.close();
  }
}
