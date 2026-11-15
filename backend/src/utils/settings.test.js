import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWhatsappNumber } from './settings.js';

test('normalizeWhatsappNumber accepts common BD and international formats', () => {
  assert.equal(normalizeWhatsappNumber('01560-047377'), '8801560047377');
  assert.equal(normalizeWhatsappNumber('+880 1560 047377'), '8801560047377');
  assert.equal(normalizeWhatsappNumber('1560047377'), '8801560047377');
  assert.equal(normalizeWhatsappNumber('+1 202 555 0198'), '12025550198');
});

test('normalizeWhatsappNumber rejects incomplete or empty values', () => {
  assert.equal(normalizeWhatsappNumber(''), null);
  assert.equal(normalizeWhatsappNumber('12345'), null);
});
