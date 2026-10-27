import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  exclusionReason,
  rankCandidates,
  scoreComponents,
  weightedScore,
  type MatchRules,
  type MatchShipment,
  type MatchTrip,
} from './matching';

const day = (d: number) => new Date(Date.UTC(2026, 10, d));

const rules: MatchRules = {
  dateToleranceDays: 2,
  minReliability: 0.3,
  weights: {
    reliability: 0.35,
    dateProximity: 0.25,
    capacityFit: 0.15,
    rating: 0.15,
    responseRate: 0.1,
    originMatch: 0.1,
  },
};

const shipment: MatchShipment = {
  senderId: 'sender',
  originCityId: 'paris',
  destinationCityId: 'algiers',
  categoryCode: 'CLOTHING',
  weightGrams: 3000,
  longestSideCm: 40,
  urgency: 'STANDARD',
  earliestDate: day(10),
  latestDate: day(20),
};

const trip = (
  over: Partial<Omit<MatchTrip, 'traveller'>> & {
    traveller?: Partial<MatchTrip['traveller']>;
  } = {},
): MatchTrip => ({
  tripId: over.tripId ?? 't1',
  travellerId: over.travellerId ?? 'traveller',
  originCityId: 'paris',
  destinationCityId: 'algiers',
  departureDate: day(12),
  remainingGrams: 10000,
  itemsAccepted: 0,
  maxItems: 3,
  maxLengthCm: null,
  categoryCodes: [],
  ...over,
  traveller: {
    verified: true,
    active: true,
    reliabilityScore: 0.8,
    ratingAvg: null,
    ratingCount: 0,
    offersReceived: 0,
    offersAnswered: 0,
    ...over.traveller,
  },
});

describe('exclusionReason', () => {
  const cases: [string, MatchTrip, string | null][] = [
    ['eligible trip', trip(), null],
    ['sender cannot carry their own parcel', trip({ travellerId: 'sender' }), 'own_shipment'],
    ['suspended traveller', trip({ traveller: { active: false } }), 'traveller_suspended'],
    ['unverified traveller', trip({ traveller: { verified: false } }), 'traveller_not_verified'],
    [
      'reliability below the floor',
      trip({ traveller: { reliabilityScore: 0.2 } }),
      'low_reliability',
    ],
    ['other destination city', trip({ destinationCityId: 'oran' }), 'destination_mismatch'],
    ['departs before the parcel is ready', trip({ departureDate: day(9) }), 'date_out_of_window'],
    ['departs within tolerance after the window', trip({ departureDate: day(22) }), null],
    ['departs after the tolerance', trip({ departureDate: day(23) }), 'date_out_of_window'],
    ['not enough space', trip({ remainingGrams: 2999 }), 'insufficient_capacity'],
    ['no more items allowed', trip({ itemsAccepted: 3 }), 'max_items_reached'],
    ['parcel too long', trip({ maxLengthCm: 35 }), 'too_large'],
    ['category not accepted', trip({ categoryCodes: ['DOCUMENTS'] }), 'category_not_accepted'],
    ['category accepted explicitly', trip({ categoryCodes: ['DOCUMENTS', 'CLOTHING'] }), null],
  ];
  for (const [name, t, expected] of cases) {
    it(name, () => assert.equal(exclusionReason(shipment, t, rules, new Set()), expected));
  }

  it('skips travellers who already had an offer for this parcel', () => {
    assert.equal(
      exclusionReason(shipment, trip(), rules, new Set(['traveller'])),
      'already_offered',
    );
  });
});

describe('scoring', () => {
  it('keeps every component within [0, 1]', () => {
    const c = scoreComponents(
      shipment,
      trip({
        traveller: { ratingAvg: 4.5, ratingCount: 10, offersReceived: 10, offersAnswered: 9 },
      }),
      rules,
    );
    for (const value of Object.values(c)) assert.ok(value >= 0 && value <= 1);
    assert.equal(c.rating, 0.9);
    assert.equal(c.responseRate, 0.9);
  });

  it('uses neutral values for new travellers', () => {
    const c = scoreComponents(shipment, trip(), rules);
    assert.equal(c.rating, 0.8);
    assert.equal(c.responseRate, 0.8);
  });

  it('prefers earlier departures and same origin city', () => {
    const early = scoreComponents(shipment, trip({ departureDate: day(10) }), rules);
    const late = scoreComponents(
      shipment,
      trip({ departureDate: day(20), originCityId: 'lyon' }),
      rules,
    );
    assert.ok(early.dateProximity > late.dateProximity);
    assert.equal(early.originMatch, 1);
    assert.equal(late.originMatch, 0.5);
  });

  it('weights date proximity twice for express parcels', () => {
    const components = {
      reliability: 1,
      dateProximity: 0,
      capacityFit: 1,
      rating: 1,
      responseRate: 1,
      originMatch: 1,
    };
    assert.ok(
      weightedScore(components, rules.weights, 'EXPRESS') <
        weightedScore(components, rules.weights, 'STANDARD'),
    );
  });
});

describe('rankCandidates', () => {
  it('ranks the most reliable, earliest trip first and lists exclusions last', () => {
    const ranked = rankCandidates(
      shipment,
      [
        trip({ tripId: 'late', travellerId: 'a', departureDate: day(19) }),
        trip({ tripId: 'full', travellerId: 'b', remainingGrams: 1000 }),
        trip({
          tripId: 'best',
          travellerId: 'c',
          departureDate: day(10),
          traveller: { reliabilityScore: 0.95 },
        }),
      ],
      rules,
    );
    assert.deepEqual(
      ranked.map((r) => r.tripId),
      ['best', 'late', 'full'],
    );
    assert.equal(ranked[2]?.eligible, false);
    assert.equal(ranked[2]?.excludedReason, 'insufficient_capacity');
  });

  it('breaks ties by earlier departure', () => {
    const ranked = rankCandidates(
      shipment,
      [
        trip({ tripId: 'b', travellerId: 'b', departureDate: day(15) }),
        trip({ tripId: 'a', travellerId: 'a', departureDate: day(15) }),
      ],
      {
        ...rules,
        weights: {
          reliability: 1,
          dateProximity: 0,
          capacityFit: 0,
          rating: 0,
          responseRate: 0,
          originMatch: 0,
        },
      },
    );
    assert.equal(ranked[0]?.score, ranked[1]?.score);
  });
});
