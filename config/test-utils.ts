/**
 * Enhanced Test Utilities for EchoForge Platform
 * Provides comprehensive testing helpers and utilities
 */

import { vi, expect, beforeEach, afterEach } from 'vitest';
import type { MockedFunction } from 'vitest';

// Test Environment Setup
export interface TestEnvironment {
  cleanup: () => void;
  mocks: Record<string, MockedFunction<any>>;
  fixtures: Record<string, any>;
}

/**
 * Creates a clean test environment with automatic cleanup
 */
export function createTestEnvironment(): TestEnvironment {
  const mocks: Record<string, MockedFunction<any>> = {};
  const fixtures: Record<string, any> = {};
  const cleanupTasks: (() => void)[] = [];

  const cleanup = () => {
    // Clear all mocks
    Object.values(mocks).forEach(mock => mock.mockRestore?.());
    
    // Run cleanup tasks
    cleanupTasks.forEach(task => task());
    
    // Clear fixtures
    Object.keys(fixtures).forEach(key => delete fixtures[key]);
  };

  return { cleanup, mocks, fixtures };
}

/**
 * Mock factory for common EchoForge components
 */
export class MockFactory {
  static createBlueprintProposal(overrides: Partial<any> = {}) {
    return {
      id: 'test-proposal-' + Math.random().toString(36).substr(2, 9),
      name: 'Test Proposal',
      intent: 'Test intent for proposal',
      dominantSequence: 'test-sequence',
      capabilities: {
        functions: [
          {
            name: 'testFunction',
            description: 'A test function',
            parameters: {},
          },
        ],
      },
      suggestedAgents: ['test-agent'],
      refinementAnnotations: [],
      timestamp: new Date().toISOString(),
      ...overrides,
    };
  }

  static createSoulWeaverInsight(overrides: Partial<any> = {}) {
    return {
      id: 'insight-' + Math.random().toString(36).substr(2, 9),
      content: 'Test insight content',
      relevanceScore: 0.8,
      timestamp: new Date().toISOString(),
      source: 'test-source',
      tags: ['test', 'insight'],
      ...overrides,
    };
  }

  static createMetricsData(overrides: Partial<any> = {}) {
    return {
      timestamp: new Date().toISOString(),
      proposalQuality: 0.85,
      adaptationSpeed: 0.75,
      feedbackIntegration: 0.90,
      consciousnessImpact: {
        coherence: 0.88,
        creativity: 0.82,
        adaptability: 0.79,
        overallScore: 0.83,
      },
      ...overrides,
    };
  }

  static createEventEmitterMock() {
    const listeners: Record<string, Function[]> = {};
    
    return {
      on: vi.fn((event: string, listener: Function) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(listener);
      }),
      emit: vi.fn((event: string, ...args: any[]) => {
        if (listeners[event]) {
          listeners[event].forEach(listener => listener(...args));
        }
      }),
      off: vi.fn((event: string, listener: Function) => {
        if (listeners[event]) {
          const index = listeners[event].indexOf(listener);
          if (index > -1) listeners[event].splice(index, 1);
        }
      }),
      removeAllListeners: vi.fn((event?: string) => {
        if (event) {
          delete listeners[event];
        } else {
          Object.keys(listeners).forEach(key => delete listeners[key]);
        }
      }),
      _getListeners: () => listeners, // For testing purposes
    };
  }
}

/**
 * Async test utilities
 */
export class AsyncTestUtils {
  /**
   * Waits for a condition to be true with timeout
   */
  static async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeout = 5000,
    interval = 100
  ): Promise<void> {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }

  /**
   * Waits for an event to be emitted
   */
  static async waitForEvent(
    emitter: any,
    eventName: string,
    timeout = 5000
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        emitter.off(eventName, handler);
        reject(new Error(`Event '${eventName}' not emitted within ${timeout}ms`));
      }, timeout);

      const handler = (data: any) => {
        clearTimeout(timer);
        emitter.off(eventName, handler);
        resolve(data);
      };

      emitter.on(eventName, handler);
    });
  }

  /**
   * Creates a promise that resolves after a delay
   */
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceTestUtils {
  /**
   * Measures execution time of a function
   */
  static async measureExecutionTime<T>(
    fn: () => Promise<T> | T
  ): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return { result, duration };
  }

  /**
   * Runs a function multiple times and returns statistics
   */
  static async benchmark(
    fn: () => Promise<any> | any,
    iterations = 100
  ): Promise<{
    min: number;
    max: number;
    avg: number;
    median: number;
    iterations: number;
  }> {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const { duration } = await this.measureExecutionTime(fn);
      times.push(duration);
    }

    times.sort((a, b) => a - b);

    return {
      min: times[0],
      max: times[times.length - 1],
      avg: times.reduce((sum, time) => sum + time, 0) / times.length,
      median: times[Math.floor(times.length / 2)],
      iterations,
    };
  }
}

/**
 * Custom matchers for enhanced assertions
 */
export const customMatchers = {
  toBeWithinRange(received: number, min: number, max: number) {
    const pass = received >= min && received <= max;
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be within range ${min}-${max}`
          : `Expected ${received} to be within range ${min}-${max}`,
    };
  },

  toHaveBeenCalledWithPartialObject(received: MockedFunction<any>, expected: any) {
    const calls = received.mock.calls;
    const pass = calls.some(call => 
      call.some(arg => 
        typeof arg === 'object' && 
        Object.keys(expected).every(key => 
          arg[key] !== undefined && 
          (typeof expected[key] === 'object' 
            ? JSON.stringify(arg[key]) === JSON.stringify(expected[key])
            : arg[key] === expected[key]
          )
        )
      )
    );

    return {
      pass,
      message: () =>
        pass
          ? `Expected function not to have been called with partial object ${JSON.stringify(expected)}`
          : `Expected function to have been called with partial object ${JSON.stringify(expected)}`,
    };
  },
};

/**
 * Test data generators
 */
export class TestDataGenerator {
  static generateRandomString(length = 10): string {
    return Math.random().toString(36).substring(2, 2 + length);
  }

  static generateRandomNumber(min = 0, max = 100): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static generateRandomBoolean(): boolean {
    return Math.random() < 0.5;
  }

  static generateRandomArray<T>(generator: () => T, length = 5): T[] {
    return Array.from({ length }, generator);
  }

  static generateRandomDate(start = new Date(2020, 0, 1), end = new Date()): Date {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }
}

/**
 * Global test setup and teardown
 */
export function setupGlobalTestEnvironment() {
  let testEnv: TestEnvironment;

  beforeEach(() => {
    testEnv = createTestEnvironment();
    // Extend expect with custom matchers
    expect.extend(customMatchers);
  });

  afterEach(() => {
    testEnv?.cleanup();
  });

  return () => testEnv;
}