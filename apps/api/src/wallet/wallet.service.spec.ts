import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { nextPayoutDate } from './wallet.service';

describe('nextPayoutDate', () => {
  // 2026-10-27 is a Tuesday.
  const tuesdayMorning = new Date(Date.UTC(2026, 9, 27, 7, 0));

  it('returns the coming weekday at 09:00 UTC', () => {
    assert.equal(nextPayoutDate(1, tuesdayMorning).toISOString(), '2026-11-02T09:00:00.000Z');
    assert.equal(nextPayoutDate(5, tuesdayMorning).toISOString(), '2026-10-30T09:00:00.000Z');
  });

  it('uses today when the payout hour is still ahead', () => {
    assert.equal(nextPayoutDate(2, tuesdayMorning).toISOString(), '2026-10-27T09:00:00.000Z');
  });

  it('moves to next week once today’s payout hour has passed', () => {
    const tuesdayAfternoon = new Date(Date.UTC(2026, 9, 27, 15, 0));
    assert.equal(nextPayoutDate(2, tuesdayAfternoon).toISOString(), '2026-11-03T09:00:00.000Z');
  });
});
