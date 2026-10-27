import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { maskContactDetails } from './masking';

describe('maskContactDetails', () => {
  const masked = (input: string) => maskContactDetails(input).text;

  it('masks phone numbers in common formats', () => {
    assert.equal(masked('call me on +33 6 12 34 56 78 tonight'), 'call me on ••• tonight');
    assert.equal(masked('0661-23-45-67'), '•••');
    assert.equal(masked('mon numéro: 00213 555 123 456'), 'mon numéro: •••');
    assert.equal(masked('رقمي 0555123456 شكرا'), 'رقمي ••• شكرا');
  });

  it('masks emails and messaging links', () => {
    assert.equal(masked('write to karim.b@gmail.com'), 'write to •••');
    assert.equal(masked('whatsapp https://wa.me/33612345678'), 'whatsapp •••');
    assert.equal(masked('or t.me/karim_b'), 'or •••');
  });

  it('keeps ordinary text, dates, references and small numbers', () => {
    const text = 'I land on 12/11 at 14:30, parcel MRS-7K3D-29QX weighs 2.5 kg, gate 21';
    assert.deepEqual(maskContactDetails(text), { text, masked: false });
  });
});
