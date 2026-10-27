import type { MatchingWeights } from './schemas/trips';

/** Why a trip was not proposed — stored with each matching run for auditability. */
export type ExclusionReason =
  | 'own_shipment'
  | 'traveller_not_verified'
  | 'traveller_suspended'
  | 'low_reliability'
  | 'already_offered'
  | 'destination_mismatch'
  | 'date_out_of_window'
  | 'insufficient_capacity'
  | 'max_items_reached'
  | 'too_large'
  | 'category_not_accepted';

export interface MatchShipment {
  senderId: string;
  originCityId: string;
  destinationCityId: string;
  categoryCode: string;
  weightGrams: number;
  longestSideCm: number;
  urgency: 'STANDARD' | 'EXPRESS';
  earliestDate: Date;
  latestDate: Date;
}

export interface MatchTrip {
  tripId: string;
  travellerId: string;
  originCityId: string;
  destinationCityId: string;
  departureDate: Date;
  remainingGrams: number;
  itemsAccepted: number;
  maxItems: number;
  maxLengthCm: number | null;
  categoryCodes: string[];
  traveller: {
    verified: boolean;
    active: boolean;
    reliabilityScore: number;
    ratingAvg: number | null;
    ratingCount: number;
    offersReceived: number;
    offersAnswered: number;
  };
}

export interface MatchRules {
  dateToleranceDays: number;
  minReliability: number;
  weights: MatchingWeights;
}

export interface ScoreComponents {
  reliability: number;
  dateProximity: number;
  capacityFit: number;
  rating: number;
  responseRate: number;
  originMatch: number;
}

export interface CandidateResult {
  tripId: string;
  travellerId: string;
  eligible: boolean;
  excludedReason?: ExclusionReason;
  score: number;
  components?: ScoreComponents;
}

const DAY = 86_400_000;
const NEUTRAL_RATING = 0.8;
const NEUTRAL_RESPONSE = 0.8;
const MIN_OFFERS_FOR_RESPONSE_RATE = 3;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** First hard rule a trip fails, or null when it is eligible. Order matters for the recorded reason. */
export function exclusionReason(
  shipment: MatchShipment,
  trip: MatchTrip,
  rules: MatchRules,
  alreadyOfferedTravellers: ReadonlySet<string>,
): ExclusionReason | null {
  if (trip.travellerId === shipment.senderId) return 'own_shipment';
  if (!trip.traveller.active) return 'traveller_suspended';
  if (!trip.traveller.verified) return 'traveller_not_verified';
  if (trip.traveller.reliabilityScore < rules.minReliability) return 'low_reliability';
  if (alreadyOfferedTravellers.has(trip.travellerId)) return 'already_offered';
  if (trip.destinationCityId !== shipment.destinationCityId) return 'destination_mismatch';
  const latest = shipment.latestDate.getTime() + rules.dateToleranceDays * DAY;
  if (trip.departureDate < shipment.earliestDate || trip.departureDate.getTime() > latest)
    return 'date_out_of_window';
  if (trip.remainingGrams < shipment.weightGrams) return 'insufficient_capacity';
  if (trip.itemsAccepted >= trip.maxItems) return 'max_items_reached';
  if (trip.maxLengthCm !== null && shipment.longestSideCm > trip.maxLengthCm) return 'too_large';
  if (trip.categoryCodes.length > 0 && !trip.categoryCodes.includes(shipment.categoryCode))
    return 'category_not_accepted';
  return null;
}

/** Each component is in [0, 1]; higher is better. */
export function scoreComponents(
  shipment: MatchShipment,
  trip: MatchTrip,
  rules: MatchRules,
): ScoreComponents {
  const windowDays =
    (shipment.latestDate.getTime() - shipment.earliestDate.getTime()) / DAY +
    rules.dateToleranceDays;
  const daysAfterEarliest = Math.max(
    0,
    (trip.departureDate.getTime() - shipment.earliestDate.getTime()) / DAY,
  );
  const t = trip.traveller;
  return {
    reliability: clamp01(t.reliabilityScore),
    // Earlier departures within the window deliver sooner.
    dateProximity: clamp01(1 - daysAfterEarliest / (windowDays + 1)),
    // Best fit: prefer trips whose spare capacity the parcel uses well, keeping big gaps for big parcels.
    capacityFit: clamp01(shipment.weightGrams / trip.remainingGrams),
    rating: t.ratingCount > 0 && t.ratingAvg !== null ? clamp01(t.ratingAvg / 5) : NEUTRAL_RATING,
    responseRate:
      t.offersReceived >= MIN_OFFERS_FOR_RESPONSE_RATE
        ? clamp01(t.offersAnswered / t.offersReceived)
        : NEUTRAL_RESPONSE,
    originMatch: trip.originCityId === shipment.originCityId ? 1 : 0.5,
  };
}

/** Weighted average of the components. Express parcels weigh departure date twice as much. */
export function weightedScore(
  components: ScoreComponents,
  weights: MatchingWeights,
  urgency: MatchShipment['urgency'],
): number {
  const effective = {
    ...weights,
    dateProximity: weights.dateProximity * (urgency === 'EXPRESS' ? 2 : 1),
  };
  const keys = Object.keys(components) as (keyof ScoreComponents)[];
  const totalWeight = keys.reduce((sum, k) => sum + (effective[k] ?? 0), 0);
  if (totalWeight === 0) return 0;
  const score = keys.reduce((sum, k) => sum + components[k] * (effective[k] ?? 0), 0) / totalWeight;
  return Math.round(score * 10_000) / 10_000;
}

/**
 * Evaluates every trip for a shipment: eligible trips are scored and ranked (best first),
 * ineligible ones carry the reason they were skipped.
 */
export function rankCandidates(
  shipment: MatchShipment,
  trips: MatchTrip[],
  rules: MatchRules,
  alreadyOfferedTravellers: ReadonlySet<string> = new Set(),
): CandidateResult[] {
  const results = trips.map((trip): CandidateResult => {
    const reason = exclusionReason(shipment, trip, rules, alreadyOfferedTravellers);
    if (reason)
      return {
        tripId: trip.tripId,
        travellerId: trip.travellerId,
        eligible: false,
        excludedReason: reason,
        score: 0,
      };
    const components = scoreComponents(shipment, trip, rules);
    return {
      tripId: trip.tripId,
      travellerId: trip.travellerId,
      eligible: true,
      components,
      score: weightedScore(components, rules.weights, shipment.urgency),
    };
  });

  // Tie-break on earlier departure so results are deterministic.
  const departure = new Map(trips.map((t) => [t.tripId, t.departureDate.getTime()]));
  return results.sort(
    (a, b) =>
      Number(b.eligible) - Number(a.eligible) ||
      b.score - a.score ||
      (departure.get(a.tripId) ?? 0) - (departure.get(b.tripId) ?? 0),
  );
}
