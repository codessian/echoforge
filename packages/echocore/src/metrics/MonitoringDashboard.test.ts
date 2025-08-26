/**
 * MonitoringDashboard Tests
 * 
 * Comprehensive test suite for the MonitoringDashboard class
 */

import { MonitoringDashboard, DashboardConfig, DashboardWidget } from './MonitoringDashboard';
import { MetricsEngine } from './MetricsEngine';
import { ConflictResolutionMetrics } from './ConflictResolutionMetrics';

// Mock MetricsEngine
class MockMetricsEngine extends MetricsEngine {
  private mockData: Map<string, any[]> = new Map();
  private mockAggregated: Map<string, any> = new Map();
  private mockAlerts: any[] = [];

  constructor() {
    super({ enableAlerting: false, enablePrometheusExport: false });
  }

  async initialize(): Promise<void> {
    // Mock initialization
  }

  getMetricData(metric: string, since?: number): any[] {
    return this.mockData.get(metric) || [];
  }

  getAggregatedMetrics(metric: string, since?: number): any {
    return this.mockAggregated.get(metric) || null;
  }

  getActiveAlerts(): any[] {
    return this.mockAlerts;
  }

  getHealthStatus(): any {
    return {
      status: 'healthy',
      uptime: 60000,
      metrics: {
        totalMetrics: 5,
        totalDataPoints: 100,
      },
    };
  }

  // Helper methods for testing
  setMockData(metric: string, data: any[]): void {
    this.mockData.set(metric, data);
  }

  setMockAggregated(metric: string, aggregated: any): void {
    this.mockAggregated.set(metric, aggregated);
  }

  setMockAlerts(alerts: any[]): void {
    this.mockAlerts = alerts;
  }
}

// Mock ConflictResolutionMetrics
class MockConflictResolutionMetrics {
  getMetrics(): any {
    return {
      successRate: 0.85,
      averageResolutionTime: 150,
      totalConflicts: 10,
      resolvedConflicts: 8,
    };
  }
}

describe('MonitoringDashboard', () => {
  let dashboard: MonitoringDashboard;
  let mockMetricsEngine: MockMetricsEngine;
  let mockConflictMetrics: MockConflictResolutionMetrics;

  beforeEach(async () => {
    mockMetricsEngine = new MockMetricsEngine();
    mockConflictMetrics = new MockConflictResolutionMetrics();
    
    dashboard = new MonitoringDashboard({
      metricsEngine: mockMetricsEngine,
      conflictResolutionMetrics: mockConflictMetrics as any,
      refreshInterval: 1000,
      enableRealTimeUpdates: false, // Disable for testing
      enableAlerting: true,
    });
  });

  afterEach(async () => {
    await dashboard.stop();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(dashboard.start()).resolves.not.toThrow();
    });

    it('should create default dashboards on initialization', () => {
      const dashboards = dashboard.getAllDashboards();
      expect(dashboards.length).toBeGreaterThan(0);
      
      const systemOverview = dashboard.getDashboard('system-overview');
      expect(systemOverview).toBeDefined();
      expect(systemOverview!.name).toBe('System Overview');
      
      const conflictResolution = dashboard.getDashboard('conflict-resolution');
      expect(conflictResolution).toBeDefined();
      expect(conflictResolution!.name).toBe('Conflict Resolution');
    });

    it('should not start twice', async () => {
      await dashboard.start();
      await expect(dashboard.start()).resolves.not.toThrow();
    });
  });

  describe('System Health', () => {
    beforeEach(async () => {
      await dashboard.start();
    });

    it('should return system health status', () => {
      const health = dashboard.getSystemHealth();
      
      expect(health).toBeDefined();
      expect(health.overall).toMatch(/healthy|degraded|critical/);
      expect(health.components).toBeDefined();
      expect(health.components.metricsEngine).toMatch(/healthy|degraded|critical/);
      expect(health.components.conflictResolution).toMatch(/healthy|degraded|critical/);
      expect(health.components.soulMesh).toMatch(/healthy|degraded|critical/);
      expect(health.components.consciousness).toMatch(/healthy|degraded|critical/);
      expect(health.metrics).toBeDefined();
      expect(health.timestamp).toBeGreaterThan(0);
    });

    it('should determine overall health based on components', () => {
      // Mock healthy state
      const health = dashboard.getSystemHealth();
      expect(health.overall).toBe('healthy');
    });

    it('should include metrics in health status', () => {
      const health = dashboard.getSystemHealth();
      
      expect(health.metrics.totalMetrics).toBe(5);
      expect(health.metrics.activeAlerts).toBe(0);
      expect(health.metrics.dataPoints).toBe(100);
      expect(health.metrics.uptime).toBeGreaterThan(0);
    });
  });

  describe('Performance Metrics', () => {
    beforeEach(async () => {
      await dashboard.start();
      
      // Set up mock data
      mockMetricsEngine.setMockAggregated('proposal_quality', { avg: 0.85 });
      mockMetricsEngine.setMockAggregated('adaptation_speed', { avg: 120 });
      mockMetricsEngine.setMockAggregated('feedback_integration', { avg: 0.92 });
      mockMetricsEngine.setMockAggregated('coherence_score', { avg: 0.78 });
    });

    it('should return performance metrics summary', () => {
      const performance = dashboard.getPerformanceMetrics();
      
      expect(performance).toBeDefined();
      expect(performance.consciousness).toBeDefined();
      expect(performance.conflicts).toBeDefined();
      expect(performance.system).toBeDefined();
      expect(performance.timestamp).toBeGreaterThan(0);
    });

    it('should include consciousness metrics', () => {
      const performance = dashboard.getPerformanceMetrics();
      
      expect(performance.consciousness.proposalQuality).toBe(0.85);
      expect(performance.consciousness.adaptationSpeed).toBe(120);
      expect(performance.consciousness.feedbackIntegration).toBe(0.92);
      expect(performance.consciousness.coherenceScore).toBe(0.78);
    });

    it('should include conflict resolution metrics', () => {
      const performance = dashboard.getPerformanceMetrics();
      
      expect(performance.conflicts.resolutionSuccessRate).toBe(0.85);
      expect(performance.conflicts.averageResolutionTime).toBe(150);
    });

    it('should include system metrics', () => {
      const performance = dashboard.getPerformanceMetrics();
      
      expect(performance.system.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(performance.system.memoryUsage).toBeLessThanOrEqual(1);
    });
  });

  describe('Dashboard Management', () => {
    const testDashboard: DashboardConfig = {
      id: 'test-dashboard',
      name: 'Test Dashboard',
      description: 'A test dashboard',
      widgets: [
        {
          id: 'test-widget',
          type: 'metric',
          title: 'Test Metric',
          metric: 'test_metric',
          position: { x: 0, y: 0, width: 6, height: 4 },
        },
      ],
    };

    it('should create a new dashboard', () => {
      dashboard.createDashboard(testDashboard);
      
      const created = dashboard.getDashboard('test-dashboard');
      expect(created).toEqual(testDashboard);
    });

    it('should emit dashboard_created event', (done) => {
      dashboard.on('dashboard_created', (config) => {
        expect(config).toEqual(testDashboard);
        done();
      });
      
      dashboard.createDashboard(testDashboard);
    });

    it('should update an existing dashboard', () => {
      dashboard.createDashboard(testDashboard);
      
      const updates = {
        name: 'Updated Test Dashboard',
        description: 'An updated test dashboard',
      };
      
      dashboard.updateDashboard('test-dashboard', updates);
      
      const updated = dashboard.getDashboard('test-dashboard');
      expect(updated!.name).toBe('Updated Test Dashboard');
      expect(updated!.description).toBe('An updated test dashboard');
    });

    it('should emit dashboard_updated event', (done) => {
      dashboard.createDashboard(testDashboard);
      
      dashboard.on('dashboard_updated', (config) => {
        expect(config.name).toBe('Updated Dashboard');
        done();
      });
      
      dashboard.updateDashboard('test-dashboard', { name: 'Updated Dashboard' });
    });

    it('should delete a dashboard', () => {
      dashboard.createDashboard(testDashboard);
      expect(dashboard.getDashboard('test-dashboard')).toBeDefined();
      
      dashboard.deleteDashboard('test-dashboard');
      expect(dashboard.getDashboard('test-dashboard')).toBeUndefined();
    });

    it('should emit dashboard_deleted event', (done) => {
      dashboard.createDashboard(testDashboard);
      
      dashboard.on('dashboard_deleted', (config) => {
        expect(config).toEqual(testDashboard);
        done();
      });
      
      dashboard.deleteDashboard('test-dashboard');
    });

    it('should return all dashboards', () => {
      const dashboard1 = { ...testDashboard, id: 'dashboard1' };
      const dashboard2 = { ...testDashboard, id: 'dashboard2' };
      
      dashboard.createDashboard(dashboard1);
      dashboard.createDashboard(dashboard2);
      
      const allDashboards = dashboard.getAllDashboards();
      expect(allDashboards.length).toBeGreaterThanOrEqual(4); // 2 default + 2 created
      
      const ids = allDashboards.map(d => d.id);
      expect(ids).toContain('dashboard1');
      expect(ids).toContain('dashboard2');
    });
  });

  describe('Widget Data', () => {
    const testWidget: DashboardWidget = {
      id: 'test-widget',
      type: 'metric',
      title: 'Test Widget',
      metric: 'test_metric',
      timeRange: 60000, // 1 minute
      position: { x: 0, y: 0, width: 6, height: 4 },
    };

    const testDashboard: DashboardConfig = {
      id: 'widget-test-dashboard',
      name: 'Widget Test Dashboard',
      widgets: [testWidget],
    };

    beforeEach(() => {
      dashboard.createDashboard(testDashboard);
      
      // Set up mock data
      mockMetricsEngine.setMockAggregated('test_metric', {
        avg: 42,
        count: 10,
        min: 10,
        max: 100,
      });
      
      mockMetricsEngine.setMockData('test_metric', [
        { timestamp: Date.now() - 30000, value: 30, tags: { type: 'test' } },
        { timestamp: Date.now() - 15000, value: 45, tags: { type: 'test' } },
        { timestamp: Date.now(), value: 60, tags: { type: 'test' } },
      ]);
    });

    it('should return metric widget data', () => {
      const data = dashboard.getWidgetData('widget-test-dashboard', 'test-widget');
      
      expect(data).toBeDefined();
      expect(data.metric).toBe('test_metric');
      expect(data.value).toBe(42);
      expect(data.count).toBe(10);
      expect(data.min).toBe(10);
      expect(data.max).toBe(100);
    });

    it('should return chart widget data', () => {
      const chartWidget = { ...testWidget, type: 'chart' as const };
      const chartDashboard = {
        ...testDashboard,
        id: 'chart-dashboard',
        widgets: [chartWidget],
      };
      
      dashboard.createDashboard(chartDashboard);
      
      const data = dashboard.getWidgetData('chart-dashboard', 'test-widget');
      
      expect(data).toBeDefined();
      expect(data.metric).toBe('test_metric');
      expect(data.dataPoints).toHaveLength(3);
      expect(data.aggregated).toBeDefined();
    });

    it('should return alert widget data', () => {
      const alertWidget = { ...testWidget, type: 'alert' as const, metric: undefined };
      const alertDashboard = {
        ...testDashboard,
        id: 'alert-dashboard',
        widgets: [alertWidget],
      };
      
      dashboard.createDashboard(alertDashboard);
      
      const mockAlerts = [
        { condition: 'critical', rule: { id: 'alert1' } },
        { condition: 'warning', rule: { id: 'alert2' } },
      ];
      mockMetricsEngine.setMockAlerts(mockAlerts);
      
      const data = dashboard.getWidgetData('alert-dashboard', 'test-widget');
      
      expect(data).toBeDefined();
      expect(data.alerts).toHaveLength(2);
      expect(data.count).toBe(2);
      expect(data.critical).toBe(1);
      expect(data.warning).toBe(1);
    });

    it('should return health widget data', () => {
      const healthWidget = { ...testWidget, type: 'health' as const, metric: undefined };
      const healthDashboard = {
        ...testDashboard,
        id: 'health-dashboard',
        widgets: [healthWidget],
      };
      
      dashboard.createDashboard(healthDashboard);
      
      const data = dashboard.getWidgetData('health-dashboard', 'test-widget');
      
      expect(data).toBeDefined();
      expect(data.overall).toMatch(/healthy|degraded|critical/);
      expect(data.components).toBeDefined();
    });

    it('should return table widget data', () => {
      const tableWidget = { ...testWidget, type: 'table' as const };
      const tableDashboard = {
        ...testDashboard,
        id: 'table-dashboard',
        widgets: [tableWidget],
      };
      
      dashboard.createDashboard(tableDashboard);
      
      const data = dashboard.getWidgetData('table-dashboard', 'test-widget');
      
      expect(data).toBeDefined();
      expect(data.metric).toBe('test_metric');
      expect(data.rows).toHaveLength(3);
      expect(data.rows[0]).toHaveProperty('timestamp');
      expect(data.rows[0]).toHaveProperty('value');
      expect(data.rows[0]).toHaveProperty('tags');
    });

    it('should return null for non-existent dashboard', () => {
      const data = dashboard.getWidgetData('non-existent', 'test-widget');
      expect(data).toBeNull();
    });

    it('should return null for non-existent widget', () => {
      const data = dashboard.getWidgetData('widget-test-dashboard', 'non-existent');
      expect(data).toBeNull();
    });
  });

  describe('Dashboard Import/Export', () => {
    const testDashboard: DashboardConfig = {
      id: 'export-test',
      name: 'Export Test Dashboard',
      description: 'Dashboard for export testing',
      widgets: [
        {
          id: 'export-widget',
          type: 'metric',
          title: 'Export Widget',
          metric: 'export_metric',
          position: { x: 0, y: 0, width: 12, height: 6 },
        },
      ],
    };

    it('should export dashboard configuration', () => {
      dashboard.createDashboard(testDashboard);
      
      const exported = dashboard.exportDashboard('export-test');
      expect(exported).toBeDefined();
      
      const parsed = JSON.parse(exported!);
      expect(parsed).toEqual(testDashboard);
    });

    it('should return null for non-existent dashboard export', () => {
      const exported = dashboard.exportDashboard('non-existent');
      expect(exported).toBeNull();
    });

    it('should import dashboard configuration', () => {
      const configJson = JSON.stringify(testDashboard);
      
      dashboard.importDashboard(configJson);
      
      const imported = dashboard.getDashboard('export-test');
      expect(imported).toEqual(testDashboard);
    });

    it('should handle invalid JSON during import', (done) => {
      dashboard.on('error', (error) => {
        expect(error.message).toContain('Failed to import dashboard');
        done();
      });
      
      dashboard.importDashboard('invalid json');
    });
  });

  describe('Real-time Updates', () => {
    it('should emit refresh events when real-time updates are enabled', (done) => {
      const realtimeDashboard = new MonitoringDashboard({
        metricsEngine: mockMetricsEngine,
        refreshInterval: 100, // Very short for testing
        enableRealTimeUpdates: true,
      });
      
      realtimeDashboard.on('refresh', (data) => {
        expect(data.systemHealth).toBeDefined();
        expect(data.performanceMetrics).toBeDefined();
        expect(data.timestamp).toBeGreaterThan(0);
        
        realtimeDashboard.stop().then(() => done());
      });
      
      realtimeDashboard.start();
    });

    it('should emit metric_update events', (done) => {
      dashboard.on('metric_update', (dataPoint) => {
        expect(dataPoint).toBeDefined();
        done();
      });
      
      // Simulate metric update from metrics engine
      mockMetricsEngine.emit('metric_recorded', {
        metric: 'test_metric',
        value: 42,
        timestamp: Date.now(),
      });
    });

    it('should emit alert events', (done) => {
      dashboard.on('alert', (alert) => {
        expect(alert).toBeDefined();
        done();
      });
      
      // Simulate alert from metrics engine
      mockMetricsEngine.emit('alert_triggered', {
        rule: { id: 'test_alert' },
        value: 100,
        timestamp: Date.now(),
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle metrics engine errors gracefully', (done) => {
      dashboard.on('error', (error) => {
        expect(error).toBeInstanceOf(Error);
        done();
      });
      
      // Simulate error from metrics engine
      mockMetricsEngine.emit('error', new Error('Test error'));
    });

    it('should handle missing conflict resolution metrics', () => {
      const dashboardWithoutConflicts = new MonitoringDashboard({
        metricsEngine: mockMetricsEngine,
        enableRealTimeUpdates: false,
      });
      
      const performance = dashboardWithoutConflicts.getPerformanceMetrics();
      expect(performance.conflicts.detectionRate).toBe(0);
      expect(performance.conflicts.resolutionSuccessRate).toBe(0);
    });
  });
});