// Jest setup file - executed before each test file

// Mock ioredis globally for all tests
const mockIncr = jest.fn().mockResolvedValue(1);
const mockExpire = jest.fn().mockResolvedValue(1);
const mockTtl = jest.fn().mockResolvedValue(60);
const mockOn = jest.fn();

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    incr: mockIncr,
    expire: mockExpire,
    ttl: mockTtl,
    on: mockOn,
  }));
});

// Export mocks for use in tests
export { mockIncr, mockExpire, mockTtl, mockOn };
