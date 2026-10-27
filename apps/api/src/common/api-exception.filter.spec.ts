import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NotFoundException, PayloadTooLargeException, type ArgumentsHost } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { ApiExceptionFilter } from './api-exception.filter';
import { conflict } from './errors';

/** Runs the filter against a fake Express response and returns what it sent. */
function send(exception: unknown) {
  const sent: { status?: number; body?: unknown } = {};
  const res = {
    headersSent: false,
    status(code: number) {
      sent.status = code;
      return this;
    },
    json(body: unknown) {
      sent.body = body;
    },
  };
  const host = { switchToHttp: () => ({ getResponse: () => res }) } as unknown as ArgumentsHost;
  new ApiExceptionFilter().catch(exception, host);
  return sent;
}

describe('ApiExceptionFilter', () => {
  it('passes application errors through unchanged', () => {
    const sent = send(conflict('dispute_exists', 'Already reported'));
    assert.deepEqual(sent, {
      status: 409,
      body: { code: 'dispute_exists', message: 'Already reported' },
    });
  });

  it('gives framework errors a translatable code', () => {
    assert.equal(
      (send(new ThrottlerException()).body as { code: string }).code,
      'too_many_requests',
    );
    assert.equal(send(new ThrottlerException()).status, 429);
    assert.equal((send(new NotFoundException()).body as { code: string }).code, 'not_found');
    assert.equal(
      (send(new PayloadTooLargeException()).body as { code: string }).code,
      'invalid_file',
    );
  });

  it('hides unexpected crashes behind internal_error', () => {
    const sent = send(new Error('relation "User" does not exist'));
    assert.deepEqual(sent, {
      status: 500,
      body: { code: 'internal_error', message: 'Internal server error' },
    });
  });
});
