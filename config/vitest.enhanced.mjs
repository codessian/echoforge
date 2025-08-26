/**
 * Enhanced Vitest Configuration for EchoForge Platform
 * Provides comprehensive testing setup with advanced features
 */

import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { fileURLToPath, URL } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  test: {
    // Environment
    environment: 'node',
    globals: true,
    
    // Test Discovery
    include: [
      '**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      '**/tests/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      '**/__tests__/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      '**/.nyc_output/**',
      '**/cypress/**',
      '**/e2e/**',
      '**/.git/**',
      '**/tmp/**',
      '**/temp/**'
    ],
    
    // Timeouts
    testTimeout: 30000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    
    // Parallel Execution
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 4,
        useAtomics: true
      }
    },
    
    // Coverage Configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'coverage/**',
        'dist/**',
        'build/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/*.test.*',
        '**/*.spec.*',
        '**/node_modules/**',
        '**/test/**',
        '**/tests/**',
        '**/__tests__/**',
        '**/.next/**'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      },
      all: true,
      skipFull: false
    },
    
    // Setup Files
    setupFiles: [
      resolve(__dirname, 'global-test-setup.ts'),
      resolve(__dirname, 'test-setup.ts')
    ],
    
    // Reporters
    reporter: [
      'default',
      'json',
      'html'
    ],
    outputFile: {
      json: './test-results/results.json',
      html: './test-results/index.html'
    },
    
    // Watch Options
    watch: false,
    watchExclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**'
    ],
    
    // Mocking
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
    
    // Performance
    logHeapUsage: true,
    
    // Advanced Options
    isolate: true,
    passWithNoTests: true,
    allowOnly: process.env.NODE_ENV !== 'ci',
    
    // Retry Configuration
    retry: process.env.CI ? 2 : 0,
    
    // Bail Configuration
    bail: process.env.CI ? 1 : 0,
    
    // Silent Mode
    silent: false,
    
    // UI Configuration
    ui: false,
    open: false,
    
    // Benchmark Configuration
    benchmark: {
      include: ['**/*.{bench,benchmark}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**'
      ],
      reporter: ['default', 'json'],
      outputFile: {
        json: './test-results/benchmark.json'
      }
    },
    
    // Type Checking
    typecheck: {
      enabled: true,
      tsconfig: resolve(__dirname, '../tsconfig.base.json'),
      include: [
        '**/*.{test,spec}.{ts,tsx}',
        '**/tests/**/*.{ts,tsx}',
        '**/__tests__/**/*.{ts,tsx}'
      ]
    },
    
    // Projects Configuration
      projects: [
        {
          test: {
            name: 'packages',
            include: ['packages/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}']
          }
        },
        {
          test: {
            name: 'apps',
            include: ['apps/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}']
          }
        },
        {
          test: {
            name: 'tests',
            include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}']
          }
        }
      ]
  },
  
  // Resolve Configuration
  resolve: {
    alias: {
      '@': resolve(__dirname, '../src'),
      '@packages': resolve(__dirname, '../packages'),
      '@apps': resolve(__dirname, '../apps'),
      '@config': resolve(__dirname, '../config'),
      '@tests': resolve(__dirname, '../tests')
    }
  },
  
  // Define Configuration
  define: {
    __TEST__: true,
    __DEV__: process.env.NODE_ENV === 'development'
  }
});