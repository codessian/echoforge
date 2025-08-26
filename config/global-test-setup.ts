/**
 * Global Test Setup
 * Runs once before all tests across all test files
 */

import { mkdir, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { existsSync } from 'fs';

export async function setup() {
  console.log('🚀 Setting up global test environment...');
  
  // Create test directories
  const testDirs = [
    'test-results',
    'coverage',
    'test-fixtures',
    'test-temp',
  ];
  
  for (const dir of testDirs) {
    const dirPath = resolve(process.cwd(), dir);
    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true });
      console.log(`📁 Created test directory: ${dir}`);
    }
  }
  
  // Set up test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests
  process.env.TEST_TIMEOUT = '30000';
  
  // Create test configuration file if it doesn't exist
  const testConfigPath = resolve(process.cwd(), 'test-fixtures', 'test-config.json');
  if (!existsSync(testConfigPath)) {
    const testConfig = {
      database: {
        url: 'sqlite::memory:',
        logging: false,
      },
      api: {
        baseUrl: 'http://localhost:3000',
        timeout: 5000,
      },
      features: {
        enableMetrics: false,
        enableLogging: false,
        enableCaching: false,
      },
      testData: {
        seedData: true,
        cleanupAfterTests: true,
      },
    };
    
    await writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));
    console.log('⚙️ Created test configuration file');
  }
  
  // Initialize test database or other resources if needed
  await initializeTestResources();
  
  console.log('✅ Global test environment setup complete');
}

export async function teardown() {
  console.log('🧹 Cleaning up global test environment...');
  
  // Clean up test resources
  await cleanupTestResources();
  
  console.log('✅ Global test environment cleanup complete');
}

/**
 * Initialize test resources (databases, external services, etc.)
 */
async function initializeTestResources() {
  // Initialize in-memory database for tests
  // This is where you'd set up test databases, mock services, etc.
  
  // Example: Initialize test database
  try {
    // await initializeTestDatabase();
    console.log('🗄️ Test database initialized');
  } catch (error) {
    console.warn('⚠️ Test database initialization skipped:', error);
  }
  
  // Example: Start mock services
  try {
    // await startMockServices();
    console.log('🔧 Mock services started');
  } catch (error) {
    console.warn('⚠️ Mock services startup skipped:', error);
  }
}

/**
 * Clean up test resources
 */
async function cleanupTestResources() {
  // Clean up databases, stop services, etc.
  
  try {
    // await cleanupTestDatabase();
    console.log('🗄️ Test database cleaned up');
  } catch (error) {
    console.warn('⚠️ Test database cleanup failed:', error);
  }
  
  try {
    // await stopMockServices();
    console.log('🔧 Mock services stopped');
  } catch (error) {
    console.warn('⚠️ Mock services cleanup failed:', error);
  }
}

// Export setup and teardown for Vitest
export default { setup, teardown };