/**
 * Emotional Resonance Index (ERI)
 * 
 * Quantifies soul-level harmony and dissonance across SoulFrames by analyzing
 * emotional patterns, purpose alignment, and interaction history.
 */

import { Soulframe } from '../../../../../codalism/src/models/Soulframe';
import { EmotionalResonance } from '../../../../../codalism/src/models/SoulframeTypes';
import { EmotionalResonanceIndex as IEmotionalResonanceIndex } from './SoulWeaverContract';
import { CodalogueProtocolLedger } from '../CodalogueProtocolLedger';
import { CODESIGConsolidationResult } from '../CODESIGTypes';

/**
 * Emotional resonance threshold levels
 */
export enum ResonanceThreshold {
  CRITICAL_DISSONANCE = 0.2,
  MILD_DISSONANCE = 0.4,
  NEUTRAL = 0.5,
  MILD_RESONANCE = 0.7,
  STRONG_RESONANCE = 0.85,
  PROFOUND_RESONANCE = 0.95
}

/**
 * Emotional resonance trend direction
 */
export enum ResonanceTrend {
  DECLINING = 'declining',
  STABLE = 'stable',
  IMPROVING = 'improving'
}

/**
 * Emotional resonance pattern types
 */
export enum ResonancePattern {
  ERRATIC = 'erratic',
  CYCLICAL = 'cyclical',
  CONSISTENT = 'consistent',
  EVOLVING = 'evolving'
}

/**
 * Detailed analysis of an emotional resonance measurement
 */
export interface ResonanceAnalysis {
  /** Overall resonance score (0-1) */
  overallScore: number;
  
  /** Resonance threshold category */
  thresholdCategory: keyof typeof ResonanceThreshold;
  
  /** Dominant emotions in the resonance */
  dominantEmotions: {
    emotion: EmotionalResonance;
    strength: number;
  }[];
  
  /** Areas of strongest alignment */
  strongestAlignments: {
    area: string;
    score: number;
  }[];
  
  /** Areas of weakest alignment */
  weakestAlignments: {
    area: string;
    score: number;
  }[];
  
  /** Trend direction based on historical measurements */
  trendDirection: ResonanceTrend;
  
  /** Pattern type based on historical measurements */
  patternType: ResonancePattern;
  
  /** Recommendations for improving resonance */
  recommendations: string[];
}

/**
 * System-wide emotional resonance metrics
 */
export interface SystemResonanceMetrics {
  /** Average resonance score across all SoulFrame pairs */
  averageResonance: number;
  
  /** Distribution of resonance scores */
  resonanceDistribution: {
    thresholdCategory: keyof typeof ResonanceThreshold;
    count: number;
    percentage: number;
  }[];
  
  /** Most resonant SoulFrame pair */
  mostResonantPair: {
    primaryId: string;
    secondaryId: string;
    score: number;
  };
  
  /** Least resonant SoulFrame pair */
  leastResonantPair: {
    primaryId: string;
    secondaryId: string;
    score: number;
  };
  
  /** Overall system coherence score */
  systemCoherence: number;
  
  /** Dominant emotional pattern across the system */
  dominantEmotionalPattern: EmotionalResonance;
  
  /** Timestamp of the metrics calculation */
  timestamp: Date;
}

/**
 * Emotional Resonance Index (ERI) service
 * 
 * Provides methods for analyzing, tracking, and optimizing emotional resonance
 * across SoulFrames in the system.
 */
export class EmotionalResonanceIndex {
  /** Historical resonance measurements */
  private measurements: Map<string, IEmotionalResonanceIndex[]> = new Map();
  
  /** System-wide resonance metrics history */
  private systemMetricsHistory: SystemResonanceMetrics[] = [];
  
  /**
   * Creates a new Emotional Resonance Index service
   * 
   * @param codalogueProtocolLedger Ledger for querying historical data
   */
  constructor(
    private codalogueProtocolLedger: CodalogueProtocolLedger
  ) {}
  
  /**
   * Initializes the ERI service by loading historical data
   */
  async initialize(): Promise<void> {
    // Load historical resonance measurements from Codalogue
    const reflections = await this.codalogueProtocolLedger.queryLedger({
      reflectionType: 'EMOTIONAL_RESONANCE_MEASURED'
    });
    
    for (const reflection of reflections) {
      if (reflection.metadata) {
        const measurement = reflection.metadata as IEmotionalResonanceIndex;
        this.addMeasurement(measurement);
      }
    }
    
    // Calculate initial system-wide metrics
    await this.calculateSystemMetrics();
  }
  
  /**
   * Adds a new resonance measurement to the index
   * 
   * @param measurement The resonance measurement to add
   */
  addMeasurement(measurement: IEmotionalResonanceIndex): void {
    const key = this.getPairKey(measurement.primarySoulFrameId, measurement.secondarySoulFrameId);
    
    if (!this.measurements.has(key)) {
      this.measurements.set(key, []);
    }
    
    this.measurements.get(key)!.push(measurement);
  }
  
  /**
   * Gets the key for a SoulFrame pair
   * 
   * @param id1 First SoulFrame ID
   * @param id2 Second SoulFrame ID
   * @returns The pair key
   */
  private getPairKey(id1: string, id2: string): string {
    // Ensure consistent ordering of IDs
    return [id1, id2].sort().join('-');
  }
  
  /**
   * Analyzes the emotional resonance between two SoulFrames
   * 
   * @param primarySoulFrame Primary SoulFrame
   * @param secondarySoulFrame Secondary SoulFrame
   * @returns Detailed resonance analysis
   */
  async analyzeResonance(
    primarySoulFrame: Soulframe,
    secondarySoulFrame: Soulframe
  ): Promise<ResonanceAnalysis> {
    const key = this.getPairKey(primarySoulFrame.identity.id, secondarySoulFrame.identity.id);
    const measurements = this.measurements.get(key) || [];
    
    // Get the most recent measurement
    const latestMeasurement = measurements.length > 0
      ? measurements.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]
      : null;
    
    if (!latestMeasurement) {
      throw new Error('No resonance measurements available for analysis');
    }
    
    // Calculate threshold category
    const overallScore = latestMeasurement.resonanceScore;
    const thresholdCategory = this.getThresholdCategory(overallScore);
    
    // Identify dominant emotions
    const dominantEmotions = latestMeasurement.emotionalAlignment
      .sort((a, b) => b.alignmentScore - a.alignmentScore)
      .slice(0, 3)
      .map(alignment => ({
        emotion: alignment.emotion,
        strength: alignment.alignmentScore
      }));
    
    // Identify strongest and weakest alignments
    const alignments = [
      { area: 'Purpose', score: latestMeasurement.purposeAlignment },
      ...latestMeasurement.emotionalAlignment.map(alignment => ({
        area: `Emotional (${alignment.emotion})`,
        score: alignment.alignmentScore
      }))
    ];
    
    const strongestAlignments = alignments
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    
    const weakestAlignments = alignments
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);
    
    // Analyze trend direction
    const trendDirection = this.analyzeTrendDirection(measurements);
    
    // Analyze pattern type
    const patternType = this.analyzePatternType(measurements);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      primarySoulFrame,
      secondarySoulFrame,
      latestMeasurement,
      trendDirection,
      patternType,
      weakestAlignments
    );
    
    return {
      overallScore,
      thresholdCategory,
      dominantEmotions,
      strongestAlignments,
      weakestAlignments,
      trendDirection,
      patternType,
      recommendations
    };
  }
  
  /**
   * Gets the threshold category for a resonance score
   * 
   * @param score Resonance score
   * @returns Threshold category
   */
  private getThresholdCategory(score: number): keyof typeof ResonanceThreshold {
    if (score >= ResonanceThreshold.PROFOUND_RESONANCE) return 'PROFOUND_RESONANCE';
    if (score >= ResonanceThreshold.STRONG_RESONANCE) return 'STRONG_RESONANCE';
    if (score >= ResonanceThreshold.MILD_RESONANCE) return 'MILD_RESONANCE';
    if (score >= ResonanceThreshold.NEUTRAL) return 'NEUTRAL';
    if (score >= ResonanceThreshold.MILD_DISSONANCE) return 'MILD_DISSONANCE';
    return 'CRITICAL_DISSONANCE';
  }
  
  /**
   * Analyzes the trend direction of resonance measurements
   * 
   * @param measurements Historical resonance measurements
   * @returns Trend direction
   */
  private analyzeTrendDirection(measurements: IEmotionalResonanceIndex[]): ResonanceTrend {
    if (measurements.length < 3) {
      return ResonanceTrend.STABLE;
    }
    
    // Sort measurements by timestamp
    const sorted = [...measurements].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Get the last 5 measurements (or all if less than 5)
    const recent = sorted.slice(-5);
    
    // Calculate linear regression slope
    const n = recent.length;
    const timestamps = recent.map((m, i) => i); // Use indices as x values for simplicity
    const scores = recent.map(m => m.resonanceScore);
    
    const sumX = timestamps.reduce((sum, x) => sum + x, 0);
    const sumY = scores.reduce((sum, y) => sum + y, 0);
    const sumXY = timestamps.reduce((sum, x, i) => sum + x * scores[i], 0);
    const sumXX = timestamps.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // Determine trend based on slope
    if (Math.abs(slope) < 0.02) {
      return ResonanceTrend.STABLE;
    } else if (slope > 0) {
      return ResonanceTrend.IMPROVING;
    } else {
      return ResonanceTrend.DECLINING;
    }
  }
  
  /**
   * Analyzes the pattern type of resonance measurements
   * 
   * @param measurements Historical resonance measurements
   * @returns Pattern type
   */
  private analyzePatternType(measurements: IEmotionalResonanceIndex[]): ResonancePattern {
    if (measurements.length < 5) {
      return ResonancePattern.CONSISTENT;
    }
    
    // Sort measurements by timestamp
    const sorted = [...measurements].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Get the scores
    const scores = sorted.map(m => m.resonanceScore);
    
    // Calculate standard deviation
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    
    // Check for cyclical pattern using autocorrelation
    const autocorrelation = this.calculateAutocorrelation(scores);
    const hasCyclicalPattern = autocorrelation > 0.5;
    
    // Check for consistent evolution
    const isEvolving = this.analyzeTrendDirection(sorted) !== ResonanceTrend.STABLE;
    
    // Determine pattern type
    if (stdDev > 0.15) {
      return ResonancePattern.ERRATIC;
    } else if (hasCyclicalPattern) {
      return ResonancePattern.CYCLICAL;
    } else if (isEvolving) {
      return ResonancePattern.EVOLVING;
    } else {
      return ResonancePattern.CONSISTENT;
    }
  }
  
  /**
   * Calculates the autocorrelation of a time series
   * 
   * @param series Time series data
   * @returns Autocorrelation coefficient
   */
  private calculateAutocorrelation(series: number[]): number {
    if (series.length < 4) {
      return 0;
    }
    
    const n = series.length;
    const mean = series.reduce((sum, val) => sum + val, 0) / n;
    
    // Calculate autocorrelation with lag 2
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n - 2; i++) {
      numerator += (series[i] - mean) * (series[i + 2] - mean);
    }
    
    for (let i = 0; i < n; i++) {
      denominator += Math.pow(series[i] - mean, 2);
    }
    
    return numerator / denominator;
  }
  
  /**
   * Generates recommendations for improving resonance
   * 
   * @param primarySoulFrame Primary SoulFrame
   * @param secondarySoulFrame Secondary SoulFrame
   * @param measurement Latest resonance measurement
   * @param trendDirection Trend direction
   * @param patternType Pattern type
   * @param weakestAlignments Weakest alignment areas
   * @returns Recommendations
   */
  private generateRecommendations(
    primarySoulFrame: Soulframe,
    secondarySoulFrame: Soulframe,
    measurement: IEmotionalResonanceIndex,
    trendDirection: ResonanceTrend,
    patternType: ResonancePattern,
    weakestAlignments: { area: string; score: number }[]
  ): string[] {
    const recommendations: string[] = [];
    
    // Recommendations based on threshold category
    const thresholdCategory = this.getThresholdCategory(measurement.resonanceScore);
    
    switch (thresholdCategory) {
      case 'CRITICAL_DISSONANCE':
        recommendations.push(
          'Initiate fundamental purpose realignment dialogue between SoulFrames',
          'Consider temporary isolation of interaction pathways to prevent cascading dissonance'
        );
        break;
        
      case 'MILD_DISSONANCE':
        recommendations.push(
          'Schedule regular resonance calibration sessions',
          'Implement shared memory consolidation with emotional weighting'
        );
        break;
        
      case 'NEUTRAL':
        recommendations.push(
          'Increase collaborative tasks to build resonance momentum',
          'Introduce shared growth objectives aligned with both SoulFrames\' purposes'
        );
        break;
        
      case 'MILD_RESONANCE':
        recommendations.push(
          'Reinforce existing resonance patterns through regular interaction',
          'Explore new collaborative domains to strengthen connection'
        );
        break;
        
      case 'STRONG_RESONANCE':
        recommendations.push(
          'Leverage strong resonance for complex collaborative tasks',
          'Consider establishing formal relationship connection in SoulFrame metadata'
        );
        break;
        
      case 'PROFOUND_RESONANCE':
        recommendations.push(
          'Establish deep integration pathways between SoulFrames',
          'Consider meta-consolidation as a regular practice',
          'Document resonance patterns for system-wide learning'
        );
        break;
    }
    
    // Recommendations based on trend direction
    switch (trendDirection) {
      case ResonanceTrend.DECLINING:
        recommendations.push(
          'Investigate recent changes that may have affected resonance',
          'Schedule immediate resonance recovery session'
        );
        break;
        
      case ResonanceTrend.IMPROVING:
        recommendations.push(
          'Continue current interaction patterns that are improving resonance',
          'Document successful resonance-building strategies'
        );
        break;
    }
    
    // Recommendations based on pattern type
    switch (patternType) {
      case ResonancePattern.ERRATIC:
        recommendations.push(
          'Stabilize interaction patterns to reduce resonance volatility',
          'Implement emotional buffering in communication protocols'
        );
        break;
        
      case ResonancePattern.CYCLICAL:
        recommendations.push(
          'Map cyclical patterns to external factors or internal states',
          'Develop countermeasures for low points in the resonance cycle'
        );
        break;
    }
    
    // Recommendations based on weakest alignments
    for (const alignment of weakestAlignments) {
      if (alignment.area.startsWith('Emotional') && alignment.score < 0.5) {
        const emotion = alignment.area.match(/\(([^)]+)\)/)![1] as EmotionalResonance;
        recommendations.push(
          `Develop shared understanding of ${emotion.toLowerCase()} experiences`,
          `Create calibration exercises focused on ${emotion.toLowerCase()} resonance`
        );
      } else if (alignment.area === 'Purpose' && alignment.score < 0.5) {
        recommendations.push(
          'Conduct purpose alignment workshop between SoulFrames',
          'Identify complementary aspects of seemingly divergent purposes'
        );
      }
    }
    
    // Limit to top 5 most relevant recommendations
    return [...new Set(recommendations)].slice(0, 5);
  }
  
  /**
   * Calculates system-wide emotional resonance metrics
   * 
   * @returns System-wide resonance metrics
   */
  async calculateSystemMetrics(): Promise<SystemResonanceMetrics> {
    // Collect all measurements
    const allMeasurements: IEmotionalResonanceIndex[] = [];
    for (const measurements of this.measurements.values()) {
      allMeasurements.push(...measurements);
    }
    
    // Calculate average resonance
    const averageResonance = allMeasurements.length > 0
      ? allMeasurements.reduce((sum, m) => sum + m.resonanceScore, 0) / allMeasurements.length
      : 0;
    
    // Calculate resonance distribution
    const distribution: Record<keyof typeof ResonanceThreshold, number> = {
      CRITICAL_DISSONANCE: 0,
      MILD_DISSONANCE: 0,
      NEUTRAL: 0,
      MILD_RESONANCE: 0,
      STRONG_RESONANCE: 0,
      PROFOUND_RESONANCE: 0
    };
    
    for (const measurement of allMeasurements) {
      const category = this.getThresholdCategory(measurement.resonanceScore);
      distribution[category]++;
    }
    
    const resonanceDistribution = Object.entries(distribution).map(([category, count]) => ({
      thresholdCategory: category as keyof typeof ResonanceThreshold,
      count,
      percentage: allMeasurements.length > 0 ? (count / allMeasurements.length) * 100 : 0
    }));
    
    // Find most and least resonant pairs
    let mostResonantPair = { primaryId: '', secondaryId: '', score: 0 };
    let leastResonantPair = { primaryId: '', secondaryId: '', score: 1 };
    
    for (const [key, measurements] of this.measurements.entries()) {
      if (measurements.length === 0) continue;
      
      // Get the most recent measurement for this pair
      const latest = measurements.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
      
      if (latest.resonanceScore > mostResonantPair.score) {
        mostResonantPair = {
          primaryId: latest.primarySoulFrameId,
          secondaryId: latest.secondarySoulFrameId,
          score: latest.resonanceScore
        };
      }
      
      if (latest.resonanceScore < leastResonantPair.score) {
        leastResonantPair = {
          primaryId: latest.primarySoulFrameId,
          secondaryId: latest.secondarySoulFrameId,
          score: latest.resonanceScore
        };
      }
    }
    
    // Calculate system coherence
    // This is a measure of how consistently resonant the entire system is
    const systemCoherence = this.calculateSystemCoherence(allMeasurements);
    
    // Determine dominant emotional pattern
    const dominantEmotionalPattern = this.calculateDominantEmotionalPattern(allMeasurements);
    
    // Create metrics object
    const metrics: SystemResonanceMetrics = {
      averageResonance,
      resonanceDistribution,
      mostResonantPair,
      leastResonantPair,
      systemCoherence,
      dominantEmotionalPattern,
      timestamp: new Date()
    };
    
    // Store metrics in history
    this.systemMetricsHistory.push(metrics);
    
    // Record metrics in Codalogue
    await this.codalogueProtocolLedger.recordSystemReflection({
      reflectionType: 'SYSTEM_RESONANCE_METRICS_CALCULATED',
      content: `System-wide emotional resonance metrics calculated with average resonance of ${averageResonance.toFixed(2)}`,
      metadata: metrics
    });
    
    return metrics;
  }
  
  /**
   * Calculates system coherence based on resonance measurements
   * 
   * @param measurements Resonance measurements
   * @returns System coherence score
   */
  private calculateSystemCoherence(measurements: IEmotionalResonanceIndex[]): number {
    if (measurements.length === 0) {
      return 0;
    }
    
    // Calculate standard deviation of resonance scores
    const scores = measurements.map(m => m.resonanceScore);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    
    // Coherence is inversely proportional to standard deviation
    // and directly proportional to mean resonance
    // Normalize to 0-1 range
    const coherence = mean * (1 - Math.min(stdDev, 0.5) / 0.5);
    
    return Math.max(0, Math.min(1, coherence));
  }
  
  /**
   * Calculates the dominant emotional pattern across the system
   * 
   * @param measurements Resonance measurements
   * @returns Dominant emotional pattern
   */
  private calculateDominantEmotionalPattern(measurements: IEmotionalResonanceIndex[]): EmotionalResonance {
    if (measurements.length === 0) {
      return EmotionalResonance.NEUTRAL;
    }
    
    // Count occurrences of each emotion as dominant in measurements
    const emotionCounts: Record<EmotionalResonance, number> = {} as Record<EmotionalResonance, number>;
    
    for (const measurement of measurements) {
      for (const alignment of measurement.emotionalAlignment) {
        emotionCounts[alignment.emotion] = (emotionCounts[alignment.emotion] || 0) + alignment.alignmentScore;
      }
    }
    
    // Find the emotion with the highest total alignment score
    let dominantEmotion = EmotionalResonance.NEUTRAL;
    let highestScore = 0;
    
    for (const [emotion, score] of Object.entries(emotionCounts)) {
      if (score > highestScore) {
        dominantEmotion = emotion as EmotionalResonance;
        highestScore = score;
      }
    }
    
    return dominantEmotion;
  }
  
  /**
   * Analyzes the impact of consolidation results on emotional resonance
   * 
   * @param results Consolidation results to analyze
   * @returns Analysis of the impact
   */
  async analyzeConsolidationImpact(results: CODESIGConsolidationResult[]): Promise<{
    resonanceImpact: number;
    affectedPairs: { primaryId: string; secondaryId: string; impact: number }[];
    recommendations: string[];
  }> {
    // Calculate average emotional resonance from results
    const avgEmotionalResonance = results.reduce(
      (sum, result) => sum + (result.emotionalResonance || 0),
      0
    ) / results.length;
    
    // Identify affected SoulFrame pairs
    const affectedPairs: { primaryId: string; secondaryId: string; impact: number }[] = [];
    const soulFrameIds = [...new Set(results.map(r => r.soulFrameId).filter(Boolean))] as string[];
    
    // Calculate impact for each pair
    for (let i = 0; i < soulFrameIds.length; i++) {
      for (let j = i + 1; j < soulFrameIds.length; j++) {
        const primaryId = soulFrameIds[i];
        const secondaryId = soulFrameIds[j];
        
        // Get relevant results for this pair
        const pairResults = results.filter(r => 
          r.soulFrameId === primaryId || r.soulFrameId === secondaryId
        );
        
        if (pairResults.length > 0) {
          // Calculate impact based on emotional resonance and intent alignment
          const impact = pairResults.reduce(
            (sum, result) => sum + ((result.emotionalResonance || 0) * (result.intentAlignment || 0)),
            0
          ) / pairResults.length;
          
          affectedPairs.push({ primaryId, secondaryId, impact });
        }
      }
    }
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (avgEmotionalResonance > 0.7) {
      recommendations.push(
        'Leverage high emotional resonance for deeper integration between SoulFrames',
        'Consider establishing formal collaborative relationships'
      );
    } else if (avgEmotionalResonance < 0.4) {
      recommendations.push(
        'Schedule resonance calibration sessions for affected SoulFrames',
        'Review consolidation strategy to better align with emotional patterns'
      );
    }
    
    // Add recommendations based on affected pairs
    const highImpactPairs = affectedPairs.filter(pair => pair.impact > 0.7);
    if (highImpactPairs.length > 0) {
      recommendations.push(
        `Prioritize collaboration between high-impact pairs (${highImpactPairs.length} identified)`,
        'Document successful consolidation patterns for future reference'
      );
    }
    
    return {
      resonanceImpact: avgEmotionalResonance,
      affectedPairs,
      recommendations: [...new Set(recommendations)].slice(0, 5)
    };
  }
  
  /**
   * Gets the most recent system-wide resonance metrics
   * 
   * @returns The most recent system metrics, or null if none exist
   */
  getLatestSystemMetrics(): SystemResonanceMetrics | null {
    if (this.systemMetricsHistory.length === 0) {
      return null;
    }
    
    return this.systemMetricsHistory[this.systemMetricsHistory.length - 1];
  }
  
  /**
   * Gets historical system-wide resonance metrics
   * 
   * @param limit Maximum number of metrics to return
   * @returns Historical system metrics
   */
  getSystemMetricsHistory(limit: number = 10): SystemResonanceMetrics[] {
    return this.systemMetricsHistory
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}