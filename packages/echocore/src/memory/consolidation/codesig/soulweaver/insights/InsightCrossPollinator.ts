/**
 * Insight Cross-Pollination Module
 * 
 * Extracted insight cross-pollination functionality from SoulWeaverBridge for code splitting optimization.
 * This module handles the sharing and cross-pollination of insights between different SoulFrames.
 */

import { EventEmitter } from 'events';
import { ObserverInsight } from '../ObserverInsight';
import { CodalogueProtocolLedger } from '../../CodalogueProtocolLedger';

/**
 * Configuration for insight cross-pollination
 */
export interface InsightCrossPollinationConfig {
  /** Whether to enable cross-pollination between SoulFrames */
  enableCrossPollination: boolean;
  /** Maximum number of insights to cross-pollinate per session */
  maxInsightsPerSession: number;
  /** Minimum relevance score for cross-pollination (0-1) */
  minRelevanceScore: number;
  /** Whether to enable detailed logging */
  enableDetailedLogging: boolean;
  /** Cooldown period between cross-pollination attempts (ms) */
  crossPollinationCooldown: number;
  /** Maximum age of insights to consider for cross-pollination (ms) */
  maxInsightAge: number;
  /** Similarity threshold for avoiding duplicate insights (0-1) */
  similarityThreshold: number;
}

/**
 * Interface for tracking cross-pollinated insights
 */
export interface CrossPollinatedInsight {
  originalInsight: ObserverInsight;
  sourceSoulFrameId: string;
  targetSoulFrameId: string;
  relevanceScore: number;
  crossPollinationTimestamp: Date;
  adaptations: string[];
  status: 'pending' | 'applied' | 'rejected' | 'expired';
  metadata?: Record<string, any>;
}

/**
 * Interface for SoulFrame insight context
 */
export interface SoulFrameInsightContext {
  soulFrameId: string;
  activeInsights: ObserverInsight[];
  recentInsights: ObserverInsight[];
  insightCategories: string[];
  contextualTags: string[];
  lastPollinationTimestamp?: Date;
}

/**
 * Insight Cross-Pollinator
 * 
 * Manages the cross-pollination of insights between different SoulFrames
 */
export class InsightCrossPollinator extends EventEmitter {
  private soulFrameContexts: Map<string, SoulFrameInsightContext> = new Map();
  private crossPollinatedInsights: Map<string, CrossPollinatedInsight> = new Map();
  private lastPollinationAttempt: Date | null = null;
  private config: InsightCrossPollinationConfig;

  constructor(
    private codalogueProtocolLedger: CodalogueProtocolLedger,
    config: InsightCrossPollinationConfig
  ) {
    super();
    this.config = config;

    if (this.config.enableDetailedLogging) {
      this.codalogueProtocolLedger.recordSystemReflection({
        reflectionType: 'INSIGHT_CROSS_POLLINATOR_INITIALIZED',
        content: 'InsightCrossPollinator initialized',
        metadata: { config: this.config },
      });
    }
  }

  /**
   * Registers a SoulFrame for cross-pollination
   */
  public registerSoulFrame(
    soulFrameId: string,
    initialInsights: ObserverInsight[] = [],
    contextualTags: string[] = []
  ): void {
    const context: SoulFrameInsightContext = {
      soulFrameId,
      activeInsights: initialInsights,
      recentInsights: [],
      insightCategories: this.extractInsightCategories(initialInsights),
      contextualTags,
      lastPollinationTimestamp: undefined,
    };

    this.soulFrameContexts.set(soulFrameId, context);

    if (this.config.enableDetailedLogging) {
      this.codalogueProtocolLedger.recordSystemReflection({
        reflectionType: 'SOULFRAME_REGISTERED_FOR_CROSS_POLLINATION',
        content: `Registered SoulFrame ${soulFrameId} for cross-pollination`,
        metadata: {
          soulFrameId,
          initialInsightCount: initialInsights.length,
          contextualTags,
        },
      });
    }

    this.emit('soulframe_registered', { soulFrameId, context });
  }

  /**
   * Updates insights for a SoulFrame
   */
  public updateSoulFrameInsights(
    soulFrameId: string,
    newInsights: ObserverInsight[]
  ): void {
    const context = this.soulFrameContexts.get(soulFrameId);
    if (!context) {
      throw new Error(`SoulFrame ${soulFrameId} not registered for cross-pollination`);
    }

    // Move current active insights to recent insights
    context.recentInsights = [...context.activeInsights, ...context.recentInsights]
      .slice(0, 50); // Keep only the 50 most recent

    // Update active insights
    context.activeInsights = newInsights;
    context.insightCategories = this.extractInsightCategories(newInsights);

    if (this.config.enableDetailedLogging) {
      this.codalogueProtocolLedger.recordSystemReflection({
        reflectionType: 'SOULFRAME_INSIGHTS_UPDATED',
        content: `Updated insights for SoulFrame ${soulFrameId}`,
        metadata: {
          soulFrameId,
          newInsightCount: newInsights.length,
          totalRecentInsights: context.recentInsights.length,
        },
      });
    }

    this.emit('soulframe_insights_updated', { soulFrameId, newInsights, context });

    // Trigger cross-pollination if conditions are met
    this.considerCrossPollination(soulFrameId);
  }

  /**
   * Performs cross-pollination between SoulFrames
   */
  public async performCrossPollination(): Promise<CrossPollinatedInsight[]> {
    if (!this.config.enableCrossPollination) {
      return [];
    }

    // Check cooldown
    if (this.lastPollinationAttempt) {
      const timeSinceLastAttempt = Date.now() - this.lastPollinationAttempt.getTime();
      if (timeSinceLastAttempt < this.config.crossPollinationCooldown) {
        return [];
      }
    }

    this.lastPollinationAttempt = new Date();
    const crossPollinatedInsights: CrossPollinatedInsight[] = [];

    const soulFrameIds = Array.from(this.soulFrameContexts.keys());
    
    // Cross-pollinate between all pairs of SoulFrames
    for (let i = 0; i < soulFrameIds.length; i++) {
      for (let j = i + 1; j < soulFrameIds.length; j++) {
        const sourceId = soulFrameIds[i];
        const targetId = soulFrameIds[j];

        // Pollinate from source to target
        const sourceToTarget = await this.crossPollinateBetweenFrames(sourceId, targetId);
        crossPollinatedInsights.push(...sourceToTarget);

        // Pollinate from target to source
        const targetToSource = await this.crossPollinateBetweenFrames(targetId, sourceId);
        crossPollinatedInsights.push(...targetToSource);
      }
    }

    if (this.config.enableDetailedLogging && crossPollinatedInsights.length > 0) {
      this.codalogueProtocolLedger.recordSystemReflection({
        reflectionType: 'CROSS_POLLINATION_COMPLETED',
        content: `Cross-pollination completed with ${crossPollinatedInsights.length} insights`,
        metadata: {
          crossPollinatedCount: crossPollinatedInsights.length,
          soulFrameCount: soulFrameIds.length,
        },
      });
    }

    this.emit('cross_pollination_completed', { insights: crossPollinatedInsights });

    return crossPollinatedInsights;
  }

  /**
   * Cross-pollinates insights between two specific SoulFrames
   */
  private async crossPollinateBetweenFrames(
    sourceSoulFrameId: string,
    targetSoulFrameId: string
  ): Promise<CrossPollinatedInsight[]> {
    const sourceContext = this.soulFrameContexts.get(sourceSoulFrameId);
    const targetContext = this.soulFrameContexts.get(targetSoulFrameId);

    if (!sourceContext || !targetContext) {
      return [];
    }

    const crossPollinatedInsights: CrossPollinatedInsight[] = [];
    const candidateInsights = [...sourceContext.activeInsights, ...sourceContext.recentInsights]
      .filter(insight => this.isInsightEligibleForCrossPollination(insight));

    for (const insight of candidateInsights) {
      const relevanceScore = this.calculateInsightRelevance(insight, targetContext);
      
      if (relevanceScore >= this.config.minRelevanceScore) {
        // Check for similarity with existing insights in target
        const isDuplicate = this.checkForDuplicateInsight(insight, targetContext);
        
        if (!isDuplicate) {
          const crossPollinatedInsight: CrossPollinatedInsight = {
            originalInsight: insight,
            sourceSoulFrameId,
            targetSoulFrameId,
            relevanceScore,
            crossPollinationTimestamp: new Date(),
            adaptations: this.generateInsightAdaptations(insight, targetContext),
            status: 'pending',
            metadata: {
              sourceCategories: sourceContext.insightCategories,
              targetCategories: targetContext.insightCategories,
              contextualOverlap: this.calculateContextualOverlap(sourceContext, targetContext),
            },
          };

          const insightId = this.generateCrossPollinatedInsightId(crossPollinatedInsight);
          this.crossPollinatedInsights.set(insightId, crossPollinatedInsight);
          crossPollinatedInsights.push(crossPollinatedInsight);

          if (this.config.enableDetailedLogging) {
            this.codalogueProtocolLedger.recordSystemReflection({
              reflectionType: 'INSIGHT_CROSS_POLLINATED',
              content: `Cross-pollinated insight from ${sourceSoulFrameId} to ${targetSoulFrameId}`,
              metadata: {
                insightId,
                sourceSoulFrameId,
                targetSoulFrameId,
                relevanceScore,
                adaptationCount: crossPollinatedInsight.adaptations.length,
              },
            });
          }

          this.emit('insight_cross_pollinated', { insightId, insight: crossPollinatedInsight });
        }
      }
    }

    return crossPollinatedInsights;
  }

  /**
   * Checks if an insight is eligible for cross-pollination
   */
  private isInsightEligibleForCrossPollination(insight: ObserverInsight): boolean {
    const insightAge = Date.now() - new Date(insight.timestamp).getTime();
    return insightAge <= this.config.maxInsightAge;
  }

  /**
   * Calculates the relevance of an insight to a target SoulFrame
   */
  private calculateInsightRelevance(
    insight: ObserverInsight,
    targetContext: SoulFrameInsightContext
  ): number {
    let relevanceScore = 0;

    // Category overlap
    const insightCategories = this.extractInsightCategories([insight]);
    const categoryOverlap = insightCategories.filter(cat => 
      targetContext.insightCategories.includes(cat)
    ).length;
    relevanceScore += (categoryOverlap / Math.max(insightCategories.length, 1)) * 0.4;

    // Contextual tag overlap
    const insightTags = insight.metadata?.tags || [];
    const tagOverlap = insightTags.filter(tag => 
      targetContext.contextualTags.includes(tag)
    ).length;
    relevanceScore += (tagOverlap / Math.max(insightTags.length, 1)) * 0.3;

    // Confidence score
    relevanceScore += (insight.confidence || 0.5) * 0.2;

    // Recency bonus
    const insightAge = Date.now() - new Date(insight.timestamp).getTime();
    const recencyBonus = Math.max(0, 1 - (insightAge / this.config.maxInsightAge)) * 0.1;
    relevanceScore += recencyBonus;

    return Math.min(relevanceScore, 1);
  }

  /**
   * Checks for duplicate insights in the target context
   */
  private checkForDuplicateInsight(
    insight: ObserverInsight,
    targetContext: SoulFrameInsightContext
  ): boolean {
    const allTargetInsights = [...targetContext.activeInsights, ...targetContext.recentInsights];
    
    for (const targetInsight of allTargetInsights) {
      const similarity = this.calculateInsightSimilarity(insight, targetInsight);
      if (similarity >= this.config.similarityThreshold) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculates similarity between two insights
   */
  private calculateInsightSimilarity(
    insight1: ObserverInsight,
    insight2: ObserverInsight
  ): number {
    // Simple similarity calculation based on content and type
    let similarity = 0;

    // Type similarity
    if (insight1.type === insight2.type) {
      similarity += 0.3;
    }

    // Content similarity (simplified)
    const content1 = insight1.content.toLowerCase();
    const content2 = insight2.content.toLowerCase();
    const commonWords = this.getCommonWords(content1, content2);
    const totalWords = this.getUniqueWords(content1 + ' ' + content2).length;
    similarity += (commonWords.length / totalWords) * 0.5;

    // Metadata similarity
    const metadata1 = insight1.metadata || {};
    const metadata2 = insight2.metadata || {};
    const commonKeys = Object.keys(metadata1).filter(key => key in metadata2);
    similarity += (commonKeys.length / Math.max(Object.keys(metadata1).length, Object.keys(metadata2).length, 1)) * 0.2;

    return Math.min(similarity, 1);
  }

  /**
   * Generates adaptations for cross-pollinated insights
   */
  private generateInsightAdaptations(
    insight: ObserverInsight,
    targetContext: SoulFrameInsightContext
  ): string[] {
    const adaptations: string[] = [];

    // Context-specific adaptations
    if (targetContext.contextualTags.length > 0) {
      adaptations.push(`Adapted for context: ${targetContext.contextualTags.join(', ')}`);
    }

    // Category-specific adaptations
    const targetCategories = targetContext.insightCategories;
    if (targetCategories.length > 0) {
      adaptations.push(`Aligned with categories: ${targetCategories.join(', ')}`);
    }

    // SoulFrame-specific adaptation
    adaptations.push(`Customized for SoulFrame: ${targetContext.soulFrameId}`);

    return adaptations;
  }

  /**
   * Calculates contextual overlap between two SoulFrames
   */
  private calculateContextualOverlap(
    sourceContext: SoulFrameInsightContext,
    targetContext: SoulFrameInsightContext
  ): number {
    const sourceTags = new Set([...sourceContext.contextualTags, ...sourceContext.insightCategories]);
    const targetTags = new Set([...targetContext.contextualTags, ...targetContext.insightCategories]);
    
    const intersection = new Set([...sourceTags].filter(tag => targetTags.has(tag)));
    const union = new Set([...sourceTags, ...targetTags]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Considers whether to trigger cross-pollination
   */
  private considerCrossPollination(soulFrameId: string): void {
    const context = this.soulFrameContexts.get(soulFrameId);
    if (!context) return;

    // Check if enough time has passed since last pollination for this SoulFrame
    if (context.lastPollinationTimestamp) {
      const timeSinceLastPollination = Date.now() - context.lastPollinationTimestamp.getTime();
      if (timeSinceLastPollination < this.config.crossPollinationCooldown) {
        return;
      }
    }

    // Check if there are enough insights to warrant cross-pollination
    if (context.activeInsights.length >= 3) {
      context.lastPollinationTimestamp = new Date();
      // Trigger async cross-pollination
      setImmediate(() => this.performCrossPollination());
    }
  }

  /**
   * Extracts insight categories from insights
   */
  private extractInsightCategories(insights: ObserverInsight[]): string[] {
    const categories = new Set<string>();
    
    for (const insight of insights) {
      categories.add(insight.type);
      
      // Extract categories from metadata
      const metadataCategories = insight.metadata?.categories || [];
      metadataCategories.forEach(cat => categories.add(cat));
      
      // Extract categories from tags
      const tags = insight.metadata?.tags || [];
      tags.forEach(tag => categories.add(tag));
    }
    
    return Array.from(categories);
  }

  /**
   * Generates a unique ID for cross-pollinated insight
   */
  private generateCrossPollinatedInsightId(insight: CrossPollinatedInsight): string {
    const timestamp = insight.crossPollinationTimestamp.getTime();
    const hash = this.simpleHash(
      `${insight.sourceSoulFrameId}-${insight.targetSoulFrameId}-${insight.originalInsight.id}-${timestamp}`
    );
    return `cross_pollinated_${hash}`;
  }

  /**
   * Simple hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Gets common words between two strings
   */
  private getCommonWords(str1: string, str2: string): string[] {
    const words1 = str1.split(/\s+/).filter(word => word.length > 2);
    const words2 = str2.split(/\s+/).filter(word => word.length > 2);
    return words1.filter(word => words2.includes(word));
  }

  /**
   * Gets unique words from a string
   */
  private getUniqueWords(str: string): string[] {
    const words = str.split(/\s+/).filter(word => word.length > 2);
    return Array.from(new Set(words));
  }

  /**
   * Gets cross-pollinated insight by ID
   */
  public getCrossPollinatedInsight(insightId: string): CrossPollinatedInsight | undefined {
    return this.crossPollinatedInsights.get(insightId);
  }

  /**
   * Gets all cross-pollinated insights
   */
  public getAllCrossPollinatedInsights(): CrossPollinatedInsight[] {
    return Array.from(this.crossPollinatedInsights.values());
  }

  /**
   * Gets cross-pollinated insights by status
   */
  public getCrossPollinatedInsightsByStatus(
    status: CrossPollinatedInsight['status']
  ): CrossPollinatedInsight[] {
    return Array.from(this.crossPollinatedInsights.values())
      .filter(insight => insight.status === status);
  }

  /**
   * Updates the status of a cross-pollinated insight
   */
  public updateCrossPollinatedInsightStatus(
    insightId: string,
    status: CrossPollinatedInsight['status'],
    metadata?: Record<string, any>
  ): void {
    const insight = this.crossPollinatedInsights.get(insightId);
    if (insight) {
      insight.status = status;
      if (metadata) {
        insight.metadata = { ...insight.metadata, ...metadata };
      }

      if (this.config.enableDetailedLogging) {
        this.codalogueProtocolLedger.recordSystemReflection({
          reflectionType: 'CROSS_POLLINATED_INSIGHT_STATUS_UPDATED',
          content: `Updated cross-pollinated insight ${insightId} status to ${status}`,
          metadata: {
            insightId,
            status,
            sourceSoulFrameId: insight.sourceSoulFrameId,
            targetSoulFrameId: insight.targetSoulFrameId,
          },
        });
      }

      this.emit('cross_pollinated_insight_status_updated', { insightId, status, insight });
    }
  }

  /**
   * Cleanup expired insights
   */
  public cleanupExpiredInsights(): number {
    let removedCount = 0;
    const now = Date.now();

    for (const [id, insight] of this.crossPollinatedInsights) {
      const age = now - insight.crossPollinationTimestamp.getTime();
      if (age > this.config.maxInsightAge || insight.status === 'expired') {
        this.crossPollinatedInsights.delete(id);
        removedCount++;
      }
    }

    if (this.config.enableDetailedLogging && removedCount > 0) {
      this.codalogueProtocolLedger.recordSystemReflection({
        reflectionType: 'EXPIRED_INSIGHTS_CLEANED',
        content: `Cleaned up ${removedCount} expired cross-pollinated insights`,
        metadata: { removedCount },
      });
    }

    return removedCount;
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    this.soulFrameContexts.clear();
    this.crossPollinatedInsights.clear();
    this.removeAllListeners();
  }
}