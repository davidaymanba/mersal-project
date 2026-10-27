import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  SHIPMENT_REFERENCE_PATTERN,
  canTransition,
  formatMoney,
  generateShipmentReference,
  gramsToKg,
  toMinor,
} from './index';

describe('shipment status machine', () => {
  it('allows the happy path', () => {
    const path = [
      'DRAFT',
      'QUOTED',
      'PAID',
      'MATCHING',
      'MATCHED',
      'PICKED_UP',
      'IN_TRANSIT',
      'DELIVERED',
      'COMPLETED',
    ] as const;
    for (let i = 0; i < path.length - 1; i++) {
      assert.equal(canTransition(path[i]!, path[i + 1]!), true, `${path[i]} -> ${path[i + 1]}`);
    }
  });

  it('rejects skipping payment', () => {
    assert.equal(canTransition('QUOTED', 'MATCHING'), false);
  });

  it('treats completed and refunded as terminal', () => {
    assert.equal(canTransition('COMPLETED', 'DISPUTED'), false);
    assert.equal(canTransition('REFUNDED', 'MATCHING'), false);
  });
});

describe('references', () => {
  it('generates references matching the public pattern', () => {
    for (let i = 0; i < 50; i++) {
      assert.match(generateShipmentReference(), SHIPMENT_REFERENCE_PATTERN);
    }
  });
});

describe('money', () => {
  it('converts to minor units without float drift', () => {
    assert.equal(toMinor(19.99, 'EUR'), 1999);
    assert.equal(toMinor(0.1 + 0.2, 'EUR'), 30);
  });

  it('formats per locale', () => {
    assert.equal(formatMoney(1999, 'EUR', 'en'), '€19.99');
  });

  it('rounds grams to two-decimal kilograms', () => {
    assert.equal(gramsToKg(2345), 2.35);
  });
});
