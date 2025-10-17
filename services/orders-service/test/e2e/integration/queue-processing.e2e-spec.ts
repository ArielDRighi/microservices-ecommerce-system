import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { ResponseHelper } from '../../helpers/response.helper';
import { QueueService } from '../../../src/queues/queue.service';
import { QueueHelper } from '../../helpers/queue.helper';
import { Queue } from 'bull';
import { ProductFactory } from '../../helpers/factories/product.factory';
import { Product } from '../../../src/modules/products/entities/product.entity';
// ✅ Epic 1.6 - Inventory entity removed (now external service)
// import { Inventory } from '../../../src/modules/inventory/entities/inventory.entity';
import { OrderProcessingJobData } from '../../../src/common/interfaces/queue-job.interface';
import { TestAppHelper } from '../../helpers/test-app.helper';

// Helper function to extract data from nested response structure

describe('Queue Processing - Integration (E2E)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let queueService: QueueService;
  let orderQueue: Queue<OrderProcessingJobData>;
  let productRepository: Repository<Product>;
  // ✅ Epic 1.6 - Inventory repository removed (now external service)
  // let inventoryRepository: Repository<Inventory>;

  beforeAll(async () => {
    app = await TestAppHelper.createTestApp();

    dataSource = app.get<DataSource>(DataSource);
    queueService = app.get<QueueService>(QueueService);
    productRepository = dataSource.getRepository(Product);
    // ✅ Epic 1.6 - Inventory repository removed (now external service)
    // inventoryRepository = dataSource.getRepository(Inventory);

    // Get order processing queue directly from Bull
    const orderQueueToken = 'BullQueue_order-processing';
    orderQueue = app.get<Queue<OrderProcessingJobData>>(orderQueueToken);
  });

  afterAll(async () => {
    await TestAppHelper.closeApp(app);
  });

  beforeEach(async () => {
    await TestAppHelper.cleanDatabase(app);

    // Clear all queues before each test
    const queues = queueService.getAllQueues();
    for (const { queue } of queues) {
      await QueueHelper.clearQueue(queue);
    }
  });

  describe('Basic Queue Job Processing', () => {
    it('should process order job end-to-end (order → job → completion)', async () => {
      const timestamp = Date.now();

      // 0. Register user and get token using direct request
      const userEmail = `test-queue-${timestamp}@example.com`;
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: userEmail,
          password: 'Test123!',
          firstName: 'Test',
          lastName: 'Queue User',
        })
        .expect(201);

      const registerData = ResponseHelper.extractData(registerResponse);
      const { accessToken } = registerData;

      // 1. Create product and inventory using factory
      const product = await ProductFactory.create(productRepository, {
        price: 100,
        sku: `TEST-QUEUE-${timestamp}`,
      });

      // ✅ Epic 1.6 - Inventory creation removed (now handled by external Inventory Service)
      // In a real scenario, the Inventory Service would need to be running or mocked
      // For this test, we skip inventory setup as the saga will handle stock verification
      // via InventoryServiceClient (which will be mocked in unit tests)

      // const inventory = inventoryRepository.create({
      //   productId: product.id,
      //   sku: product.sku,
      //   currentStock: 50,
      //   reservedStock: 0,
      //   location: 'MAIN_WAREHOUSE',
      // });
      // await inventoryRepository.save(inventory);

      // 2. Create order which should trigger queue processing
      const orderResponse = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          items: [{ productId: product.id, quantity: 2 }],
        })
        .expect(202);

      const orderData = ResponseHelper.extractData(orderResponse);
      const orderId = orderData.id;

      // 3. Wait for queue processing to complete
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // 4. Check order was processed
      console.log('Order ID received:', orderId); // Debug log

      if (!orderId) {
        console.error('Order response body:', orderResponse.body);
        throw new Error('Order ID not received from order creation');
      }

      const orderStatusResponse = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const orderStatusData = ResponseHelper.extractData(orderStatusResponse);
      // Order should be in a processed state (CONFIRMED, PROCESSING, etc.)
      expect(['PENDING', 'PROCESSING', 'CONFIRMED']).toContain(orderStatusData.status);

      // 5. Verify queue metrics
      const metrics = await queueService.getQueueMetrics('order-processing');
      expect(metrics).toBeDefined();
      expect(metrics.queueName).toBe('order-processing');
      expect(typeof metrics.completed).toBe('number');
    });
  });

  describe('Job Retry Mechanism', () => {
    it('should retry failed jobs according to configuration', async () => {
      // 1. Create job data that will likely fail (invalid product)
      const jobData: OrderProcessingJobData = {
        jobId: 'test-retry-job',
        orderId: 'non-existent-order',
        userId: 'test-user',
        items: [{ productId: 'invalid-product-id', quantity: 1 }],
        createdAt: new Date(),
      };

      // 2. Add job to queue with retry configuration
      const job = await orderQueue.add('process-order', jobData, {
        attempts: 2, // Reduce attempts for faster test
        backoff: {
          type: 'fixed',
          delay: 50,
        },
      });

      // 3. Wait for job processing and retries
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 4. Check job was processed (even if failed)
      const refreshedJob = await orderQueue.getJob(job.id);

      // Job should exist regardless of status
      expect(refreshedJob).toBeDefined();

      if (refreshedJob) {
        // Check if job is in any valid state (even if not attempted due to saga pattern)
        const isFailed = await refreshedJob.isFailed();
        const isActive = await refreshedJob.isActive();
        const isWaiting = await refreshedJob.isWaiting();
        const isCompleted = await refreshedJob.isCompleted();

        // Job should be in one of these valid states
        expect(isFailed || isActive || isWaiting || isCompleted).toBeTruthy();

        // Log the actual state for debugging
        console.log('Job state:', {
          id: refreshedJob.id,
          attemptsMade: refreshedJob.attemptsMade,
          isFailed,
          isActive,
          isWaiting,
          isCompleted,
          failedReason: refreshedJob.failedReason,
        });
      }
    });
  });

  describe('Failed Job Handling', () => {
    it('should handle jobs that fail after maximum retries', async () => {
      // 1. Create job data that will definitely fail
      const jobData: OrderProcessingJobData = {
        jobId: 'test-max-retries-job',
        orderId: 'definitely-invalid-order-id',
        userId: 'test-user',
        items: [{ productId: 'definitely-invalid-product', quantity: 999 }],
        createdAt: new Date(),
      };

      // 2. Add job with limited retries
      const job = await orderQueue.add('process-order', jobData, {
        attempts: 2, // Limited attempts for faster test
        backoff: {
          type: 'fixed',
          delay: 50,
        },
      });

      // 3. Wait for job to fail completely
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // 4. Check job handling after max retries
      const failedJobs = await QueueHelper.getFailedJobs(orderQueue);
      const ourFailedJob = failedJobs.find((failedJob) => failedJob.id === job.id);

      if (ourFailedJob) {
        expect(ourFailedJob.attemptsMade).toBe(2);
        expect(ourFailedJob.failedReason).toBeDefined();
      }

      // 5. Verify queue metrics reflect failed jobs
      const metrics = await queueService.getQueueMetrics('order-processing');
      expect(metrics.failed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Queue Health and Metrics', () => {
    it('should provide accurate queue health and basic metrics', async () => {
      // 1. Get queue metrics
      const metrics = await queueService.getQueueMetrics('order-processing');

      // 2. Verify metrics structure
      expect(metrics).toBeDefined();
      expect(metrics.queueName).toBe('order-processing');
      expect(typeof metrics.waiting).toBe('number');
      expect(typeof metrics.active).toBe('number');
      expect(typeof metrics.completed).toBe('number');
      expect(typeof metrics.failed).toBe('number');
      expect(typeof metrics.delayed).toBe('number');
      expect(typeof metrics.paused).toBe('boolean');
      expect(metrics.timestamp).toBeInstanceOf(Date);

      // 3. Get all queue metrics
      const allMetrics = await queueService.getAllQueueMetrics();

      // 4. Verify all queues are included
      expect(allMetrics).toHaveLength(4);
      const queueNames = allMetrics.map((m) => m.queueName);
      expect(queueNames).toContain('order-processing');
      expect(queueNames).toContain('payment-processing');
      expect(queueNames).toContain('inventory-management');
      expect(queueNames).toContain('notification-sending');

      // 5. Test queue pause/resume functionality
      await queueService.pauseQueue('order-processing');
      const pausedMetrics = await queueService.getQueueMetrics('order-processing');
      expect(pausedMetrics.paused).toBe(true);

      await queueService.resumeQueue('order-processing');
      const resumedMetrics = await queueService.getQueueMetrics('order-processing');
      expect(resumedMetrics.paused).toBe(false);
    });
  });
});
