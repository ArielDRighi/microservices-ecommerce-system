import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';

/**
 * 🧹 Clear Seed Script
 *
 * Este script limpia todos los datos insertados por los seeds,
 * pero respeta el orden de dependencias para evitar errores de foreign keys.
 *
 * Orden de limpieza (inverso a la creación):
 * 1. Inventory (depende de Products)
 * 2. Order Items (depende de Orders y Products)
 * 3. Orders (depende de Users)
 * 4. Products (depende de Categories)
 * 5. Categories (estructura jerárquica)
 * 6. Users (base)
 * 7. Otros (outbox, idempotency keys, etc.)
 */
export const clearSeededData = async (dataSource: DataSource): Promise<void> => {
  const logger = new Logger('ClearSeed');
  logger.log('🧹 Starting seed data cleanup process...');
  logger.warn('⚠️  This will DELETE all seeded data from the database!');

  try {
    // Ensure connection is active
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let deletedCount = 0;

      // 1. Clear Inventory (stock entries)
      logger.log('📦 Clearing inventory...');
      const inventoryResult = await queryRunner.query(`
        DELETE FROM inventory WHERE id IS NOT NULL;
      `);
      deletedCount += inventoryResult[1] || 0;
      logger.log(`   ✅ Deleted ${inventoryResult[1] || 0} inventory entries`);

      // 2. Clear Order Items
      logger.log('🛒 Clearing order items...');
      const orderItemsResult = await queryRunner.query(`
        DELETE FROM order_items WHERE id IS NOT NULL;
      `);
      deletedCount += orderItemsResult[1] || 0;
      logger.log(`   ✅ Deleted ${orderItemsResult[1] || 0} order items`);

      // 3. Clear Saga States
      logger.log('🔄 Clearing saga states...');
      const sagaStatesResult = await queryRunner.query(`
        DELETE FROM saga_states WHERE id IS NOT NULL;
      `);
      deletedCount += sagaStatesResult[1] || 0;
      logger.log(`   ✅ Deleted ${sagaStatesResult[1] || 0} saga states`);

      // 4. Clear Inventory Reservations (depende de Inventory)
      logger.log('� Clearing inventory reservations...');
      const inventoryReservationsResult = await queryRunner.query(`
        DELETE FROM inventory_reservations WHERE id IS NOT NULL;
      `);
      deletedCount += inventoryReservationsResult[1] || 0;
      logger.log(`   ✅ Deleted ${inventoryReservationsResult[1] || 0} inventory reservations`);

      // 5. Clear Inventory Movements (depende de Inventory)
      logger.log('� Clearing inventory movements...');
      const inventoryMovementsResult = await queryRunner.query(`
        DELETE FROM inventory_movements WHERE id IS NOT NULL;
      `);
      deletedCount += inventoryMovementsResult[1] || 0;
      logger.log(`   ✅ Deleted ${inventoryMovementsResult[1] || 0} inventory movements`);

      // 6. Clear Orders
      logger.log('📋 Clearing orders...');
      const ordersResult = await queryRunner.query(`
        DELETE FROM orders WHERE id IS NOT NULL;
      `);
      deletedCount += ordersResult[1] || 0;
      logger.log(`   ✅ Deleted ${ordersResult[1] || 0} orders`);

      // 7. Clear Products
      logger.log('🏷️  Clearing products...');
      const productsResult = await queryRunner.query(`
        DELETE FROM products WHERE id IS NOT NULL;
      `);
      deletedCount += productsResult[1] || 0;
      logger.log(`   ✅ Deleted ${productsResult[1] || 0} products`);

      // 8. Clear Categories (respecting hierarchy - children first)
      logger.log('📁 Clearing categories...');
      const categoriesResult = await queryRunner.query(`
        DELETE FROM categories WHERE id IS NOT NULL;
      `);
      deletedCount += categoriesResult[1] || 0;
      logger.log(`   ✅ Deleted ${categoriesResult[1] || 0} categories`);

      // 9. Clear Users (keep this near the end as many tables reference users)
      logger.log('👤 Clearing users...');
      const usersResult = await queryRunner.query(`
        DELETE FROM users WHERE id IS NOT NULL;
      `);
      deletedCount += usersResult[1] || 0;
      logger.log(`   ✅ Deleted ${usersResult[1] || 0} users`);

      // 10. Clear Outbox Events
      logger.log('📤 Clearing outbox events...');
      const outboxResult = await queryRunner.query(`
        DELETE FROM outbox_events WHERE id IS NOT NULL;
      `);
      deletedCount += outboxResult[1] || 0;
      logger.log(`   ✅ Deleted ${outboxResult[1] || 0} outbox events`);

      // Commit transaction
      await queryRunner.commitTransaction();

      // Summary
      logger.log('\n📋 Cleanup Summary:');
      logger.log(`   🗑️  Total records deleted: ${deletedCount}`);
      logger.log('\n🎉 Seed data cleanup completed successfully!');
      logger.log('💡 You can now run "npm run seed:all" to re-seed the database');
    } catch (error) {
      // Rollback on error
      await queryRunner.rollbackTransaction();
      logger.error('❌ Cleanup transaction failed, rolled back:', error);
      throw error;
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  } catch (error) {
    logger.error('❌ Seed data cleanup process failed:', error);
    throw error;
  }
};

// CLI runner function
export const runClearSeed = async (): Promise<void> => {
  const logger = new Logger('RunClearSeed');

  // Load environment variables
  const { config } = await import('dotenv');
  config({ path: '.env' });

  const dbHost = process.env['DATABASE_HOST'] || 'localhost';
  const dbPort = parseInt(process.env['DATABASE_PORT'] || '5433', 10);
  const dbUser = process.env['DATABASE_USERNAME'] || 'postgres';
  const dbPassword = process.env['DATABASE_PASSWORD'] || 'password';
  const dbName = process.env['DATABASE_NAME'] || 'ecommerce_async';

  logger.log(`🔌 Connecting to database: ${dbName} at ${dbHost}:${dbPort}`);

  // Create a dedicated DataSource for clearing
  const { join } = await import('path');
  const ClearDataSource = new DataSource({
    type: 'postgres',
    host: dbHost,
    port: dbPort,
    username: dbUser,
    password: dbPassword,
    database: dbName,
    entities: [join(__dirname, '..', '..', 'modules', '**', 'entities', '*.entity{.ts,.js}')],
    synchronize: false,
    logging: false,
  });

  try {
    await clearSeededData(ClearDataSource);
  } catch (error) {
    logger.error('❌ Failed to clear seed data:', error);
    process.exit(1);
  } finally {
    if (ClearDataSource.isInitialized) {
      await ClearDataSource.destroy();
    }
    process.exit(0);
  }
};

// Run if called directly
if (require.main === module) {
  runClearSeed();
}
