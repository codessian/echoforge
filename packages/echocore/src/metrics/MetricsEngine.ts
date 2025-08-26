/**
 * MetricsEngine - Core metrics collection and management system
 * 
 * Provides a unified interface for collecting, storing, and querying metrics
 * across the EchoForge platform with support for real-time monitoring,
 * alerting, and observability.
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Metric definition interface
 */
export interface MetricDefinition {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  description: string;
  unit?: string;
  labels?: string[];
}

/**
 * Metric data point
 */
export interface MetricDataPoint {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
  labels?: Record<string, string>;
}

/**
 * Aggregated metric result
 */
export interface AggregatedMetric {
  name: string;
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  percentiles?: Record<string, number>;
  tags?: Record<string, string>;
}

/**
 * Alert rule configuration
 */
export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration: number; // milliseconds
  enabled: boolean;
  tags?: Record<string, string>;
}

/**
 * Alert event
 */
export interface AlertEvent {
  ruleId: string;
  ruleName: string;
  metric: string;
  value: number;
  threshold: number;
  condition: string;
  timestamp: number;
  resolved: boolean;
  tags?: Record<string, string>;
}

/**
 * MetricsEngine configuration
 */
export interface MetricsEngineConfig {
  /** Storage directory for metrics data */
  storageDir?: string;
  
  /** Maximum number of data points to keep in memory */
  maxDataPoints?: number;
  
  /** Data retention period in milliseconds */
  retentionPeriod?: number;
  
  /** Flush interval for persisting data */
  flushInterval?: number;
  
  /** Enable real-time alerting */
  enableAlerting?: boolean;
  
  /** Enable Prometheus-compatible metrics export */
  enablePrometheusExport?: boolean;
  
  /** Prometheus export port */
  prometheusPort?: number;
}

/**
 * Core metrics engine for collecting and managing metrics
 */
export class MetricsEngine extends EventEmitter {
  private config: MetricsEngineConfig;
  private metrics: Map<string, MetricDefinition> = new Map();
  private dataPoints: MetricDataPoint[] = [];
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, AlertEvent> = new Map();
  private flushTimer?: NodeJS.Timeout;
  private initialized: boolean = false;

  constructor(config: MetricsEngineConfig = {}) {
    super();
    this.config = {
      storageDir: config.storageDir || './metrics',
      maxDataPoints: config.maxDataPoints || 10000,
      retentionPeriod: config.retentionPeriod || 7 * 24 * 60 * 60 * 1000, // 7 days
      flushInterval: config.flushInterval || 60000, // 1 minute
      enableAlerting: config.enableAlerting ?? true,
      enablePrometheusExport: config.enablePrometheusExport ?? false,
      prometheusPort: config.prometheusPort || 9090,
    };
  }

  /**
   * Initialize the metrics engine
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Ensure storage directory exists
      if (this.config.storageDir) {
        await fs.mkdir(this.config.storageDir, { recursive: true });
      }

      // Load persisted metrics definitions
      await this.loadMetricsDefinitions();

      // Load alert rules
      await this.loadAlertRules();

      // Start flush timer
      this.startFlushTimer();

      // Initialize Prometheus export if enabled
      if (this.config.enablePrometheusExport) {
        await this.initializePrometheusExport();
      }

      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Register a new metric
   */
  registerMetric(definition: MetricDefinition): void {
    this.metrics.set(definition.name, definition);
    this.emit('metric_registered', definition);
  }

  /**
   * Record a metric data point
   */
  record(name: string, value: number, tags?: Record<string, string>): void {
    const dataPoint: MetricDataPoint = {
      name,
      value,
      timestamp: Date.now(),
      tags,
    };

    this.dataPoints.push(dataPoint);

    // Trim data points if we exceed the limit
    if (this.dataPoints.length > this.config.maxDataPoints!) {
      this.dataPoints = this.dataPoints.slice(-this.config.maxDataPoints!);
    }

    // Check alert rules
    if (this.config.enableAlerting) {
      this.checkAlertRules(dataPoint);
    }

    this.emit('metric_recorded', dataPoint);
  }

  /**
   * Get metric data points for a specific metric
   */
  getMetricData(name: string, since?: number): MetricDataPoint[] {
    const sinceTimestamp = since || (Date.now() - this.config.retentionPeriod!);
    return this.dataPoints.filter(
      point => point.name === name && point.timestamp >= sinceTimestamp
    );
  }

  /**
   * Get aggregated metrics for a specific metric
   */
  getAggregatedMetrics(name: string, since?: number): AggregatedMetric | null {
    const data = this.getMetricData(name, since);
    if (data.length === 0) {
      return null;
    }

    const values = data.map(point => point.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Calculate percentiles
    const sortedValues = [...values].sort((a, b) => a - b);
    const percentiles = {
      p50: this.calculatePercentile(sortedValues, 0.5),
      p90: this.calculatePercentile(sortedValues, 0.9),
      p95: this.calculatePercentile(sortedValues, 0.95),
      p99: this.calculatePercentile(sortedValues, 0.99),
    };

    return {
      name,
      count: data.length,
      sum,
      avg,
      min,
      max,
      percentiles,
    };
  }

  /**
   * Add an alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    this.emit('alert_rule_added', rule);
  }

  /**
   * Remove an alert rule
   */
  removeAlertRule(ruleId: string): void {
    const rule = this.alertRules.get(ruleId);
    if (rule) {
      this.alertRules.delete(ruleId);
      this.emit('alert_rule_removed', rule);
    }
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): AlertEvent[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusMetrics(): string {
    const lines: string[] = [];
    
    // Group data points by metric name
    const metricGroups = new Map<string, MetricDataPoint[]>();
    for (const point of this.dataPoints) {
      if (!metricGroups.has(point.name)) {
        metricGroups.set(point.name, []);
      }
      metricGroups.get(point.name)!.push(point);
    }

    // Generate Prometheus format
    for (const [metricName, points] of metricGroups) {
      const definition = this.metrics.get(metricName);
      if (definition) {
        lines.push(`# HELP ${metricName} ${definition.description}`);
        lines.push(`# TYPE ${metricName} ${definition.type}`);
      }

      // Get latest value for each unique tag combination
      const latestValues = new Map<string, MetricDataPoint>();
      for (const point of points) {
        const tagKey = JSON.stringify(point.tags || {});
        if (!latestValues.has(tagKey) || point.timestamp > latestValues.get(tagKey)!.timestamp) {
          latestValues.set(tagKey, point);
        }
      }

      for (const point of latestValues.values()) {
        const tags = point.tags ? Object.entries(point.tags)
          .map(([key, value]) => `${key}="${value}"`)
          .join(',') : '';
        const tagString = tags ? `{${tags}}` : '';
        lines.push(`${metricName}${tagString} ${point.value} ${point.timestamp}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Get health status of the metrics engine
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: {
      totalMetrics: number;
      totalDataPoints: number;
      activeAlerts: number;
      memoryUsage: number;
    };
  } {
    const memoryUsage = process.memoryUsage();
    const activeAlertsCount = this.getActiveAlerts().length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (activeAlertsCount > 10) {
      status = 'degraded';
    }
    if (activeAlertsCount > 50 || memoryUsage.heapUsed > 500 * 1024 * 1024) {
      status = 'unhealthy';
    }

    return {
      status,
      metrics: {
        totalMetrics: this.metrics.size,
        totalDataPoints: this.dataPoints.length,
        activeAlerts: activeAlertsCount,
        memoryUsage: memoryUsage.heapUsed,
      },
    };
  }

  /**
   * Shutdown the metrics engine
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    // Flush remaining data
    await this.flushData();

    this.emit('shutdown');
  }

  // Private methods

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    const index = Math.ceil(sortedValues.length * percentile) - 1;
    return sortedValues[Math.max(0, index)];
  }

  private checkAlertRules(dataPoint: MetricDataPoint): void {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled || rule.metric !== dataPoint.name) {
        continue;
      }

      const shouldAlert = this.evaluateAlertCondition(rule, dataPoint.value);
      const alertKey = `${rule.id}_${JSON.stringify(dataPoint.tags || {})}`;
      const existingAlert = this.activeAlerts.get(alertKey);

      if (shouldAlert && !existingAlert) {
        // Create new alert
        const alert: AlertEvent = {
          ruleId: rule.id,
          ruleName: rule.name,
          metric: rule.metric,
          value: dataPoint.value,
          threshold: rule.threshold,
          condition: rule.condition,
          timestamp: dataPoint.timestamp,
          resolved: false,
          tags: dataPoint.tags,
        };
        
        this.activeAlerts.set(alertKey, alert);
        this.emit('alert_triggered', alert);
      } else if (!shouldAlert && existingAlert && !existingAlert.resolved) {
        // Resolve existing alert
        existingAlert.resolved = true;
        this.emit('alert_resolved', existingAlert);
      }
    }
  }

  private evaluateAlertCondition(rule: AlertRule, value: number): boolean {
    switch (rule.condition) {
      case 'gt': return value > rule.threshold;
      case 'gte': return value >= rule.threshold;
      case 'lt': return value < rule.threshold;
      case 'lte': return value <= rule.threshold;
      case 'eq': return value === rule.threshold;
      default: return false;
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(async () => {
      try {
        await this.flushData();
      } catch (error) {
        this.emit('error', error);
      }
    }, this.config.flushInterval);
  }

  private async flushData(): Promise<void> {
    if (!this.config.storageDir || this.dataPoints.length === 0) {
      return;
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = path.join(this.config.storageDir, `metrics-${timestamp}.json`);
      
      const data = {
        timestamp: Date.now(),
        dataPoints: this.dataPoints,
        metrics: Array.from(this.metrics.values()),
      };

      await fs.writeFile(filename, JSON.stringify(data, null, 2));
      this.emit('data_flushed', { filename, count: this.dataPoints.length });

      // Clean up old data points
      const cutoff = Date.now() - this.config.retentionPeriod!;
      this.dataPoints = this.dataPoints.filter(point => point.timestamp >= cutoff);
    } catch (error) {
      this.emit('error', error);
    }
  }

  private async loadMetricsDefinitions(): Promise<void> {
    if (!this.config.storageDir) {
      return;
    }

    try {
      const definitionsFile = path.join(this.config.storageDir, 'metrics-definitions.json');
      const data = await fs.readFile(definitionsFile, 'utf-8');
      const definitions: MetricDefinition[] = JSON.parse(data);
      
      for (const definition of definitions) {
        this.metrics.set(definition.name, definition);
      }
    } catch (error) {
      // File doesn't exist or is invalid, start with empty definitions
    }
  }

  private async loadAlertRules(): Promise<void> {
    if (!this.config.storageDir) {
      return;
    }

    try {
      const rulesFile = path.join(this.config.storageDir, 'alert-rules.json');
      const data = await fs.readFile(rulesFile, 'utf-8');
      const rules: AlertRule[] = JSON.parse(data);
      
      for (const rule of rules) {
        this.alertRules.set(rule.id, rule);
      }
    } catch (error) {
      // File doesn't exist or is invalid, start with empty rules
    }
  }

  private async initializePrometheusExport(): Promise<void> {
    // This would typically set up an HTTP server for Prometheus scraping
    // For now, we'll just emit an event that can be handled by the application
    this.emit('prometheus_export_ready', {
      port: this.config.prometheusPort,
      endpoint: '/metrics',
    });
  }
}

/**
 * Create a new MetricsEngine instance with default configuration
 */
export function createMetricsEngine(config?: MetricsEngineConfig): MetricsEngine {
  return new MetricsEngine(config);
}

/**
 * Default metrics engine instance (singleton)
 */
let defaultInstance: MetricsEngine | null = null;

/**
 * Get the default metrics engine instance
 */
export function getDefaultMetricsEngine(): MetricsEngine {
  if (!defaultInstance) {
    defaultInstance = new MetricsEngine();
  }
  return defaultInstance;
}