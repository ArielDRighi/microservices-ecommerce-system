import { NotificationEntity } from '../entities/notification.entity';
import { NotificationStatus } from '../enums';

/**
 * Create mock notification repository
 */
export function mockNotificationRepository() {
  return {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  };
}

/**
 * Create mock notification entity
 */
export function createMockNotification(
  id: string,
  userId: string,
  status: NotificationStatus = NotificationStatus.SENT,
): NotificationEntity {
  return {
    id,
    userId,
    type: 'EMAIL',
    status,
  } as NotificationEntity;
}

/**
 * Assert notification result
 */
export function expectValidNotificationResult(result: { status: NotificationStatus }): void {
  expect(result).toBeDefined();
  expect([NotificationStatus.SENT, NotificationStatus.FAILED]).toContain(result.status);
}

/**
 * Mock successful notification
 */
export function mockSuccessfulNotification(): void {
  jest.spyOn(Math, 'random').mockReturnValue(0.1); // < 0.95 = success
}

/**
 * Mock failed notification
 */
export function mockFailedNotification(): void {
  jest.spyOn(Math, 'random').mockReturnValue(0.99); // >= 0.95 = failure
}
