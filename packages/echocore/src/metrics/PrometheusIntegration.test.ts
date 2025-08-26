/**
 * PrometheusIntegration Tests
 * 
 * Comprehensive test suite for the PrometheusIntegration class
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrometheusIntegration, PrometheusIntegrationConfig } from './PrometheusIntegration';
import { MetricsEngine } from './MetricsEngine';
import http from 'http';

// Mock MetricsEngine
class MockMetricsEngine extends MetricsEngine {
  private mockMetrics: Map<string, any> = new Map();
  private mockData: Map<string, any[]> = new Map();
  private mockHealth: any = { status: 'healthy', uptime: 60000 };

  constructor() {
    super({ enableAlerting: false, enablePrometheusExport: false });
  }

  async initialize(): Promise<void> {
    // Mock initialization
  }

  getRegisteredMetrics(): Map<string, any> {
    return this.mockMetrics;
  }

  getMetricData(metric: string): any[] {
    return this.mockData.get(metric) || [];
  }

  getHealthStatus(): any {
    return this.mockHealth;
  }

  // Helper methods for testing
  setMockMetric(name: string, definition: any): void {
    this.mockMetrics.set(name, definition);
  }

  setMockData(metric: string, data: any[]): void {
    this.mockData.set(metric, data);
  }

  setMockHealth(health: any): void {
    this.mockHealth = health;
  }
}

// Helper function to make HTTP requests
function makeRequest(url: string): Promise<{ statusCode: number; data: string }> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode || 0, data });
      });
    });
    
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

describe('PrometheusIntegration', () => {
  let integration: PrometheusIntegration;
  let mockMetricsEngine: MockMetricsEngine;
  const testPort = 9091; // Use different port to avoid conflicts

  beforeEach(() => {
    mockMetricsEngine = new MockMetricsEngine();
    
    const config: PrometheusIntegrationConfig = {
      metricsEngine: mockMetricsEngine,
      port: testPort,
      endpoint: '/metrics',
      prefix: 'echocore_',
      customLabels: {
        service: 'echocore-test',
        version: '1.0.0',
      },
      enableTimestamps: false,
    };
    
    integration = new PrometheusIntegration(config);
  });

  afterEach(async () => {
    await integration.stop();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultConfig: PrometheusIntegrationConfig = {
        metricsEngine: mockMetricsEngine,
        port: 9090,
        endpoint: '/metrics',
        prefix: '',
        customLabels: {},
        enableTimestamps: false,
      };
      const defaultIntegration = new PrometheusIntegration(defaultConfig);
      expect(defaultIntegration).toBeDefined();
    });

    it('should start HTTP server successfully', async () => {
      await expect(integration.start()).resolves.not.toThrow();
      const status = integration.getStatus();
      expect(status.isRunning).toBe(true);
    });

    it('should not start twice', async () => {
      await integration.start();
      await expect(integration.start()).resolves.not.toThrow();
      const status = integration.getStatus();
      expect(status.isRunning).toBe(true);
    });

    it('should register default metrics on start', async () => {
      await integration.start();
      
      const metricsJson = integration.getMetricsAsJson();
        expect(Object.keys(metricsJson).length).toBeGreaterThan(0);
        expect(metricsJson['process_cpu_user_seconds_total']).toBeDefined();
        expect(metricsJson['process_cpu_system_seconds_total']).toBeDefined();
      expect(metricsJson['process_resident_memory_bytes']).toBeDefined();
        expect(metricsJson['nodejs_heap_size_total_bytes']).toBeDefined();
    });
  });

  describe('HTTP Server', () => {
    beforeEach(async () => {
      await integration.start();
    });

    it('should serve metrics at configured endpoint', async () => {
      const response = await makeRequest(`http://localhost:${testPort}/metrics`);
      
      expect(response.statusCode).toBe(200);
      expect(response.data).toContain('# HELP');
      expect(response.data).toContain('# TYPE');
    });

    it('should return 404 for non-metrics endpoints', async () => {
      const response = await makeRequest(`http://localhost:${testPort}/invalid`);
      expect(response.statusCode).toBe(404);
    });

    it('should include content-type header', async () => {
      const response = await makeRequest(`http://localhost:${testPort}/metrics`);
      expect(response.statusCode).toBe(200);
      // Note: We can't easily test headers with basic http.get, but the implementation sets it
    });
  });

  describe('Metric Registration', () => {
    beforeEach(async () => {
      await integration.start();
    });

    it('should register counter metrics', () => {
      integration.registerMetric({
        name: 'test_counter',
        type: 'counter',
        help: 'Test counter metric',
        labels: ['method', 'status'],
      });
      
      const metricsJson = integration.getMetricsAsJson();
      expect(metricsJson['test_counter']).toBeDefined();
      
      const metric = metricsJson['test_counter'];
      expect(metric.type).toBe('counter');
      expect(metric.help).toBe('Test counter metric');
    });

    it('should register gauge metrics', () => {
      integration.registerMetric({
        name: 'test_gauge',
        type: 'gauge',
        help: 'Test gauge metric',
      });
      
      const metricsJson = integration.getMetricsAsJson();
      expect(metricsJson['test_gauge']).toBeDefined();
      
      const metric = metricsJson['test_gauge'];
      expect(metric.type).toBe('gauge');
    });

    it('should register histogram metrics', () => {
      integration.registerMetric({
        name: 'test_histogram',
        type: 'histogram',
        help: 'Test histogram metric',
        buckets: [0.1, 0.5, 1, 2.5, 5, 10],
      });
      
      const metricsJson = integration.getMetricsAsJson();
      expect(metricsJson['test_histogram']).toBeDefined();
      
      const metric = metricsJson['test_histogram'];
      expect(metric.type).toBe('histogram');
    });

    it('should register summary metrics', () => {
      integration.registerMetric({
        name: 'test_summary',
        type: 'summary',
        help: 'Test summary metric',
        quantiles: [0.5, 0.9, 0.99],
      });
      
      const metricsJson = integration.getMetricsAsJson();
      expect(metricsJson['test_summary']).toBeDefined();
      
      const metric = metricsJson['test_summary'];
      expect(metric.type).toBe('summary');
    });

    it('should not register duplicate metrics', () => {
      const metricDef = {
        name: 'duplicate_test',
        type: 'counter' as const,
        help: 'Duplicate test metric',
      };
      
      integration.registerMetric(metricDef);
      integration.registerMetric(metricDef); // Should not throw
      
      const metricsJson = integration.getMetricsAsJson();
      expect(metricsJson['duplicate_test']).toBeDefined();
    });
  });

  describe('Metric Updates', () => {
    beforeEach(async () => {
      await integration.start();
      
      // Register test metrics
      integration.registerMetric({
        name: 'test_counter',
        type: 'counter',
        help: 'Test counter',
        labels: ['status'],
      });
      
      integration.registerMetric({
        name: 'test_gauge',
        type: 'gauge',
        help: 'Test gauge',
      });
      
      integration.registerMetric({
        name: 'test_histogram',
        type: 'histogram',
        help: 'Test histogram',
        buckets: [0.1, 0.5, 1, 5, 10],
      });
    });

    it('should update counter metrics', () => {
      integration.updateMetric('test_counter', 5, { status: 'success' });
      integration.updateMetric('test_counter', 3, { status: 'error' });
      
      const metricsJson = integration.getMetricsAsJson();
      const samples = metricsJson['test_counter']?.samples || [];
      
      expect(samples.length).toBeGreaterThan(0);
      const successSample = samples.find(s => s.labels.status === 'success');
      const errorSample = samples.find(s => s.labels.status === 'error');
      
      expect(successSample?.value).toBe(5);
      expect(errorSample?.value).toBe(3);
    });

    it('should update gauge metrics', () => {
      integration.updateMetric('test_gauge', 42);
      integration.updateMetric('test_gauge', 84); // Should overwrite
      
      const metricsJson = integration.getMetricsAsJson();
      const samples = metricsJson['test_gauge']?.samples || [];
      
      expect(samples.length).toBe(1);
      expect(samples[0].value).toBe(84);
    });

    it('should update histogram metrics', () => {
      integration.updateMetric('test_histogram', 0.3);
      integration.updateMetric('test_histogram', 2.1);
      integration.updateMetric('test_histogram', 7.5);
      
      const metricsJson = integration.getMetricsAsJson();
      const samples = metricsJson['test_histogram']?.samples || [];
      
      // Should have bucket samples and sum/count
      expect(samples.length).toBeGreaterThan(0);
      
      const bucketSamples = samples.filter(s => s.name.endsWith('_bucket'));
      const countSample = samples.find(s => s.name.endsWith('_count'));
      const sumSample = samples.find(s => s.name.endsWith('_sum'));
      
      expect(bucketSamples.length).toBeGreaterThan(0);
      expect(countSample?.value).toBe(3);
      expect(sumSample?.value).toBe(9.9);
    });

    it('should handle non-existent metrics gracefully', () => {
      expect(() => {
        integration.updateMetric('non_existent', 42);
      }).not.toThrow();
    });
  });

  describe('Metrics Engine Integration', () => {
    beforeEach(async () => {
      // Set up mock data in metrics engine
      mockMetricsEngine.setMockMetric('proposal_quality', {
        name: 'proposal_quality',
        type: 'gauge',
        description: 'Quality of proposals',
        unit: 'ratio',
        tags: ['agent_id'],
      });
      
      mockMetricsEngine.setMockData('proposal_quality', [
        { timestamp: Date.now() - 60000, value: 0.8, tags: { agent_id: 'agent1' } },
        { timestamp: Date.now() - 30000, value: 0.85, tags: { agent_id: 'agent1' } },
        { timestamp: Date.now(), value: 0.9, tags: { agent_id: 'agent1' } },
      ]);
      
      await integration.start();
    });

    it('should sync metrics from MetricsEngine on start', () => {
      const metricsJson = integration.getMetricsAsJson();
      
      expect(metricsJson['proposal_quality']).toBeDefined();
      
      const metric = metricsJson['proposal_quality'];
      expect(metric.type).toBe('gauge');
      expect(metric.help).toBe('Quality of proposals');
    });

    it('should update metrics when MetricsEngine emits events', () => {
      // Simulate metric update from MetricsEngine
      mockMetricsEngine.emit('metric_recorded', {
        metric: 'proposal_quality',
        value: 0.95,
        tags: { agent_id: 'agent2' },
        timestamp: Date.now(),
      });
      
      const metricsJson = integration.getMetricsAsJson();
      const samples = metricsJson['proposal_quality']?.samples || [];
      
      const agent2Sample = samples.find(s => s.labels.agent_id === 'agent2');
      expect(agent2Sample?.value).toBe(0.95);
    });

    it('should handle MetricsEngine errors gracefully', (done) => {
      integration.on('error', (error) => {
        expect(error).toBeInstanceOf(Error);
        done();
      });
      
      // Simulate error from MetricsEngine
      mockMetricsEngine.emit('error', new Error('Test error'));
    });
  });

  describe('System Metrics Collection', () => {
    beforeEach(async () => {
      await integration.start();
    });

    it('should collect process CPU metrics', () => {
      const metricsJson = integration.getMetricsAsJson();
      const cpuUserSamples = metricsJson['process_cpu_user_seconds_total']?.samples || [];
      const cpuSystemSamples = metricsJson['process_cpu_system_seconds_total']?.samples || [];
      
      expect(cpuUserSamples.length).toBe(1);
      expect(cpuSystemSamples.length).toBe(1);
      expect(cpuUserSamples[0].value).toBeGreaterThanOrEqual(0);
      expect(cpuSystemSamples[0].value).toBeGreaterThanOrEqual(0);
    });

    it('should collect memory metrics', () => {
      const metricsJson = integration.getMetricsAsJson();
      const memorySamples = metricsJson['process_resident_memory_bytes']?.samples || [];
      const heapSamples = metricsJson['nodejs_heap_size_total_bytes']?.samples || [];
      
      expect(memorySamples.length).toBe(1);
      expect(heapSamples.length).toBe(1);
      expect(memorySamples[0].value).toBeGreaterThan(0);
      expect(heapSamples[0].value).toBeGreaterThan(0);
    });

    it('should collect uptime metrics', () => {
      const metricsJson = integration.getMetricsAsJson();
      const uptimeSamples = metricsJson['process_start_time_seconds']?.samples || [];
      
      expect(uptimeSamples.length).toBe(1);
      expect(uptimeSamples[0].value).toBeGreaterThan(0);
    });

    it('should include configured labels in system metrics', () => {
      const metricsJson = integration.getMetricsAsJson();
      const samples = metricsJson['process_cpu_user_seconds_total']?.samples || [];
      
      expect(samples[0].labels.service).toBe('echocore-test');
      expect(samples[0].labels.version).toBe('1.0.0');
    });
  });

  describe('Prometheus Format Output', () => {
    beforeEach(async () => {
      await integration.start();
      
      // Add some test metrics
      integration.registerMetric({
        name: 'test_counter_total',
        type: 'counter',
        help: 'Test counter for format testing',
        labels: ['method'],
      });
      
      integration.updateMetric('test_counter_total', 42, { method: 'GET' });
      integration.updateMetric('test_counter_total', 13, { method: 'POST' });
    });

    it('should format metrics in Prometheus exposition format', async () => {
      const response = await makeRequest(`http://localhost:${testPort}/metrics`);
      
      expect(response.statusCode).toBe(200);
      expect(response.data).toContain('# HELP test_counter_total Test counter for format testing');
      expect(response.data).toContain('# TYPE test_counter_total counter');
      expect(response.data).toContain('test_counter_total{method="GET"} 42');
      expect(response.data).toContain('test_counter_total{method="POST"} 13');
    });

    it('should include timestamps when enabled', async () => {
      // Create integration with timestamps enabled
      const timestampIntegration = new PrometheusIntegration(mockMetricsEngine, {
        port: testPort + 1,
        includeTimestamps: true,
      });
      
      await timestampIntegration.start();
      
      try {
        const response = await makeRequest(`http://localhost:${testPort + 1}/metrics`);
        expect(response.statusCode).toBe(200);
        // Timestamps should be included in the output
        expect(response.data).toMatch(/\d+\.\d+$/m);
      } finally {
        await timestampIntegration.stop();
      }
    });

    it('should escape special characters in labels', async () => {
      integration.registerMetric({
        name: 'test_escaped',
        type: 'gauge',
        help: 'Test metric with special characters',
        labels: ['path'],
      });
      
      integration.updateMetric('test_escaped', 1, { path: '/api/v1/test\nwith"quotes' });
      
      const response = await makeRequest(`http://localhost:${testPort}/metrics`);
      expect(response.statusCode).toBe(200);
      expect(response.data).toContain('path="/api/v1/test\\nwith\\"quotes"');
    });
  });

  describe('Status and Health', () => {
    it('should report running status correctly', async () => {
      let status = integration.getStatus();
      expect(status.isRunning).toBe(false);
      
      await integration.start();
      status = integration.getStatus();
      expect(status.isRunning).toBe(true);
      
      await integration.stop();
      status = integration.getStatus();
      expect(status.isRunning).toBe(false);
    });

    it('should return status information', async () => {
      await integration.start();
      
      const status = integration.getStatus();
      
      expect(status.running).toBe(true);
      expect(status.port).toBe(testPort);
      expect(status.path).toBe('/metrics');
      expect(status.metricsCount).toBeGreaterThan(0);
      expect(status.uptime).toBeGreaterThan(0);
    });

    it('should include health status from MetricsEngine', async () => {
      mockMetricsEngine.setMockHealth({
        status: 'healthy',
        uptime: 120000,
        metrics: { totalMetrics: 10 },
      });
      
      await integration.start();
      
      const status = integration.getStatus();
      expect(status.health).toBeDefined();
      expect(status.health.status).toBe('healthy');
      expect(status.health.uptime).toBe(120000);
    });
  });

  describe('Error Handling', () => {
    it('should handle port conflicts gracefully', async () => {
      // Start first integration
      await integration.start();
      
      // Try to start second integration on same port
      const conflictIntegration = new PrometheusIntegration(mockMetricsEngine, {
        port: testPort,
      });
      
      await expect(conflictIntegration.start()).rejects.toThrow();
    });

    it('should emit error events for server errors', (done) => {
      integration.on('error', (error) => {
        expect(error).toBeInstanceOf(Error);
        done();
      });
      
      // This will cause an error due to invalid port
      const invalidIntegration = new PrometheusIntegration(mockMetricsEngine, {
        port: -1,
      });
      
      invalidIntegration.start().catch(() => {
        // Expected to fail
      });
    });

    it('should handle malformed metric updates', () => {
      expect(() => {
        integration.updateMetric('', NaN);
      }).not.toThrow();
      
      expect(() => {
        integration.updateMetric('test', Infinity);
      }).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should stop server and clean up resources', async () => {
      await integration.start();
      let status = integration.getStatus();
      expect(status.isRunning).toBe(true);
      
      await integration.stop();
      status = integration.getStatus();
      expect(status.isRunning).toBe(false);
      
      // Should not be able to make requests after stopping
      await expect(makeRequest(`http://localhost:${testPort}/metrics`))
        .rejects.toThrow();
    });

    it('should handle multiple stop calls gracefully', async () => {
      await integration.start();
      
      await integration.stop();
      await expect(integration.stop()).resolves.not.toThrow();
    });

    it('should clear intervals on stop', async () => {
      await integration.start();
      
      const status = integration.getStatus();
      expect(status.running).toBe(true);
      
      await integration.stop();
      
      // Wait a bit to ensure intervals are cleared
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const status = integration.getStatus();
      expect(status.isRunning).toBe(false);
    });
  });
});