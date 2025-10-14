import { DataSource } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { Product } from '../../modules/products/entities/product.entity';
import { Inventory } from '../../modules/inventory/entities/inventory.entity';
import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../modules/users/enums/user-role.enum';

export const seedInitialData = async (dataSource: DataSource): Promise<void> => {
  const logger = new Logger('SeedInitialData');
  logger.log('🌱 Starting seed process...');

  try {
    // Ensure connection is active
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    const userRepo = dataSource.getRepository(User);
    const productRepo = dataSource.getRepository(Product);
    const inventoryRepo = dataSource.getRepository(Inventory);

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
      // Update role if user exists but doesn't have ADMIN role
      if (adminUser.role !== UserRole.ADMIN) {
        adminUser.role = UserRole.ADMIN;
        await userRepo.save(adminUser);
        logger.log('✅ Updated admin user role to ADMIN');
      } else {
        logger.log('ℹ️  Admin user already exists');
      }
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
      logger.log('ℹ️  Test user already exists');
    }

    // Create test products (without categories)
    logger.log('📦 Creating products...');

    const products = [
      {
        name: 'Laptop Gaming Pro',
        description:
          'High-performance gaming laptop with RTX 4060, Intel i7 processor, and 16GB RAM',
        price: 1299.99,
        sku: 'LAP-GAMING-001',
        brand: 'TechBrand',
        weight: 2.5,
        isActive: true,
        trackInventory: true,
        minimumStock: 5,
        costPrice: 800.0,
        compareAtPrice: 1499.99,
        images: [
          'https://example.com/laptop-gaming-pro-1.jpg',
          'https://example.com/laptop-gaming-pro-2.jpg',
        ],
        tags: ['gaming', 'laptop', 'electronics', 'high-performance'],
        attributes: {
          color: 'Black',
          ram: '16GB',
          storage: '1TB SSD',
          graphics: 'RTX 4060',
          processor: 'Intel i7-13700H',
          display: '15.6" 144Hz',
          warranty: '2 years',
        },
      },
      {
        name: 'Wireless Gaming Mouse',
        description: 'Ergonomic wireless gaming mouse with RGB lighting and precision sensor',
        price: 79.99,
        sku: 'MOUSE-WIRELESS-001',
        brand: 'TechBrand',
        weight: 0.12,
        isActive: true,
        trackInventory: true,
        minimumStock: 20,
        costPrice: 35.0,
        compareAtPrice: 99.99,
        images: ['https://example.com/wireless-mouse-1.jpg'],
        tags: ['gaming', 'mouse', 'wireless', 'rgb'],
        attributes: {
          color: 'Black',
          connectivity: 'Wireless 2.4GHz',
          dpi: '16000',
          buttons: '6',
          battery: 'Rechargeable',
          rgb: true,
        },
      },
      {
        name: 'Mechanical Keyboard RGB',
        description: 'Cherry MX Blue switches mechanical keyboard with customizable RGB backlight',
        price: 159.99,
        sku: 'KEYBOARD-MECH-001',
        brand: 'TechBrand',
        weight: 1.2,
        isActive: true,
        trackInventory: true,
        minimumStock: 15,
        costPrice: 80.0,
        compareAtPrice: 199.99,
        images: [
          'https://example.com/mechanical-keyboard-1.jpg',
          'https://example.com/mechanical-keyboard-2.jpg',
        ],
        tags: ['gaming', 'keyboard', 'mechanical', 'rgb'],
        attributes: {
          switches: 'Cherry MX Blue',
          layout: 'Full Size',
          backlight: 'RGB',
          connectivity: 'USB-C',
          keycaps: 'Double-shot PBT',
        },
      },
      {
        name: '4K Gaming Monitor',
        description: '27-inch 4K IPS gaming monitor with 144Hz refresh rate and HDR support',
        price: 599.99,
        sku: 'MON-4K-001',
        brand: 'DisplayTech',
        weight: 7.8,
        isActive: true,
        trackInventory: true,
        minimumStock: 8,
        costPrice: 350.0,
        compareAtPrice: 799.99,
        images: ['https://example.com/4k-monitor-1.jpg'],
        tags: ['gaming', 'monitor', '4k', 'hdr'],
        attributes: {
          size: '27 inch',
          resolution: '4K UHD 3840x2160',
          refreshRate: '144Hz',
          panelType: 'IPS',
          hdr: true,
          connectivity: 'HDMI, DisplayPort, USB-C',
        },
      },
      {
        name: 'USB-C Hub Pro',
        description: 'Multi-port USB-C hub with HDMI, ethernet, and fast charging support',
        price: 49.99,
        sku: 'HUB-USBC-001',
        brand: 'ConnectTech',
        weight: 0.15,
        isActive: true,
        trackInventory: true,
        minimumStock: 30,
        costPrice: 20.0,
        compareAtPrice: 69.99,
        images: ['https://example.com/usb-c-hub-1.jpg'],
        tags: ['connectivity', 'hub', 'usb-c', 'portable'],
        attributes: {
          ports: '7 in 1',
          hdmi: '4K@60Hz',
          ethernet: 'Gigabit',
          charging: '100W PD',
          material: 'Aluminum',
        },
      },
    ];

    const savedProducts = await productRepo.save(
      products.map((productData) => productRepo.create(productData)),
    );
    logger.log(`✅ Created ${savedProducts.length} products`);

    // Create inventory records for all products
    logger.log('📊 Creating inventory records...');

    const inventoryRecords = savedProducts.map((product) => {
      const baseStock = Math.floor(Math.random() * 100) + 20; // Random stock between 20-120

      return inventoryRepo.create({
        productId: product.id,
        sku: product.sku,
        location: 'MAIN_WAREHOUSE',
        currentStock: baseStock,
        reservedStock: Math.floor(baseStock * 0.1), // 10% reserved
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
    });

    await inventoryRepo.save(inventoryRecords);
    logger.log(`✅ Created ${inventoryRecords.length} inventory records`);

    // Summary
    logger.log('\n📋 Seed Summary:');
    logger.log(`   👤 Users: ${[adminUser, testUser].length}`);
    logger.log(`   📦 Products: ${savedProducts.length}`);
    logger.log(`   📊 Inventory Records: ${inventoryRecords.length}`);
    logger.log('\n🎉 Seed process completed successfully!');

    // Print test credentials
    logger.log('\n🔐 Test Credentials:');
    logger.log('   📧 Admin: admin@test.com');
    logger.log('   📧 User: user@test.com');
    logger.log('   🔑 Password: Admin123!');
  } catch (error) {
    logger.error('❌ Seed process failed:', error);
    throw error;
  }
};

// CLI runner function
export const runSeed = async (): Promise<void> => {
  const AppDataSource = (await import('../../config/typeorm.config')).default;
  const logger = new Logger('RunSeed');

  try {
    await seedInitialData(AppDataSource);
  } catch (error) {
    logger.error('❌ Failed to run seed:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(0);
  }
};

// Run if called directly
if (require.main === module) {
  runSeed();
}
