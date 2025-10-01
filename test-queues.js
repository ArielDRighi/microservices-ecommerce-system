#!/usr/bin/env node

/**
 * Script de testing manual para el sistema de colas
 *
 * Este script permite probar manualmente el funcionamiento de las colas
 * agregando jobs de prueba y monitoreando su procesamiento.
 *
 * Uso:
 *   node test-queues.js [tipo-de-job]
 *
 * Tipos de jobs disponibles:
 *   - order: Agregar job de procesamiento de orden
 *   - payment: Agregar job de procesamiento de pago
 *   - inventory: Agregar job de gestión de inventario
 *   - notification: Agregar job de notificación
 *   - all: Agregar jobs de todos los tipos
 */

const Queue = require('bull');
const Redis = require('ioredis');

// Configuración de Redis
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || '',
  db: parseInt(process.env.BULL_REDIS_DB || '1'),
  keyPrefix: process.env.BULL_KEY_PREFIX || 'bull',
};

console.log('🔧 Configuración de Redis:', {
  host: redisConfig.host,
  port: redisConfig.port,
  db: redisConfig.db,
  keyPrefix: redisConfig.keyPrefix,
});

// Crear cliente Redis para verificar conexión
const redis = new Redis(redisConfig);

redis.on('connect', () => {
  console.log('✅ Conectado a Redis exitosamente\n');
});

redis.on('error', (err) => {
  console.error('❌ Error conectando a Redis:', err.message);
  process.exit(1);
});

// Crear instancias de las colas
const orderQueue = new Queue('order-processing', { redis: redisConfig });
const paymentQueue = new Queue('payment-processing', { redis: redisConfig });
const inventoryQueue = new Queue('inventory-management', { redis: redisConfig });
const notificationQueue = new Queue('notification-sending', { redis: redisConfig });

// Datos de prueba
const testData = {
  order: {
    jobId: `test-order-${Date.now()}`,
    orderId: `order-${Date.now()}`,
    userId: 'test-user-123',
    items: [
      { productId: 'prod-1', quantity: 2 },
      { productId: 'prod-2', quantity: 1 },
    ],
    totalAmount: 299.99,
    currency: 'USD',
    shippingAddress: {
      street: '123 Test St',
      city: 'Test City',
      country: 'US',
    },
    createdAt: new Date(),
  },
  payment: {
    jobId: `test-payment-${Date.now()}`,
    orderId: `order-${Date.now()}`,
    amount: 299.99,
    currency: 'USD',
    paymentMethod: 'credit_card',
    cardToken: 'tok_test_123',
    gatewayConfig: {
      provider: 'stripe',
      merchantId: 'test_merchant',
    },
    createdAt: new Date(),
  },
  inventory: {
    jobId: `test-inventory-${Date.now()}`,
    orderId: `order-${Date.now()}`,
    items: [
      { productId: 'prod-1', quantity: 2, warehouseId: 'warehouse-1' },
      { productId: 'prod-2', quantity: 1, warehouseId: 'warehouse-1' },
    ],
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    createdAt: new Date(),
  },
  notification: {
    jobId: `test-notification-${Date.now()}`,
    recipient: 'test@example.com',
    type: 'order-confirmation',
    templateId: 'order_confirmation_v1',
    data: {
      orderId: `order-${Date.now()}`,
      customerName: 'Test Customer',
    },
    priority: 'high',
    createdAt: new Date(),
  },
};

// Función para agregar job de orden
async function addOrderJob() {
  console.log('📦 Agregando job de procesamiento de orden...');
  const job = await orderQueue.add('create-order', testData.order, {
    jobId: testData.order.jobId,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });
  console.log(`✅ Job de orden agregado: ${job.id}`);
  return job;
}

// Función para agregar job de pago
async function addPaymentJob() {
  console.log('💳 Agregando job de procesamiento de pago...');
  const job = await paymentQueue.add('authorize-payment', testData.payment, {
    jobId: testData.payment.jobId,
    priority: 1,
    attempts: 3,
  });
  console.log(`✅ Job de pago agregado: ${job.id}`);
  return job;
}

// Función para agregar job de inventario
async function addInventoryJob() {
  console.log('📊 Agregando job de gestión de inventario...');
  const job = await inventoryQueue.add('reserve-inventory', testData.inventory, {
    jobId: testData.inventory.jobId,
    attempts: 4,
  });
  console.log(`✅ Job de inventario agregado: ${job.id}`);
  return job;
}

// Función para agregar job de notificación
async function addNotificationJob() {
  console.log('📧 Agregando job de notificación...');
  const job = await notificationQueue.add('send-email', testData.notification, {
    jobId: testData.notification.jobId,
    attempts: 3,
  });
  console.log(`✅ Job de notificación agregado: ${job.id}`);
  return job;
}

// Función para obtener métricas de una cola
async function getQueueMetrics(queue, name) {
  const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
    queue.getPausedCount(),
  ]);

  return {
    name,
    waiting,
    active,
    completed,
    failed,
    delayed,
    paused,
  };
}

// Función para mostrar métricas de todas las colas
async function showAllMetrics() {
  console.log('\n📊 MÉTRICAS DE COLAS\n');

  const metrics = await Promise.all([
    getQueueMetrics(orderQueue, 'Order Processing'),
    getQueueMetrics(paymentQueue, 'Payment Processing'),
    getQueueMetrics(inventoryQueue, 'Inventory Management'),
    getQueueMetrics(notificationQueue, 'Notification Sending'),
  ]);

  console.table(metrics);
}

// Función para limpiar colas completadas
async function cleanQueues() {
  console.log('\n🧹 Limpiando jobs completados...');

  const grace = 1000; // 1 segundo
  await Promise.all([
    orderQueue.clean(grace, 'completed'),
    paymentQueue.clean(grace, 'completed'),
    inventoryQueue.clean(grace, 'completed'),
    notificationQueue.clean(grace, 'completed'),
  ]);

  console.log('✅ Colas limpiadas');
}

// Función para vaciar todas las colas
async function emptyAllQueues() {
  console.log('\n🗑️  Vaciando todas las colas...');

  await Promise.all([
    orderQueue.empty(),
    paymentQueue.empty(),
    inventoryQueue.empty(),
    notificationQueue.empty(),
  ]);

  console.log('✅ Todas las colas vaciadas');
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  console.log('\n🚀 SISTEMA DE TESTING DE COLAS\n');

  try {
    // Esperar a que Redis esté conectado
    await new Promise((resolve) => setTimeout(resolve, 1000));

    switch (command) {
      case 'order':
        await addOrderJob();
        break;

      case 'payment':
        await addPaymentJob();
        break;

      case 'inventory':
        await addInventoryJob();
        break;

      case 'notification':
        await addNotificationJob();
        break;

      case 'all':
        await addOrderJob();
        await addPaymentJob();
        await addInventoryJob();
        await addNotificationJob();
        break;

      case 'metrics':
        await showAllMetrics();
        break;

      case 'clean':
        await cleanQueues();
        break;

      case 'empty':
        await emptyAllQueues();
        break;

      case 'help':
      default:
        console.log(`
📚 COMANDOS DISPONIBLES:

  node test-queues.js order         - Agregar job de orden
  node test-queues.js payment       - Agregar job de pago
  node test-queues.js inventory     - Agregar job de inventario
  node test-queues.js notification  - Agregar job de notificación
  node test-queues.js all           - Agregar jobs de todos los tipos
  node test-queues.js metrics       - Mostrar métricas de todas las colas
  node test-queues.js clean         - Limpiar jobs completados
  node test-queues.js empty         - Vaciar todas las colas
  node test-queues.js help          - Mostrar esta ayuda

📊 DASHBOARD:
  
  Una vez que la aplicación esté corriendo, puedes ver el dashboard de colas en:
  http://localhost:3000/admin/queues

💡 TIPS:

  1. Asegúrate de que Redis esté corriendo (docker-compose up redis)
  2. Inicia la aplicación NestJS (npm run start:dev)
  3. Los processors procesarán automáticamente los jobs
  4. Monitorea el progreso en el dashboard Bull Board
        `);
        break;
    }

    // Mostrar métricas después de agregar jobs
    if (['order', 'payment', 'inventory', 'notification', 'all'].includes(command)) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await showAllMetrics();
    }

    console.log('\n✅ Operación completada\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Cerrar conexiones
    await redis.quit();
    await orderQueue.close();
    await paymentQueue.close();
    await inventoryQueue.close();
    await notificationQueue.close();
    process.exit(0);
  }
}

// Ejecutar
main();
