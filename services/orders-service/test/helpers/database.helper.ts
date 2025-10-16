import { DataSource } from 'typeorm';
import { INestApplication } from '@nestjs/common';

/**
 * Helper para operaciones de base de datos en tests E2E
 * Incluye funciones para limpiar datos de test
 */
export class DatabaseHelper {
  private dataSource: DataSource;

  constructor(app: INestApplication) {
    this.dataSource = app.get(DataSource);
  }

  /**
   * Limpia todas las tablas relacionadas con tests
   * IMPORTANTE: Ejecutar en afterEach o afterAll
   */
  async cleanDatabase(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Deshabilitar foreign keys temporalmente
      await queryRunner.query('SET session_replication_role = replica;');

      // Helper function to delete from table if it exists
      const deleteIfExists = async (tableName: string) => {
        try {
          const tableExists = await queryRunner.query(
            `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '${tableName}');`,
          );
          if (tableExists[0].exists) {
            await queryRunner.query(`DELETE FROM "${tableName}" WHERE 1=1;`);
          }
        } catch (error) {
          // Ignore errors if table doesn't exist
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.warn(`Could not clean table ${tableName}:`, message);
        }
      };

      // Limpiar tablas en orden inverso a las dependencias
      await deleteIfExists('order_items');
      await deleteIfExists('orders');
      await deleteIfExists('stock_movements');
      await deleteIfExists('inventory');
      await deleteIfExists('products');
      await deleteIfExists('categories');
      await deleteIfExists('users');

      // Rehabilitar foreign keys
      await queryRunner.query('SET session_replication_role = DEFAULT;');
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Limpia solo datos de un usuario específico
   * Útil para tests aislados
   */
  async cleanUserData(userId: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.query('SET session_replication_role = replica;');

      // Limpiar datos del usuario
      await queryRunner.query(
        'DELETE FROM "order_items" WHERE "orderId" IN (SELECT id FROM "orders" WHERE "userId" = $1);',
        [userId],
      );
      await queryRunner.query('DELETE FROM "orders" WHERE "userId" = $1;', [userId]);
      await queryRunner.query('DELETE FROM "users" WHERE id = $1;', [userId]);

      await queryRunner.query('SET session_replication_role = DEFAULT;');
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Limpia solo productos de test
   */
  async cleanTestProducts(): Promise<void> {
    await this.dataSource.query('DELETE FROM "products" WHERE "sku" LIKE \'TEST-%\';');
  }

  /**
   * Verifica conexión a la base de datos
   */
  async checkConnection(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Limpia tablas específicas para tests E2E
   * @param tables - Lista de nombres de tablas a limpiar
   */
  async cleanTables(tables: string[]): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.query('SET session_replication_role = replica;');

      for (const table of tables) {
        await queryRunner.query(`DELETE FROM "${table}" WHERE 1=1;`);
      }

      await queryRunner.query('SET session_replication_role = DEFAULT;');
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Trunca todas las tablas (más rápido que DELETE)
   * CUIDADO: Esto es irreversible
   */
  async truncateAllTables(): Promise<void> {
    const entities = this.dataSource.entityMetadatas;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.query('SET session_replication_role = replica;');

      for (const entity of entities) {
        await queryRunner.query(`TRUNCATE TABLE "${entity.tableName}" CASCADE;`);
      }

      await queryRunner.query('SET session_replication_role = DEFAULT;');
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Obtiene el DataSource para operaciones avanzadas
   */
  getDataSource(): DataSource {
    return this.dataSource;
  }
}
