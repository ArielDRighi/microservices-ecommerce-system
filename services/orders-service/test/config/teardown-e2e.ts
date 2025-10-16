/**
 * Teardown E2E Testing Environment
 * Runs once after all E2E tests complete
 */

/**
 * Global teardown - cleanup resources
 */
export default async function globalTeardown() {
  console.log('🧹 Running global E2E test teardown...');

  // Allow time for all async operations to complete
  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log('✅ E2E test teardown complete');
}
