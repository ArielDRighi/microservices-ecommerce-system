import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { Inventory } from '../../modules/inventory/entities/inventory.entity';
import { Product } from '../../modules/products/entities/product.entity';

export const seedInventory = async (dataSource: DataSource): Promise<void> => {
  const logger = new Logger('SeedInventory');
  logger.log('🌱 Starting inventory seed process...');

  try {
    // Ensure connection is active
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    const inventoryRepo = dataSource.getRepository(Inventory);
    const productRepo = dataSource.getRepository(Product);

    // Get all products
    logger.log('📦 Loading products...');
    const products = await productRepo.find();

    if (products.length === 0) {
      throw new Error('No products found. Please run seed:products first.');
    }

    logger.log(`📊 Creating inventory records for ${products.length} products...`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const product of products) {
      // Check if inventory already exists for this product
      const existingInventory = await inventoryRepo.findOne({
        where: {
          productId: product.id,
          location: 'MAIN_WAREHOUSE',
        },
      });

      if (!existingInventory) {
        // Generate realistic stock levels based on product type
        const baseStock = Math.floor(Math.random() * 100) + 20; // Random between 20-120
        const reservedStock = Math.floor(baseStock * 0.1); // 10% reserved

        const inventory = inventoryRepo.create({
          productId: product.id,
          sku: product.sku,
          location: 'MAIN_WAREHOUSE',
          currentStock: baseStock,
          reservedStock: reservedStock,
          minimumStock: product.minimumStock,
          maximumStock: baseStock * 2,
          reorderPoint: product.minimumStock + 10,
          reorderQuantity: 50,
          averageCost: product.costPrice || product.price * 0.7,
          lastCost: product.costPrice || product.price * 0.7,
          currency: 'USD',
          isActive: true,
          autoReorderEnabled: true,
          lastRestockAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date in last 30 days
          notes: `Initial inventory for ${product.name}`,
        });

        await inventoryRepo.save(inventory);
        logger.log(
          `✅ Created inventory for ${product.name}: ${baseStock} units (${reservedStock} reserved)`,
        );
        createdCount++;
      } else {
        logger.log(`⏭️  Inventory already exists for: ${product.name}`);
        skippedCount++;
      }
    }

    // Summary with stock statistics
    const totalInventory = await inventoryRepo.count();
    const stockStats = await inventoryRepo
      .createQueryBuilder('inventory')
      .select('SUM(inventory.currentStock)', 'totalStock')
      .addSelect('SUM(inventory.reservedStock)', 'totalReserved')
      .addSelect('AVG(inventory.currentStock)', 'avgStock')
      .getRawOne();

    logger.log('\n📋 Seed Summary:');
    logger.log(`   ✅ Inventory records created: ${createdCount}`);
    logger.log(`   ⏭️  Inventory records skipped: ${skippedCount}`);
    logger.log(`   📊 Total inventory records: ${totalInventory}`);
    logger.log(`   📦 Total stock units: ${Math.round(stockStats.totalStock || 0)}`);
    logger.log(`   🔒 Total reserved units: ${Math.round(stockStats.totalReserved || 0)}`);
    logger.log(`   📈 Average stock per product: ${Math.round(stockStats.avgStock || 0)}`);
    logger.log('\n🎉 Inventory seed process completed successfully!');
  } catch (error) {
    logger.error('❌ Inventory seed process failed:', error);
    throw error;
  }
};

// CLI runner function
export const runSeed = async (): Promise<void> => {
  const logger = new Logger('RunInventorySeed');

  // Load environment variables
  const { config } = await import('dotenv');
  config({ path: '.env' });

  const dbHost = process.env['DATABASE_HOST'] || 'localhost';
  const dbPort = parseInt(process.env['DATABASE_PORT'] || '5433', 10);
  const dbUser = process.env['DATABASE_USERNAME'] || 'postgres';
  const dbPassword = process.env['DATABASE_PASSWORD'] || 'password';
  const dbName = process.env['DATABASE_NAME'] || 'ecommerce_async';

  logger.log(`🔌 Connecting to database: ${dbName} at ${dbHost}:${dbPort}`);

  // Create a dedicated DataSource for seeding
  const { join } = await import('path');
  const SeedDataSource = new DataSource({
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
    await seedInventory(SeedDataSource);
  } catch (error) {
    logger.error('❌ Failed to run inventory seed:', error);
    process.exit(1);
  } finally {
    if (SeedDataSource.isInitialized) {
      await SeedDataSource.destroy();
    }
    process.exit(0);
  }
};

// Run if called directly
if (require.main === module) {
  runSeed();
}
