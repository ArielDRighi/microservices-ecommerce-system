import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { Product } from '../../modules/products/entities/product.entity';
import { Category } from '../../modules/categories/entities/category.entity';

export const seedProducts = async (dataSource: DataSource): Promise<void> => {
  const logger = new Logger('SeedProducts');
  logger.log('🌱 Starting products seed process...');

  try {
    // Ensure connection is active
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    const productRepo = dataSource.getRepository(Product);
    const categoryRepo = dataSource.getRepository(Category);

    // Get categories for product assignment
    logger.log('📂 Loading categories...');
    const electronics = await categoryRepo.findOne({ where: { slug: 'electronics' } });
    const clothing = await categoryRepo.findOne({ where: { slug: 'clothing' } });
    const homeGarden = await categoryRepo.findOne({ where: { slug: 'home-garden' } });
    const books = await categoryRepo.findOne({ where: { slug: 'books' } });
    const sports = await categoryRepo.findOne({ where: { slug: 'sports' } });

    if (!electronics || !clothing || !homeGarden || !books || !sports) {
      throw new Error('Categories not found. Please run seed:categories first.');
    }

    logger.log('📦 Creating products...');

    const products = [
      // Electronics
      {
        name: 'Laptop Gaming Pro',
        description:
          'High-performance gaming laptop with RTX 4060, Intel i7 processor, and 16GB RAM',
        price: 1299.99,
        sku: 'LAP-GAMING-001',
        categoryId: electronics.id,
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
        categoryId: electronics.id,
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
        categoryId: electronics.id,
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
        categoryId: electronics.id,
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
        categoryId: electronics.id,
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
      // Clothing
      {
        name: 'Premium Cotton T-Shirt',
        description: 'Soft, breathable 100% cotton t-shirt in various colors',
        price: 29.99,
        sku: 'TSHIRT-COTTON-001',
        categoryId: clothing.id,
        brand: 'FashionCo',
        weight: 0.2,
        isActive: true,
        trackInventory: true,
        minimumStock: 50,
        costPrice: 12.0,
        compareAtPrice: 39.99,
        images: ['https://example.com/tshirt-1.jpg'],
        tags: ['clothing', 'casual', 'cotton', 'basics'],
        attributes: {
          material: '100% Cotton',
          sizes: ['S', 'M', 'L', 'XL', 'XXL'],
          colors: ['White', 'Black', 'Navy', 'Gray'],
          fit: 'Regular',
        },
      },
      {
        name: 'Running Sneakers Pro',
        description: 'Lightweight running shoes with advanced cushioning technology',
        price: 129.99,
        sku: 'SHOES-RUN-001',
        categoryId: sports.id,
        brand: 'SportMax',
        weight: 0.8,
        isActive: true,
        trackInventory: true,
        minimumStock: 25,
        costPrice: 60.0,
        compareAtPrice: 159.99,
        images: ['https://example.com/running-shoes-1.jpg'],
        tags: ['sports', 'running', 'footwear', 'athletic'],
        attributes: {
          sizes: ['7', '8', '9', '10', '11', '12'],
          colors: ['Black/White', 'Blue/Gray', 'Red/Black'],
          technology: 'Air Cushion',
          terrain: 'Road',
        },
      },
      {
        name: 'Yoga Mat Premium',
        description: 'Non-slip premium yoga mat with carrying strap',
        price: 49.99,
        sku: 'YOGA-MAT-001',
        categoryId: sports.id,
        brand: 'FitLife',
        weight: 1.5,
        isActive: true,
        trackInventory: true,
        minimumStock: 40,
        costPrice: 20.0,
        compareAtPrice: 69.99,
        images: ['https://example.com/yoga-mat-1.jpg'],
        tags: ['sports', 'yoga', 'fitness', 'home-workout'],
        attributes: {
          dimensions: '183cm x 61cm x 6mm',
          material: 'TPE',
          colors: ['Purple', 'Blue', 'Green', 'Pink'],
          nonSlip: true,
        },
      },
      // Books
      {
        name: 'Clean Code - Robert Martin',
        description: 'A Handbook of Agile Software Craftsmanship',
        price: 42.99,
        sku: 'BOOK-CLEAN-CODE',
        categoryId: books.id,
        brand: 'Prentice Hall',
        weight: 0.9,
        isActive: true,
        trackInventory: true,
        minimumStock: 20,
        costPrice: 25.0,
        compareAtPrice: 54.99,
        images: ['https://example.com/clean-code.jpg'],
        tags: ['programming', 'software', 'development', 'best-practices'],
        attributes: {
          author: 'Robert C. Martin',
          pages: 464,
          language: 'English',
          publisher: 'Prentice Hall',
          isbn: '978-0132350884',
          format: 'Paperback',
        },
      },
      {
        name: 'The Pragmatic Programmer',
        description: 'Your Journey to Mastery, 20th Anniversary Edition',
        price: 44.99,
        sku: 'BOOK-PRAGMATIC',
        categoryId: books.id,
        brand: 'Addison-Wesley',
        weight: 0.85,
        isActive: true,
        trackInventory: true,
        minimumStock: 15,
        costPrice: 27.0,
        compareAtPrice: 59.99,
        images: ['https://example.com/pragmatic-programmer.jpg'],
        tags: ['programming', 'software', 'career', 'professional-development'],
        attributes: {
          author: 'David Thomas, Andrew Hunt',
          pages: 352,
          language: 'English',
          publisher: 'Addison-Wesley',
          isbn: '978-0135957059',
          format: 'Paperback',
        },
      },
      // Home & Garden
      {
        name: 'LED Smart Bulb Set',
        description: 'WiFi-enabled smart LED bulbs with voice control (4-pack)',
        price: 39.99,
        sku: 'BULB-SMART-004',
        categoryId: homeGarden.id,
        brand: 'SmartHome',
        weight: 0.4,
        isActive: true,
        trackInventory: true,
        minimumStock: 35,
        costPrice: 18.0,
        compareAtPrice: 59.99,
        images: ['https://example.com/smart-bulb.jpg'],
        tags: ['smart-home', 'lighting', 'wifi', 'voice-control'],
        attributes: {
          quantity: '4 bulbs',
          wattage: '9W (60W equivalent)',
          colors: '16 million colors',
          compatibility: 'Alexa, Google Home',
          lifespan: '25000 hours',
        },
      },
      {
        name: 'Indoor Plant Pot Set',
        description: 'Modern ceramic plant pots with drainage (set of 3)',
        price: 34.99,
        sku: 'POT-CERAMIC-003',
        categoryId: homeGarden.id,
        brand: 'GardenStyle',
        weight: 2.5,
        isActive: true,
        trackInventory: true,
        minimumStock: 30,
        costPrice: 15.0,
        compareAtPrice: 49.99,
        images: ['https://example.com/plant-pots.jpg'],
        tags: ['home-decor', 'plants', 'ceramic', 'indoor'],
        attributes: {
          quantity: '3 pots',
          sizes: ['Small: 4"', 'Medium: 6"', 'Large: 8"'],
          material: 'Ceramic',
          colors: ['White', 'Gray', 'Terracotta'],
          drainage: true,
        },
      },
    ];

    let createdCount = 0;
    let skippedCount = 0;

    for (const productData of products) {
      // Check if product already exists
      const existingProduct = await productRepo.findOne({
        where: { sku: productData.sku },
      });

      if (!existingProduct) {
        const product = productRepo.create(productData);
        await productRepo.save(product);
        logger.log(`✅ Created product: ${productData.name}`);
        createdCount++;
      } else {
        logger.log(`⏭️  Product already exists: ${productData.name}`);
        skippedCount++;
      }
    }

    // Summary
    const totalProducts = await productRepo.count();
    logger.log('\n📋 Seed Summary:');
    logger.log(`   ✅ Products created: ${createdCount}`);
    logger.log(`   ⏭️  Products skipped: ${skippedCount}`);
    logger.log(`   📦 Total products in database: ${totalProducts}`);
    logger.log('\n🎉 Products seed process completed successfully!');
  } catch (error) {
    logger.error('❌ Products seed process failed:', error);
    throw error;
  }
};

// CLI runner function
export const runSeed = async (): Promise<void> => {
  const logger = new Logger('RunProductsSeed');

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
    await seedProducts(SeedDataSource);
  } catch (error) {
    logger.error('❌ Failed to run products seed:', error);
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
