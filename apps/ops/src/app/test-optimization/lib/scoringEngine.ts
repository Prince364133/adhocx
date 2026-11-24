import {
  PROFILE_WEIGHTS,
} from '../types.ts';
import type {
  RouteOption,
  OptimizationProfile,
  RouteScoreBreakdown,
} from '../types.ts';
import { calculateDistanceCharge } from './fleetOptimizer.ts';

export interface ScoredCandidate {
  route: RouteOption;
  score: number;
  breakdown: RouteScoreBreakdown;
  recommendationReason: string;
}

/**
 * Normalizes metrics and scores route candidates using a multi-objective evaluation engine.
 * - Distance Score: Measures total vehicle kilometers independently.
 * - Detour Score: Measures true commuter fairness using Individual Detour Factors (IDF),
 *   eliminating mathematical double-counting with distance.
 * - Cost Score: Calculates actual driver payout via production tiered distance slabs.
 * - Time Score: Traffic-aware transit duration.
 * - Utilization Score: Passenger occupancy relative to vehicle capacity.
 *
 * Preserves canonical option indexing:
 * - Index 0: Option 1 (Shortest Distance)
 * - Index 1: Option 2 (Fastest Journey)
 * - Index 2: Option 3 (Balanced Alternative)
 */
export function scoreRouteCandidates(
  candidates: RouteOption[],
  profile: OptimizationProfile = 'BALANCED',
  vehicleCapacity: number = 4,
  passengerCount: number = 4,
  vehicleCategory: 'SEDAN' | 'SUV' = 'SEDAN',
): RouteOption[] {
  if (!candidates || candidates.length === 0) return [];

  const weights = PROFILE_WEIGHTS[profile] || PROFILE_WEIGHTS.BALANCED;

  // Find min values across candidates for normalization
  const minDistanceKm = Math.min(...candidates.map((c) => Math.max(0.1, c.distanceKm)));
  const minDurationMin = Math.min(...candidates.map((c) => Math.max(1, c.durationMinutes)));

  // Calculate driver payout using production tiered distance slabs
  const candidateCosts = candidates.map((c) =>
    calculateDistanceCharge(c.distanceKm, vehicleCategory),
  );
  const minCost = Math.min(...candidateCosts);

  // Vehicle utilization (passengers / capacity)
  const utilizationRatio = Math.min(1.0, passengerCount / Math.max(1, vehicleCapacity));
  const utilizationScore = Math.round(utilizationRatio * 100);

  // Score each candidate preserving canonical index
  const scoredItems = candidates.map((cand, idx) => {
    // 1. Vehicle Distance Score
    const distScore = Math.min(
      100,
      Math.round((minDistanceKm / Math.max(0.1, cand.distanceKm)) * 100),
    );

    // 2. Travel Time Score
    const timeScore = Math.min(
      100,
      Math.round((minDurationMin / Math.max(1, cand.durationMinutes)) * 100),
    );

    // 3. Genuine Passenger Detour Score (IDF)
    // 100 points for direct commute (averageIdf = 1.0). Each 10% detour deducts 15 points.
    const avgIdf = cand.averageIdf && cand.averageIdf >= 1.0 ? cand.averageIdf : 1.15;
    const maxIdf = cand.maxIdf && cand.maxIdf >= 1.0 ? cand.maxIdf : 1.25;
    let detourScore = Math.max(0, Math.min(100, Math.round(100 - (avgIdf - 1.0) * 150)));

    // Penalize extreme individual passenger detour if worst detour > 1.40
    if (maxIdf > 1.40) {
      const excessPenalty = Math.round((maxIdf - 1.40) * 50);
      detourScore = Math.max(0, detourScore - excessPenalty);
    }

    // 4. Driver Remuneration Cost Score
    const cost = candidateCosts[idx];
    const costScore = Math.min(100, Math.round((minCost / Math.max(1, cost)) * 100));

    // 5. Multi-objective weighted score
    let compositeScore = Number(
      (
        distScore * weights.distanceWeight +
        timeScore * weights.timeWeight +
        detourScore * weights.detourWeight +
        utilizationScore * weights.utilizationWeight +
        costScore * weights.costWeight
      ).toFixed(1),
    );

    // Hard Constraint Check: If candidate is not safety compliant, penalize composite score
    if (cand.safetyCompliant === false) {
      compositeScore = Math.max(0, compositeScore - 50);
    }

    const breakdown: RouteScoreBreakdown = {
      distanceScore: distScore,
      timeScore,
      detourScore,
      utilizationScore,
      costScore,
    };

    return {
      cand,
      score: compositeScore,
      breakdown,
      originalIndex: idx,
    };
  });

  // Determine highest-scoring candidate (recommended)
  let bestItem = scoredItems[0];
  for (let i = 1; i < scoredItems.length; i++) {
    const item = scoredItems[i];
    if (item.score > bestItem.score) {
      bestItem = item;
    } else if (item.score === bestItem.score) {
      // Deterministic tie-breaking according to profile
      if (profile === 'DISTANCE_PRIORITY' && item.cand.isShortest) {
        bestItem = item;
      } else if (profile === 'TIME_PRIORITY' && item.cand.isFastest) {
        bestItem = item;
      }
    }
  }

  // Preserve canonical array order [Option 1, Option 2, Option 3]
  return scoredItems.map((item, idx) => {
    const cand = item.cand;
    const isRecommended = idx === bestItem.originalIndex;
    const kmDelta = Number((cand.distanceKm - bestItem.cand.distanceKm).toFixed(1));
    const minDelta = cand.durationMinutes - bestItem.cand.durationMinutes;
    const pctDelta =
      bestItem.cand.distanceKm > 0
        ? Math.round(((cand.distanceKm - bestItem.cand.distanceKm) / bestItem.cand.distanceKm) * 100)
        : 0;

    let reason = '';
    if (isRecommended) {
      if (cand.candidateType === 'SHORTEST_DISTANCE' || profile === 'DISTANCE_PRIORITY') {
        reason = `Recommended (Score ${item.score}): Lowest total road distance (${cand.formattedDistance}) delivering maximum fleet fuel economy and lowest driver payout.`;
      } else if (cand.candidateType === 'FASTEST_JOURNEY' || profile === 'TIME_PRIORITY') {
        if (cand.isEquivalent) {
          reason = `Recommended (Score ${item.score}): Fastest transit ETA (${cand.formattedEta}), which coincides with the shortest road distance (${cand.formattedDistance}). Optimal corridor.`;
        } else {
          reason = `Recommended (Score ${item.score}): Fastest transit duration (${cand.formattedEta}) saving commute time during peak traffic hours.`;
        }
      } else {
        reason = `Recommended (Score ${item.score}): Optimal balance between road distance (${cand.formattedDistance}), ETA (${cand.formattedEta}), and commuter detour fairness.`;
      }
    } else {
      if (cand.isEquivalent) {
        reason = `Coincides with Option 1 (${cand.formattedDistance}, ${cand.formattedEta}). Road network offers no faster bypass for this corridor without an artificial detour.`;
      } else if (kmDelta > 0 && minDelta < 0) {
        reason = `Trades +${kmDelta} km (+${pctDelta}%) distance to save ${Math.abs(minDelta)} mins commute time vs recommended route.`;
      } else if (kmDelta < 0 && minDelta > 0) {
        reason = `Saves ${Math.abs(kmDelta)} km vehicle distance but adds +${minDelta} mins travel time vs recommended route.`;
      } else if (kmDelta > 0) {
        reason = `Adds +${kmDelta} km (+${pctDelta}%) distance and +${Math.max(0, minDelta)} mins compared to recommended route. Feasible contingency corridor.`;
      } else {
        reason = `Alternative corridor (Score ${item.score}) providing operational contingency.`;
      }
    }

    return {
      ...cand,
      index: idx,
      score: item.score,
      scoreBreakdown: item.breakdown,
      isRecommended,
      recommendationReason: reason,
      deltaVsBest: {
        kmDelta,
        minDelta,
        pctDelta,
      },
    };
  });
}
