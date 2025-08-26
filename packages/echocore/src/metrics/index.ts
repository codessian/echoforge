/**
 * Metrics and Monitoring Module
 * 
 * Comprehensive monitoring and observability solution for EchoForge platform
 * providing metrics collection, real-time dashboards, alerting, and Prometheus integration.
 */

// Core metrics engine
export {
  MetricsEngine,
  MetricDefinition,
  MetricDataPoint,
  AggregatedMetric,
  AlertRule,
  AlertEvent,
  MetricsEngineConfig,
  createMetricsEngine,
} from './MetricsEngine';

// Conflict resolution metrics
export {
  ConflictResolutionMetrics,
  ConflictEvent,
  ResolutionResult,
  RollbackTrace,
  ConflictResolutionMetricsConfig,
} from './ConflictResolutionMetrics';

// SoulMesh metrics integration
export {
  SoulMeshMetricsIntegration,
  SoulMeshMetricsIntegrationConfig,
} from './integration/SoulMeshMetricsIntegration';

// Monitoring dashboard
export {
  MonitoringDashboard,
  DashboardWidget,
  DashboardConfig,
  SystemHealthStatus,
  PerformanceMetrics,
  MonitoringDashboardConfig,
  createMonitoringDashboard,
} from './MonitoringDashboard';

// Prometheus integration
export {
  PrometheusIntegration,
  PrometheusMetricType,
  PrometheusMetricConfig,
  PrometheusLabels,
  PrometheusMetricSample,
  PrometheusIntegrationConfig,
  createPrometheusIntegration,
} from './PrometheusIntegration';

/**
 * Create a complete monitoring setup with all components
 */
export interface CompleteMonitoringSetup {
  metricsEngine: typeof MetricsEngine;
  dashboard: MonitoringDashboard;
  prometheus: PrometheusIntegration;
  conflictMetrics?: ConflictResolutionMetrics;
  soulMeshIntegration?: SoulMeshMetricsIntegration;
}

/**
 * Configuration for complete monitoring setup
 */
export interface CompleteMonitoringConfig {
  // Core configuration
  enableDashboard?: boolean;
  enablePrometheus?: boolean;
  enableConflictMetrics?: boolean;
  enableSoulMeshIntegration?: boolean;
  
  // MetricsEngine configuration
  metricsEngine?: Partial<MetricsEngineConfig>;
  
  // Dashboard configuration
  dashboard?: Partial<MonitoringDashboardConfig>;
  
  // Prometheus configuration
  prometheus?: Partial<PrometheusIntegrationConfig>;
  
  // Conflict resolution configuration
  conflictMetrics?: Partial<ConflictResolutionMetricsConfig>;
  
  // SoulMesh integration configuration
  soulMeshIntegration?: Partial<import('./integration/SoulMeshMetricsIntegration').SoulMeshMetricsIntegrationConfig>;
}

/**
 * Create a complete monitoring setup with all components configured
 */
export async function createCompleteMonitoringSetup(
  config: CompleteMonitoringConfig = {}
): Promise<CompleteMonitoringSetup> {
  // Create metrics engine
  const metricsEngine = new MetricsEngine({
    enableAlerting: true,
    enablePrometheusExport: true,
    maxDataPoints: 10000,
    retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
    ...config.metricsEngine,
  });

  // Initialize metrics engine
  await metricsEngine.initialize();

  const setup: CompleteMonitoringSetup = {
    metricsEngine,
    dashboard: null as any,
    prometheus: null as any,
  };

  // Create conflict resolution metrics if enabled
  if (config.enableConflictMetrics !== false) {
    setup.conflictMetrics = new ConflictResolutionMetrics({
      metricsEngine,
      enableHistoricalTracking: true,
      maxHistoricalEvents: 1000,
      ...config.conflictMetrics,
    } as ConflictResolutionMetricsConfig);
  }

  // Create SoulMesh integration if enabled
  if (config.enableSoulMeshIntegration !== false && setup.conflictMetrics) {
    setup.soulMeshIntegration = new SoulMeshMetricsIntegration({
      metricsEngine,
      enableHistoricalTracking: true,
      maxHistoricalEvents: 1000,
      ...config.soulMeshIntegration,
    } as SoulMeshMetricsIntegrationConfig);
  }

  // Create monitoring dashboard if enabled
  if (config.enableDashboard !== false) {
    setup.dashboard = createMonitoringDashboard({
      metricsEngine,
      conflictResolutionMetrics: setup.conflictMetrics,
      refreshInterval: 5000,
      enableRealTimeUpdates: true,
      enableAlerting: true,
      ...config.dashboard,
    });
  }

  // Create Prometheus integration if enabled
  if (config.enablePrometheus !== false) {
    setup.prometheus = createPrometheusIntegration({
      metricsEngine,
      port: 9090,
      endpoint: '/metrics',
      enableTimestamps: true,
      enableHealthCheck: true,
      ...config.prometheus,
    });
  }

  return setup;
}

/**
 * Start all monitoring components
 */
export async function startMonitoring(setup: CompleteMonitoringSetup): Promise<void> {
  const startPromises: Promise<void>[] = [];

  // Start dashboard
  if (setup.dashboard) {
    startPromises.push(setup.dashboard.start());
  }

  // Start Prometheus integration
  if (setup.prometheus) {
    startPromises.push(setup.prometheus.start());
  }

  // Start SoulMesh integration
  if (setup.soulMeshIntegration) {
    startPromises.push(setup.soulMeshIntegration.start());
  }

  await Promise.all(startPromises);
}

/**
 * Stop all monitoring components
 */
export async function stopMonitoring(setup: CompleteMonitoringSetup): Promise<void> {
  const stopPromises: Promise<void>[] = [];

  // Stop dashboard
  if (setup.dashboard) {
    stopPromises.push(setup.dashboard.stop());
  }

  // Stop Prometheus integration
  if (setup.prometheus) {
    stopPromises.push(setup.prometheus.stop());
  }

  // Stop SoulMesh integration
  if (setup.soulMeshIntegration) {
    stopPromises.push(setup.soulMeshIntegration.stop());
  }

  // Stop metrics engine
  if (setup.metricsEngine) {
    stopPromises.push(setup.metricsEngine.shutdown());
  }

  await Promise.all(stopPromises);
}

/**
 * Default monitoring configuration for quick setup
 */
export const DEFAULT_MONITORING_CONFIG: CompleteMonitoringConfig = {
  enableDashboard: true,
  enablePrometheus: true,
  enableConflictMetrics: true,
  enableSoulMeshIntegration: true,
  
  metricsEngine: {
    enableAlerting: true,
    enablePrometheusExport: true,
    maxDataPoints: 10000,
    retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
  },
  
  dashboard: {
    refreshInterval: 5000,
    enableRealTimeUpdates: true,
    enableAlerting: true,
  },
  
  prometheus: {
    port: 9090,
    endpoint: '/metrics',
    enableTimestamps: true,
    enableHealthCheck: true,
  },
};

/**
 * Quick setup function for default monitoring
 */
export async function setupDefaultMonitoring(): Promise<CompleteMonitoringSetup> {
  const setup = await createCompleteMonitoringSetup(DEFAULT_MONITORING_CONFIG);
  await startMonitoring(setup);
  return setup;
}

/**
 * Monitoring utilities
 */
export const MonitoringUtils = {
  /**
   * Create a health check function
   */
  createHealthCheck: (setup: CompleteMonitoringSetup) => {
    return () => {
      const health = setup.dashboard?.getSystemHealth();
      return {
        status: health?.overall || 'unknown',
        timestamp: Date.now(),
        components: health?.components || {},
        metrics: health?.metrics || {},
      };
    };
  },

  /**
   * Create a metrics summary function
   */
  createMetricsSummary: (setup: CompleteMonitoringSetup) => {
    return () => {
      const performance = setup.dashboard?.getPerformanceMetrics();
      return {
        consciousness: performance?.consciousness || {},
        conflicts: performance?.conflicts || {},
        system: performance?.system || {},
        timestamp: Date.now(),
      };
    };
  },

  /**
   * Create an alert handler
   */
  createAlertHandler: (setup: CompleteMonitoringSetup, handler: (alert: AlertEvent) => void) => {
    setup.metricsEngine.on('alert_triggered', handler);
    return () => {
      setup.metricsEngine.off('alert_triggered', handler);
    };
  },
};