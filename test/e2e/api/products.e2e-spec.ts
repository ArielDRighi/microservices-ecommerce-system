import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TestAppHelper } from '../../helpers/test-app.helper';
import { ResponseHelper } from '../../helpers/response.helper';

describe('Products API (E2E)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    app = await TestAppHelper.createTestApp();
  });

  afterAll(async () => {
    await TestAppHelper.closeApp(app);
  });

  beforeEach(async () => {
    await TestAppHelper.cleanDatabase(app);

    // Create admin user for protected endpoints
    const adminData = {
      email: `admin${Date.now()}@test.com`,
      password: 'AdminPass123!@',
      firstName: 'Admin',
      lastName: 'User',
    };

    const adminResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send(adminData)
      .expect(201);

    adminToken = ResponseHelper.extractData(adminResponse).accessToken;
  });

  describe('GET /products (List with pagination and filters)', () => {
    let product1Id: string;
    let product2Id: string;
    let product3Id: string;

    beforeEach(async () => {
      // Create test products with different attributes
      const product1 = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Wireless Headphones ${Date.now()}`,
          description: 'Premium wireless headphones with noise cancellation',
          price: 299.99,
          sku: `WH-${Date.now()}-001`,
          brand: 'AudioTech',
          tags: ['wireless', 'bluetooth', 'audio'],
          compareAtPrice: 399.99,
          isActive: true,
        })
        .expect(201);
      product1Id = ResponseHelper.extractData(product1).id;

      const product2 = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Gaming Mouse ${Date.now()}`,
          description: 'High precision gaming mouse with RGB',
          price: 79.99,
          sku: `GM-${Date.now()}-002`,
          brand: 'GameGear',
          tags: ['gaming', 'mouse', 'rgb'],
          isActive: true,
        })
        .expect(201);
      product2Id = ResponseHelper.extractData(product2).id;

      const product3 = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Mechanical Keyboard ${Date.now()}`,
          description: 'Professional mechanical keyboard',
          price: 149.99,
          sku: `MK-${Date.now()}-003`,
          brand: 'GameGear',
          tags: ['keyboard', 'gaming', 'mechanical'],
          isActive: false, // Inactive
        })
        .expect(201);
      product3Id = ResponseHelper.extractData(product3).id;
    });

    it('should list products with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ page: 1, limit: 10 })
        .expect(200);

      const responseData = ResponseHelper.extractData(response);
      expect(responseData).toHaveProperty('items');
      expect(responseData).toHaveProperty('meta');
      expect(Array.isArray(responseData.items)).toBe(true);
      expect(responseData.meta).toHaveProperty('page', 1);
      expect(responseData.meta).toHaveProperty('limit', 10);
      expect(responseData.meta).toHaveProperty('total');
      expect(responseData.meta).toHaveProperty('totalPages');
    });

    it('should filter by price range (minPrice, maxPrice)', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ minPrice: 100, maxPrice: 200, status: 'all' })
        .expect(200);

      const responseData = ResponseHelper.extractData(response);
      expect(responseData.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: product3Id,
            price: '149.99', // Price is returned as string from DB
          }),
        ]),
      );

      // Verify all products are within price range
      responseData.items.forEach((product: any) => {
        const price = parseFloat(product.price);
        expect(price).toBeGreaterThanOrEqual(100);
        expect(price).toBeLessThanOrEqual(200);
      });
    });

    it('should sort by price ascending', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ sortBy: 'price', sortOrder: 'ASC', status: 'all' })
        .expect(200);

      const responseData = ResponseHelper.extractData(response);
      const products = responseData.items;
      expect(products.length).toBeGreaterThan(0);

      // Verify ascending order
      for (let i = 1; i < products.length; i++) {
        const currentPrice = parseFloat(products[i].price);
        const previousPrice = parseFloat(products[i - 1].price);
        expect(currentPrice).toBeGreaterThanOrEqual(previousPrice);
      }
    });

    it('should sort by price descending', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ sortBy: 'price', sortOrder: 'DESC', status: 'all' })
        .expect(200);

      const responseData = ResponseHelper.extractData(response);
      const products = responseData.items;
      expect(products.length).toBeGreaterThan(0);

      // Verify descending order
      for (let i = 1; i < products.length; i++) {
        const currentPrice = parseFloat(products[i].price);
        const previousPrice = parseFloat(products[i - 1].price);
        expect(currentPrice).toBeLessThanOrEqual(previousPrice);
      }
    });

    it('should sort by name', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ sortBy: 'name', sortOrder: 'ASC', status: 'all' })
        .expect(200);

      const responseData = ResponseHelper.extractData(response);
      const products = responseData.items;
      expect(products.length).toBeGreaterThan(0);

      // Verify alphabetical order
      for (let i = 1; i < products.length; i++) {
        expect(products[i].name.localeCompare(products[i - 1].name)).toBeGreaterThanOrEqual(0);
      }
    });

    it('should sort by createdAt', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ sortBy: 'createdAt', sortOrder: 'DESC', status: 'all' })
        .expect(200);

      const responseData = ResponseHelper.extractData(response);
      const products = responseData.items;
      expect(products.length).toBeGreaterThan(0);

      // Verify date order
      for (let i = 1; i < products.length; i++) {
        const date1 = new Date(products[i - 1].createdAt).getTime();
        const date2 = new Date(products[i].createdAt).getTime();
        expect(date1).toBeGreaterThanOrEqual(date2);
      }
    });

    it('should filter by isActive (active only by default)', async () => {
      const response = await request(app.getHttpServer()).get('/products').expect(200);

      const responseData = ResponseHelper.extractData(response);
      // All products should be active by default
      responseData.items.forEach((product: any) => {
        expect(product.isActive).toBe(true);
      });

      // product3 should not be in the list (it's inactive)
      const product3InList = responseData.items.find((p: any) => p.id === product3Id);
      expect(product3InList).toBeUndefined();
    });

    it('should filter by isActive with status=inactive', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ status: 'inactive' })
        .expect(200);

      const responseData = ResponseHelper.extractData(response);
      // All products should be inactive
      responseData.items.forEach((product: any) => {
        expect(product.isActive).toBe(false);
      });

      // product3 should be in the list
      const product3InList = responseData.items.find((p: any) => p.id === product3Id);
      expect(product3InList).toBeDefined();
    });

    it('should filter by isActive with status=all', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ status: 'all' })
        .expect(200);

      const responseData = ResponseHelper.extractData(response);
      // Should include both active and inactive products
      const hasActive = responseData.items.some((p: any) => p.isActive === true);
      const hasInactive = responseData.items.some((p: any) => p.isActive === false);

      expect(hasActive).toBe(true);
      expect(hasInactive).toBe(true);
    });

    it('should filter by brand', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ brand: 'GameGear', status: 'all' })
        .expect(200);

      const responseData = ResponseHelper.extractData(response);
      // All products should be from GameGear brand
      responseData.items.forEach((product: any) => {
        expect(product.brand).toBe('GameGear');
      });

      // Should include product2 and product3
      const productIds = responseData.items.map((p: any) => p.id);
      expect(productIds).toContain(product2Id);
      expect(productIds).toContain(product3Id);
    });

    it('should filter products on sale', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ onSale: true })
        .expect(200);

      const responseData = ResponseHelper.extractData(response);
      // All products should have compareAtPrice > price
      responseData.items.forEach((product: any) => {
        expect(product.isOnSale).toBe(true);
        const compareAtPrice = parseFloat(product.compareAtPrice);
        const price = parseFloat(product.price);
        expect(compareAtPrice).toBeGreaterThan(price);
      });

      // Should include product1 (has compareAtPrice)
      const product1InList = responseData.items.find((p: any) => p.id === product1Id);
      expect(product1InList).toBeDefined();
    });
  });

  describe('GET /products/search (Search functionality)', () => {
    let searchProduct1Id: string;
    let searchProduct2Id: string;

    beforeEach(async () => {
      // Create products with specific searchable content
      const product1 = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Bluetooth Speaker ${Date.now()}`,
          description: 'Portable bluetooth speaker with excellent sound quality',
          price: 89.99,
          sku: `BS-${Date.now()}-001`,
          tags: ['bluetooth', 'speaker', 'portable'],
        })
        .expect(201);
      searchProduct1Id = ResponseHelper.extractData(product1).id;

      const product2 = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Wireless Charger ${Date.now()}`,
          description: 'Fast wireless charging pad for smartphones',
          price: 39.99,
          sku: `WC-${Date.now()}-002`,
          tags: ['wireless', 'charger', 'fast-charging'],
        })
        .expect(201);
      searchProduct2Id = ResponseHelper.extractData(product2).id;
    });

    it('should search products by name', async () => {
      const response = await request(app.getHttpServer())
        .get('/products/search')
        .query({ q: 'Bluetooth' })
        .expect(200);

      const responseData = ResponseHelper.extractData(response);
      expect(Array.isArray(responseData)).toBe(true);
      expect(responseData.length).toBeGreaterThan(0);

      // Should include searchProduct1
      const foundProduct = responseData.find((p: any) => p.id === searchProduct1Id);
      expect(foundProduct).toBeDefined();
      expect(foundProduct.name).toContain('Bluetooth');
    });

    it('should search products by description', async () => {
      const response = await request(app.getHttpServer())
        .get('/products/search')
        .query({ q: 'charging' })
        .expect(200);

      const responseData = ResponseHelper.extractData(response);
      expect(Array.isArray(responseData)).toBe(true);

      // Should include searchProduct2
      const foundProduct = responseData.find((p: any) => p.id === searchProduct2Id);
      expect(foundProduct).toBeDefined();
      expect(foundProduct.description).toContain('charging');
    });

    it('should search products by tags', async () => {
      const response = await request(app.getHttpServer())
        .get('/products/search')
        .query({ q: 'portable' })
        .expect(200);

      const responseData = ResponseHelper.extractData(response);
      expect(Array.isArray(responseData)).toBe(true);

      // Should include searchProduct1 (has 'portable' tag)
      const foundProduct = responseData.find((p: any) => p.id === searchProduct1Id);
      expect(foundProduct).toBeDefined();
    });

    it('should respect limit parameter in search', async () => {
      const response = await request(app.getHttpServer())
        .get('/products/search')
        .query({ q: 'wireless', limit: 2 })
        .expect(200);

      const responseData = ResponseHelper.extractData(response);
      expect(Array.isArray(responseData)).toBe(true);
      expect(responseData.length).toBeLessThanOrEqual(2);
    });

    it('should return empty array for non-matching search term', async () => {
      const response = await request(app.getHttpServer())
        .get('/products/search')
        .query({ q: 'nonexistentproduct12345' })
        .expect(200);

      const responseData = ResponseHelper.extractData(response);
      expect(Array.isArray(responseData)).toBe(true);
      expect(responseData.length).toBe(0);
    });

    it('should return 400 with missing search term', async () => {
      await request(app.getHttpServer()).get('/products/search').expect(400);
    });
  });

  describe('GET /products/:id (Get product by ID)', () => {
    let productId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Test Product Detail ${Date.now()}`,
          description: 'Product for detail testing',
          price: 199.99,
          sku: `TPD-${Date.now()}-001`,
          brand: 'TestBrand',
          weight: 1.5,
          tags: ['test', 'detail'],
          images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
          attributes: { color: 'black', size: 'large' },
          costPrice: 100.0,
          compareAtPrice: 249.99,
        })
        .expect(201);

      productId = ResponseHelper.extractData(response).id;
    });

    it('should get product with complete details', async () => {
      const response = await request(app.getHttpServer()).get(`/products/${productId}`).expect(200);

      const responseData = ResponseHelper.extractData(response);
      expect(responseData).toMatchObject({
        id: productId,
        name: expect.stringContaining('Test Product Detail'),
        description: 'Product for detail testing',
        price: '199.99', // Decimal values returned as strings
        brand: 'TestBrand',
        weight: '1.500', // Decimal(8,3) returned with 3 decimals
        isActive: true,
        isOnSale: true,
        discountPercentage: 20, // (249.99 - 199.99) / 249.99 * 100 = 20%
      });

      expect(responseData.tags).toEqual(expect.arrayContaining(['test', 'detail']));
      expect(responseData.images).toHaveLength(2);
      expect(responseData.attributes).toEqual({ color: 'black', size: 'large' });
      expect(responseData).toHaveProperty('createdAt');
      expect(responseData).toHaveProperty('updatedAt');
    });

    it('should return 404 with non-existent product ID', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app.getHttpServer())
        .get(`/products/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 with invalid UUID format', async () => {
      await request(app.getHttpServer()).get('/products/invalid-uuid-format').expect(400);
    });
  });

  describe('POST /products (Create product - Admin only)', () => {
    it('should create product successfully with all fields', async () => {
      const productData = {
        name: `Complete Product ${Date.now()}`,
        description: 'Product with all fields populated',
        price: 499.99,
        sku: `CP-${Date.now()}-FULL`,
        brand: 'PremiumBrand',
        weight: 2.5,
        tags: ['premium', 'complete', 'test'],
        images: ['https://example.com/product1.jpg'],
        attributes: { material: 'aluminum', warranty: '2 years' },
        costPrice: 250.0,
        compareAtPrice: 599.99,
        isActive: true,
        trackInventory: true,
        minimumStock: 10,
      };

      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      const responseData = ResponseHelper.extractData(response);
      expect(responseData).toMatchObject({
        name: productData.name,
        description: productData.description,
        price: '499.99', // Decimal returned as string
        sku: productData.sku,
        brand: productData.brand,
        weight: '2.500', // Decimal(8,3) returned with 3 decimals
        isActive: true,
        trackInventory: true,
        minimumStock: 10,
      });
      expect(responseData).toHaveProperty('id');
      expect(responseData).toHaveProperty('createdAt');
    });

    it('should create product with minimal required fields', async () => {
      const productData = {
        name: `Minimal Product ${Date.now()}`,
        price: 29.99,
        sku: `MIN-${Date.now()}-001`,
      };

      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      const responseData = ResponseHelper.extractData(response);
      expect(responseData).toMatchObject({
        name: productData.name,
        price: '29.99', // Decimal returned as string
        sku: productData.sku,
        isActive: true, // Default value
        trackInventory: true, // Default value
        minimumStock: 0, // Default value
      });
    });

    it('should return 409 with duplicate SKU', async () => {
      const sku = `DUP-${Date.now()}-SKU`;

      // Create first product
      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Product One ${Date.now()}`,
          price: 99.99,
          sku: sku,
        })
        .expect(201);

      // Try to create second product with same SKU
      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Product Two ${Date.now()}`,
          price: 149.99,
          sku: sku,
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 with negative price', async () => {
      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Invalid Price Product ${Date.now()}`,
          price: -50.0,
          sku: `INV-${Date.now()}-001`,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should return 400 with zero price', async () => {
      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Zero Price Product ${Date.now()}`,
          price: 0,
          sku: `ZERO-${Date.now()}-001`,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 with missing required fields', async () => {
      // Missing price
      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `No Price Product ${Date.now()}`,
          sku: `NP-${Date.now()}-001`,
        })
        .expect(400);

      // Missing SKU
      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `No SKU Product ${Date.now()}`,
          price: 99.99,
        })
        .expect(400);

      // Missing name
      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          price: 99.99,
          sku: `NN-${Date.now()}-001`,
        })
        .expect(400);
    });

    it('should return 400 with invalid SKU format', async () => {
      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Invalid SKU Product ${Date.now()}`,
          price: 99.99,
          sku: 'invalid@sku#with$special', // Special characters not allowed
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/products')
        .send({
          name: `Unauthorized Product ${Date.now()}`,
          price: 99.99,
          sku: `UNAUTH-${Date.now()}-001`,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /products/:id (Update product)', () => {
    let productId: string;

    beforeEach(async () => {
      // Create product to update
      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Original Product ${Date.now()}`,
          description: 'Original description',
          price: 199.99,
          sku: `ORIG-${Date.now()}-001`,
          brand: 'OriginalBrand',
        })
        .expect(201);
      productId = ResponseHelper.extractData(response).id;
    });

    it('should update product successfully', async () => {
      const updateData = {
        name: `Updated Product ${Date.now()}`,
        description: 'Updated description',
        price: 249.99,
        brand: 'UpdatedBrand',
      };

      const response = await request(app.getHttpServer())
        .patch(`/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      const responseData = ResponseHelper.extractData(response);
      expect(responseData).toMatchObject({
        id: productId,
        name: updateData.name,
        description: updateData.description,
        price: '249.99', // Decimal returned as string
        brand: updateData.brand,
      });
    });

    it('should update only specified fields', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/products/${productId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          price: 299.99,
        })
        .expect(200);

      const responseData = ResponseHelper.extractData(response);
      expect(responseData.price).toBe('299.99'); // Decimal returned as string
      // Other fields should remain unchanged
      expect(responseData.name).toContain('Original Product');
    });

    it('should return 404 with non-existent product ID', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app.getHttpServer())
        .patch(`/products/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          price: 199.99,
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .patch(`/products/${productId}`)
        .send({
          price: 199.99,
        })
        .expect(401);
    });
  });

  describe('PATCH /products/:id/activate (Activate product)', () => {
    let inactiveProductId: string;

    beforeEach(async () => {
      // Create inactive product
      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Inactive Product ${Date.now()}`,
          price: 99.99,
          sku: `INACT-${Date.now()}-001`,
          isActive: false,
        })
        .expect(201);
      inactiveProductId = ResponseHelper.extractData(response).id;
    });

    it('should activate product successfully', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/products/${inactiveProductId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const responseData = ResponseHelper.extractData(response);
      expect(responseData.isActive).toBe(true);
      expect(responseData.id).toBe(inactiveProductId);
    });

    it('should return 404 with non-existent product ID', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .patch(`/products/${nonExistentId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .patch(`/products/${inactiveProductId}/activate`)
        .expect(401);
    });
  });

  describe('PATCH /products/:id/deactivate (Deactivate product)', () => {
    let activeProductId: string;

    beforeEach(async () => {
      // Create active product
      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Active Product ${Date.now()}`,
          price: 99.99,
          sku: `ACT-${Date.now()}-001`,
          isActive: true,
        })
        .expect(201);
      activeProductId = ResponseHelper.extractData(response).id;
    });

    it('should deactivate product successfully', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/products/${activeProductId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const responseData = ResponseHelper.extractData(response);
      expect(responseData.isActive).toBe(false);
      expect(responseData.id).toBe(activeProductId);
    });

    it('should return 404 with non-existent product ID', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .patch(`/products/${nonExistentId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .patch(`/products/${activeProductId}/deactivate`)
        .expect(401);
    });
  });

  describe('DELETE /products/:id (Soft delete product)', () => {
    let productToDeleteId: string;

    beforeEach(async () => {
      // Create product to delete
      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Product To Delete ${Date.now()}`,
          price: 99.99,
          sku: `DEL-${Date.now()}-001`,
        })
        .expect(201);
      productToDeleteId = ResponseHelper.extractData(response).id;
    });

    it('should soft delete product successfully', async () => {
      await request(app.getHttpServer())
        .delete(`/products/${productToDeleteId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify product is not in default listing
      const listResponse = await request(app.getHttpServer()).get('/products').expect(200);

      const responseData = ResponseHelper.extractData(listResponse);
      const deletedProductInList = responseData.items.find((p: any) => p.id === productToDeleteId);
      expect(deletedProductInList).toBeUndefined();

      // Verify accessing soft deleted product returns 404
      await request(app.getHttpServer()).get(`/products/${productToDeleteId}`).expect(404);
    });

    it('should return 404 with non-existent product ID', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .delete(`/products/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Product For Unauth Delete ${Date.now()}`,
          price: 99.99,
          sku: `UNAUTH-DEL-${Date.now()}-001`,
        })
        .expect(201);

      const productId = ResponseHelper.extractData(response).id;
      await request(app.getHttpServer()).delete(`/products/${productId}`).expect(401);
    });
  });
});
