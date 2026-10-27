export interface ReliabilityStats {
  /** Parcels delivered (including disputes resolved in the traveller's favour). */
  delivered: number;
  /** Parcels accepted then withdrawn, or lost in a dispute. */
  failed: number;
  offersReceived: number;
  offersAnswered: number;
  ratingAvg: number | null;
  ratingCount: number;
}

/** Everyone starts here; evidence moves the score away from it gradually. */
export const RELIABILITY_PRIOR = 0.8;
const PRIOR_WEIGHT = 2;

const smoothed = (successes: number, total: number) =>
  (successes + RELIABILITY_PRIOR * PRIOR_WEIGHT) / (total + PRIOR_WEIGHT);

/**
 * Traveller reliability in [0, 1], used by matching. Each signal is smoothed towards the
 * prior so a single event never swings a new traveller's score.
 *   40% delivery record · 30% ratings · 30% answering proposals
 */
export function computeReliability(stats: ReliabilityStats): number {
  const delivery = smoothed(stats.delivered, stats.delivered + stats.failed);
  const response = smoothed(stats.offersAnswered, stats.offersReceived);
  const rating =
    stats.ratingCount > 0 && stats.ratingAvg !== null
      ? smoothed((stats.ratingAvg / 5) * stats.ratingCount, stats.ratingCount)
      : RELIABILITY_PRIOR;
  const score = 0.4 * delivery + 0.3 * rating + 0.3 * response;
  return Math.round(Math.min(1, Math.max(0, score)) * 1000) / 1000;
}
