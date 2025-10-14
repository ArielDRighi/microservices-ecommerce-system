import { DataSource } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../modules/users/enums/user-role.enum';

export const seedUsers = async (dataSource: DataSource): Promise<void> => {
  const logger = new Logger('SeedUsers');
  logger.log('🌱 Starting users seed process...');

  try {
    // Ensure connection is active
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    const userRepo = dataSource.getRepository(User);

    // Create test users
    logger.log('👤 Creating users...');

    const hashedPassword = await bcrypt.hash('Admin123!', 12);

    // Check if admin user already exists
    let adminUser = await userRepo.findOne({ where: { email: 'admin@test.com' } });
    if (!adminUser) {
      adminUser = userRepo.create({
        email: 'admin@test.com',
        passwordHash: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
        isActive: true,
        language: 'en',
        timezone: 'UTC',
      });
      await userRepo.save(adminUser);
      logger.log('✅ Created admin user');
    } else {
      // Update password, role, and ensure user is active
      adminUser.passwordHash = hashedPassword;
      adminUser.role = UserRole.ADMIN;
      adminUser.isActive = true;
      await userRepo.save(adminUser);
      logger.log('✅ Updated admin user (password reset to Admin123!, role: ADMIN, active: true)');
    }

    // Check if test user already exists
    let testUser = await userRepo.findOne({ where: { email: 'user@test.com' } });
    if (!testUser) {
      testUser = userRepo.create({
        email: 'user@test.com',
        passwordHash: hashedPassword,
        firstName: 'Test',
        lastName: 'Customer',
        role: UserRole.USER,
        isActive: true,
        language: 'en',
        timezone: 'UTC',
      });
      await userRepo.save(testUser);
      logger.log('✅ Created test user');
    } else {
      // Update password and ensure user is active
      testUser.passwordHash = hashedPassword;
      testUser.role = UserRole.USER;
      testUser.isActive = true;
      await userRepo.save(testUser);
      logger.log('✅ Updated test user (password reset to Admin123!, role: USER, active: true)');
    }

    // Summary
    logger.log('\n📋 Seed Summary:');
    logger.log(`   👤 Users created/updated: ${[adminUser, testUser].length}`);
    logger.log('\n🎉 Users seed process completed successfully!');

    // Print test credentials
    logger.log('\n🔐 Test Credentials:');
    logger.log('   📧 Admin: admin@test.com');
    logger.log('   📧 User: user@test.com');
    logger.log('   🔑 Password: Admin123!');
  } catch (error) {
    logger.error('❌ Users seed process failed:', error);
    throw error;
  }
};

// CLI runner function
export const runSeed = async (): Promise<void> => {
  const logger = new Logger('RunUsersSeed');

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
    await seedUsers(SeedDataSource);
  } catch (error) {
    logger.error('❌ Failed to run users seed:', error);
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
