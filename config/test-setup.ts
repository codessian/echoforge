/**
 * Test Setup Configuration
 * Runs before each test file
 */

import { vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { setupGlobalTestEnvironment } from './test-utils';

// Setup global test environment
const getTestEnv = setupGlobalTestEnvironment();

// Global test configuration
beforeAll(() => {
  // Set timezone for consistent date testing
  process.env.TZ = 'UTC';
  
  // Mock console methods in CI to reduce noise
  if (process.env.CI) {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  }
  
  // Set up global fetch mock if needed
  if (!global.fetch) {
    global.fetch = vi.fn();
  }
});

afterAll(() => {
  // Restore console methods
  if (process.env.CI) {
    vi.restoreAllMocks();
  }
});

// Per-test setup
beforeEach(() => {
  // Clear all timers
  vi.clearAllTimers();
  
  // Reset fetch mock
  if (global.fetch && vi.isMockFunction(global.fetch)) {
    (global.fetch as any).mockClear();
  }
});

afterEach(() => {
  // Clean up test environment
  const testEnv = getTestEnv();
  testEnv?.cleanup();
  
  // Clear all mocks
  vi.clearAllMocks();
  
  // Run fake timers if they were used
  if (vi.isFakeTimers()) {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  }
});

// Global error handling for tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in tests, but log the error
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process in tests, but log the error
});

// Export test environment getter for use in tests
export { getTestEnv };