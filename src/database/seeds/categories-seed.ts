import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { Category } from '../../modules/categories/entities/category.entity';

export const seedCategories = async (dataSource: DataSource): Promise<void> => {
  const logger = new Logger('SeedCategories');
  logger.log('🌱 Starting categories seed process...');

  try {
    // Ensure connection is active
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    const categoryRepo = dataSource.getRepository(Category);

    // Create categories
    logger.log('📂 Creating categories...');

    const categories = [
      {
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic products and gadgets',
        sortOrder: 10,
        isActive: true,
      },
      {
        name: 'Clothing',
        slug: 'clothing',
        description: 'Fashion and apparel',
        sortOrder: 20,
        isActive: true,
      },
      {
        name: 'Home & Garden',
        slug: 'home-garden',
        description: 'Home improvement and garden supplies',
        sortOrder: 30,
        isActive: true,
      },
      {
        name: 'Books',
        slug: 'books',
        description: 'Books and educational materials',
        sortOrder: 40,
        isActive: true,
      },
      {
        name: 'Sports',
        slug: 'sports',
        description: 'Sports and outdoor activities',
        sortOrder: 50,
        isActive: true,
      },
    ];

    for (const categoryData of categories) {
      // Check if category already exists
      const existingCategory = await categoryRepo.findOne({
        where: { slug: categoryData.slug },
      });

      if (!existingCategory) {
        const category = categoryRepo.create(categoryData);
        await categoryRepo.save(category);
        logger.log(`✅ Created category: ${categoryData.name}`);
      } else {
        logger.log(`⏭️  Category already exists: ${categoryData.name}`);
      }
    }

    // Summary
    const totalCategories = await categoryRepo.count();
    logger.log('\n📋 Seed Summary:');
    logger.log(`   📂 Total categories in database: ${totalCategories}`);
    logger.log('\n🎉 Categories seed process completed successfully!');
  } catch (error) {
    logger.error('❌ Categories seed process failed:', error);
    throw error;
  }
};

// CLI runner function
export const runSeed = async (): Promise<void> => {
  const logger = new Logger('RunCategoriesSeed');

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
    await seedCategories(SeedDataSource);
  } catch (error) {
    logger.error('❌ Failed to run categories seed:', error);
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
