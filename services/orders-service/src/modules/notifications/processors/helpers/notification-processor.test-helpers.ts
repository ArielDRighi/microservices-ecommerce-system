import { Job } from 'bull';
import { NotificationsService } from '../../notifications.service';
import { NotificationPriority } from '../../enums';

/**
 * Create mock NotificationsService
 */
export function mockNotificationsService(): jest.Mocked<NotificationsService> {
  return {
    sendOrderConfirmation: jest.fn().mockResolvedValue(undefined),
    sendPaymentFailure: jest.fn().mockResolvedValue(undefined),
    sendShippingUpdate: jest.fn().mockResolvedValue(undefined),
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<NotificationsService>;
}

/**
 * Create mock job for testing
 */
export function createMockJob(
  id: string,
  type: 'order-confirmation' | 'payment-failure' | 'shipping-update' | 'welcome',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
  priority: NotificationPriority = NotificationPriority.NORMAL,
  userId: string = 'user-123',
): Job {
  return {
    id,
    data: {
      type,
      data,
      priority,
      userId,
    },
  } as Job;
}

/**
 * Expectativa para validar resultado exitoso de job
 */
export function expectSuccessfulJobResult(result: {
  success: boolean;
  jobId?: string | number;
}): void {
  expect(result.success).toBe(true);
  expect(result.jobId).toBeDefined();
}

/**
 * Assert job result structure
 */
export function expectValidJobResultStructure(result: {
  success: boolean;
  jobId?: string | number;
}): void {
  expect(result).toHaveProperty('success');
  expect(result).toHaveProperty('jobId');
  expect(typeof result.success).toBe('boolean');
  expect(typeof result.jobId).toBe('string');
}
