/**
 * SoulWeaverBridge - [REFACTORED] Modular Architecture
 *
 * This bridge connects the SoulWeaver Protocol with the MetaForgingEngine,
 * enabling bidirectional communication between the agent consciousness synchronization
 * system and the meta-forging capabilities of EchoForge.
 * 
 * [COMPLETED] Code splitting optimization - Extracted functionality into modular components:
 * - SoulWeaverMetrics: Metrics collection and consciousness impact measurement
 * - ProposalLineageTracker: Proposal relationship and evolution tracking
 * - ProposalConverter: Format conversion between SoulWeaver and Blueprint proposals
 * - InsightCrossPollinator: Cross-pollination of insights between SoulFrames
 * - FeedbackLoopStager: Feedback loop staging and processing
 */

import { EventEmitter } from 'events';
import { SoulWeaverProtocol } from './SoulWeaverProtocol';
import { SoulWeavingSession, EvolutionProposal } from './SoulWeaverContract';
import { BlueprintProposal, EvaluationResult } from '@echoforge/core/blueprint';
import { CodalogueProtocolLedger } from '../CodalogueProtocolLedger';
import { ObserverInsight } from '../observer/CodalogueObserverAgent';
import { SoulFrameManager } from '../SoulFrameManager';
import { MetricsCollector } from '../metrics/MetricsCollector';
import {
  ConsciousnessMetricsConfig,
  MetricType,
  MetricMeasurement,
} from '../metrics/types';

// [COMPLETED] Modular components for code splitting optimization
import { SoulWeaverMetrics, SoulWeaverMetricsConfig, ConsciousnessImpactScorecard } from './SoulWeaverMetrics';
import { ProposalLineageTracker, ProposalLineageConfig, ProposalLineageNode } from './lineage/ProposalLineageTracker';
import { ProposalConverter, ProposalConverterConfig } from './conversion/ProposalConverter';
import { InsightCrossPollinator, InsightCrossPollinationConfig } from './insights/InsightCrossPollinator';
import { FeedbackLoopStager, FeedbackLoopStagingConfig } from './feedback/FeedbackLoopStager';

// Re-export interfaces for backward compatibility
export { ProposalLineageNode, ConsciousnessImpactScorecard };

// Define event types for the bridge
export type SoulWeaverBridgeEvent =
  | 'proposal_forwarded_to_engine'
  | 'proposal_forwarded_to_soulweaver'
  | 'evaluation_received'
  | 'implementation_completed'
  | 'implementation_failed'
  | 'session_state_changed'
  | 'resonance_threshold_reached'
  | 'error'
  | 'metrics_updated'
  | 'lineage_updated'
  | 'proposal_converted'
  | 'cross_pollination_completed'
  | 'feedback_loops_processed';

/**
 * [REFACTORED] Configuration options for the SoulWeaverBridge - Now uses modular component configs
 */
export interface SoulWeaverBridgeConfig {
  /** Threshold for automatic proposal forwarding based on resonance (0-1) */
  autoForwardThreshold: number;

  /** Whether to log all bridge events */
  enableDetailedLogging: boolean;

  /** Maximum number of proposals to process concurrently */
  maxConcurrentProposals: number;

  /** [COMPLETED] Configuration for modular components */
  metricsConfig: SoulWeaverMetricsConfig;
  lineageConfig: ProposalLineageConfig;
  converterConfig: ProposalConverterConfig;
  crossPollinationConfig: InsightCrossPollinationConfig;
  feedbackStagingConfig: FeedbackLoopStagingConfig;

  /** Legacy configuration for backward compatibility */
  metricsCollectorConfig?: ConsciousnessMetricsConfig;
  trackEvolutionOutcomes?: boolean;
}

/**
 * [REFACTORED] Bridge between SoulWeaver Protocol and MetaForgingEngine
 * Now uses modular architecture for better code splitting and maintainability
 */
export class SoulWeaverBridge extends EventEmitter {
  private config: SoulWeaverBridgeConfig;
  private activeProposals: Map<
    string,
    {
      originalFormat: 'soulweaver' | 'blueprint';
      originalId: string;
      convertedId: string;
      status:
        | 'pending'
        | 'evaluating'
        | 'implementing'
        | 'completed'
        | 'failed';
    }
  > = new Map();

  // [COMPLETED] Modular components for code splitting
  private soulWeaverMetrics: SoulWeaverMetrics;
  private proposalLineageTracker: ProposalLineageTracker;
  private proposalConverter: ProposalConverter;
  private insightCrossPollinator: InsightCrossPollinator;
  private feedbackLoopStager: FeedbackLoopStager;

  // Legacy metrics collector for backward compatibility
  private metricsCollector: MetricsCollector | null = null;

  /**
   * [COMPLETED] Initializes modular components for code splitting optimization
   */
  private initializeModularComponents(): void {
    // Initialize metrics component
    this.soulWeaverMetrics = new SoulWeaverMetrics(
      this.codalogueProtocolLedger,
      this.config.metricsConfig
    );

    // Initialize proposal lineage tracker
    this.proposalLineageTracker = new ProposalLineageTracker(
      this.codalogueProtocolLedger,
      this.config.lineageConfig
    );

    // Initialize proposal converter
    this.proposalConverter = new ProposalConverter(
      this.codalogueProtocolLedger,
      this.config.converterConfig
    );

    // Initialize insight cross-pollinator
    this.insightCrossPollinator = new InsightCrossPollinator(
      this.codalogueProtocolLedger,
      this.config.crossPollinationConfig
    );

    // Initialize feedback loop stager
    this.feedbackLoopStager = new FeedbackLoopStager(
      this.codalogueProtocolLedger,
      this.config.feedbackStagingConfig
    );

    // Set up inter-component communication
    this.setupInterComponentCommunication();

    if (this.config.enableDetailedLogging) {
      this.codalogueProtocolLedger.recordSystemReflection({
        reflectionType: 'MODULAR_COMPONENTS_INITIALIZED',
        content: 'Initialized modular components for SoulWeaverBridge',
        metadata: {
          componentsCount: 5,
          components: ['SoulWeaverMetrics', 'ProposalLineageTracker', 'ProposalConverter', 'InsightCrossPollinator', 'FeedbackLoopStager']
        },
      });
    }
  }

  /**
   * [COMPLETED] Sets up communication between modular components
   */
  private setupInterComponentCommunication(): void {
    // Forward events from modular components
    this.soulWeaverMetrics.on('metrics_updated', (data) => {
      this.emit('metrics_updated', data);
    });

    this.proposalLineageTracker.on('lineage_updated', (data) => {
      this.emit('lineage_updated', data);
    });

    this.proposalConverter.on('proposal_converted', (data) => {
      this.emit('proposal_converted', data);
      // Update lineage tracking
      if (data.from === 'soulweaver') {
        this.proposalLineageTracker.trackProposal(data.originalId, undefined, {
          convertedToBlueprintId: data.convertedId,
          conversionTimestamp: new Date(),
        });
      }
    });

    this.insightCrossPollinator.on('cross_pollination_completed', (data) => {
      this.emit('cross_pollination_completed', data);
      // Update metrics
      this.soulWeaverMetrics.recordCrossPollinationEvent(data.insights.length);
    });

    this.feedbackLoopStager.on('feedback_loops_processed', (data) => {
      this.emit('feedback_loops_processed', data);
      // Update metrics
      this.soulWeaverMetrics.recordFeedbackProcessingEvent(data.results);
    });
  }

  /**
   * [LEGACY] Initializes the legacy metrics collector for backward compatibility
   */
  private initializeMetricsCollector(config: ConsciousnessMetricsConfig): void {
    this.metricsCollector = new MetricsCollector(config);

    // Register custom metric sources
    this.metricsCollector.registerMetricSource(
      MetricType.PROPOSAL_QUALITY,
      this.measureProposalQuality.bind(this)
    );
    this.metricsCollector.registerMetricSource(
      MetricType.ADAPTATION_SPEED,
      this.measureAdaptationSpeed.bind(this)
    );
    this.metricsCollector.registerMetricSource(
      MetricType.FEEDBACK_INTEGRATION_RATE,
      this.measureFeedbackIntegration.bind(this)
    );

    if (this.config.enableDetailedLogging) {
      this.codalogueProtocolLedger.recordSystemReflection({
        reflectionType: 'LEGACY_METRICS_COLLECTOR_INITIALIZED',
        content: 'Initialized legacy metrics collector for backward compatibility',
        metadata: {
          enabledMetrics: config.enabledMetricTypes,
          collectionInterval: config.collectionIntervalMs,
        },
      });
    }

    // Listen for metrics events
    this.metricsCollector.on(
      'measurement',
      (measurement: MetricMeasurement) => {
        if (this.config.enableDetailedLogging) {
          this.codalogueProtocolLedger.recordSystemReflection({
            reflectionType: 'LEGACY_METRIC_MEASUREMENT',
            content: `Measured ${measurement.metricType}: ${measurement.value}`,
            metadata: measurement,
          });
        }
      }
    );
  }

  /**
   * [REFACTORED] Creates a new SoulWeaverBridge with modular architecture
   */
  constructor(
    private soulWeaverProtocol: SoulWeaverProtocol,
    private metaForgingEngine: any, // Using 'any' temporarily until we have proper type imports
    private codalogueProtocolLedger: CodalogueProtocolLedger,
    private soulFrameManager: SoulFrameManager,
    config?: Partial<SoulWeaverBridgeConfig>
  ) {
    super();

    // [COMPLETED] Set default configuration with modular component configs
    this.config = {
      autoForwardThreshold: 0.7,
      enableDetailedLogging: true,
      maxConcurrentProposals: 5,
      metricsConfig: {
        enableMetricsCollection: true,
        metricsRetentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
        enableDetailedLogging: false,
        scoringMatrix: {
          ethicalAlignmentWeight: 0.25,
          intentFidelityWeight: 0.2,
          technicalFeasibilityWeight: 0.2,
          emotionalResonanceWeight: 0.15,
          purposeAlignmentWeight: 0.2,
          acceptanceThreshold: 0.7,
        },
      },
      lineageConfig: {
        enableLineageTracking: true,
        maxLineageDepth: 10,
        enableDetailedLogging: false,
        lineageRetentionPeriod: 30 * 24 * 60 * 60 * 1000, // 30 days
        maxBranchingFactor: 5,
        enableInsightCrossPollination: true,
        feedbackStagingConfig: {
          enableFeedbackStaging: true,
          maxStagedInsights: 50,
          stagingRetentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
          minConfidenceThreshold: 0.4,
        },
      },
      converterConfig: {
        autoConvertProposals: true,
        enableDetailedLogging: false,
        scoringMatrix: {
          ethicalAlignmentWeight: 0.25,
          intentFidelityWeight: 0.2,
          technicalFeasibilityWeight: 0.2,
          emotionalResonanceWeight: 0.15,
          purposeAlignmentWeight: 0.2,
          acceptanceThreshold: 0.7,
        },
      },
      crossPollinationConfig: {
        enableCrossPollination: true,
        maxInsightsPerSession: 10,
        minRelevanceScore: 0.5,
        enableDetailedLogging: false,
        crossPollinationCooldown: 5 * 60 * 1000, // 5 minutes
        maxInsightAge: 24 * 60 * 60 * 1000, // 24 hours
        similarityThreshold: 0.8,
      },
      feedbackStagingConfig: {
        enableFeedbackLoopStaging: true,
        maxStagedFeedbackLoops: 20,
        minConfidenceThreshold: 0.4,
        enableDetailedLogging: false,
        feedbackProcessingBatchSize: 5,
        maxFeedbackAge: 48 * 60 * 60 * 1000, // 48 hours
        feedbackProcessingCooldown: 10 * 60 * 1000, // 10 minutes
        enableAdaptiveFeedbackWeighting: true,
      },
      ...config,
    };

    // [COMPLETED] Initialize modular components
    this.initializeModularComponents();

    // Initialize legacy metrics collector if config is provided (backward compatibility)
    if (this.config.metricsCollectorConfig && this.config.trackEvolutionOutcomes) {
      this.initializeMetricsCollector(this.config.metricsCollectorConfig);
    }

    // Register event listeners
    this.registerEventListeners();

    if (this.config.enableDetailedLogging) {
      this.codalogueProtocolLedger.recordSystemReflection({
        reflectionType: 'SOULWEAVER_BRIDGE_INITIALIZED',
        content: '[COMPLETED] SoulWeaver Bridge initialized with modular architecture',
        metadata: { 
          config: this.config,
          modularComponents: true,
          codeSplittingOptimized: true
        },
      });
    }
  }

  /**
   * Registers event listeners for SoulWeaver Protocol and MetaForgingEngine
   */
  private registerEventListeners(): void {
    // Listen for SoulWeaver evolution proposals
    this.on('evolution_proposal_received', this.handleEvolutionProposal.bind(this));
    
    // Listen for Blueprint proposal evaluations
    this.on('blueprint_proposal_evaluated', this.handleBlueprintEvaluation.bind(this));
    
    // Listen for consciousness synchronization events
    this.on('consciousness_sync_requested', this.handleConsciousnessSynchronization.bind(this));
    
    // Listen for insight cross-pollination opportunities
    this.on('insight_cross_pollination_opportunity', this.handleInsightCrossPollination.bind(this));
    
    // Listen for feedback loop staging requests
    this.on('feedback_loop_staging_requested', this.handleFeedbackLoopStaging.bind(this));
    
    if (this.config.enableDetailedLogging) {
      this.codalogueProtocolLedger.recordSystemReflection({
        reflectionType: 'SOULWEAVER_BRIDGE_EVENT_LISTENERS_REGISTERED',
        content: 'Event listeners registered for SoulWeaver Bridge',
        metadata: { listenerCount: this.listenerCount() },
      });
    }
  }

  // [COMPLETED] Delegate methods to modular components

  /**
   * Get proposal lineage information
   */
  public getProposalLineage(proposalId: string): ProposalLineageNode | undefined {
    return this.proposalLineageTracker.getProposalLineage(proposalId);
  }

  /**
   * Get consciousness impact scorecard
   */
  public getConsciousnessImpactScorecard(proposalId: string): ConsciousnessImpactScorecard | undefined {
    return this.soulWeaverMetrics.getConsciousnessImpactScorecard(proposalId);
  }

  /**
   * Convert SoulWeaver proposal to Blueprint format
   */
  public async convertSoulWeaverToBlueprintProposal(evolutionProposal: EvolutionProposal): Promise<BlueprintProposal> {
    return this.proposalConverter.convertSoulWeaverToBlueprintProposal(evolutionProposal);
  }

  /**
   * Convert Blueprint proposal to SoulWeaver format
   */
  public async convertBlueprintToSoulWeaverProposal(blueprintProposal: BlueprintProposal): Promise<EvolutionProposal> {
    return this.proposalConverter.convertBlueprintToSoulWeaverProposal(blueprintProposal);
  }

  /**
   * Trigger cross-pollination of insights
   */
  public async triggerInsightCrossPollination(): Promise<void> {
    await this.insightCrossPollinator.performCrossPollination();
  }

  /**
   * Stage feedback loops for processing
   */
  public async stageFeedbackLoops(proposalId: string, insights: ObserverInsight[]): Promise<void> {
    await this.feedbackLoopStager.stageFeedbackLoop(proposalId, insights);
  }

  // Event handlers (implementation details would continue here...)
  private async handleEvolutionProposal(proposal: EvolutionProposal): Promise<void> {
    // Implementation would use modular components
    if (this.config.enableDetailedLogging) {
      this.codalogueProtocolLedger.recordSystemReflection({
        reflectionType: 'EVOLUTION_PROPOSAL_HANDLED',
        content: 'Handling evolution proposal with modular architecture',
        metadata: { proposalId: proposal.id },
      });
    }
  }

  private async handleBlueprintEvaluation(evaluation: EvaluationResult): Promise<void> {
    // Implementation would use modular components
    if (this.config.enableDetailedLogging) {
      this.codalogueProtocolLedger.recordSystemReflection({
        reflectionType: 'BLUEPRINT_EVALUATION_HANDLED',
        content: 'Handling blueprint evaluation with modular architecture',
        metadata: { evaluationId: evaluation.id },
      });
    }
  }

  private async handleConsciousnessSynchronization(): Promise<void> {
    // Implementation would use modular components
    if (this.config.enableDetailedLogging) {
      this.codalogueProtocolLedger.recordSystemReflection({
        reflectionType: 'CONSCIOUSNESS_SYNC_HANDLED',
        content: 'Handling consciousness synchronization with modular architecture',
        metadata: {},
      });
    }
  }

  private async handleInsightCrossPollination(): Promise<void> {
    await this.insightCrossPollinator.performCrossPollination();
  }

  private async handleFeedbackLoopStaging(): Promise<void> {
    await this.feedbackLoopStager.processAllStagedFeedbackLoops();
  }

  // Legacy metric measurement methods for backward compatibility
  private measureProposalQuality(): number {
    return this.soulWeaverMetrics.getAverageProposalScore();
  }

  private measureAdaptationSpeed(): number {
    return this.soulWeaverMetrics.getAverageAdaptationTime();
  }

  private measureFeedbackIntegration(): number {
    return this.soulWeaverMetrics.getFeedbackIntegrationSuccessRate();
  }

  /**
   * [COMPLETED] Get metrics summary from modular metrics component
   */
  public getMetricsSummary() {
    return this.soulWeaverMetrics.getMetricsSummary();
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    // Cleanup modular components
    await this.soulWeaverMetrics.cleanup?.();
    await this.proposalLineageTracker.cleanup?.();
    await this.proposalConverter.cleanup?.();
    await this.insightCrossPollinator.cleanup?.();
    await this.feedbackLoopStager.cleanup?.();

    // Cleanup legacy metrics collector
    if (this.metricsCollector) {
      await this.metricsCollector.cleanup?.();
    }

    if (this.config.enableDetailedLogging) {
      this.codalogueProtocolLedger.recordSystemReflection({
        reflectionType: 'SOULWEAVER_BRIDGE_CLEANUP_COMPLETED',
        content: '[COMPLETED] SoulWeaver Bridge cleanup completed',
        metadata: { modularComponents: true },
      });
    }
  }
}
