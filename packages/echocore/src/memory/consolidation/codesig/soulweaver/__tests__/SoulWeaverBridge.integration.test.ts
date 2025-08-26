/**
 * Integration Test Suite for SoulWeaverBridge
 * Tests the complete integration of all modular components
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SoulWeaverBridge } from '../SoulWeaverBridge';
import { MockFactory, AsyncTestUtils, PerformanceTestUtils } from '@test-utils';
import type { SoulWeaverBridgeConfig } from '../SoulWeaverBridge';

describe('SoulWeaverBridge Integration Tests', () => {
  let bridge: SoulWeaverBridge;
  let mockConfig: SoulWeaverBridgeConfig;
  let mockSoulWeaverProtocol: any;
  let mockMetaForgingEngine: any;

  beforeEach(() => {
    // Create comprehensive mock configuration
    mockConfig = {
      autoForward: true,
      enableProposalConversion: true,
      enableLogging: true,
      maxConcurrentProposals: 10,
      scoringMatrix: {
        complexity: 0.3,
        feasibility: 0.25,
        innovation: 0.2,
        alignment: 0.15,
        impact: 0.1,
      },
      soulWeaverInsights: {
        enabled: true,
        maxInsightsPerSession: 50,
        relevanceThreshold: 0.7,
        enableLogging: true,
      },
      insightCrossPollination: {
        enabled: true,
        maxInsightsPerSession: 25,
        relevanceThreshold: 0.6,
        enableLogging: true,
        cooldownPeriod: 5000,
        maxInsightAge: 3600000,
      },
      proposalLineageTracking: {
        enabled: true,
        maxLineageDepth: 10,
        enableCrossPollination: true,
        retentionPeriod: 86400000,
      },
      consciousnessImpactScorecard: {
        enabled: true,
        updateInterval: 30000,
        thresholds: {
          coherence: 0.7,
          creativity: 0.6,
          adaptability: 0.8,
        },
      },
      feedbackLoopStaging: {
        enabled: true,
        maxStagedLoops: 20,
        processingInterval: 10000,
        enableAutoProcessing: true,
      },
    };

    // Create mock dependencies
    mockSoulWeaverProtocol = MockFactory.createEventEmitterMock();
    mockMetaForgingEngine = MockFactory.createEventEmitterMock();

    // Add protocol-specific methods
    mockSoulWeaverProtocol.getActiveProposals = vi.fn().mockResolvedValue([]);
    mockSoulWeaverProtocol.submitProposal = vi.fn().mockResolvedValue({ success: true });
    mockMetaForgingEngine.processBlueprint = vi.fn().mockResolvedValue({ success: true });
    mockMetaForgingEngine.getProcessingStatus = vi.fn().mockResolvedValue('idle');

    bridge = new SoulWeaverBridge(
      mockSoulWeaverProtocol,
      mockMetaForgingEngine,
      mockConfig
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('End-to-End Proposal Processing', () => {
    it('should handle complete proposal lifecycle', async () => {
      const proposal = MockFactory.createBlueprintProposal({
        name: 'Integration Test Proposal',
        capabilities: {
          functions: [
            {
              name: 'processData',
              description: 'Processes incoming data with advanced algorithms',
              parameters: { data: 'object', options: 'object' },
            },
          ],
        },
      });

      // Submit proposal
      const submissionResult = await bridge.submitProposal(proposal);
      expect(submissionResult.success).toBe(true);
      expect(submissionResult.proposalId).toBeDefined();

      // Wait for processing
      await AsyncTestUtils.waitFor(
        () => bridge.getActiveProposals().length === 0,
        10000
      );

      // Verify proposal was processed
      expect(mockMetaForgingEngine.processBlueprint).toHaveBeenCalledWith(
        expect.objectContaining({
          id: proposal.id,
          name: proposal.name,
        })
      );

      // Check metrics were collected
      const metrics = await bridge.getMetrics();
      expect(metrics.totalProposalsProcessed).toBeGreaterThan(0);
    });

    it('should handle proposal conversion and scoring', async () => {
      const soulWeaverProposal = {
        id: 'sw-proposal-1',
        concept: 'Advanced data processing',
        insights: ['insight1', 'insight2'],
        complexity: 0.8,
        novelty: 0.9,
      };

      const conversionResult = await bridge.convertProposal(soulWeaverProposal);
      
      expect(conversionResult).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        intent: expect.any(String),
        capabilities: expect.any(Object),
        score: expect.any(Number),
      });

      expect(conversionResult.score).toBeWithinRange(0, 1);
    });

    it('should track proposal lineage throughout processing', async () => {
      const parentProposal = MockFactory.createBlueprintProposal({ name: 'Parent Proposal' });
      const childProposal = MockFactory.createBlueprintProposal({ 
        name: 'Child Proposal',
        parentId: parentProposal.id,
      });

      await bridge.submitProposal(parentProposal);
      await bridge.submitProposal(childProposal);

      const lineage = await bridge.getProposalLineage(childProposal.id);
      
      expect(lineage).toMatchObject({
        proposalId: childProposal.id,
        ancestors: expect.arrayContaining([parentProposal.id]),
        descendants: expect.any(Array),
        depth: expect.any(Number),
      });
    });
  });

  describe('Cross-Pollination Integration', () => {
    it('should facilitate insight cross-pollination between SoulFrames', async () => {
      const soulFrame1 = 'frame-analytics';
      const soulFrame2 = 'frame-creativity';

      const insight1 = MockFactory.createSoulWeaverInsight({
        content: 'Advanced pattern recognition techniques',
        source: soulFrame1,
        relevanceScore: 0.85,
      });

      const insight2 = MockFactory.createSoulWeaverInsight({
        content: 'Creative problem-solving approaches',
        source: soulFrame2,
        relevanceScore: 0.78,
      });

      // Register SoulFrames and add insights
      await bridge.registerSoulFrame(soulFrame1);
      await bridge.registerSoulFrame(soulFrame2);
      await bridge.addInsight(soulFrame1, insight1);
      await bridge.addInsight(soulFrame2, insight2);

      // Trigger cross-pollination
      await bridge.performCrossPollination();

      // Verify insights were shared
      const frame1Insights = await bridge.getSoulFrameInsights(soulFrame1);
      const frame2Insights = await bridge.getSoulFrameInsights(soulFrame2);

      expect(frame1Insights.some(i => i.source === soulFrame2)).toBe(true);
      expect(frame2Insights.some(i => i.source === soulFrame1)).toBe(true);
    });

    it('should respect relevance thresholds in cross-pollination', async () => {
      const soulFrame1 = 'frame-test1';
      const soulFrame2 = 'frame-test2';

      const lowRelevanceInsight = MockFactory.createSoulWeaverInsight({
        content: 'Low relevance insight',
        source: soulFrame1,
        relevanceScore: 0.3, // Below threshold
      });

      await bridge.registerSoulFrame(soulFrame1);
      await bridge.registerSoulFrame(soulFrame2);
      await bridge.addInsight(soulFrame1, lowRelevanceInsight);

      await bridge.performCrossPollination();

      const frame2Insights = await bridge.getSoulFrameInsights(soulFrame2);
      expect(frame2Insights.some(i => i.id === lowRelevanceInsight.id)).toBe(false);
    });
  });

  describe('Feedback Loop Integration', () => {
    it('should stage and process feedback loops automatically', async () => {
      const feedbackLoop = {
        id: 'feedback-loop-1',
        source: 'user-interaction',
        type: 'performance-feedback',
        data: {
          proposalId: 'test-proposal-1',
          rating: 4.5,
          comments: 'Excellent performance, minor improvements needed',
          metrics: { speed: 0.9, accuracy: 0.85 },
        },
        priority: 'high',
        timestamp: new Date().toISOString(),
      };

      // Stage feedback loop
      const stagingResult = await bridge.stageFeedbackLoop(feedbackLoop);
      expect(stagingResult.success).toBe(true);
      expect(stagingResult.stagedId).toBeDefined();

      // Wait for auto-processing
      await AsyncTestUtils.waitFor(
        async () => {
          const staged = await bridge.getStagedFeedbackLoops();
          return staged.length === 0;
        },
        15000
      );

      // Verify processing occurred
      const processedLoops = await bridge.getProcessedFeedbackLoops();
      expect(processedLoops.some(loop => loop.id === feedbackLoop.id)).toBe(true);
    });

    it('should integrate feedback into proposal improvements', async () => {
      const originalProposal = MockFactory.createBlueprintProposal({
        name: 'Original Proposal',
        capabilities: {
          functions: [{
            name: 'basicFunction',
            description: 'Basic functionality',
            parameters: {},
          }],
        },
      });

      const improvementFeedback = {
        id: 'improvement-feedback',
        source: 'expert-review',
        type: 'enhancement-suggestion',
        data: {
          proposalId: originalProposal.id,
          suggestions: [
            'Add error handling',
            'Improve parameter validation',
            'Add performance monitoring',
          ],
          priority: 'high',
        },
        timestamp: new Date().toISOString(),
      };

      await bridge.submitProposal(originalProposal);
      await bridge.stageFeedbackLoop(improvementFeedback);

      // Wait for feedback integration
      await AsyncTestUtils.waitFor(
        async () => {
          const lineage = await bridge.getProposalLineage(originalProposal.id);
          return lineage.descendants.length > 0;
        },
        10000
      );

      const lineage = await bridge.getProposalLineage(originalProposal.id);
      expect(lineage.descendants.length).toBeGreaterThan(0);
    });
  });

  describe('Metrics and Monitoring Integration', () => {
    it('should collect comprehensive metrics across all components', async () => {
      const proposal = MockFactory.createBlueprintProposal();
      
      await bridge.submitProposal(proposal);
      await AsyncTestUtils.delay(1000); // Allow metrics collection

      const metrics = await bridge.getComprehensiveMetrics();
      
      expect(metrics).toMatchObject({
        proposals: {
          total: expect.any(Number),
          successful: expect.any(Number),
          failed: expect.any(Number),
          averageProcessingTime: expect.any(Number),
        },
        insights: {
          total: expect.any(Number),
          crossPollinated: expect.any(Number),
          averageRelevance: expect.any(Number),
        },
        feedback: {
          staged: expect.any(Number),
          processed: expect.any(Number),
          integrated: expect.any(Number),
        },
        consciousness: {
          coherence: expect.any(Number),
          creativity: expect.any(Number),
          adaptability: expect.any(Number),
          overallScore: expect.any(Number),
        },
      });
    });

    it('should emit real-time metric updates', async () => {
      const metricsUpdates: any[] = [];
      
      bridge.on('metricsUpdate', (update) => {
        metricsUpdates.push(update);
      });

      const proposal = MockFactory.createBlueprintProposal();
      await bridge.submitProposal(proposal);

      await AsyncTestUtils.waitFor(
        () => metricsUpdates.length > 0,
        5000
      );

      expect(metricsUpdates.length).toBeGreaterThan(0);
      expect(metricsUpdates[0]).toMatchObject({
        timestamp: expect.any(String),
        component: expect.any(String),
        metrics: expect.any(Object),
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high-volume proposal processing', async () => {
      const proposalCount = 100;
      const proposals = Array.from({ length: proposalCount }, (_, i) =>
        MockFactory.createBlueprintProposal({ name: `Proposal ${i}` })
      );

      const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
        await Promise.all(proposals.map(p => bridge.submitProposal(p)));
      });

      // Should process 100 proposals in reasonable time
      expect(duration).toBeLessThan(5000);

      // Verify all proposals were processed
      await AsyncTestUtils.waitFor(
        () => bridge.getActiveProposals().length === 0,
        10000
      );

      const metrics = await bridge.getMetrics();
      expect(metrics.totalProposalsProcessed).toBe(proposalCount);
    });

    it('should maintain performance under concurrent operations', async () => {
      const operations = [
        () => bridge.submitProposal(MockFactory.createBlueprintProposal()),
        () => bridge.performCrossPollination(),
        () => bridge.stageFeedbackLoop({
          id: 'concurrent-feedback',
          source: 'test',
          type: 'test',
          data: {},
          timestamp: new Date().toISOString(),
        }),
        () => bridge.getMetrics(),
        () => bridge.getComprehensiveMetrics(),
      ];

      const concurrentRuns = 20;
      const allOperations = Array.from({ length: concurrentRuns }, () => 
        operations[Math.floor(Math.random() * operations.length)]()
      );

      const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
        await Promise.all(allOperations);
      });

      // Should handle concurrent operations efficiently
      expect(duration).toBeLessThan(3000);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle component failures gracefully', async () => {
      // Simulate MetaForgingEngine failure
      mockMetaForgingEngine.processBlueprint.mockRejectedValue(
        new Error('MetaForgingEngine unavailable')
      );

      const proposal = MockFactory.createBlueprintProposal();
      const result = await bridge.submitProposal(proposal);

      expect(result.success).toBe(false);
      expect(result.error).toContain('MetaForgingEngine unavailable');

      // Verify bridge continues to function
      const metrics = await bridge.getMetrics();
      expect(metrics.totalErrors).toBeGreaterThan(0);
    });

    it('should recover from temporary failures', async () => {
      let failureCount = 0;
      mockMetaForgingEngine.processBlueprint.mockImplementation(() => {
        failureCount++;
        if (failureCount <= 2) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve({ success: true });
      });

      const proposal = MockFactory.createBlueprintProposal();
      
      // First attempts should fail
      let result = await bridge.submitProposal(proposal);
      expect(result.success).toBe(false);

      result = await bridge.submitProposal(proposal);
      expect(result.success).toBe(false);

      // Third attempt should succeed
      result = await bridge.submitProposal(proposal);
      expect(result.success).toBe(true);
    });
  });

  describe('Configuration and Customization', () => {
    it('should respect configuration changes at runtime', async () => {
      // Change configuration
      await bridge.updateConfiguration({
        maxConcurrentProposals: 5,
        autoForward: false,
      });

      const config = await bridge.getConfiguration();
      expect(config.maxConcurrentProposals).toBe(5);
      expect(config.autoForward).toBe(false);

      // Verify behavior changes
      const proposals = Array.from({ length: 10 }, () => 
        MockFactory.createBlueprintProposal()
      );

      await Promise.all(proposals.map(p => bridge.submitProposal(p)));
      
      const activeProposals = bridge.getActiveProposals();
      expect(activeProposals.length).toBeLessThanOrEqual(5);
    });

    it('should validate configuration changes', async () => {
      const invalidConfig = {
        maxConcurrentProposals: -1,
        scoringMatrix: {
          complexity: 1.5, // Invalid: > 1
        },
      };

      await expect(bridge.updateConfiguration(invalidConfig))
        .rejects.toThrow('Invalid configuration');
    });
  });
});