import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateQuote,
  PricingError,
  PricingRulesSchema,
  volumetricGrams,
  type ParcelInput,
  type PricingRules,
} from './pricing';

const rules: PricingRules = PricingRulesSchema.parse({
  currency: 'EUR',
  volumetricDivisor: 5000,
  maxWeightGrams: 23000,
  brackets: [
    { upToGrams: 1000, price: 1600 },
    { upToGrams: 3000, price: 2400 },
    { upToGrams: 10000, price: 4800 },
  ],
  extraPerKg: 450,
  categoryMultipliers: { DOCUMENTS: 0.85, SMALL_ELECTRONICS: 1.25 },
  declaredValue: { freeUpTo: 10000, feeBps: 150 },
  urgencyMultipliers: { STANDARD: 1, EXPRESS: 1.35 },
  options: [
    { code: 'FRAGILE', price: 300, names: { en: 'Fragile', fr: 'Fragile', ar: 'قابل للكسر' } },
    { code: 'PHOTO_PROOF', price: 150, names: { en: 'Photo', fr: 'Photo', ar: 'صورة' } },
  ],
  minimumPrice: 1200,
  commissionBps: 2000,
  roundTo: 50,
});

const parcel = (over: Partial<ParcelInput> = {}): ParcelInput => ({
  categoryCode: 'CLOTHING',
  weightGrams: 2000,
  lengthCm: 30,
  widthCm: 20,
  heightCm: 10,
  declaredValue: 5000,
  urgency: 'STANDARD',
  options: [],
  ...over,
});

describe('calculateQuote', () => {
  it('prices by the bracket containing the actual weight', () => {
    const q = calculateQuote(rules, parcel());
    assert.equal(q.chargeableGrams, 2000);
    assert.equal(q.total, 2400);
    assert.deepEqual(q.lines, [{ code: 'base', amount: 2400 }]);
  });

  it('uses volumetric weight when the parcel is bulky but light', () => {
    // 50×40×30 / 5000 = 12 kg volumetric vs 1 kg actual
    const q = calculateQuote(
      rules,
      parcel({ weightGrams: 1000, lengthCm: 50, widthCm: 40, heightCm: 30 }),
    );
    assert.equal(q.volumetricGrams, 12000);
    assert.equal(q.chargeableGrams, 12000);
    // above last bracket: 4800 + 2 started kg × 450
    assert.equal(q.total, 5700);
  });

  it('charges started kilograms above the last bracket', () => {
    const q = calculateQuote(rules, parcel({ weightGrams: 10001 }));
    assert.equal(q.lines[0]?.amount, 4800 + 450);
  });

  it('applies category and urgency multipliers in order', () => {
    const q = calculateQuote(
      rules,
      parcel({ categoryCode: 'SMALL_ELECTRONICS', urgency: 'EXPRESS' }),
    );
    // 2400 × 1.25 = 3000 → × 1.35 = 4050
    assert.equal(q.total, 4050);
    assert.deepEqual(
      q.lines.map((l) => [l.code, l.amount]),
      [
        ['base', 2400],
        ['category', 600],
        ['urgency', 1050],
      ],
    );
  });

  it('adds a fee on the declared value above the free allowance', () => {
    // (50 000 − 10 000) × 1.5% = 600
    const q = calculateQuote(rules, parcel({ declaredValue: 50000 }));
    assert.equal(q.lines.find((l) => l.code === 'declaredValue')?.amount, 600);
    assert.equal(q.total, 3000);
  });

  it('adds options once each and rejects unknown ones', () => {
    const q = calculateQuote(rules, parcel({ options: ['FRAGILE', 'FRAGILE', 'PHOTO_PROOF'] }));
    assert.equal(q.total, 2400 + 300 + 150);
    assert.throws(
      () => calculateQuote(rules, parcel({ options: ['TELEPORT'] })),
      (e: unknown) => e instanceof PricingError && e.code === 'unknown_option',
    );
  });

  it('enforces the minimum price', () => {
    const q = calculateQuote(
      rules,
      parcel({
        categoryCode: 'DOCUMENTS',
        weightGrams: 200,
        lengthCm: 30,
        widthCm: 21,
        heightCm: 1,
      }),
    );
    // 1600 × 0.85 = 1360 ≥ 1200, so no minimum line
    assert.equal(q.total, 1350);
    const cheap = calculateQuote(
      { ...rules, brackets: [{ upToGrams: 1000, price: 500 }, ...rules.brackets.slice(1)] },
      parcel({ weightGrams: 300, lengthCm: 20, widthCm: 15, heightCm: 5 }),
    );
    assert.equal(cheap.total, 1200);
    assert.ok(cheap.lines.some((l) => l.code === 'minimum'));
  });

  it('rounds to the configured step and records the difference', () => {
    const q = calculateQuote(
      rules,
      parcel({
        categoryCode: 'DOCUMENTS',
        weightGrams: 900,
        lengthCm: 20,
        widthCm: 15,
        heightCm: 5,
      }),
    );
    // 1600 × 0.85 = 1360 → nearest 50 = 1350
    assert.equal(q.total, 1350);
    assert.deepEqual(q.lines.at(-1), { code: 'rounding', amount: -10 });
  });

  it('splits commission and traveller earning so they add up to the total', () => {
    const q = calculateQuote(
      rules,
      parcel({ urgency: 'EXPRESS', options: ['FRAGILE'], declaredValue: 25000 }),
    );
    assert.equal(q.commission + q.travellerEarning, q.total);
    assert.equal(q.commission, Math.round(q.total * 0.2));
  });

  it('rejects parcels heavier than the corridor limit', () => {
    assert.throws(
      () => calculateQuote(rules, parcel({ weightGrams: 23001 })),
      (e: unknown) => e instanceof PricingError && e.code === 'too_heavy',
    );
  });

  it('sums every line to the total', () => {
    for (const over of [
      {},
      { urgency: 'EXPRESS' as const },
      { declaredValue: 99999 },
      { weightGrams: 15000, options: ['FRAGILE'] },
    ]) {
      const q = calculateQuote(rules, parcel(over));
      assert.equal(
        q.lines.reduce((s, l) => s + l.amount, 0),
        q.total,
      );
    }
  });
});

describe('volumetricGrams', () => {
  it('rounds up to the gram', () => {
    assert.equal(volumetricGrams(10, 10, 10, 5000), 200);
    assert.equal(volumetricGrams(11, 7, 3, 5000), 47);
  });
});

describe('PricingRulesSchema', () => {
  it('rejects unsorted brackets', () => {
    const result = PricingRulesSchema.safeParse({
      ...rules,
      brackets: [
        { upToGrams: 3000, price: 1 },
        { upToGrams: 1000, price: 2 },
      ],
    });
    assert.equal(result.success, false);
  });
});
