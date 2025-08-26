/**
 * Proposal Converter Module
 * 
 * Extracted proposal conversion functionality from SoulWeaverBridge for code splitting optimization.
 * This module handles conversion between SoulWeaver and Blueprint proposal formats.
 */

import { EventEmitter } from 'events';
import { EvolutionProposal, SoulWeavingSession } from '../SoulWeaverContract';
import { BlueprintProposal, EvaluationResult } from '@echoforge/core/blueprint';
import { CodalogueProtocolLedger } from '../../CodalogueProtocolLedger';

/**
 * Configuration for proposal conversion
 */
export interface ProposalConverterConfig {
  /** Whether to automatically convert between proposal formats */
  autoConvertProposals: boolean;
  /** Whether to enable detailed logging */
  enableDetailedLogging: boolean;
  /** Scoring matrix weights for proposal evaluation */
  scoringMatrix: {
    /** Weight for ethical alignment (0-1) */
    ethicalAlignmentWeight: number;
    /** Weight for intent fidelity (0-1) */
    intentFidelityWeight: number;
    /** Weight for technical feasibility (0-1) */
    technicalFeasibilityWeight: number;
    /** Weight for emotional resonance (0-1) */
    emotionalResonanceWeight: number;
    /** Weight for purpose alignment (0-1) */
    purposeAlignmentWeight: number;
    /** Minimum threshold for proposal acceptance (0-1) */
    acceptanceThreshold: number;
  };
}

/**
 * Interface for tracking active proposals
 */
export interface ActiveProposal {
  originalFormat: 'soulweaver' | 'blueprint';
  originalId: string;
  convertedId: string;
  status: 'pending' | 'evaluating' | 'implementing' | 'completed' | 'failed';
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Proposal Converter
 * 
 * Handles conversion between different proposal formats and tracks active proposals
 */
export class ProposalConverter extends EventEmitter {
  private activeProposals: Map<string, ActiveProposal> = new Map();
  private config: ProposalConverterConfig;

  constructor(
    private codalogueProtocolLedger: CodalogueProtocolLedger,
    config: ProposalConverterConfig
  ) {
    super();
    this.config = config;

    if (this.config.enableDetailedLogging) {
      this.codalogueProtocolLedger.recordSystemReflection({
        reflectionType: 'PROPOSAL_CONVERTER_INITIALIZED',
        content: 'ProposalConverter initialized',
        metadata: { config: this.config },
      });
    }
  }

  /**
   * Converts a SoulWeaver EvolutionProposal to a Blueprint proposal
   */
  public convertSoulWeaverToBlueprintProposal(
    evolutionProposal: EvolutionProposal
  ): BlueprintProposal {
    if (!this.config.autoConvertProposals) {
      throw new Error('Automatic proposal conversion is disabled');
    }

    const blueprintProposal: BlueprintProposal = {
      id: `blueprint_${evolutionProposal.id}`,
      title: evolutionProposal.title || `Evolution: ${evolutionProposal.type}`,
      description: evolutionProposal.description || evolutionProposal.rationale,
      type: this.mapEvolutionTypeToBlueprintType(evolutionProposal.type),
      priority: this.calculatePriorityFromResonance(evolutionProposal),
      estimatedEffort: this.estimateEffortFromComplexity(evolutionProposal),
      dependencies: evolutionProposal.dependencies || [],
      tags: this.generateTagsFromEvolution(evolutionProposal),
      metadata: {
        originalSoulWeaverId: evolutionProposal.id,
        sessionId: evolutionProposal.sessionId,
        resonanceScore: evolutionProposal.resonanceScore,
        conversionTimestamp: new Date().toISOString(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Track the conversion
    this.trackActiveProposal({
      originalFormat: 'soulweaver',
      originalId: evolutionProposal.id,
      convertedId: blueprintProposal.id,
      status: 'pending',
      timestamp: new Date(),
      metadata: {
        evolutionType: evolutionProposal.type,
        resonanceScore: evolutionProposal.resonanceScore,
      },
    });

    if (this.config.enableDetailedLogging) {
      this.codalogueProtocolLedger.recordSystemReflection({
        reflectionType: 'SOULWEAVER_TO_BLUEPRINT_CONVERSION',
        content: `Converted SoulWeaver proposal ${evolutionProposal.id} to Blueprint ${blueprintProposal.id}`,
        metadata: {
          originalId: evolutionProposal.id,
          convertedId: blueprintProposal.id,
          evolutionType: evolutionProposal.type,
          blueprintType: blueprintProposal.type,
        },
      });
    }

    this.emit('proposal_converted', {
      from: 'soulweaver',
      to: 'blueprint',
      originalId: evolutionProposal.id,
      convertedId: blueprintProposal.id,
      proposal: blueprintProposal,
    });

    return blueprintProposal;
  }

  /**
   * Converts a Blueprint proposal to a SoulWeaver EvolutionProposal
   */
  public convertBlueprintToSoulWeaverProposal(
    blueprintProposal: BlueprintProposal,
    sessionId: string
  ): EvolutionProposal {
    if (!this.config.autoConvertProposals) {
      throw new Error('Automatic proposal conversion is disabled');
    }

    const evolutionProposal: EvolutionProposal = {
      id: `evolution_${blueprintProposal.id}`,
      sessionId,
      type: this.mapBlueprintTypeToEvolutionType(blueprintProposal.type),
      title: blueprintProposal.title,
      description: blueprintProposal.description,
      rationale: `Converted from Blueprint: ${blueprintProposal.description}`,
      resonanceScore: this.calculateResonanceFromPriority(blueprintProposal.priority),
      dependencies: blueprintProposal.dependencies,
      metadata: {
        originalBlueprintId: blueprintProposal.id,
        blueprintType: blueprintProposal.type,
        estimatedEffort: blueprintProposal.estimatedEffort,
        tags: blueprintProposal.tags,
        conversionTimestamp: new Date().toISOString(),
      },
      createdAt: new Date(),
    };

    // Track the conversion
    this.trackActiveProposal({
      originalFormat: 'blueprint',
      originalId: blueprintProposal.id,
      convertedId: evolutionProposal.id,
      status: 'pending',
      timestamp: new Date(),
      metadata: {
        blueprintType: blueprintProposal.type,
        priority: blueprintProposal.priority,
      },
    });

    if (this.config.enableDetailedLogging) {
      this.codalogueProtocolLedger.recordSystemReflection({
        reflectionType: 'BLUEPRINT_TO_SOULWEAVER_CONVERSION',
        content: `Converted Blueprint proposal ${blueprintProposal.id} to SoulWeaver ${evolutionProposal.id}`,
        metadata: {
          originalId: blueprintProposal.id,
          convertedId: evolutionProposal.id,
          blueprintType: blueprintProposal.type,
          evolutionType: evolutionProposal.type,
        },
      });
    }

    this.emit('proposal_converted', {
      from: 'blueprint',
      to: 'soulweaver',
      originalId: blueprintProposal.id,
      convertedId: evolutionProposal.id,
      proposal: evolutionProposal,
    });

    return evolutionProposal;
  }

  /**
   * Maps evolution type to blueprint type
   */
  private mapEvolutionTypeToBlueprintType(evolutionType: string): string {
    const typeMapping: Record<string, string> = {
      'consciousness_enhancement': 'feature',
      'memory_optimization': 'optimization',
      'protocol_refinement': 'refactor',
      'agent_capability_expansion': 'enhancement',
      'system_integration': 'integration',
      'performance_improvement': 'optimization',
      'security_enhancement': 'security',
      'user_experience_improvement': 'ux',
    };

    return typeMapping[evolutionType] || 'feature';
  }

  /**
   * Maps blueprint type to evolution type
   */
  private mapBlueprintTypeToEvolutionType(blueprintType: string): string {
    const typeMapping: Record<string, string> = {
      'feature': 'consciousness_enhancement',
      'optimization': 'memory_optimization',
      'refactor': 'protocol_refinement',
      'enhancement': 'agent_capability_expansion',
      'integration': 'system_integration',
      'security': 'security_enhancement',
      'ux': 'user_experience_improvement',
      'bugfix': 'system_stabilization',
    };

    return typeMapping[blueprintType] || 'consciousness_enhancement';
  }

  /**
   * Calculates priority from resonance score
   */
  private calculatePriorityFromResonance(evolutionProposal: EvolutionProposal): 'low' | 'medium' | 'high' | 'critical' {
    const resonance = evolutionProposal.resonanceScore || 0;
    
    if (resonance >= 0.9) return 'critical';
    if (resonance >= 0.7) return 'high';
    if (resonance >= 0.4) return 'medium';
    return 'low';
  }

  /**
   * Calculates resonance score from priority
   */
  private calculateResonanceFromPriority(priority: string): number {
    const priorityMapping: Record<string, number> = {
      'critical': 0.95,
      'high': 0.8,
      'medium': 0.6,
      'low': 0.3,
    };

    return priorityMapping[priority] || 0.5;
  }

  /**
   * Estimates effort from complexity
   */
  private estimateEffortFromComplexity(evolutionProposal: EvolutionProposal): 'small' | 'medium' | 'large' | 'xl' {
    // Analyze various factors to estimate effort
    const dependencyCount = evolutionProposal.dependencies?.length || 0;
    const descriptionLength = evolutionProposal.description?.length || 0;
    const resonance = evolutionProposal.resonanceScore || 0;

    // Simple heuristic for effort estimation
    let effortScore = 0;
    effortScore += dependencyCount * 0.2;
    effortScore += Math.min(descriptionLength / 100, 1) * 0.3;
    effortScore += (1 - resonance) * 0.5; // Lower resonance might indicate more complex implementation

    if (effortScore >= 0.8) return 'xl';
    if (effortScore >= 0.6) return 'large';
    if (effortScore >= 0.3) return 'medium';
    return 'small';
  }

  /**
   * Generates tags from evolution proposal
   */
  private generateTagsFromEvolution(evolutionProposal: EvolutionProposal): string[] {
    const tags: string[] = [];
    
    // Add type-based tag
    tags.push(evolutionProposal.type);
    
    // Add resonance-based tags
    const resonance = evolutionProposal.resonanceScore || 0;
    if (resonance >= 0.8) tags.push('high-resonance');
    if (resonance <= 0.3) tags.push('low-resonance');
    
    // Add dependency-based tags
    if (evolutionProposal.dependencies && evolutionProposal.dependencies.length > 0) {
      tags.push('has-dependencies');
    }
    
    // Add session-based tag
    if (evolutionProposal.sessionId) {
      tags.push(`session-${evolutionProposal.sessionId}`);
    }
    
    return tags;
  }

  /**
   * Tracks an active proposal
   */
  private trackActiveProposal(proposal: ActiveProposal): void {
    this.activeProposals.set(proposal.convertedId, proposal);
    this.emit('proposal_tracked', proposal);
  }

  /**
   * Updates the status of an active proposal
   */
  public updateProposalStatus(
    proposalId: string,
    status: ActiveProposal['status'],
    metadata?: Record<string, any>
  ): void {
    const proposal = this.activeProposals.get(proposalId);
    if (proposal) {
      proposal.status = status;
      if (metadata) {
        proposal.metadata = { ...proposal.metadata, ...metadata };
      }

      if (this.config.enableDetailedLogging) {
        this.codalogueProtocolLedger.recordSystemReflection({
          reflectionType: 'PROPOSAL_STATUS_UPDATED',
          content: `Updated proposal ${proposalId} status to ${status}`,
          metadata: {
            proposalId,
            status,
            originalFormat: proposal.originalFormat,
            originalId: proposal.originalId,
          },
        });
      }

      this.emit('proposal_status_updated', { proposalId, status, proposal });
    }
  }

  /**
   * Gets an active proposal by ID
   */
  public getActiveProposal(proposalId: string): ActiveProposal | undefined {
    return this.activeProposals.get(proposalId);
  }

  /**
   * Gets all active proposals
   */
  public getAllActiveProposals(): ActiveProposal[] {
    return Array.from(this.activeProposals.values());
  }

  /**
   * Gets active proposals by status
   */
  public getActiveProposalsByStatus(status: ActiveProposal['status']): ActiveProposal[] {
    return Array.from(this.activeProposals.values())
      .filter(proposal => proposal.status === status);
  }

  /**
   * Removes completed or failed proposals from tracking
   */
  public cleanupCompletedProposals(): number {
    let removedCount = 0;
    for (const [id, proposal] of this.activeProposals) {
      if (proposal.status === 'completed' || proposal.status === 'failed') {
        this.activeProposals.delete(id);
        removedCount++;
      }
    }

    if (this.config.enableDetailedLogging && removedCount > 0) {
      this.codalogueProtocolLedger.recordSystemReflection({
        reflectionType: 'COMPLETED_PROPOSALS_CLEANED',
        content: `Cleaned up ${removedCount} completed/failed proposals`,
        metadata: { removedCount },
      });
    }

    return removedCount;
  }

  /**
   * Evaluates a proposal using the scoring matrix
   */
  public evaluateProposal(proposal: EvolutionProposal | BlueprintProposal): number {
    const matrix = this.config.scoringMatrix;
    
    // Calculate individual scores (placeholder implementation)
    const ethicalAlignment = this.calculateEthicalAlignment(proposal);
    const intentFidelity = this.calculateIntentFidelity(proposal);
    const technicalFeasibility = this.calculateTechnicalFeasibility(proposal);
    const emotionalResonance = this.calculateEmotionalResonance(proposal);
    const purposeAlignment = this.calculatePurposeAlignment(proposal);

    // Calculate weighted score
    const totalScore = 
      (ethicalAlignment * matrix.ethicalAlignmentWeight) +
      (intentFidelity * matrix.intentFidelityWeight) +
      (technicalFeasibility * matrix.technicalFeasibilityWeight) +
      (emotionalResonance * matrix.emotionalResonanceWeight) +
      (purposeAlignment * matrix.purposeAlignmentWeight);

    return Math.min(Math.max(totalScore, 0), 1); // Clamp between 0 and 1
  }

  // Placeholder evaluation methods (to be implemented with actual logic)
  private calculateEthicalAlignment(proposal: any): number { return 0.8; }
  private calculateIntentFidelity(proposal: any): number { return 0.75; }
  private calculateTechnicalFeasibility(proposal: any): number { return 0.85; }
  private calculateEmotionalResonance(proposal: any): number { return 0.7; }
  private calculatePurposeAlignment(proposal: any): number { return 0.9; }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    this.activeProposals.clear();
    this.removeAllListeners();
  }
}