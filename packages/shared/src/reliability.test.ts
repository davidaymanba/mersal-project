import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeReliability, RELIABILITY_PRIOR, type ReliabilityStats } from './reliability';

const fresh: ReliabilityStats = {
  delivered: 0,
  failed: 0,
  offersReceived: 0,
  offersAnswered: 0,
  ratingAvg: null,
  ratingCount: 0,
};

describe('computeReliability', () => {
  it('starts new travellers at the prior', () => {
    assert.equal(computeReliability(fresh), RELIABILITY_PRIOR);
  });

  it('rewards a strong record and stays within [0, 1]', () => {
    const score = computeReliability({
      delivered: 40,
      failed: 0,
      offersReceived: 45,
      offersAnswered: 45,
      ratingAvg: 5,
      ratingCount: 38,
    });
    assert.ok(score > 0.95 && score <= 1, String(score));
  });

  it('penalises failures and ignored proposals', () => {
    const poor = computeReliability({
      delivered: 2,
      failed: 4,
      offersReceived: 12,
      offersAnswered: 3,
      ratingAvg: 2,
      ratingCount: 4,
    });
    assert.ok(poor < 0.5, String(poor));
  });

  it('moves only a little after a single bad event', () => {
    const afterOneFailure = computeReliability({ ...fresh, failed: 1 });
    assert.ok(
      afterOneFailure > 0.65 && afterOneFailure < RELIABILITY_PRIOR,
      String(afterOneFailure),
    );
  });

  it('weights delivery more than ratings or responsiveness', () => {
    const deliveryHit = computeReliability({ ...fresh, failed: 3 });
    const responseHit = computeReliability({ ...fresh, offersReceived: 3 });
    assert.ok(deliveryHit < responseHit);
  });
});
