import { DataSource } from 'typeorm';
import AppDataSource from '../src/config/typeorm.config';
import { Inventory } from '../src/modules/inventory/entities/inventory.entity';

async function seedTestInventory() {
  console.log('🌱 Seeding test inventory...');

  try {
    // Initialize connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const inventoryRepo = AppDataSource.getRepository(Inventory);

    // Create inventory for Laptop Test
    const laptopInventory = inventoryRepo.create({
      productId: '928c5f38-55ca-4a11-9fe6-95612efbb662',
      sku: 'LAPTOP-TEST-001',
      location: 'MAIN_WAREHOUSE',
      currentStock: 100,
      reservedStock: 0,
      minimumStock: 5,
      maximumStock: 200,
      reorderPoint: 15,
      reorderQuantity: 50,
      averageCost: 800.0,
      lastCost: 800.0,
      currency: 'USD',
      isActive: true,
      autoReorderEnabled: true,
      lastRestockAt: new Date(),
      notes: 'Test inventory for Laptop Test',
    });

    // Create inventory for Mouse Test
    const mouseInventory = inventoryRepo.create({
      productId: '9c543e8e-ecf0-48f1-82b1-30e6189765b6',
      sku: 'MOUSE-TEST-001',
      location: 'MAIN_WAREHOUSE',
      currentStock: 100,
      reservedStock: 0,
      minimumStock: 10,
      maximumStock: 200,
      reorderPoint: 20,
      reorderQuantity: 50,
      averageCost: 30.0,
      lastCost: 30.0,
      currency: 'USD',
      isActive: true,
      autoReorderEnabled: true,
      lastRestockAt: new Date(),
      notes: 'Test inventory for Mouse Test',
    });

    await inventoryRepo.save([laptopInventory, mouseInventory]);

    console.log('✅ Created inventory for:');
    console.log(`   📦 Laptop Test: 100 units`);
    console.log(`   📦 Mouse Test: 100 units`);
    console.log('\n🎉 Seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(0);
  }
}

seedTestInventory();
