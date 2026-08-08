import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBdPhone, sendSms } from './sms.js';

describe('normalizeBdPhone', () => {
  test('a local 11-digit number starting with 0 gets the 88 country code prepended', () => {
    assert.equal(normalizeBdPhone('01711223344'), '8801711223344');
  });

  test('a 10-digit number without the leading 0 gets 880 prepended', () => {
    assert.equal(normalizeBdPhone('1711223344'), '8801711223344');
  });

  test('an already-full international number passes through unchanged', () => {
    assert.equal(normalizeBdPhone('8801711223344'), '8801711223344');
  });

  test('spaces, dashes, and a leading + are stripped before normalizing', () => {
    assert.equal(normalizeBdPhone('+880 171-122-3344'), '8801711223344');
    assert.equal(normalizeBdPhone('017-1122-3344'), '8801711223344');
  });

  test('an unrecognizable shape returns null rather than guessing', () => {
    assert.equal(normalizeBdPhone('12345'), null);
    assert.equal(normalizeBdPhone(''), null);
    assert.equal(normalizeBdPhone(null), null);
  });
});

describe('sendSms (gateway not configured)', () => {
  let savedApiKey, savedSenderId;
  before(() => {
    savedApiKey = process.env.SMS_API_KEY;
    savedSenderId = process.env.SMS_SENDER_ID;
    delete process.env.SMS_API_KEY;
    delete process.env.SMS_SENDER_ID;
  });
  after(() => {
    if (savedApiKey !== undefined) process.env.SMS_API_KEY = savedApiKey;
    if (savedSenderId !== undefined) process.env.SMS_SENDER_ID = savedSenderId;
  });

  test('logs instead of calling the network, and reports sent: false', async () => {
    const result = await sendSms('01711223344', 'Your order has shipped.');
    assert.equal(result.sent, false);
    assert.equal(result.reason, 'not_configured');
  });

  test('an unnormalizable phone also skips without throwing', async () => {
    const result = await sendSms('not-a-phone', 'Your order has shipped.');
    assert.equal(result.sent, false);
  });
});
