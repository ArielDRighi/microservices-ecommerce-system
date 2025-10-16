/**
 * Reservation Test Helper
 *
 * Provides utility methods for generating test reservation IDs
 * to avoid code duplication across E2E tests.
 */
export class ReservationHelper {
  /**
   * Generate a unique reservation ID for testing
   *
   * Uses timestamp + random suffix to ensure uniqueness across parallel tests
   *
   * @returns Unique reservation ID in format: res-{timestamp}-{random}
   *
   * @example
   * ```typescript
   * const reservationId = ReservationHelper.generateReservationId();
   * // => 'res-1760285000-abc123'
   * ```
   */
  static generateReservationId(): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(7);
    return `res-${timestamp}-${randomSuffix}`;
  }
}
