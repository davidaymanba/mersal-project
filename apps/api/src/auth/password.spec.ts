import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
  it('verifies the original password and rejects others', async () => {
    const stored = await hashPassword('Correct horse battery staple');
    assert.match(stored, /^scrypt\$32768\$8\$1\$/);
    assert.equal(await verifyPassword('Correct horse battery staple', stored), true);
    assert.equal(await verifyPassword('correct horse battery staple', stored), false);
  });

  it('salts every hash', async () => {
    assert.notEqual(await hashPassword('same'), await hashPassword('same'));
  });

  it('rejects malformed stored values', async () => {
    assert.equal(await verifyPassword('x', 'bcrypt$whatever'), false);
  });
});
