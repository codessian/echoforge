/**
 * MetricsEngine Tests
 * 
 * Comprehensive test suite for the MetricsEngine class
 */

import { MetricsEngine, MetricDefinition, AlertRule } from './MetricsEngine';

describe('MetricsEngine', () => {
  let metricsEngine: MetricsEngine;

  beforeEach(async () => {
    metricsEngine = new MetricsEngine({
      enableAlerting: true,
      enablePrometheusExport: true,
      maxDataPoints: 1000,
      retentionPeriod: 60000, // 1 minute for testing
    });
    await metricsEngine.initialize();
  });

  afterEach(async () => {
    await metricsEngine.shutdown();
  });

  describe('Metric Registration', () => {
    it('should register a metric successfully', () => {
      const metric: MetricDefinition = {
        name: 'test_metric',
        type: 'gauge',
        description: 'Test metric',
        unit: 'count',
      };

      metricsEngine.registerMetric(metric);
      const registered = metricsEngine.getRegisteredMetrics();
      
      expect(registered).toHaveLength(1);
      expect(registered[0]).toEqual(metric);
    });

    it('should not register duplicate metrics', () => {
      const metric: MetricDefinition = {
        name: 'duplicate_metric',
        type: 'counter',
        description: 'Duplicate test',
      };

      metricsEngine.registerMetric(metric);
      metricsEngine.registerMetric(metric);
      
      const registered = metricsEngine.getRegisteredMetrics();
      expect(registered).toHaveLength(1);
    });

    it('should register multiple different metrics', () => {
      const metrics: MetricDefinition[] = [
        { name: 'metric1', type: 'gauge', description: 'First metric' },
        { name: 'metric2', type: 'counter', description: 'Second metric' },
        { name: 'metric3', type: 'histogram', description: 'Third metric' },
      ];

      metrics.forEach(metric => metricsEngine.registerMetric(metric));
      
      const registered = metricsEngine.getRegisteredMetrics();
      expect(registered).toHaveLength(3);
      expect(registered.map(m => m.name)).toEqual(['metric1', 'metric2', 'metric3']);
    });
  });

  describe('Metric Recording', () => {
    beforeEach(() => {
      metricsEngine.registerMetric({
        name: 'test_gauge',
        type: 'gauge',
        description: 'Test gauge metric',
      });
    });

    it('should record a metric value', () => {
      metricsEngine.recordMetric('test_gauge', 42);
      
      const data = metricsEngine.getMetricData('test_gauge');
      expect(data).toHaveLength(1);
      expect(data[0].value).toBe(42);
      expect(data[0].metric).toBe('test_gauge');
    });

    it('should record metric with tags', () => {
      const tags = { environment: 'test', component: 'engine' };
      metricsEngine.recordMetric('test_gauge', 100, tags);
      
      const data = metricsEngine.getMetricData('test_gauge');
      expect(data[0].tags).toEqual(tags);
    });

    it('should record multiple values for the same metric', () => {
      metricsEngine.recordMetric('test_gauge', 10);
      metricsEngine.recordMetric('test_gauge', 20);
      metricsEngine.recordMetric('test_gauge', 30);
      
      const data = metricsEngine.getMetricData('test_gauge');
      expect(data).toHaveLength(3);
      expect(data.map(d => d.value)).toEqual([10, 20, 30]);
    });

    it('should handle recording for unregistered metrics', () => {
      expect(() => {
        metricsEngine.recordMetric('unregistered_metric', 42);
      }).not.toThrow();
      
      // Should auto-register the metric
      const registered = metricsEngine.getRegisteredMetrics();
      expect(registered.some(m => m.name === 'unregistered_metric')).toBe(true);
    });
  });

  describe('Data Retrieval', () => {
    beforeEach(() => {
      metricsEngine.registerMetric({
        name: 'retrieval_test',
        type: 'gauge',
        description: 'Test metric for retrieval',
      });
      
      // Record some test data
      metricsEngine.recordMetric('retrieval_test', 10);
      metricsEngine.recordMetric('retrieval_test', 20);
      metricsEngine.recordMetric('retrieval_test', 30);
    });

    it('should retrieve all data for a metric', () => {
      const data = metricsEngine.getMetricData('retrieval_test');
      expect(data).toHaveLength(3);
    });

    it('should retrieve data since a specific timestamp', () => {
      const now = Date.now();
      
      // Record additional data after timestamp
      setTimeout(() => {
        metricsEngine.recordMetric('retrieval_test', 40);
        
        const recentData = metricsEngine.getMetricData('retrieval_test', now);
        expect(recentData).toHaveLength(1);
        expect(recentData[0].value).toBe(40);
      }, 10);
    });

    it('should return empty array for non-existent metric', () => {
      const data = metricsEngine.getMetricData('non_existent');
      expect(data).toEqual([]);
    });
  });

  describe('Aggregation', () => {
    beforeEach(() => {
      metricsEngine.registerMetric({
        name: 'aggregation_test',
        type: 'gauge',
        description: 'Test metric for aggregation',
      });
      
      // Record test data
      [10, 20, 30, 40, 50].forEach(value => {
        metricsEngine.recordMetric('aggregation_test', value);
      });
    });

    it('should calculate correct aggregations', () => {
      const aggregated = metricsEngine.getAggregatedMetrics('aggregation_test');
      
      expect(aggregated).toBeDefined();
      expect(aggregated!.count).toBe(5);
      expect(aggregated!.sum).toBe(150);
      expect(aggregated!.avg).toBe(30);
      expect(aggregated!.min).toBe(10);
      expect(aggregated!.max).toBe(50);
    });

    it('should return null for non-existent metric', () => {
      const aggregated = metricsEngine.getAggregatedMetrics('non_existent');
      expect(aggregated).toBeNull();
    });

    it('should calculate aggregations for time range', () => {
      const now = Date.now();
      const oneMinuteAgo = now - 60000;
      
      const aggregated = metricsEngine.getAggregatedMetrics('aggregation_test', oneMinuteAgo);
      expect(aggregated).toBeDefined();
      expect(aggregated!.count).toBe(5);
    });
  });

  describe('Alerting', () => {
    beforeEach(() => {
      metricsEngine.registerMetric({
        name: 'alert_test',
        type: 'gauge',
        description: 'Test metric for alerting',
      });
    });

    it('should create an alert rule', () => {
      const alertRule: AlertRule = {
        id: 'test_alert',
        metric: 'alert_test',
        condition: 'greater_than',
        threshold: 100,
        severity: 'warning',
        description: 'Test alert',
      };

      metricsEngine.createAlertRule(alertRule);
      
      const rules = metricsEngine.getAlertRules();
      expect(rules).toHaveLength(1);
      expect(rules[0]).toEqual(alertRule);
    });

    it('should trigger alert when threshold is exceeded', (done) => {
      const alertRule: AlertRule = {
        id: 'threshold_alert',
        metric: 'alert_test',
        condition: 'greater_than',
        threshold: 50,
        severity: 'critical',
        description: 'Threshold exceeded',
      };

      metricsEngine.createAlertRule(alertRule);
      
      metricsEngine.on('alert_triggered', (alert) => {
        expect(alert.rule.id).toBe('threshold_alert');
        expect(alert.value).toBe(100);
        done();
      });
      
      metricsEngine.recordMetric('alert_test', 100);
    });

    it('should resolve alert when condition is no longer met', (done) => {
      const alertRule: AlertRule = {
        id: 'resolve_alert',
        metric: 'alert_test',
        condition: 'greater_than',
        threshold: 50,
        severity: 'warning',
        description: 'Resolve test',
      };

      metricsEngine.createAlertRule(alertRule);
      
      let alertTriggered = false;
      
      metricsEngine.on('alert_triggered', () => {
        alertTriggered = true;
      });
      
      metricsEngine.on('alert_resolved', (alert) => {
        expect(alertTriggered).toBe(true);
        expect(alert.rule.id).toBe('resolve_alert');
        done();
      });
      
      // Trigger alert
      metricsEngine.recordMetric('alert_test', 100);
      
      // Resolve alert
      setTimeout(() => {
        metricsEngine.recordMetric('alert_test', 30);
      }, 10);
    });

    it('should delete alert rule', () => {
      const alertRule: AlertRule = {
        id: 'delete_test',
        metric: 'alert_test',
        condition: 'less_than',
        threshold: 10,
        severity: 'info',
        description: 'Delete test',
      };

      metricsEngine.createAlertRule(alertRule);
      expect(metricsEngine.getAlertRules()).toHaveLength(1);
      
      metricsEngine.deleteAlertRule('delete_test');
      expect(metricsEngine.getAlertRules()).toHaveLength(0);
    });
  });

  describe('Health Status', () => {
    it('should return healthy status initially', () => {
      const health = metricsEngine.getHealthStatus();
      
      expect(health.status).toBe('healthy');
      expect(health.uptime).toBeGreaterThan(0);
      expect(health.metrics.totalMetrics).toBe(0);
      expect(health.metrics.totalDataPoints).toBe(0);
    });

    it('should update health status with metrics', () => {
      metricsEngine.registerMetric({
        name: 'health_test',
        type: 'counter',
        description: 'Health test metric',
      });
      
      metricsEngine.recordMetric('health_test', 1);
      metricsEngine.recordMetric('health_test', 2);
      
      const health = metricsEngine.getHealthStatus();
      expect(health.metrics.totalMetrics).toBe(1);
      expect(health.metrics.totalDataPoints).toBe(2);
    });
  });

  describe('Prometheus Export', () => {
    beforeEach(() => {
      metricsEngine.registerMetric({
        name: 'prometheus_test',
        type: 'gauge',
        description: 'Prometheus export test',
        unit: 'bytes',
      });
      
      metricsEngine.recordMetric('prometheus_test', 1024, { type: 'memory' });
    });

    it('should export metrics in Prometheus format', () => {
      const prometheusData = metricsEngine.exportPrometheusMetrics();
      
      expect(prometheusData).toContain('# HELP prometheus_test Prometheus export test');
      expect(prometheusData).toContain('# TYPE prometheus_test gauge');
      expect(prometheusData).toContain('prometheus_test{type="memory"} 1024');
    });

    it('should handle metrics without tags', () => {
      metricsEngine.registerMetric({
        name: 'no_tags_test',
        type: 'counter',
        description: 'No tags test',
      });
      
      metricsEngine.recordMetric('no_tags_test', 5);
      
      const prometheusData = metricsEngine.exportPrometheusMetrics();
      expect(prometheusData).toContain('no_tags_test 5');
    });
  });

  describe('Data Retention', () => {
    it('should clean up old data based on retention period', (done) => {
      // Create engine with very short retention period
      const shortRetentionEngine = new MetricsEngine({
        retentionPeriod: 100, // 100ms
        cleanupInterval: 50, // 50ms
      });
      
      shortRetentionEngine.initialize().then(() => {
        shortRetentionEngine.registerMetric({
          name: 'retention_test',
          type: 'gauge',
          description: 'Retention test',
        });
        
        shortRetentionEngine.recordMetric('retention_test', 42);
        
        // Check data exists initially
        expect(shortRetentionEngine.getMetricData('retention_test')).toHaveLength(1);
        
        // Wait for cleanup
        setTimeout(() => {
          const data = shortRetentionEngine.getMetricData('retention_test');
          expect(data).toHaveLength(0);
          
          shortRetentionEngine.shutdown().then(() => done());
        }, 200);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid metric names gracefully', () => {
      expect(() => {
        metricsEngine.recordMetric('', 42);
      }).not.toThrow();
    });

    it('should handle invalid metric values gracefully', () => {
      metricsEngine.registerMetric({
        name: 'error_test',
        type: 'gauge',
        description: 'Error test',
      });
      
      expect(() => {
        metricsEngine.recordMetric('error_test', NaN);
      }).not.toThrow();
      
      expect(() => {
        metricsEngine.recordMetric('error_test', Infinity);
      }).not.toThrow();
    });

    it('should emit error events for critical failures', (done) => {
      metricsEngine.on('error', (error) => {
        expect(error).toBeInstanceOf(Error);
        done();
      });
      
      // Simulate a critical error
      (metricsEngine as any).emit('error', new Error('Test error'));
    });
  });
});