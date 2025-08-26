/**
 * Comprehensive Test Suite for SoulWeaverMetrics
 * Demonstrates enhanced testing infrastructure capabilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SoulWeaverMetrics, SoulWeaverMetricsConfig, ConsciousnessImpactScorecard } from '../metrics/SoulWeaverMetrics';
import { MockFactory, AsyncTestUtils, PerformanceTestUtils } from '@test-utils';

describe('SoulWeaverMetrics', () => {
  let metrics: SoulWeaverMetrics;
  let mockConfig: SoulWeaverMetricsConfig;
  let mockEventEmitter: any;

  beforeEach(() => {
    mockEventEmitter = MockFactory.createEventEmitterMock();
    
    mockConfig = {
      trackEvolutionOutcomes: true,
      generateConsciousnessImpactScorecard: true,
      enableDetailedLogging: true,
      metricsConfig: {
        enabledMetricTypes: ['PROPOSAL_QUALITY', 'ADAPTATION_SPEED', 'FEEDBACK_INTEGRATION_RATE'],
        collectionIntervalMs: 60000,
        retentionPeriodMs: 2592000000, // 30 days
        aggregationWindowMs: 300000, // 5 minutes
      },
    };

    metrics = new SoulWeaverMetrics(mockEventEmitter, mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultMetrics = new SoulWeaverMetrics();
      expect(defaultMetrics).toBeInstanceOf(SoulWeaverMetrics);
    });

    it('should initialize with custom configuration', () => {
      expect(metrics).toBeInstanceOf(SoulWeaverMetrics);
      expect(mockEventEmitter.on).toHaveBeenCalledWith('metricsUpdate', expect.any(Function));
    });

    it('should set up metric collection intervals when enabled', () => {
      vi.useFakeTimers();
      const intervalSpy = vi.spyOn(global, 'setInterval');
      
      new SoulWeaverMetrics(mockConfig, mockEventEmitter);
      
      expect(intervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        mockConfig.aggregationInterval
      );
      
      vi.useRealTimers();
    });
  });

  describe('Metrics Collection', () => {
    it('should collect proposal quality metrics', async () => {
      const proposalData = MockFactory.createBlueprintProposal({
        capabilities: {
          functions: [
            { name: 'highQualityFunction', description: 'Well-documented function' },
            { name: 'anotherFunction', description: 'Another well-documented function' },
          ],
        },
      });

      const quality = await metrics.collectProposalQuality(proposalData);
      
      expect(quality).toBeWithinRange(0, 1);
      expect(typeof quality).toBe('number');
    });

    it('should measure adaptation speed accurately', async () => {
      const startTime = Date.now();
      const adaptationData = {
        startTime,
        endTime: startTime + 1000,
        complexity: 0.5,
        changesMade: 3,
      };

      const speed = await metrics.measureAdaptationSpeed(adaptationData);
      
      expect(speed).toBeWithinRange(0, 1);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('adaptationSpeedMeasured', {
        speed,
        data: adaptationData,
      });
    });

    it('should track feedback integration effectiveness', async () => {
      const feedbackData = {
        feedbackReceived: 10,
        feedbackIntegrated: 8,
        integrationTime: 2000,
        qualityImprovement: 0.15,
      };

      const effectiveness = await metrics.trackFeedbackIntegration(feedbackData);
      
      expect(effectiveness).toBeWithinRange(0, 1);
      expect(effectiveness).toBeCloseTo(0.8, 1); // 8/10 integration rate
    });

    it('should generate consciousness impact scorecards', async () => {
      const impactData = {
        coherenceMetrics: { score: 0.85, factors: ['consistency', 'logic'] },
        creativityMetrics: { score: 0.78, factors: ['novelty', 'originality'] },
        adaptabilityMetrics: { score: 0.82, factors: ['flexibility', 'responsiveness'] },
      };

      const scorecard = await metrics.generateConsciousnessImpactScorecard(impactData);
      
      expect(scorecard).toMatchObject({
        coherence: expect.any(Number),
        creativity: expect.any(Number),
        adaptability: expect.any(Number),
        overallScore: expect.any(Number),
        timestamp: expect.any(String),
        factors: expect.any(Object),
      });
      
      expect(scorecard.overallScore).toBeWithinRange(0, 1);
    });
  });

  describe('Real-time Updates', () => {
    it('should emit real-time metric updates when enabled', async () => {
      const metricsData = MockFactory.createMetricsData();
      
      await metrics.updateMetrics(metricsData);
      
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('metricsUpdated', {
        timestamp: expect.any(String),
        metrics: metricsData,
      });
    });

    it('should not emit updates when real-time updates are disabled', async () => {
      const disabledConfig = { ...mockConfig, enableRealTimeUpdates: false };
      const disabledMetrics = new SoulWeaverMetrics(disabledConfig, mockEventEmitter);
      
      const metricsData = MockFactory.createMetricsData();
      await disabledMetrics.updateMetrics(metricsData);
      
      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith('metricsUpdated', expect.any(Object));
    });

    it('should handle metric update errors gracefully', async () => {
      const invalidData = null;
      
      await expect(metrics.updateMetrics(invalidData as any)).rejects.toThrow();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('metricsError', expect.any(Object));
    });
  });

  describe('Threshold Monitoring', () => {
    it('should detect when metrics fall below thresholds', async () => {
      const lowQualityData = MockFactory.createMetricsData({
        proposalQuality: 0.5, // Below threshold of 0.7
        adaptationSpeed: 0.4,  // Below threshold of 0.6
      });

      await metrics.updateMetrics(lowQualityData);
      
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('thresholdViolation', {
        metric: 'proposalQuality',
        value: 0.5,
        threshold: 0.7,
        timestamp: expect.any(String),
      });
      
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('thresholdViolation', {
        metric: 'adaptationSpeed',
        value: 0.4,
        threshold: 0.6,
        timestamp: expect.any(String),
      });
    });

    it('should not emit threshold violations for metrics above thresholds', async () => {
      const highQualityData = MockFactory.createMetricsData({
        proposalQuality: 0.9,
        adaptationSpeed: 0.8,
        feedbackIntegration: 0.95,
      });

      await metrics.updateMetrics(highQualityData);
      
      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith('thresholdViolation', expect.any(Object));
    });
  });

  describe('Data Retention', () => {
    it('should clean up old metrics data based on retention policy', async () => {
      vi.useFakeTimers();
      
      // Add old metrics data
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35); // 35 days old
      
      const oldMetrics = MockFactory.createMetricsData({
        timestamp: oldDate.toISOString(),
      });
      
      await metrics.updateMetrics(oldMetrics);
      
      // Trigger cleanup
      await metrics.cleanupOldMetrics();
      
      const retainedMetrics = await metrics.getMetricsHistory();
      expect(retainedMetrics).not.toContainEqual(expect.objectContaining({
        timestamp: oldDate.toISOString(),
      }));
      
      vi.useRealTimers();
    });
  });

  describe('Performance', () => {
    it('should handle high-frequency metric updates efficiently', async () => {
      const updateCount = 1000;
      const updates = Array.from({ length: updateCount }, () => 
        MockFactory.createMetricsData()
      );

      const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
        await Promise.all(updates.map(data => metrics.updateMetrics(data)));
      });

      // Should complete 1000 updates in less than 1 second
      expect(duration).toBeLessThan(1000);
    });

    it('should maintain performance under concurrent access', async () => {
      const concurrentOperations = 50;
      const operations = Array.from({ length: concurrentOperations }, async (_, i) => {
        const data = MockFactory.createMetricsData({ proposalQuality: i / concurrentOperations });
        return metrics.updateMetrics(data);
      });

      const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
        await Promise.all(operations);
      });

      // Should handle concurrent operations efficiently
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid metric data gracefully', async () => {
      const invalidInputs = [
        null,
        undefined,
        {},
        { invalidField: 'test' },
        { proposalQuality: 'not-a-number' },
      ];

      for (const input of invalidInputs) {
        await expect(metrics.updateMetrics(input as any)).rejects.toThrow();
      }
    });

    it('should recover from event emitter errors', async () => {
      mockEventEmitter.emit.mockImplementation(() => {
        throw new Error('Event emitter error');
      });

      const metricsData = MockFactory.createMetricsData();
      
      // Should not throw despite event emitter error
      await expect(metrics.updateMetrics(metricsData)).resolves.not.toThrow();
    });
  });

  describe('Integration', () => {
    it('should integrate with external monitoring systems', async () => {
      const externalMonitor = vi.fn();
      metrics.addExternalMonitor(externalMonitor);

      const metricsData = MockFactory.createMetricsData();
      await metrics.updateMetrics(metricsData);

      expect(externalMonitor).toHaveBeenCalledWith({
        source: 'SoulWeaverMetrics',
        data: metricsData,
        timestamp: expect.any(String),
      });
    });

    it('should export metrics in multiple formats', async () => {
      const metricsData = MockFactory.createMetricsData();
      await metrics.updateMetrics(metricsData);

      const jsonExport = await metrics.exportMetrics('json');
      const csvExport = await metrics.exportMetrics('csv');
      const prometheusExport = await metrics.exportMetrics('prometheus');

      expect(jsonExport).toContain('proposalQuality');
      expect(csvExport).toContain('timestamp,proposalQuality');
      expect(prometheusExport).toContain('soulweaver_proposal_quality');
    });
  });
});