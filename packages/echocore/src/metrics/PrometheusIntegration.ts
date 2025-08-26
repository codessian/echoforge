/**
 * PrometheusIntegration - Prometheus metrics export and integration
 * 
 * Provides integration with Prometheus monitoring system by exposing
 * metrics in Prometheus format and handling scraping endpoints.
 */

import { EventEmitter } from 'events';
import { MetricsEngine, MetricDataPoint, MetricDefinition } from './MetricsEngine';

/**
 * Prometheus metric types
 */
export type PrometheusMetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

/**
 * Prometheus metric configuration
 */
export interface PrometheusMetricConfig {
  name: string;
  type: PrometheusMetricType;
  help: string;
  labels?: string[];
  buckets?: number[]; // For histograms
  quantiles?: number[]; // For summaries
}

/**
 * Prometheus label set
 */
export interface PrometheusLabels {
  [key: string]: string;
}

/**
 * Prometheus metric sample
 */
export interface PrometheusMetricSample {
  name: string;
  labels: PrometheusLabels;
  value: number;
  timestamp?: number;
}

/**
 * Prometheus integration configuration
 */
export interface PrometheusIntegrationConfig {
  metricsEngine: MetricsEngine;
  prefix?: string;
  port?: number;
  endpoint?: string;
  enableTimestamps?: boolean;
  scrapeInterval?: number;
  maxMetrics?: number;
  enableHealthCheck?: boolean;
  customLabels?: PrometheusLabels;
}

/**
 * Prometheus metrics registry
 */
class PrometheusRegistry {
  private metrics: Map<string, PrometheusMetricConfig> = new Map();
  private samples: Map<string, PrometheusMetricSample[]> = new Map();

  /**
   * Register a metric
   */
  register(config: PrometheusMetricConfig): void {
    this.metrics.set(config.name, config);
    if (!this.samples.has(config.name)) {
      this.samples.set(config.name, []);
    }
  }

  /**
   * Add a sample to a metric
   */
  addSample(name: string, labels: PrometheusLabels, value: number, timestamp?: number): void {
    const samples = this.samples.get(name) || [];
    const existingIndex = samples.findIndex(s => 
      JSON.stringify(s.labels) === JSON.stringify(labels)
    );

    const sample: PrometheusMetricSample = {
      name,
      labels,
      value,
      timestamp,
    };

    if (existingIndex >= 0) {
      samples[existingIndex] = sample;
    } else {
      samples.push(sample);
    }

    this.samples.set(name, samples);
  }

  /**
   * Get all registered metrics
   */
  getMetrics(): PrometheusMetricConfig[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get samples for a metric
   */
  getSamples(name: string): PrometheusMetricSample[] {
    return this.samples.get(name) || [];
  }

  /**
   * Get all samples
   */
  getAllSamples(): Map<string, PrometheusMetricSample[]> {
    return new Map(this.samples);
  }

  /**
   * Clear all samples
   */
  clear(): void {
    this.samples.clear();
  }

  /**
   * Clear samples for a specific metric
   */
  clearMetric(name: string): void {
    this.samples.delete(name);
  }
}

/**
 * Prometheus integration for metrics export
 */
export class PrometheusIntegration extends EventEmitter {
  private config: PrometheusIntegrationConfig;
  private metricsEngine: MetricsEngine;
  private registry: PrometheusRegistry;
  private server?: any; // HTTP server instance
  private updateTimer?: NodeJS.Timeout;
  private isRunning: boolean = false;

  constructor(config: PrometheusIntegrationConfig) {
    super();
    this.config = {
      prefix: 'echoforge_',
      port: 9090,
      endpoint: '/metrics',
      enableTimestamps: true,
      scrapeInterval: 15000, // 15 seconds
      maxMetrics: 10000,
      enableHealthCheck: true,
      customLabels: {},
      ...config,
    };
    
    this.metricsEngine = config.metricsEngine;
    this.registry = new PrometheusRegistry();

    this.setupEventListeners();
    this.registerDefaultMetrics();
  }

  /**
   * Start the Prometheus integration
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    try {
      // Start HTTP server for metrics endpoint
      await this.startMetricsServer();

      // Start periodic metrics update
      this.startUpdateTimer();

      this.isRunning = true;
      this.emit('started');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Stop the Prometheus integration
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Stop update timer
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }

    // Stop HTTP server
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server.close(() => resolve());
      });
      this.server = undefined;
    }

    this.isRunning = false;
    this.emit('stopped');
  }

  /**
   * Register a custom metric
   */
  registerMetric(config: PrometheusMetricConfig): void {
    const name = this.config.prefix + config.name;
    this.registry.register({ ...config, name });
    this.emit('metric_registered', config);
  }

  /**
   * Update metric value
   */
  updateMetric(name: string, value: number, labels: PrometheusLabels = {}): void {
    const fullName = this.config.prefix + name;
    const allLabels = { ...this.config.customLabels, ...labels };
    const timestamp = this.config.enableTimestamps ? Date.now() : undefined;
    
    this.registry.addSample(fullName, allLabels, value, timestamp);
    this.emit('metric_updated', { name: fullName, value, labels: allLabels });
  }

  /**
   * Get metrics in Prometheus format
   */
  getPrometheusMetrics(): string {
    const lines: string[] = [];
    const metrics = this.registry.getMetrics();

    for (const metric of metrics) {
      // Add HELP comment
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      
      // Add TYPE comment
      lines.push(`# TYPE ${metric.name} ${metric.type}`);

      // Add samples
      const samples = this.registry.getSamples(metric.name);
      for (const sample of samples) {
        const labelStr = this.formatLabels(sample.labels);
        const timestampStr = sample.timestamp ? ` ${sample.timestamp}` : '';
        lines.push(`${sample.name}${labelStr} ${sample.value}${timestampStr}`);
      }

      lines.push(''); // Empty line between metrics
    }

    return lines.join('\n');
  }

  /**
   * Get metrics as JSON (for debugging)
   */
  getMetricsAsJson(): any {
    const result: any = {};
    const metrics = this.registry.getMetrics();

    for (const metric of metrics) {
      const samples = this.registry.getSamples(metric.name);
      result[metric.name] = {
        type: metric.type,
        help: metric.help,
        samples: samples.map(s => ({
          labels: s.labels,
          value: s.value,
          timestamp: s.timestamp,
        })),
      };
    }

    return result;
  }

  /**
   * Get integration status
   */
  getStatus(): any {
    return {
      isRunning: this.isRunning,
      port: this.config.port,
      endpoint: this.config.endpoint,
      metricsCount: this.registry.getMetrics().length,
      samplesCount: Array.from(this.registry.getAllSamples().values())
        .reduce((total, samples) => total + samples.length, 0),
      lastUpdate: Date.now(),
    };
  }

  // Private methods

  private setupEventListeners(): void {
    // Listen for metrics engine events
    this.metricsEngine.on('metric_recorded', (dataPoint: MetricDataPoint) => {
      this.handleMetricRecorded(dataPoint);
    });
  }

  private registerDefaultMetrics(): void {
    // System metrics
    this.registerMetric({
      name: 'system_uptime_seconds',
      type: 'counter',
      help: 'System uptime in seconds',
    });

    this.registerMetric({
      name: 'memory_usage_bytes',
      type: 'gauge',
      help: 'Memory usage in bytes',
      labels: ['type'],
    });

    this.registerMetric({
      name: 'cpu_usage_percent',
      type: 'gauge',
      help: 'CPU usage percentage',
    });

    // Consciousness metrics
    this.registerMetric({
      name: 'consciousness_score',
      type: 'gauge',
      help: 'Current consciousness score',
      labels: ['component'],
    });

    this.registerMetric({
      name: 'proposal_quality_score',
      type: 'gauge',
      help: 'Proposal quality score',
    });

    this.registerMetric({
      name: 'adaptation_speed_ms',
      type: 'histogram',
      help: 'Adaptation speed in milliseconds',
      buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
    });

    // Conflict resolution metrics
    this.registerMetric({
      name: 'conflicts_detected_total',
      type: 'counter',
      help: 'Total number of conflicts detected',
      labels: ['type'],
    });

    this.registerMetric({
      name: 'conflicts_resolved_total',
      type: 'counter',
      help: 'Total number of conflicts resolved',
      labels: ['resolution_type'],
    });

    this.registerMetric({
      name: 'conflict_resolution_duration_ms',
      type: 'histogram',
      help: 'Conflict resolution duration in milliseconds',
      buckets: [1, 10, 50, 100, 500, 1000, 5000, 10000],
    });

    this.registerMetric({
      name: 'rollbacks_total',
      type: 'counter',
      help: 'Total number of rollbacks',
      labels: ['reason'],
    });

    // SoulMesh metrics
    this.registerMetric({
      name: 'soulmesh_nodes_active',
      type: 'gauge',
      help: 'Number of active SoulMesh nodes',
    });

    this.registerMetric({
      name: 'soulmesh_messages_total',
      type: 'counter',
      help: 'Total SoulMesh messages processed',
      labels: ['type', 'status'],
    });

    this.registerMetric({
      name: 'soulmesh_sync_duration_ms',
      type: 'histogram',
      help: 'SoulMesh synchronization duration in milliseconds',
      buckets: [1, 5, 10, 25, 50, 100, 250, 500],
    });

    // Request metrics
    this.registerMetric({
      name: 'requests_total',
      type: 'counter',
      help: 'Total number of requests',
      labels: ['method', 'endpoint', 'status'],
    });

    this.registerMetric({
      name: 'request_duration_ms',
      type: 'histogram',
      help: 'Request duration in milliseconds',
      labels: ['method', 'endpoint'],
      buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
    });
  }

  private async startMetricsServer(): Promise<void> {
    // Simple HTTP server implementation
    // In a real implementation, you might use Express or similar
    const http = require('http');
    
    this.server = http.createServer((req: any, res: any) => {
      const url = new URL(req.url, `http://${req.headers.host}`);
      
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }
      
      if (url.pathname === this.config.endpoint) {
        // Serve Prometheus metrics
        res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
        res.writeHead(200);
        res.end(this.getPrometheusMetrics());
      } else if (url.pathname === '/health' && this.config.enableHealthCheck) {
        // Health check endpoint
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          metrics: this.getStatus(),
        }));
      } else if (url.pathname === '/metrics/json') {
        // JSON format for debugging
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify(this.getMetricsAsJson(), null, 2));
      } else {
        // 404 for other paths
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    return new Promise<void>((resolve, reject) => {
      this.server.listen(this.config.port, (err: any) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  private startUpdateTimer(): void {
    this.updateTimer = setInterval(() => {
      this.updateSystemMetrics();
    }, this.config.scrapeInterval);
  }

  private updateSystemMetrics(): void {
    // Update system uptime
    this.updateMetric('system_uptime_seconds', process.uptime());

    // Update memory usage
    const memUsage = process.memoryUsage();
    this.updateMetric('memory_usage_bytes', memUsage.heapUsed, { type: 'heap_used' });
    this.updateMetric('memory_usage_bytes', memUsage.heapTotal, { type: 'heap_total' });
    this.updateMetric('memory_usage_bytes', memUsage.rss, { type: 'rss' });
    this.updateMetric('memory_usage_bytes', memUsage.external, { type: 'external' });

    // Update CPU usage (simplified)
    const cpuUsage = process.cpuUsage();
    const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    this.updateMetric('cpu_usage_percent', cpuPercent);
  }

  private handleMetricRecorded(dataPoint: MetricDataPoint): void {
    const labels = dataPoint.tags || {};
    
    // Map metric names to Prometheus metrics
    switch (dataPoint.metric) {
      case 'consciousness_score':
        this.updateMetric('consciousness_score', dataPoint.value, labels);
        break;
      case 'proposal_quality':
        this.updateMetric('proposal_quality_score', dataPoint.value, labels);
        break;
      case 'adaptation_speed':
        this.updateMetric('adaptation_speed_ms', dataPoint.value, labels);
        break;
      case 'conflict_detected':
        this.updateMetric('conflicts_detected_total', dataPoint.value, labels);
        break;
      case 'conflict_resolved':
        this.updateMetric('conflicts_resolved_total', dataPoint.value, labels);
        break;
      case 'conflict_resolution_time':
        this.updateMetric('conflict_resolution_duration_ms', dataPoint.value, labels);
        break;
      case 'rollback_event':
        this.updateMetric('rollbacks_total', dataPoint.value, labels);
        break;
      case 'soulmesh_nodes':
        this.updateMetric('soulmesh_nodes_active', dataPoint.value, labels);
        break;
      case 'soulmesh_messages':
        this.updateMetric('soulmesh_messages_total', dataPoint.value, labels);
        break;
      case 'soulmesh_sync_time':
        this.updateMetric('soulmesh_sync_duration_ms', dataPoint.value, labels);
        break;
      case 'requests_total':
        this.updateMetric('requests_total', dataPoint.value, labels);
        break;
      case 'request_duration':
        this.updateMetric('request_duration_ms', dataPoint.value, labels);
        break;
      default:
        // Generic metric handling
        const sanitizedName = dataPoint.metric.replace(/[^a-zA-Z0-9_]/g, '_');
        this.updateMetric(sanitizedName, dataPoint.value, labels);
        break;
    }
  }

  private formatLabels(labels: PrometheusLabels): string {
    const entries = Object.entries(labels);
    if (entries.length === 0) {
      return '';
    }
    
    const labelPairs = entries.map(([key, value]) => `${key}="${value}"`);
    return `{${labelPairs.join(',')}}`;
  }
}

/**
 * Create a Prometheus integration instance
 */
export function createPrometheusIntegration(config: PrometheusIntegrationConfig): PrometheusIntegration {
  return new PrometheusIntegration(config);
}