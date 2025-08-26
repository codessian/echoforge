/**
 * Proposal Lineage Tracker Module
 * 
 * Extracted lineage tracking functionality from SoulWeaverBridge for code splitting optimization.
 * This module handles tracking proposal evolution and relationships.
 */

import { EventEmitter } from 'events';
import { CodalogueProtocolLedger } from '../../CodalogueProtocolLedger';
import { ObserverInsight } from '../../observer/CodalogueObserverAgent';
import { EvolutionProposal } from '../SoulWeaverContract';

/**
 * Interface for tracking proposal lineage
 */
export interface ProposalLineageNode {
  id: string;
  parentId?: string;
  sessionContext: string;
  derivedInsights: string[];
  timestamp: Date;
}

/**
 * Configuration for proposal lineage tracking
 */
export interface ProposalLineageConfig {
  /** Whether to track proposal lineage */
  trackProposalLineage: boolean;
  /** Whether to use feedback loop staging for post-implementation insights */
  useFeedbackLoopStaging: boolean;
  /** Whether to enable insight cross-pollination */
  enableInsightCrossPollination: boolean;
  /** Minimum confidence threshold for cross-pollinating insights (0-1) */
  insightCrossPollThreshold: number;
  /** Whether to enable detailed logging */
  enableDetailedLogging: boolean;
}

/**
 * Proposal Lineage Tracker
 * 
 * Manages proposal relationships, evolution tracking, and insight cross-pollination
 */
export class ProposalLineageTracker extends EventEmitter {
  private proposalLineage: Map<string, ProposalLineageNode> = new Map();
  private feedbackStagingBuffer: Array<{
    proposalId: string;
    insights: ObserverInsight[];
    timestamp: Date;
  }> = [];
  private config: ProposalLineageConfig;

  constructor(
    private codalogueProtocolLedger: CodalogueProtocolLedger,
    config: ProposalLineageConfig
  ) {
    super();
    this.config = config;

    if (this.config.enableDetailedLogging) {
      this.codalogueProtocolLedger.recordSystemReflection({
        reflectionType: 'LINEAGE_TRACKER_INITIALIZED',
        content: 'ProposalLineageTracker initialized',
        metadata: { config: this.config },
      });
    }
  }

  /**
   * Tracks a new proposal in the lineage
   */
  public trackProposal(
    proposalId: string,
    sessionContext: string,
    parentId?: string,
    derivedInsights: string[] = []
  ): ProposalLineageNode {
    if (!this.config.trackProposalLineage) {
      throw new Error('Proposal lineage tracking is disabled');
    }

    const lineageNode: ProposalLineageNode = {
      id: proposalId,
      parentId,
      sessionContext,
      derivedInsights,
      timestamp: new Date(),
    };

    this.proposalLineage.set(proposalId, lineageNode);

    if (this.config.enableDetailedLogging) {
      this.codalogueProtocolLedger.recordSystemReflection({
        reflectionType: 'PROPOSAL_LINEAGE_TRACKED',
        content: `Tracked proposal ${proposalId} in lineage`,
        metadata: {
          proposalId,
          parentId,
          sessionContext,
          derivedInsightsCount: derivedInsights.length,
        },
      });
    }

    this.emit('proposal_tracked', lineageNode);
    return lineageNode;
  }

  /**
   * Gets the lineage for a specific proposal
   */
  public getProposalLineage(proposalId: string): ProposalLineageNode | undefined {
    return this.proposalLineage.get(proposalId);
  }

  /**
   * Gets the full lineage tree for a proposal (including ancestors and descendants)
   */
  public getFullLineageTree(proposalId: string): ProposalLineageNode[] {
    const tree: ProposalLineageNode[] = [];
    const visited = new Set<string>();

    // Get ancestors
    this.getAncestors(proposalId, tree, visited);

    // Get descendants
    this.getDescendants(proposalId, tree, visited);

    return tree;
  }

  /**
   * Gets ancestors of a proposal
   */
  private getAncestors(
    proposalId: string,
    tree: ProposalLineageNode[],
    visited: Set<string>
  ): void {
    if (visited.has(proposalId)) return;

    const node = this.proposalLineage.get(proposalId);
    if (!node) return;

    visited.add(proposalId);
    tree.push(node);

    if (node.parentId) {
      this.getAncestors(node.parentId, tree, visited);
    }
  }

  /**
   * Gets descendants of a proposal
   */
  private getDescendants(
    proposalId: string,
    tree: ProposalLineageNode[],
    visited: Set<string>
  ): void {
    for (const [id, node] of this.proposalLineage) {
      if (node.parentId === proposalId && !visited.has(id)) {
        visited.add(id);
        tree.push(node);
        this.getDescendants(id, tree, visited);
      }
    }
  }

  /**
   * Adds insights to the feedback staging buffer
   */
  public stageInsightsForFeedback(
    proposalId: string,
    insights: ObserverInsight[]
  ): void {
    if (!this.config.useFeedbackLoopStaging) {
      throw new Error('Feedback loop staging is disabled');
    }

    this.feedbackStagingBuffer.push({
      proposalId,
      insights,
      timestamp: new Date(),
    });

    if (this.config.enableDetailedLogging) {
      this.codalogueProtocolLedger.recordSystemReflection({
        reflectionType: 'INSIGHTS_STAGED_FOR_FEEDBACK',
        content: `Staged ${insights.length} insights for feedback on proposal ${proposalId}`,
        metadata: {
          proposalId,
          insightsCount: insights.length,
          bufferSize: this.feedbackStagingBuffer.length,
        },
      });
    }

    this.emit('insights_staged', { proposalId, insights });
  }

  /**
   * Processes staged feedback insights
   */
  public processStagedFeedback(): Array<{
    proposalId: string;
    insights: ObserverInsight[];
    timestamp: Date;
  }> {
    const staged = [...this.feedbackStagingBuffer];
    this.feedbackStagingBuffer = [];

    if (this.config.enableDetailedLogging && staged.length > 0) {
      this.codalogueProtocolLedger.recordSystemReflection({
        reflectionType: 'STAGED_FEEDBACK_PROCESSED',
        content: `Processed ${staged.length} staged feedback entries`,
        metadata: {
          processedCount: staged.length,
        },
      });
    }

    this.emit('feedback_processed', staged);
    return staged;
  }

  /**
   * Cross-pollinates insights between related proposals
   */
  public crossPollinateInsights(
    sourceProposalId: string,
    insights: ObserverInsight[]
  ): string[] {
    if (!this.config.enableInsightCrossPollination) {
      return [];
    }

    const crossPollinatedProposals: string[] = [];
    const sourceNode = this.proposalLineage.get(sourceProposalId);
    
    if (!sourceNode) {
      return crossPollinatedProposals;
    }

    // Find related proposals (same session context or lineage)
    for (const [proposalId, node] of this.proposalLineage) {
      if (proposalId === sourceProposalId) continue;

      const isRelated = 
        node.sessionContext === sourceNode.sessionContext ||
        node.parentId === sourceProposalId ||
        sourceNode.parentId === proposalId;

      if (isRelated) {
        // Filter insights by confidence threshold
        const highConfidenceInsights = insights.filter(
          insight => insight.confidence >= this.config.insightCrossPollThreshold
        );

        if (highConfidenceInsights.length > 0) {
          // Add insights to the target proposal's derived insights
          const insightIds = highConfidenceInsights.map(insight => insight.id);
          node.derivedInsights.push(...insightIds);
          crossPollinatedProposals.push(proposalId);

          if (this.config.enableDetailedLogging) {
            this.codalogueProtocolLedger.recordSystemReflection({
              reflectionType: 'INSIGHTS_CROSS_POLLINATED',
              content: `Cross-pollinated ${highConfidenceInsights.length} insights from ${sourceProposalId} to ${proposalId}`,
              metadata: {
                sourceProposalId,
                targetProposalId: proposalId,
                insightsCount: highConfidenceInsights.length,
                insightIds,
              },
            });
          }
        }
      }
    }

    if (crossPollinatedProposals.length > 0) {
      this.emit('insights_cross_pollinated', {
        sourceProposalId,
        targetProposals: crossPollinatedProposals,
        insights,
      });
    }

    return crossPollinatedProposals;
  }

  /**
   * Gets all proposals in the lineage
   */
  public getAllProposals(): ProposalLineageNode[] {
    return Array.from(this.proposalLineage.values());
  }

  /**
   * Gets proposals by session context
   */
  public getProposalsBySession(sessionContext: string): ProposalLineageNode[] {
    return Array.from(this.proposalLineage.values())
      .filter(node => node.sessionContext === sessionContext);
  }

  /**
   * Gets the feedback staging buffer
   */
  public getFeedbackStagingBuffer(): Array<{
    proposalId: string;
    insights: ObserverInsight[];
    timestamp: Date;
  }> {
    return [...this.feedbackStagingBuffer];
  }

  /**
   * Clears old lineage data (older than specified days)
   */
  public clearOldLineageData(daysOld: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let removedCount = 0;
    for (const [id, node] of this.proposalLineage) {
      if (node.timestamp < cutoffDate) {
        this.proposalLineage.delete(id);
        removedCount++;
      }
    }

    // Clear old feedback staging buffer entries
    const originalBufferSize = this.feedbackStagingBuffer.length;
    this.feedbackStagingBuffer = this.feedbackStagingBuffer.filter(
      entry => entry.timestamp >= cutoffDate
    );
    const removedBufferEntries = originalBufferSize - this.feedbackStagingBuffer.length;

    if (this.config.enableDetailedLogging && (removedCount > 0 || removedBufferEntries > 0)) {
      this.codalogueProtocolLedger.recordSystemReflection({
        reflectionType: 'OLD_LINEAGE_DATA_CLEARED',
        content: `Cleared ${removedCount} old lineage entries and ${removedBufferEntries} old feedback entries`,
        metadata: {
          removedLineageEntries: removedCount,
          removedBufferEntries,
          cutoffDate: cutoffDate.toISOString(),
        },
      });
    }

    return removedCount + removedBufferEntries;
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    this.proposalLineage.clear();
    this.feedbackStagingBuffer = [];
    this.removeAllListeners();
  }
}