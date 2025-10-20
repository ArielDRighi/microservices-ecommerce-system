import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RabbitMQConsumerService } from './rabbitmq-consumer.service';
import * as amqp from 'amqplib';

// Mock amqplib
jest.mock('amqplib');

describe('RabbitMQConsumerService', () => {
  let service: RabbitMQConsumerService;
  let mockConnection: any;
  let mockChannel: any;
  let mockHandler: any;

  beforeEach(async () => {
    // Create mock channel
    mockChannel = {
      assertExchange: jest.fn().mockResolvedValue(undefined),
      assertQueue: jest.fn().mockResolvedValue({ queue: 'test-queue' }),
      bindQueue: jest.fn().mockResolvedValue(undefined),
      consume: jest.fn().mockResolvedValue({ consumerTag: 'test-tag' }),
      ack: jest.fn(),
      nack: jest.fn(),
      prefetch: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };

    // Create mock connection
    mockConnection = {
      createConfirmChannel: jest.fn().mockResolvedValue(mockChannel),
      close: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
    };

    // Mock amqp.connect
    (amqp.connect as jest.Mock).mockResolvedValue(mockConnection);

    // Create mock handler
    mockHandler = {
      execute: jest.fn().mockResolvedValue(undefined),
      canHandle: jest.fn().mockReturnValue(true),
      eventType: 'InventoryReserved',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RabbitMQConsumerService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('amqp://guest:guest@localhost:5672'),
          },
        },
        {
          provide: 'INVENTORY_HANDLERS',
          useValue: [mockHandler],
        },
      ],
    }).compile();

    service = module.get<RabbitMQConsumerService>(RabbitMQConsumerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Connection Management', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should connect to RabbitMQ on initialization', async () => {
      await service.onModuleInit();

      expect(amqp.connect).toHaveBeenCalledWith(
        expect.stringContaining('amqp://'),
        expect.any(Object),
      );
      expect(mockConnection.createConfirmChannel).toHaveBeenCalled();
    });

    it('should setup exchange and queues on initialization', async () => {
      await service.onModuleInit();

      // Should assert exchange
      expect(mockChannel.assertExchange).toHaveBeenCalledWith(
        'inventory.events',
        'topic',
        expect.objectContaining({ durable: true }),
      );

      // Should assert queue
      expect(mockChannel.assertQueue).toHaveBeenCalledWith(
        'orders.inventory_events',
        expect.objectContaining({ durable: true }),
      );

      // Should bind queue to exchange
      expect(mockChannel.bindQueue).toHaveBeenCalled();
    });

    it('should set prefetch to 10 for fair dispatch', async () => {
      await service.onModuleInit();

      expect(mockChannel.prefetch).toHaveBeenCalledWith(10);
    });

    it('should close connection on module destroy', async () => {
      await service.onModuleInit();
      await service.onModuleDestroy();

      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });

    it('should handle connection errors gracefully', async () => {
      const error = new Error('Connection failed');
      (amqp.connect as jest.Mock).mockRejectedValueOnce(error);

      await expect(service.onModuleInit()).rejects.toThrow('Connection failed');
    });
  });

  describe('Message Consumption', () => {
    it('should start consuming messages after initialization', async () => {
      await service.onModuleInit();

      expect(mockChannel.consume).toHaveBeenCalledWith(expect.any(String), expect.any(Function), {
        noAck: false,
      });
    });

    it('should parse and validate incoming messages', async () => {
      const validMessage = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        eventType: 'inventory.stock.reserved',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'inventory-service',
        payload: {
          reservationId: '123e4567-e89b-12d3-a456-426614174001',
          productId: 'prod-1',
          quantity: 5,
          orderId: '123e4567-e89b-12d3-a456-426614174002',
          userId: '123e4567-e89b-12d3-a456-426614174003',
          expiresAt: new Date().toISOString(),
          reservedAt: new Date().toISOString(),
        },
      };

      const mockMessage = {
        content: Buffer.from(JSON.stringify(validMessage)),
        fields: {
          deliveryTag: 1,
          routingKey: 'inventory.stock.reserved',
        },
        properties: {
          messageId: '123e4567-e89b-12d3-a456-426614174000',
          correlationId: '123e4567-e89b-12d3-a456-426614174004',
        },
      };

      await service.onModuleInit();
      const consumeCallback = (mockChannel.consume as jest.Mock).mock.calls[0][1];
      await consumeCallback(mockMessage);

      // Should acknowledge valid message
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
    });

    it('should reject invalid messages with nack (no requeue)', async () => {
      const invalidMessage = {
        eventType: 'invalid.event',
        // Missing required fields
      };

      const mockMessage = {
        content: Buffer.from(JSON.stringify(invalidMessage)),
        fields: {
          deliveryTag: 1,
          routingKey: 'invalid.event',
        },
        properties: {},
      };

      await service.onModuleInit();
      const consumeCallback = (mockChannel.consume as jest.Mock).mock.calls[0][1];
      await consumeCallback(mockMessage);

      // Should nack invalid message (don't requeue)
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
      expect(mockChannel.ack).not.toHaveBeenCalled();
    });

    it('should handle null messages gracefully', async () => {
      await service.onModuleInit();
      const consumeCallback = (mockChannel.consume as jest.Mock).mock.calls[0][1];

      // Should not throw
      await expect(consumeCallback(null)).resolves.toBeUndefined();
    });
  });

  describe('Idempotency', () => {
    it('should not process duplicate events (same eventId)', async () => {
      const validMessage = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        eventType: 'inventory.stock.reserved',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'inventory-service',
        payload: {
          reservationId: '123e4567-e89b-12d3-a456-426614174001',
          productId: 'prod-1',
          quantity: 5,
          orderId: '123e4567-e89b-12d3-a456-426614174002',
          userId: '123e4567-e89b-12d3-a456-426614174003',
          expiresAt: new Date().toISOString(),
          reservedAt: new Date().toISOString(),
        },
      };

      const mockMessage = {
        content: Buffer.from(JSON.stringify(validMessage)),
        fields: {
          deliveryTag: 1,
          routingKey: 'inventory.stock.reserved',
        },
        properties: {
          messageId: validMessage.eventId,
        },
      };

      await service.onModuleInit();
      const consumeCallback = (mockChannel.consume as jest.Mock).mock.calls[0][1];

      // Process first time
      await consumeCallback(mockMessage);
      expect(mockHandler.execute).toHaveBeenCalledTimes(1);
      expect(mockChannel.ack).toHaveBeenCalledTimes(1);

      // Process second time (duplicate)
      await consumeCallback({ ...mockMessage, fields: { ...mockMessage.fields, deliveryTag: 2 } });

      // Should ack but not process again
      expect(mockHandler.execute).toHaveBeenCalledTimes(1);
      expect(mockChannel.ack).toHaveBeenCalledTimes(2);
    });

    it('should clear old processed event IDs after TTL', async () => {
      // This test validates that the idempotency cache doesn't grow indefinitely
      // Implementation should use a TTL-based cache (e.g., Redis or in-memory with expiration)
      expect(service).toBeDefined();
      // TODO: Implement TTL logic and add specific test
    });
  });

  describe('Error Handling', () => {
    it('should nack and requeue messages when handler throws transient error', async () => {
      const validMessage = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        eventType: 'inventory.stock.reserved',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'inventory-service',
        payload: {
          reservationId: '123e4567-e89b-12d3-a456-426614174001',
          productId: 'prod-1',
          quantity: 5,
          orderId: '123e4567-e89b-12d3-a456-426614174002',
          userId: '123e4567-e89b-12d3-a456-426614174003',
          expiresAt: new Date().toISOString(),
          reservedAt: new Date().toISOString(),
        },
      };

      const mockMessage = {
        content: Buffer.from(JSON.stringify(validMessage)),
        fields: {
          deliveryTag: 1,
          routingKey: 'inventory.stock.reserved',
        },
        properties: {
          messageId: validMessage.eventId,
        },
      };

      // Simulate transient error (e.g., DB connection issue)
      mockHandler.execute.mockRejectedValueOnce(new Error('Database timeout'));

      await service.onModuleInit();
      const consumeCallback = (mockChannel.consume as jest.Mock).mock.calls[0][1];
      await consumeCallback(mockMessage);

      // Should nack with requeue for transient errors
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, true);
      expect(mockChannel.ack).not.toHaveBeenCalled();
    });

    it('should nack without requeue for permanent errors after max retries', async () => {
      const validMessage = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        eventType: 'inventory.stock.reserved',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'inventory-service',
        payload: {
          reservationId: '123e4567-e89b-12d3-a456-426614174001',
          productId: 'prod-1',
          quantity: 5,
          orderId: '123e4567-e89b-12d3-a456-426614174002',
          userId: '123e4567-e89b-12d3-a456-426614174003',
          expiresAt: new Date().toISOString(),
          reservedAt: new Date().toISOString(),
        },
      };

      const mockMessage = {
        content: Buffer.from(JSON.stringify(validMessage)),
        fields: {
          deliveryTag: 1,
          routingKey: 'inventory.stock.reserved',
        },
        properties: {
          messageId: validMessage.eventId,
          headers: {
            'x-retry-count': 3, // Max retries exceeded
          },
        },
      };

      mockHandler.execute.mockRejectedValueOnce(new Error('Permanent failure'));

      await service.onModuleInit();
      const consumeCallback = (mockChannel.consume as jest.Mock).mock.calls[0][1];
      await consumeCallback(mockMessage);

      // Should nack without requeue (goes to DLQ)
      expect(mockChannel.nack).toHaveBeenCalledWith(mockMessage, false, false);
    });
  });

  describe('Handler Integration', () => {
    it('should route events to appropriate handlers', async () => {
      const reservedEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        eventType: 'inventory.stock.reserved',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'inventory-service',
        payload: {
          reservationId: '123e4567-e89b-12d3-a456-426614174001',
          productId: 'prod-1',
          quantity: 5,
          orderId: '123e4567-e89b-12d3-a456-426614174002',
          userId: '123e4567-e89b-12d3-a456-426614174003',
          expiresAt: new Date().toISOString(),
          reservedAt: new Date().toISOString(),
        },
      };

      const mockMessage = {
        content: Buffer.from(JSON.stringify(reservedEvent)),
        fields: {
          deliveryTag: 1,
          routingKey: 'inventory.stock.reserved',
        },
        properties: {
          messageId: reservedEvent.eventId,
        },
      };

      await service.onModuleInit();
      const consumeCallback = (mockChannel.consume as jest.Mock).mock.calls[0][1];
      await consumeCallback(mockMessage);

      expect(mockHandler.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: reservedEvent.eventId,
          eventType: 'InventoryReserved', // Internal event type (mapped from rabbitmq type)
        }),
      );
    });

    it('should log warning when no handler found for event type', async () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn');

      const unknownEvent = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        eventType: 'inventory.stock.reserved', // Valid RabbitMQ type but handler can't handle it
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        source: 'inventory-service',
        payload: {
          reservationId: '123e4567-e89b-12d3-a456-426614174001',
          productId: 'prod-1',
          quantity: 5,
          orderId: '123e4567-e89b-12d3-a456-426614174002',
          userId: '123e4567-e89b-12d3-a456-426614174003',
          expiresAt: new Date().toISOString(),
          reservedAt: new Date().toISOString(),
        },
      };

      const mockMessage = {
        content: Buffer.from(JSON.stringify(unknownEvent)),
        fields: {
          deliveryTag: 1,
          routingKey: 'inventory.stock.unknown',
        },
        properties: {
          messageId: unknownEvent.eventId,
        },
      };

      mockHandler.canHandle.mockReturnValue(false);

      await service.onModuleInit();
      const consumeCallback = (mockChannel.consume as jest.Mock).mock.calls[0][1];
      await consumeCallback(mockMessage);

      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('No handler found'));

      // Should still ack the message to avoid blocking the queue
      expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
    });
  });

  describe('Queue Configuration', () => {
    it('should configure queue with DLQ', async () => {
      await service.onModuleInit();

      expect(mockChannel.assertQueue).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          durable: true,
          arguments: expect.objectContaining({
            'x-dead-letter-exchange': expect.any(String),
            'x-dead-letter-routing-key': expect.any(String),
          }),
        }),
      );
    });

    it('should bind to multiple routing keys', async () => {
      await service.onModuleInit();

      // Should bind to all inventory event types
      const expectedRoutingKeys = [
        'inventory.stock.reserved',
        'inventory.stock.confirmed',
        'inventory.stock.released',
        'inventory.stock.failed',
      ];

      expectedRoutingKeys.forEach((key) => {
        expect(mockChannel.bindQueue).toHaveBeenCalledWith(
          expect.any(String),
          'inventory.events',
          key,
        );
      });
    });
  });
});
