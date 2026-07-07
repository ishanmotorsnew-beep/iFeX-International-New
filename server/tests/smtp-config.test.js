import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSmtpCandidates } from '../lib/smtp.js';

test('buildSmtpCandidates prefers Gmail-compatible settings', () => {
  const candidates = buildSmtpCandidates({
    host: 'smtp.gmail.com',
    port: 587,
    secure: true,
    user: 'user@gmail.com',
    pass: 'app-password',
  });

  assert.ok(candidates.length >= 2);
  assert.equal(candidates[0].host, 'smtp.gmail.com');
  assert.equal(candidates[0].port, 465);
  assert.equal(candidates[0].secure, true);
  assert.equal(candidates[1].port, 587);
  assert.equal(candidates[1].secure, false);
});

test('buildSmtpCandidates preserves explicitly configured values when valid', () => {
  const candidates = buildSmtpCandidates({
    host: 'smtp.example.com',
    port: 2525,
    secure: false,
    user: 'user@example.com',
    pass: 'secret',
  });

  assert.ok(candidates.some((candidate) => candidate.host === 'smtp.example.com' && candidate.port === 2525 && candidate.secure === false));
});
