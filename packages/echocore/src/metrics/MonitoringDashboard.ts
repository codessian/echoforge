/**
 * MonitoringDashboard - Real-time monitoring and observability dashboard
 * 
 * Provides a comprehensive monitoring interface for the EchoForge platform
 * with real-time metrics visualization, alerting, and system health monitoring.
 */

import { EventEmitter } from 'events';
import { MetricsEngine, MetricDataPoint, AggregatedMetric, AlertEvent } from './MetricsEngine';
import { ConflictResolutionMetrics } from './ConflictResolutionMetrics';

/**
 * Dashboard widget configuration
 */
export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'alert' | 'health' | 'table';
  title: string;
  metric?: string;
  timeRange?: number; // milliseconds
  refreshInterval?: number; // milliseconds
  config?: Record<string, any>;
  position: { x: number; y: number; width: number; height: number };
}

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  id: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  refreshInterval?: number;
  autoRefresh?: boolean;
}

/**
 * System health status
 */
export interface SystemHealthStatus {
  overall: 'healthy' | 'degraded' | 'critical';
  components: {
    metricsEngine: 'healthy' | 'degraded' | 'critical';
    conflictResolution: 'healthy' | 'degraded' | 'critical';
    soulMesh: 'healthy' | 'degraded' | 'critical';
    consciousness: 'healthy' | 'degraded' | 'critical';
  };
  metrics: {
    totalMetrics: number;
    activeAlerts: number;
    dataPoints: number;
    uptime: number;
  };
  timestamp: number;
}

/**
 * Performance metrics summary
 */
export interface PerformanceMetrics {
  consciousness: {
    proposalQuality: number;
    adaptationSpeed: number;
    feedbackIntegration: number;
    coherenceScore: number;
  };
  conflicts: {
    detectionRate: number;
    resolutionSuccessRate: number;
    averageResolutionTime: number;
    rollbackRate: number;
  };
  system: {
    memoryUsage: number;
    cpuUsage: number;
    responseTime: number;
    throughput: number;
  };
  timestamp: number;
}

/**
 * Monitoring dashboard configuration
 */
export interface MonitoringDashboardConfig {
  metricsEngine: MetricsEngine;
  conflictResolutionMetrics?: ConflictResolutionMetrics;
  refreshInterval?: number;
  enableRealTimeUpdates?: boolean;
  enableAlerting?: boolean;
  maxDataPoints?: number;
  retentionPeriod?: number;
}

/**
 * Real-time monitoring dashboard
 */
export class MonitoringDashboard extends EventEmitter {
  private config: MonitoringDashboardConfig;
  private metricsEngine: MetricsEngine;
  private conflictResolutionMetrics?: ConflictResolutionMetrics;
  private dashboards: Map<string, DashboardConfig> = new Map();
  private refreshTimer?: NodeJS.Timeout;
  private startTime: number;
  private isRunning: boolean = false;

  constructor(config: MonitoringDashboardConfig) {
    super();
    this.config = {
      refreshInterval: 5000, // 5 seconds
      enableRealTimeUpdates: true,
      enableAlerting: true,
      maxDataPoints: 1000,
      retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
      ...config,
    };
    
    this.metricsEngine = config.metricsEngine;
    this.conflictResolutionMetrics = config.conflictResolutionMetrics;
    this.startTime = Date.now();

    this.setupEventListeners();
    this.createDefaultDashboards();
  }

  /**
   * Start the monitoring dashboard
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    try {
      // Initialize metrics engine if not already initialized
      await this.metricsEngine.initialize();

      // Start refresh timer if real-time updates are enabled
      if (this.config.enableRealTimeUpdates) {
        this.startRefreshTimer();
      }

      this.isRunning = true;
      this.emit('started');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Stop the monitoring dashboard
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }

    this.isRunning = false;
    this.emit('stopped');
  }

  /**
   * Get system health status
   */
  getSystemHealth(): SystemHealthStatus {
    const metricsHealth = this.metricsEngine.getHealthStatus();
    const activeAlerts = this.metricsEngine.getActiveAlerts();
    
    // Determine component health
    const components = {
      metricsEngine: metricsHealth.status as 'healthy' | 'degraded' | 'critical',
      conflictResolution: this.getConflictResolutionHealth(),
      soulMesh: this.getSoulMeshHealth(),
      consciousness: this.getConsciousnessHealth(),
    };

    // Determine overall health
    const criticalComponents = Object.values(components).filter(status => status === 'critical').length;
    const degradedComponents = Object.values(components).filter(status => status === 'degraded').length;
    
    let overall: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (criticalComponents > 0) {
      overall = 'critical';
    } else if (degradedComponents > 0) {
      overall = 'degraded';
    }

    return {
      overall,
      components,
      metrics: {
        totalMetrics: metricsHealth.metrics.totalMetrics,
        activeAlerts: activeAlerts.length,
        dataPoints: metricsHealth.metrics.totalDataPoints,
        uptime: Date.now() - this.startTime,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Get performance metrics summary
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    // Get consciousness metrics
    const proposalQuality = this.getAverageMetricValue('proposal_quality', oneHourAgo) || 0;
    const adaptationSpeed = this.getAverageMetricValue('adaptation_speed', oneHourAgo) || 0;
    const feedbackIntegration = this.getAverageMetricValue('feedback_integration', oneHourAgo) || 0;
    const coherenceScore = this.getAverageMetricValue('coherence_score', oneHourAgo) || 0;

    // Get conflict resolution metrics
    let conflictMetrics = {
      detectionRate: 0,
      resolutionSuccessRate: 0,
      averageResolutionTime: 0,
      rollbackRate: 0,
    };

    if (this.conflictResolutionMetrics) {
      const conflictData = this.conflictResolutionMetrics.getMetrics();
      conflictMetrics = {
        detectionRate: this.getMetricRate('conflict_detected', oneHourAgo),
        resolutionSuccessRate: conflictData.successRate,
        averageResolutionTime: conflictData.averageResolutionTime,
        rollbackRate: this.getMetricRate('rollback_event', oneHourAgo),
      };
    }

    // Get system metrics
    const memoryUsage = process.memoryUsage();
    const systemMetrics = {
      memoryUsage: memoryUsage.heapUsed / memoryUsage.heapTotal,
      cpuUsage: this.getAverageMetricValue('cpu_usage', oneHourAgo) || 0,
      responseTime: this.getAverageMetricValue('response_time', oneHourAgo) || 0,
      throughput: this.getMetricRate('requests_total', oneHourAgo),
    };

    return {
      consciousness: {
        proposalQuality,
        adaptationSpeed,
        feedbackIntegration,
        coherenceScore,
      },
      conflicts: conflictMetrics,
      system: systemMetrics,
      timestamp: now,
    };
  }

  /**
   * Create a new dashboard
   */
  createDashboard(config: DashboardConfig): void {
    this.dashboards.set(config.id, config);
    this.emit('dashboard_created', config);
  }

  /**
   * Get dashboard configuration
   */
  getDashboard(id: string): DashboardConfig | undefined {
    return this.dashboards.get(id);
  }

  /**
   * Get all dashboards
   */
  getAllDashboards(): DashboardConfig[] {
    return Array.from(this.dashboards.values());
  }

  /**
   * Update dashboard configuration
   */
  updateDashboard(id: string, updates: Partial<DashboardConfig>): void {
    const dashboard = this.dashboards.get(id);
    if (dashboard) {
      const updated = { ...dashboard, ...updates };
      this.dashboards.set(id, updated);
      this.emit('dashboard_updated', updated);
    }
  }

  /**
   * Delete a dashboard
   */
  deleteDashboard(id: string): void {
    const dashboard = this.dashboards.get(id);
    if (dashboard) {
      this.dashboards.delete(id);
      this.emit('dashboard_deleted', dashboard);
    }
  }

  /**
   * Get widget data for a specific widget
   */
  getWidgetData(dashboardId: string, widgetId: string): any {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      return null;
    }

    const widget = dashboard.widgets.find(w => w.id === widgetId);
    if (!widget) {
      return null;
    }

    const timeRange = widget.timeRange || (60 * 60 * 1000); // 1 hour default
    const since = Date.now() - timeRange;

    switch (widget.type) {
      case 'metric':
        return this.getMetricWidgetData(widget, since);
      case 'chart':
        return this.getChartWidgetData(widget, since);
      case 'alert':
        return this.getAlertWidgetData(widget);
      case 'health':
        return this.getHealthWidgetData(widget);
      case 'table':
        return this.getTableWidgetData(widget, since);
      default:
        return null;
    }
  }

  /**
   * Export dashboard configuration
   */
  exportDashboard(id: string): string | null {
    const dashboard = this.dashboards.get(id);
    if (!dashboard) {
      return null;
    }
    return JSON.stringify(dashboard, null, 2);
  }

  /**
   * Import dashboard configuration
   */
  importDashboard(configJson: string): void {
    try {
      const config: DashboardConfig = JSON.parse(configJson);
      this.createDashboard(config);
    } catch (error) {
      this.emit('error', new Error(`Failed to import dashboard: ${error}`));
    }
  }

  // Private methods

  private setupEventListeners(): void {
    // Listen for metrics engine events
    this.metricsEngine.on('alert_triggered', (alert: AlertEvent) => {
      this.emit('alert', alert);
    });

    this.metricsEngine.on('alert_resolved', (alert: AlertEvent) => {
      this.emit('alert_resolved', alert);
    });

    this.metricsEngine.on('metric_recorded', (dataPoint: MetricDataPoint) => {
      this.emit('metric_update', dataPoint);
    });

    // Listen for conflict resolution events if available
    if (this.conflictResolutionMetrics) {
      // Add event listeners for conflict resolution metrics
    }
  }

  private startRefreshTimer(): void {
    this.refreshTimer = setInterval(() => {
      this.emit('refresh', {
        systemHealth: this.getSystemHealth(),
        performanceMetrics: this.getPerformanceMetrics(),
        timestamp: Date.now(),
      });
    }, this.config.refreshInterval);
  }

  private createDefaultDashboards(): void {
    // System Overview Dashboard
    const systemOverview: DashboardConfig = {
      id: 'system-overview',
      name: 'System Overview',
      description: 'High-level system health and performance metrics',
      widgets: [
        {
          id: 'system-health',
          type: 'health',
          title: 'System Health',
          position: { x: 0, y: 0, width: 6, height: 4 },
        },
        {
          id: 'active-alerts',
          type: 'alert',
          title: 'Active Alerts',
          position: { x: 6, y: 0, width: 6, height: 4 },
        },
        {
          id: 'consciousness-metrics',
          type: 'chart',
          title: 'Consciousness Metrics',
          metric: 'consciousness_score',
          timeRange: 60 * 60 * 1000, // 1 hour
          position: { x: 0, y: 4, width: 12, height: 6 },
        },
      ],
    };

    // Conflict Resolution Dashboard
    const conflictResolution: DashboardConfig = {
      id: 'conflict-resolution',
      name: 'Conflict Resolution',
      description: 'Conflict detection and resolution metrics',
      widgets: [
        {
          id: 'conflict-rate',
          type: 'metric',
          title: 'Conflict Detection Rate',
          metric: 'conflict_detected',
          timeRange: 60 * 60 * 1000,
          position: { x: 0, y: 0, width: 4, height: 3 },
        },
        {
          id: 'resolution-success',
          type: 'metric',
          title: 'Resolution Success Rate',
          metric: 'conflict_resolution_success_rate',
          timeRange: 60 * 60 * 1000,
          position: { x: 4, y: 0, width: 4, height: 3 },
        },
        {
          id: 'rollback-rate',
          type: 'metric',
          title: 'Rollback Rate',
          metric: 'rollback_event',
          timeRange: 60 * 60 * 1000,
          position: { x: 8, y: 0, width: 4, height: 3 },
        },
        {
          id: 'resolution-timeline',
          type: 'chart',
          title: 'Resolution Timeline',
          metric: 'conflict_resolution_time',
          timeRange: 4 * 60 * 60 * 1000, // 4 hours
          position: { x: 0, y: 3, width: 12, height: 6 },
        },
      ],
    };

    this.createDashboard(systemOverview);
    this.createDashboard(conflictResolution);
  }

  private getConflictResolutionHealth(): 'healthy' | 'degraded' | 'critical' {
    if (!this.conflictResolutionMetrics) {
      return 'healthy';
    }

    const metrics = this.conflictResolutionMetrics.getMetrics();
    if (metrics.successRate < 0.5) {
      return 'critical';
    } else if (metrics.successRate < 0.8) {
      return 'degraded';
    }
    return 'healthy';
  }

  private getSoulMeshHealth(): 'healthy' | 'degraded' | 'critical' {
    // Check SoulMesh-related metrics
    const meshErrors = this.getMetricRate('soulmesh_errors', Date.now() - 60000);
    if (meshErrors > 10) {
      return 'critical';
    } else if (meshErrors > 5) {
      return 'degraded';
    }
    return 'healthy';
  }

  private getConsciousnessHealth(): 'healthy' | 'degraded' | 'critical' {
    // Check consciousness-related metrics
    const consciousnessScore = this.getAverageMetricValue('consciousness_score', Date.now() - 300000);
    if (consciousnessScore !== null) {
      if (consciousnessScore < 0.3) {
        return 'critical';
      } else if (consciousnessScore < 0.6) {
        return 'degraded';
      }
    }
    return 'healthy';
  }

  private getAverageMetricValue(metricName: string, since: number): number | null {
    const aggregated = this.metricsEngine.getAggregatedMetrics(metricName, since);
    return aggregated ? aggregated.avg : null;
  }

  private getMetricRate(metricName: string, since: number): number {
    const data = this.metricsEngine.getMetricData(metricName, since);
    const timeSpan = Date.now() - since;
    return data.length / (timeSpan / 1000); // events per second
  }

  private getMetricWidgetData(widget: DashboardWidget, since: number): any {
    if (!widget.metric) {
      return null;
    }

    const aggregated = this.metricsEngine.getAggregatedMetrics(widget.metric, since);
    return {
      metric: widget.metric,
      value: aggregated?.avg || 0,
      count: aggregated?.count || 0,
      min: aggregated?.min || 0,
      max: aggregated?.max || 0,
      timestamp: Date.now(),
    };
  }

  private getChartWidgetData(widget: DashboardWidget, since: number): any {
    if (!widget.metric) {
      return null;
    }

    const data = this.metricsEngine.getMetricData(widget.metric, since);
    return {
      metric: widget.metric,
      dataPoints: data.map(point => ({
        timestamp: point.timestamp,
        value: point.value,
        tags: point.tags,
      })),
      aggregated: this.metricsEngine.getAggregatedMetrics(widget.metric, since),
    };
  }

  private getAlertWidgetData(widget: DashboardWidget): any {
    const activeAlerts = this.metricsEngine.getActiveAlerts();
    return {
      alerts: activeAlerts,
      count: activeAlerts.length,
      critical: activeAlerts.filter(a => a.condition === 'critical').length,
      warning: activeAlerts.filter(a => a.condition === 'warning').length,
    };
  }

  private getHealthWidgetData(widget: DashboardWidget): any {
    return this.getSystemHealth();
  }

  private getTableWidgetData(widget: DashboardWidget, since: number): any {
    if (!widget.metric) {
      return null;
    }

    const data = this.metricsEngine.getMetricData(widget.metric, since);
    return {
      metric: widget.metric,
      rows: data.slice(-100).map(point => ({
        timestamp: new Date(point.timestamp).toISOString(),
        value: point.value,
        tags: point.tags || {},
      })),
    };
  }
}

/**
 * Create a monitoring dashboard instance
 */
export function createMonitoringDashboard(config: MonitoringDashboardConfig): MonitoringDashboard {
  return new MonitoringDashboard(config);
}