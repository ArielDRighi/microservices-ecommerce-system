import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';

describe('Categories API (E2E)', () => {
  let app: INestApplication;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply global validation pipe (same as main.ts)
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

    await app.init();

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

    adminToken = adminResponse.body.data.accessToken;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /categories (List with pagination)', () => {
    let rootCategoryId: string;

    beforeAll(async () => {
      // Create root category
      const rootRes = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Root Category ${Date.now()}`,
          description: 'Root category for testing',
          sortOrder: 10,
        })
        .expect(201);

      rootCategoryId = rootRes.body.data.id;

      // Create subcategory
      await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Sub Category ${Date.now()}`,
          description: 'Sub category for testing',
          parentId: rootCategoryId,
          sortOrder: 5,
        })
        .expect(201);
    });

    it('should list categories with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/categories')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('meta');
      expect(Array.isArray(response.body.data.data)).toBe(true);
      expect(response.body.data.meta).toHaveProperty('page', 1);
      expect(response.body.data.meta).toHaveProperty('limit', 10);
      expect(response.body.data.meta).toHaveProperty('total');
    });

    it('should filter by isActive status', async () => {
      const response = await request(app.getHttpServer())
        .get('/categories')
        .query({ isActive: true })
        .expect(200);

      expect(response.body.data.data).toBeInstanceOf(Array);
      // All categories should be active
      response.body.data.data.forEach((category: any) => {
        expect(category.isActive).toBe(true);
      });
    });

    it('should sort by sortOrder ascending', async () => {
      const response = await request(app.getHttpServer())
        .get('/categories')
        .query({ sortBy: 'sortOrder', sortOrder: 'ASC', limit: 20 })
        .expect(200);

      const categories = response.body.data.data;
      if (categories.length > 1) {
        // Verify sorting
        for (let i = 0; i < categories.length - 1; i++) {
          expect(categories[i].sortOrder).toBeLessThanOrEqual(categories[i + 1].sortOrder);
        }
      }
    });
  });

  describe('GET /categories/tree (Category hierarchy)', () => {
    let parentId: string;
    let childId: string;
    let grandchildId: string;

    beforeAll(async () => {
      // Create 3-level hierarchy
      const parentRes = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Parent ${Date.now()}`,
          description: 'Parent category',
          sortOrder: 1,
        })
        .expect(201);

      parentId = parentRes.body.data.id;

      const childRes = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Child ${Date.now()}`,
          description: 'Child category',
          parentId: parentId,
          sortOrder: 2,
        })
        .expect(201);

      childId = childRes.body.data.id;

      const grandchildRes = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Grandchild ${Date.now()}`,
          description: 'Grandchild category',
          parentId: childId,
          sortOrder: 3,
        })
        .expect(201);

      grandchildId = grandchildRes.body.data.id;
    });

    it('should return complete category tree structure', async () => {
      const response = await request(app.getHttpServer()).get('/categories/tree').expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Verify tree structure
      const parentNode = response.body.data.find((cat: any) => cat.id === parentId);
      expect(parentNode).toBeDefined();
      expect(parentNode.children).toBeDefined();
      expect(Array.isArray(parentNode.children)).toBe(true);
    });

    it('should include nested subcategories in tree', async () => {
      const response = await request(app.getHttpServer()).get('/categories/tree').expect(200);

      const parentNode = response.body.data.find((cat: any) => cat.id === parentId);
      expect(parentNode).toBeDefined();

      // Check child exists
      const childNode = parentNode.children.find((cat: any) => cat.id === childId);
      expect(childNode).toBeDefined();

      // Check grandchild exists
      expect(childNode.children).toBeDefined();
      const grandchildNode = childNode.children.find((cat: any) => cat.id === grandchildId);
      expect(grandchildNode).toBeDefined();
    });

    it('should respect sortOrder in tree structure', async () => {
      const response = await request(app.getHttpServer()).get('/categories/tree').expect(200);

      const parentNode = response.body.data.find((cat: any) => cat.id === parentId);
      if (parentNode && parentNode.children && parentNode.children.length > 1) {
        // Verify children are sorted
        for (let i = 0; i < parentNode.children.length - 1; i++) {
          expect(parentNode.children[i].sortOrder).toBeLessThanOrEqual(
            parentNode.children[i + 1].sortOrder,
          );
        }
      }
    });
  });

  describe('GET /categories/:id (Get by ID)', () => {
    let categoryId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Category ${Date.now()}`,
          description: 'Test category',
          sortOrder: 1,
        })
        .expect(201);

      categoryId = response.body.data.id;
    });

    it('should get category by ID with children', async () => {
      const response = await request(app.getHttpServer())
        .get(`/categories/${categoryId}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('id', categoryId);
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('description');
      expect(response.body.data).toHaveProperty('slug');
      expect(response.body.data).toHaveProperty('children');
    });

    it('should return 404 with non-existent ID', async () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await request(app.getHttpServer())
        .get(`/categories/${nonExistentId}`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(404);
    });

    it('should return 400 with invalid UUID format', async () => {
      const response = await request(app.getHttpServer())
        .get('/categories/invalid-uuid')
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('GET /categories/slug/:slug (Get by slug)', () => {
    let testSlug: string;

    beforeAll(async () => {
      const uniqueName = `Electronics ${Date.now()}`;
      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: uniqueName,
          description: 'Electronics category',
          sortOrder: 1,
        })
        .expect(201);

      testSlug = response.body.data.slug;
    });

    it('should get category by slug', async () => {
      const response = await request(app.getHttpServer())
        .get(`/categories/slug/${testSlug}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('slug', testSlug);
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('id');
    });

    it('should return 404 with non-existent slug', async () => {
      const response = await request(app.getHttpServer())
        .get('/categories/slug/nonexistent-slug-12345')
        .expect(404);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(404);
    });
  });

  describe('GET /categories/:id/descendants (Get subcategories)', () => {
    let parentId: string;
    let child1Id: string;
    let child2Id: string;
    let grandchildId: string;

    beforeAll(async () => {
      // Create hierarchy
      const parentRes = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Parent Descendants ${Date.now()}`,
          description: 'Parent',
          sortOrder: 1,
        })
        .expect(201);

      parentId = parentRes.body.data.id;

      const child1Res = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Child1 ${Date.now()}`,
          description: 'Child 1',
          parentId: parentId,
          sortOrder: 1,
        })
        .expect(201);

      child1Id = child1Res.body.data.id;

      const child2Res = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Child2 ${Date.now()}`,
          description: 'Child 2',
          parentId: parentId,
          sortOrder: 2,
        })
        .expect(201);

      child2Id = child2Res.body.data.id;

      const grandchildRes = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Grandchild ${Date.now()}`,
          description: 'Grandchild',
          parentId: child1Id,
          sortOrder: 1,
        })
        .expect(201);

      grandchildId = grandchildRes.body.data.id;
    });

    it('should get all descendants of a category', async () => {
      const response = await request(app.getHttpServer())
        .get(`/categories/${parentId}/descendants`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);

      const descendantIds = response.body.data.map((cat: any) => cat.id);
      expect(descendantIds).toContain(child1Id);
      expect(descendantIds).toContain(child2Id);
      expect(descendantIds).toContain(grandchildId);
    });

    it('should respect maxDepth parameter', async () => {
      const response = await request(app.getHttpServer())
        .get(`/categories/${parentId}/descendants`)
        .query({ maxDepth: 1 })
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      // Should only include direct children, not grandchildren
      const descendantIds = response.body.data.map((cat: any) => cat.id);
      expect(descendantIds).toContain(child1Id);
      expect(descendantIds).toContain(child2Id);
      // Grandchild should not be included with maxDepth=1
      expect(descendantIds).not.toContain(grandchildId);
    });
  });

  describe('GET /categories/:id/path (Get breadcrumb path)', () => {
    let rootId: string;
    let level1Id: string;
    let level2Id: string;
    let rootName: string;
    let level1Name: string;
    let level2Name: string;

    beforeAll(async () => {
      rootName = `Root Path ${Date.now()}`;
      const rootRes = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: rootName,
          description: 'Root',
        })
        .expect(201);

      rootId = rootRes.body.data.id;

      level1Name = `Level1 ${Date.now()}`;
      const level1Res = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: level1Name,
          description: 'Level 1',
          parentId: rootId,
        })
        .expect(201);

      level1Id = level1Res.body.data.id;

      level2Name = `Level2 ${Date.now()}`;
      const level2Res = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: level2Name,
          description: 'Level 2',
          parentId: level1Id,
        })
        .expect(201);

      level2Id = level2Res.body.data.id;
    });

    it('should return breadcrumb path from root to category', async () => {
      const response = await request(app.getHttpServer())
        .get(`/categories/${level2Id}/path`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(3);
      expect(response.body.data[0]).toBe(rootName);
      expect(response.body.data[1]).toBe(level1Name);
      expect(response.body.data[2]).toBe(level2Name);
    });
  });

  describe('POST /categories (Create category)', () => {
    it('should create root category successfully', async () => {
      const categoryData = {
        name: `Root Category ${Date.now()}`,
        description: 'A root category for testing',
        sortOrder: 10,
      };

      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(categoryData)
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(categoryData.name);
      expect(response.body.data.description).toBe(categoryData.description);
      expect(response.body.data).toHaveProperty('slug');
      expect(response.body.data.parentId).toBeNull();
      expect(response.body.data.isActive).toBe(true);
    });

    it('should create subcategory with parentId', async () => {
      // Create parent first
      const parentRes = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Parent ${Date.now()}`,
          description: 'Parent category',
        })
        .expect(201);

      const parentId = parentRes.body.data.id;

      // Create subcategory
      const subCategoryData = {
        name: `Subcategory ${Date.now()}`,
        description: 'A subcategory',
        parentId: parentId,
        sortOrder: 5,
      };

      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(subCategoryData)
        .expect(201);

      expect(response.body.data.parentId).toBe(parentId);
      expect(response.body.data.name).toBe(subCategoryData.name);
    });

    it('should generate slug automatically if not provided', async () => {
      const categoryData = {
        name: `Auto Slug Category ${Date.now()}`,
        description: 'Category with auto-generated slug',
      };

      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(categoryData)
        .expect(201);

      expect(response.body.data).toHaveProperty('slug');
      expect(response.body.data.slug).toBeTruthy();
      expect(response.body.data.slug).toContain('auto-slug-category');
    });

    it('should return 409 with duplicate slug', async () => {
      const uniqueSlug = `unique-slug-${Date.now()}`;

      // Create first category with explicit slug
      await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `First ${Date.now()}`,
          description: 'First category',
          slug: uniqueSlug,
        })
        .expect(201);

      // Try to create second category with same slug
      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Second ${Date.now()}`,
          description: 'Second category',
          slug: uniqueSlug,
        })
        .expect(409);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(409);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .send({
          name: `Unauthorized ${Date.now()}`,
          description: 'Should fail',
        })
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });
  });

  describe('PUT /categories/:id (Update category)', () => {
    let categoryId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Update Test ${Date.now()}`,
          description: 'Original description',
          sortOrder: 1,
        })
        .expect(201);

      categoryId = response.body.data.id;
    });

    it('should update category successfully', async () => {
      const updateData = {
        name: `Updated Name ${Date.now()}`,
        description: 'Updated description',
        sortOrder: 5,
      };

      const response = await request(app.getHttpServer())
        .put(`/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.id).toBe(categoryId);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.sortOrder).toBe(updateData.sortOrder);
    });

    it('should prevent circular hierarchy', async () => {
      // Create parent and child
      const parentRes = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Circular Parent ${Date.now()}`,
          description: 'Parent',
        })
        .expect(201);

      const parentId = parentRes.body.data.id;

      const childRes = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Circular Child ${Date.now()}`,
          description: 'Child',
          parentId: parentId,
        })
        .expect(201);

      const childId = childRes.body.data.id;

      // Try to make parent a child of its own child (circular reference)
      const response = await request(app.getHttpServer())
        .put(`/categories/${parentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          parentId: childId,
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('DELETE /categories/:id (Delete category)', () => {
    it('should delete category without children successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `To Delete ${Date.now()}`,
          description: 'Will be deleted',
        })
        .expect(201);

      const categoryId = response.body.data.id;

      await request(app.getHttpServer())
        .delete(`/categories/${categoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify category is deleted
      await request(app.getHttpServer()).get(`/categories/${categoryId}`).expect(404);
    });

    it('should return 400 when deleting category with subcategories', async () => {
      // Create parent
      const parentRes = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Parent Delete ${Date.now()}`,
          description: 'Parent with child',
        })
        .expect(201);

      const parentId = parentRes.body.data.id;

      // Create child
      await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Child Delete ${Date.now()}`,
          description: 'Child category',
          parentId: parentId,
        })
        .expect(201);

      // Try to delete parent (should fail)
      const response = await request(app.getHttpServer())
        .delete(`/categories/${parentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(400);
    });
  });

  describe('PATCH /categories/:id/activate (Activate category)', () => {
    let categoryId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Activate Test ${Date.now()}`,
          description: 'Category to activate',
        })
        .expect(201);

      categoryId = response.body.data.id;

      // Deactivate it first
      await request(app.getHttpServer())
        .patch(`/categories/${categoryId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should activate deactivated category', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/categories/${categoryId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(categoryId);
      expect(response.body.data.isActive).toBe(true);
    });
  });

  describe('PATCH /categories/:id/deactivate (Deactivate category)', () => {
    let categoryId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Deactivate Test ${Date.now()}`,
          description: 'Category to deactivate',
        })
        .expect(201);

      categoryId = response.body.data.id;
    });

    it('should deactivate active category', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/categories/${categoryId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(categoryId);
      expect(response.body.data.isActive).toBe(false);
    });
  });
});
